'use client';

import type { LevelStats, StoredLevelInfo } from '../lib/types';

function getDifficultyLabel(diffVal: number | undefined) {
  switch (diffVal) {
    case 1: return 'KOLAY';
    case 2: return 'ORTA';
    case 3: return 'ZOR';
    case 4: return 'ÇOK ZOR';
    default: return 'BELİRTİLMEMİŞ';
  }
}

/** Grid boyutu / zorluk / not özet paneli + tasarımcı-oyuncu zorluk uyumsuzluğu uyarısı. */
export function DifficultyGapPanel({
  selectedLevel,
  latestStats,
}: {
  selectedLevel: StoredLevelInfo;
  latestStats: LevelStats | undefined;
}) {
  const getPlayerVotedDifficulty = () => {
    if (!latestStats) return null;
    const { votes_easy, votes_normal, votes_hard } = latestStats;
    const maxVotes = Math.max(votes_easy, votes_normal, votes_hard);
    if (maxVotes === 0) return null;
    if (maxVotes === votes_easy) return 'KOLAY';
    if (maxVotes === votes_normal) return 'ORTA';
    return 'ZOR';
  };

  const designerDiffLabel = getDifficultyLabel(selectedLevel.difficulty);
  const playerDiffLabel = getPlayerVotedDifficulty();

  let gapWarning: string | null = null;
  if (selectedLevel.difficulty && playerDiffLabel) {
    const designerVal = selectedLevel.difficulty;
    if (designerVal <= 2 && playerDiffLabel === 'ZOR') {
      gapWarning = `⚠️ ZORLUK UYUMSUZLUĞU: Tasarımcı bu bölümü "${designerDiffLabel}" planlamış ancak oyuncular çoğunlukla "ZOR" olarak oylamış! Seviye tasarımını hafifletmeyi düşünebilirsiniz.`;
    } else if (designerVal >= 3 && playerDiffLabel === 'KOLAY') {
      gapWarning = `⚠️ ZORLUK UYUMSUZLUĞU: Tasarımcı bu bölümü "${designerDiffLabel}" planlamış ancak oyuncular çoğunlukla "KOLAY" olarak oylamış! Seviyeyi biraz daha zorlaştırmayı düşünebilirsiniz.`;
    }
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, background: 'rgba(30, 41, 59, 0.2)', padding: 14, borderRadius: 12, border: '1px solid rgba(148, 163, 184, 0.08)' }}>
        <div>
          <span style={{ fontSize: 9, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Izgara Boyutu</span>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, fontWeight: 800 }}>
            {selectedLevel.width && selectedLevel.height ? `${selectedLevel.width} x ${selectedLevel.height}` : 'Belirtilmemiş'}
          </p>
        </div>
        <div>
          <span style={{ fontSize: 9, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tasarımcı Zorluğu</span>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, fontWeight: 800, color: '#60a5fa' }}>
            {designerDiffLabel}
          </p>
        </div>
        <div>
          <span style={{ fontSize: 9, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Oyuncu Zorluk Oyu</span>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, fontWeight: 800, color: playerDiffLabel === 'ZOR' ? '#ef4444' : playerDiffLabel === 'KOLAY' ? '#10b981' : '#f59e0b' }}>
            {playerDiffLabel || 'VERİ YOK'}
          </p>
        </div>
        <div>
          <span style={{ fontSize: 9, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tasarımcı / Oluşturan</span>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, fontWeight: 800 }}>
            {selectedLevel.creatorName || 'Sistem'}
          </p>
        </div>
      </div>

      {gapWarning && (
        <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: 10, padding: '10px 14px', fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>
          {gapWarning}
        </div>
      )}

      {(selectedLevel.creatorNotes || selectedLevel.gameNotes) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {selectedLevel.creatorNotes && (
            <div style={{ background: 'rgba(30, 41, 59, 0.1)', border: '1px solid rgba(148, 163, 184, 0.04)', padding: 12, borderRadius: 10 }}>
              <span style={{ fontSize: 9, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Tasarım Notu</span>
              <p style={{ margin: '4px 0 0 0', fontSize: 11, color: '#d1d5db', fontStyle: 'italic', lineHeight: '1.4' }}>
                &quot;{selectedLevel.creatorNotes}&quot;
              </p>
            </div>
          )}
          {selectedLevel.gameNotes && (
            <div style={{ background: 'rgba(30, 41, 59, 0.1)', border: '1px solid rgba(148, 163, 184, 0.04)', padding: 12, borderRadius: 10 }}>
              <span style={{ fontSize: 9, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Editör Çözüm İpuçları</span>
              <p style={{ margin: '4px 0 0 0', fontSize: 11, color: '#94a3b8', lineHeight: '1.4', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                {selectedLevel.gameNotes}
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
