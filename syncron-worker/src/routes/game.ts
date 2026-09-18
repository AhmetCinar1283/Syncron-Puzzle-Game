/**
 * DOSYA AMACI: Bu dosya, oyuncuların bitirdiği seviyelerin hamle doğruluğunu kontrol eden, 
 * yıldız/skor hesaplayan ve D1 ile Firestore verilerini güncelleyen oyun bitirme API ucunu tanımlar.
 */

import { Hono } from 'hono';
import type { AppContext } from '../types';
import { completeLevelSchema, telemetrySchema, feedbackSchema } from '../schemas/game';
import { firebaseAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimiter';
import { recordVerifyMovesFailure } from '../services/securitySignals';
import { trackSecurityEvent } from '../middleware/securityTrail';
import { getAdminAccessToken } from '../services/serviceAccount';
import { fsGet, fsCommit, parseLevelDoc, docPath, nowTimestamp, fromDoc } from '../services/firestore';
import { verifyMoves } from '../services/gameVerify';
import { getSolutionStats, computeStars, updateSolutions } from '../services/solutions';
import { writeAuditLog } from '../services/auditLog';
import { updateLeaderboardData } from '../services/leaderboard';
import { checkActiveBan } from '../services/banService';
import { upsertPlayedLevel, getPlayedLevel } from '../services/playedLevels';
import { resolveHintUsage, capStarsForHint, personalBestMoveCount, finalizeHintUsage } from '../services/hintScoring';
import type { CompleteLevelResponse } from '../types';

export const gameRouter = new Hono<AppContext>();

// Kullanıcının tamamladığı seviyenin çözümünü doğrular, yıldız ve skor hesaplayarak veritabanlarına kaydeder.
gameRouter.post('/complete-level', firebaseAuth, rateLimit('complete-level'), async (c) => {
  const uid = c.get('uid');

  // Check for platform ban
  const isBanned = await checkActiveBan(c.env.AUDIT_DB, uid, 'platform');
  if (isBanned) {
    trackSecurityEvent(c, 'ban.blocked', { banType: 'platform' });
    return c.json({ success: false, error: 'Account suspended' }, 403);
  }

  // 1. Parse JSON safely
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON' }, 400);
  }

  // 2. Validate with Zod
  const validation = completeLevelSchema.safeParse(body);
  if (!validation.success) {
    console.log('[CompleteLevel] Zod validation failed:', JSON.stringify(validation.error.format()));
    const error = validation.error.errors[0]?.message || 'Invalid request';
    return c.json({ success: false, error }, 400);
  }

  const { levelId, moves, timeSpent, hintsUsed } = validation.data;

  // 3. Get admin access token
  let adminToken: string;
  try {
    adminToken = await getAdminAccessToken(c.env.GOOGLE_SERVICE_ACCOUNT);
  } catch (e) {
    console.error('Service account error:', e);
    return c.json({ success: false, error: 'Internal error' }, 500);
  }

  const projectId = c.env.FIREBASE_PROJECT_ID;

  // 4. Fetch level from Firestore
  const levelDoc = await fsGet(projectId, `levels/${levelId}`, adminToken);
  if (!levelDoc) {
    return c.json({ success: false, error: 'Level not found' }, 404);
  }

  let levelData;
  try {
    levelData = parseLevelDoc(levelDoc, levelId);
  } catch (e) {
    console.error('Level parse error:', e);
    return c.json({ success: false, error: 'Failed to parse level' }, 500);
  }

  // 5. Replay moves & verify win
  const isValid = verifyMoves(levelData, moves);
  if (!isValid) {
    // §3.6: tam gövde DEĞİL, yalnızca teşhis için gereken kadarı loglanır.
    console.warn('[CompleteLevel] verifyMoves failed', { uid, levelId, moveCount: moves.length });
    // §3.5: tek tük başarısızlık normaldir; yalnızca eşik aşımında iz bırakılır.
    c.executionCtx.waitUntil(
      recordVerifyMovesFailure(c.env.AUDIT_DB, uid, levelId).catch((err) =>
        console.error('[Security] verifyMoves signal write failed:', err),
      ),
    );
    // 05 §3.2 — EŞİKSİZ adli iz. `recordVerifyMovesFailure` yalnızca eşik aşımında
    // sinyal yazar (gürültü kontrolü); burada ise her reddedilen iddia kaynağıyla
    // birlikte kaydedilir — tek bir hile denemesi de soruşturulabilir olmalıdır.
    trackSecurityEvent(c, 'solution.invalid', { levelId, moveCount: moves.length, surface: 'level' });
    return c.json({ success: false, error: 'Invalid solution' }, 400);
  }

  // 6. Parallel reads — played_levels now in D1 (not Firestore)
  const [existingPlayedRow, solutionStats, userDoc, hintUsage] = await Promise.all([
    getPlayedLevel(c.env.AUDIT_DB, uid, levelId),
    getSolutionStats(projectId, levelId, adminToken),
    fsGet(projectId, `users/${uid}`, adminToken),
    // İpucu kullanımı sunucu kayıtlarından okunur; istemci beyanı yalnızca skoru düşürebilir.
    resolveHintUsage(c.env.AUDIT_DB, uid, levelId, hintsUsed),
  ]);
  const { hinted } = hintUsage;
  const { bestMoveCount, worstTopMoveCount, bestHolderUid } = solutionStats;

  let displayName = 'Player';
  let tag: string | null = null;
  if (userDoc) {
    const userData = fromDoc(userDoc);
    if (typeof userData.displayName === 'string') {
      displayName = userData.displayName;
    }
    if (typeof userData.tag === 'string') {
      tag = userData.tag;
    }
  }

  const levelRaw = fromDoc(levelDoc);
  const createdBy = typeof levelRaw.createdBy === 'string' ? levelRaw.createdBy : null;

  // 7. Compute stars and score delta
  const isFirstCompletion = existingPlayedRow === null;
  const existingStars = existingPlayedRow?.stars ?? 0;
  const newStars = capStarsForHint(computeStars(moves.length, bestMoveCount), hinted);
  const scoreDelta = Math.max(0, newStars - existingStars);

  const bestStars = Math.max(newStars, existingStars);
  const existingMoveCount = personalBestMoveCount(moves.length, existingPlayedRow?.move_count, hinted);

  // 8a. Write played_levels to D1 (canonical store — replaces Firestore subcollection)
  // The returned `wasFirstCompletion` is the authoritative first-completion flag:
  // D1's UPSERT is atomic, so only one of two concurrent requests can get `true`.
  let d1IsFirstCompletion = isFirstCompletion; // fallback if D1 write fails
  try {
    const d1Result = await upsertPlayedLevel(c.env.AUDIT_DB, {
      uid,
      levelId,
      stars: bestStars as 1 | 2 | 3,
      score: bestStars,
      moveCount: existingMoveCount,
      timeSpent: Math.trunc(timeSpent),
    });
    d1IsFirstCompletion = d1Result.wasFirstCompletion;
  } catch (e) {
    console.error('[D1] played_levels upsert error:', e);
    return c.json({ success: false, error: 'Failed to save progress' }, 500);
  }

  // İlerleme kaydedildi → bu tamamlamaya uygulanan ipucu grant'lerini kapat.
  // Başarısız olursa grant'ler açık kalır ve bir sonraki tamamlamayı da sınırlar (güvenli taraf).
  try {
    await finalizeHintUsage(c.env.AUDIT_DB, uid, hintUsage);
  } catch (e) {
    console.error('[D1] reward_grants consume error:', e);
  }

  // Compute XP delta: 100 * difficulty for first completion, 20 for replaying
  const difficulty = (levelData.difficulty && levelData.difficulty >= 1 && levelData.difficulty <= 4)
    ? levelData.difficulty
    : 1;
  const xpDelta = d1IsFirstCompletion ? (100 * difficulty) : 20;

  // 8b. Update Firestore users/{uid} aggregate counters (totalScore, completedCount).
  //     The users/{uid} document still lives in Firestore for auth/profile purposes.
  const now = nowTimestamp();
  const writes: unknown[] = [];

  // If the user has no Firestore doc yet (anonymous user on first completion),
  // lazily create it — only if it does not already exist (idempotent).
  if (!userDoc) {
    writes.push({
      update: {
        name: docPath(projectId, `users/${uid}`),
        fields: {
          uid:            { stringValue: uid },
          authProvider:   { stringValue: 'anonymous' },
          createdAt:      { timestampValue: now },
          totalScore:     { integerValue: '0' },
          completedCount: { integerValue: '0' },
          role:           { stringValue: 'user' },
          xp:             { integerValue: '0' },
        },
      },
      currentDocument: { exists: false },
    });
  }

  if (scoreDelta > 0 || d1IsFirstCompletion || xpDelta > 0) {
    const fieldTransforms: unknown[] = [];
    if (scoreDelta > 0) {
      fieldTransforms.push({
        fieldPath: 'totalScore',
        increment: { integerValue: String(scoreDelta) },
      });
    }
    if (d1IsFirstCompletion) {
      fieldTransforms.push({
        fieldPath: 'completedCount',
        increment: { integerValue: '1' },
      });
    }
    if (xpDelta > 0) {
      fieldTransforms.push({
        fieldPath: 'xp',
        increment: { integerValue: String(xpDelta) },
      });
    }
    if (fieldTransforms.length > 0) {
      writes.push({
        transform: {
          document: docPath(projectId, `users/${uid}`),
          fieldTransforms,
        },
      });
    }
  }

  if (writes.length > 0) {
    try {
      await fsCommit(projectId, writes, adminToken);
    } catch (e) {
      console.error('Firestore commit error:', e);
      // Non-fatal: D1 write already succeeded. Score counters will self-correct via admin tools.
    }
  }

  // 9. Update solutions — ipuçlu çözüm global en iyi çözüm listesine ve rozetlerine girmez.
  const isNewBestSolution = !hinted && (bestMoveCount === null || moves.length < bestMoveCount);
  const isBestSolution    = !hinted && bestMoveCount !== null && moves.length === bestMoveCount;
  const isGoodSolution    = !hinted && !isNewBestSolution && !isBestSolution && (
    worstTopMoveCount === null || moves.length <= worstTopMoveCount
  );

  if (!hinted) {
    try {
      await updateSolutions(projectId, levelId, uid, moves, adminToken);
    } catch (e) {
      console.error('Solutions update error:', e);
    }
  }

  // 10. Write audit log (non-blocking — never delays the response)
  c.executionCtx.waitUntil(
    writeAuditLog(c.env.AUDIT_DB, uid, 'level.complete', 'game', {
      levelId,
      moveCount:    moves.length,
      stars:        bestStars,
      scoreDelta,
      isFirst:      isFirstCompletion,
      isNewBest:    isNewBestSolution,
      hinted,
    }).catch((err) => console.error('[AuditLog] level.complete write failed:', err)),
  );

  // 11. Update leaderboard data in D1 (non-blocking)
  c.executionCtx.waitUntil(
    updateLeaderboardData(c.env.AUDIT_DB, uid, {
      scoreDelta,
      isFirstCompletion: d1IsFirstCompletion, // use D1-authoritative value
      displayName,
      tag,
      isNewBestSolution,
      oldBestHolderUid: bestHolderUid,
      createdBy,
      starsGained: bestStars,
      xpDelta,
    }).catch((err) => console.error('[Leaderboard] leaderboard update failed:', err)),
  );

  const response: CompleteLevelResponse = {
    success: true,
    isFirstCompletion,
    isNewBestSolution,
    isBestSolution,
    isGoodSolution,
    stars: bestStars as 1 | 2 | 3,
    scoreDelta,
    xpDelta,
    hintUsed: hinted,
  };

  return c.json(response);
});

// Telemetry submission endpoint
gameRouter.post('/game/telemetry', firebaseAuth, rateLimit('game-telemetry'), async (c) => {
  const uid = c.get('uid');

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON' }, 400);
  }

  const validation = telemetrySchema.safeParse(body);
  if (!validation.success) {
    const error = validation.error.errors[0]?.message || 'Invalid request';
    return c.json({ success: false, error }, 400);
  }

  const { id, levelId, version, outcome, timeSpent, restarts, deaths, movesCount, hintsUsed } = validation.data;

  // Yazma + başarısızlığın görünür kaydı servis katmanında (bkz.
  // services/levelTelemetry/recordTelemetry.ts). Route yalnızca HTTP'ye çevirir.
  const { recordLevelTelemetry } = await import('../services/levelTelemetry/recordTelemetry');
  const result = await recordLevelTelemetry(c.env.AUDIT_DB, {
    id,
    uid,
    levelId,
    version,
    outcome,
    timeSpent,
    restarts,
    deaths,
    movesCount,
    hintsUsed,
  });

  // `duplicate`: aynı oturum ikinci kez gönderildi — satır zaten yazılı,
  // istemcinin yeniden denemesi idempotenttir, hata değildir.
  if (result.status === 'failed') {
    return c.json({ success: false, error: 'Failed to save telemetry' }, 500);
  }
  return c.json({ success: true });
});

// Feedback submission endpoint
gameRouter.post('/game/feedback', firebaseAuth, rateLimit('game-feedback'), async (c) => {
  const uid = c.get('uid');

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON' }, 400);
  }

  const validation = feedbackSchema.safeParse(body);
  if (!validation.success) {
    const error = validation.error.errors[0]?.message || 'Invalid request';
    return c.json({ success: false, error }, 400);
  }

  const { levelId, version, difficulty, liked } = validation.data;

  try {
    const { upsertFeedback } = await import('../services/telemetry');
    await upsertFeedback(c.env.AUDIT_DB, {
      uid,
      levelId,
      version,
      difficulty,
      liked,
    });
    return c.json({ success: true });
  } catch (err) {
    console.error('[Feedback] Failed to upsert feedback:', err);
    return c.json({ success: false, error: 'Failed to save feedback' }, 500);
  }
});

