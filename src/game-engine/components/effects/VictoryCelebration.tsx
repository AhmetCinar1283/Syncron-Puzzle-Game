// src/game-engine/components/effects/VictoryCelebration.tsx
// Oyun kazanıldığında çalışan, entity sayısına göre (1-5 oyuncu) dinamik şekillenen
// ve oyun hissiyatı veren süper akıcı (60fps) zafer kutlama koreografisi.

'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Entity } from '../../logic/entityTypes';
import { getPlayerColor } from '../playerColors';
import { PlayerGraphic } from '../entities/PlayerGraphic';

interface VictoryCelebrationProps {
    entities: Entity[];
    roomPositions: Record<string, { left: number; top: number; width?: number; height?: number }>;
    boardWidth: number;
    boardHeight: number;
    durationMs?: number;
}

interface Particle {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    shape: 'star' | 'circle' | 'sparkle';
    rotation: number;
    rotSpeed: number;
    opacity: number;
}

interface GhostTrail {
    x: number;
    y: number;
    scale: number;
    rotation: number;
    opacity: number;
}

interface AnimatedEntityState {
    x: number;
    y: number;
    scale: number;
    rotation: number;
    opacity: number;
    trails: GhostTrail[];
}

export const VICTORY_CELEBRATION_DURATION = 1750;

/** Oyuncu başına sabit hayalet iz yuvası sayısı (kullanılmayan gizlenir). */
const TRAIL_SLOTS = 3;

export const VictoryCelebration: React.FC<VictoryCelebrationProps> = ({
    entities,
    roomPositions,
    boardWidth,
    boardHeight,
    durationMs = VICTORY_CELEBRATION_DURATION,
}) => {
    const activePlayers = useMemo(() => {
        return entities.filter(e => e.type === 'player' && !e.customData._destroyed);
    }, [entities]);

    const N = Math.max(1, activePlayers.length);
    const cx = boardWidth / 2;
    const cy = boardHeight / 2;

    const activePlayersKey = useMemo(() => {
        return activePlayers.map(p => `${p.id}:${p.position.roomId}:${p.position.row},${p.position.col}`).join('|');
    }, [activePlayers]);

    const victoryKey = `${activePlayersKey}_${boardWidth}x${boardHeight}`;
    const lastVictoryKeyRef = useRef(victoryKey);
    const isCompletedRef = useRef(false);

    // Her oyuncunun başlangıç noktaları ve renkleri
    const playerConfigs = useMemo(() => {
        return activePlayers.map((ent, idx) => {
            const rId = ent.position.roomId ?? 'main';
            const rOffset = roomPositions[rId] ?? { left: 0, top: 0 };
            const startX = rOffset.left + ent.position.col * 64 + 32;
            const startY = rOffset.top + ent.position.row * 64 + 32;
            const playerIndex = (ent.customData.playerIndex as number) ?? idx;
            const colorSchema = getPlayerColor(playerIndex);

            // Başlangıç açısı: Merkeze göre açısı + entity indeks ofseti
            const baseAngle = Math.atan2(startY - cy, startX - cx);
            const distributedAngle = (2 * Math.PI * idx) / N;
            // Düzgün dağılım ve başlangıç açısını harmanla
            const initialAngle = (baseAngle + distributedAngle) / 2;

            return {
                entity: ent,
                startX,
                startY,
                colorSchema,
                initialAngle,
            };
        });
    }, [activePlayers, roomPositions, cx, cy, N]);

    // Arka plan konfeti ve kıvılcım parçacıkları
    const [ambientParticles] = useState<Particle[]>(() => {
        const parts: Particle[] = [];
        const count = Math.min(36, 18 + N * 4);
        const shapes: ('star' | 'circle' | 'sparkle')[] = ['star', 'circle', 'sparkle'];
        const colors = ['#ffd700', '#00ff88', '#00c4ff', '#d946ef', '#f97316', '#ffffff'];

        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
            const speed = 1.2 + Math.random() * 3.5;
            parts.push({
                id: i,
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 6 + Math.random() * 10,
                color: colors[i % colors.length],
                shape: shapes[i % shapes.length],
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 12,
                opacity: 0,
            });
        }
        return parts;
    });

    // Animasyon durum değişkenleri (Refs for 60fps bypass of React re-render overhead)
    const entityStatesRef = useRef<AnimatedEntityState[]>(
        playerConfigs.map(p => ({
            x: p.startX,
            y: p.startY,
            scale: 1,
            rotation: 0,
            opacity: 1,
            trails: [],
        }))
    );

    const burstStateRef = useRef({
        active: false,
        scale: 0,
        opacity: 0,
        shockwaveRadius: 0,
        shockwaveOpacity: 0,
    });

    const particlesRef = useRef<Particle[]>(ambientParticles);

    // ── Doğrudan DOM referansları ─────────────────────────────────────────────
    // Koreografinin durumu zaten ref'lerde tutuluyordu, ama her RAF karesinde
    // `setTick` ile React'e tam bir re-render yaptırılıyordu: ~40-60 SVG/DOM
    // düğümü saniyede 60 kez yeniden karşılaştırılıyordu. Ağaç sabit olduğu
    // için artık bir kez render ediliyor, kare güncellemeleri aşağıdaki
    // ref'ler üzerinden doğrudan yazılıyor. React döngüye hiç girmiyor.
    const particleRefs = useRef<(SVGGElement | null)[]>([]);
    const playerRefs = useRef<(HTMLDivElement | null)[]>([]);
    const trailRefs = useRef<(HTMLDivElement | null)[][]>([]);
    const burstRef = useRef<HTMLDivElement | null>(null);
    const shockOuterRef = useRef<SVGCircleElement | null>(null);
    const shockInnerRef = useRef<SVGCircleElement | null>(null);


    // Seviye veya zafer anahtarı değiştiğinde durumu sıfırla
    if (lastVictoryKeyRef.current !== victoryKey) {
        lastVictoryKeyRef.current = victoryKey;
        isCompletedRef.current = false;
        entityStatesRef.current = playerConfigs.map(p => ({
            x: p.startX,
            y: p.startY,
            scale: 1,
            rotation: 0,
            opacity: 1,
            trails: [],
        }));
    }

    // State for re-rendering frame
    const [, setTick] = useState(0);

    useEffect(() => {
        // Eğer bu zafer animasyonu zaten tamamlandıysa tekrar başlatma!
        if (isCompletedRef.current) {
            return;
        }

        let startTime: number | null = null;
        let animId: number;
        let isCancelled = false;

        const maxRadius = Math.max(90, Math.min(boardWidth, boardHeight) * 0.38);

        /** Ref durumunu DOM'a yazar. Kare başına tek geçiş, React'siz. */
        const commit = () => {
            const particles = particlesRef.current;
            for (let i = 0; i < particles.length; i++) {
                const el = particleRefs.current[i];
                if (!el) continue;
                const pt = particles[i];
                if (pt.opacity <= 0.01) {
                    el.style.display = 'none';
                    continue;
                }
                el.style.display = '';
                el.setAttribute('transform', `translate(${pt.x}, ${pt.y}) rotate(${pt.rotation})`);
                el.setAttribute('opacity', String(pt.opacity));
            }

            const states = entityStatesRef.current;
            for (let idx = 0; idx < states.length; idx++) {
                const st = states[idx];
                const el = playerRefs.current[idx];
                if (el) {
                    if (!st || st.opacity <= 0.01) {
                        el.style.display = 'none';
                    } else {
                        el.style.display = '';
                        el.style.transform = `translate3d(${st.x - 32}px, ${st.y - 32}px, 0) scale(${st.scale}) rotate(${st.rotation}deg)`;
                        el.style.opacity = String(st.opacity);
                    }
                }

                const slots = trailRefs.current[idx];
                if (!slots) continue;
                for (let t = 0; t < TRAIL_SLOTS; t++) {
                    const slot = slots[t];
                    if (!slot) continue;
                    const tr = st?.trails[t];
                    if (!tr || tr.opacity <= 0.01) {
                        slot.style.display = 'none';
                        continue;
                    }
                    slot.style.display = '';
                    slot.style.transform = `translate3d(${tr.x - 32}px, ${tr.y - 32}px, 0) scale(${tr.scale}) rotate(${tr.rotation}deg)`;
                    slot.style.opacity = String(tr.opacity);
                }
            }

            const burst = burstStateRef.current;
            if (burstRef.current) {
                if (!burst.active || burst.scale <= 0.05) {
                    burstRef.current.style.display = 'none';
                } else {
                    burstRef.current.style.display = '';
                    burstRef.current.style.transform = `scale(${burst.scale}) rotate(${burst.scale * 120}deg)`;
                    burstRef.current.style.opacity = String(burst.opacity);
                }
            }

            const shockVisible = burst.active && burst.shockwaveOpacity > 0.01;
            if (shockOuterRef.current) {
                shockOuterRef.current.style.display = shockVisible ? '' : 'none';
                if (shockVisible) {
                    shockOuterRef.current.setAttribute('r', String(burst.shockwaveRadius));
                    shockOuterRef.current.setAttribute('opacity', String(burst.shockwaveOpacity));
                }
            }
            if (shockInnerRef.current) {
                shockInnerRef.current.style.display = shockVisible ? '' : 'none';
                if (shockVisible) {
                    shockInnerRef.current.setAttribute('r', String(burst.shockwaveRadius * 0.72));
                    shockInnerRef.current.setAttribute('opacity', String(burst.shockwaveOpacity * 0.85));
                }
            }
        };

        const animate = (now: number) => {
            if (isCancelled || isCompletedRef.current) return;

            if (!startTime) startTime = now;
            const elapsed = now - startTime;
            const progress = Math.min(1, elapsed / durationMs);

            // ── AŞAMA 1: Sıçrama ve Havalanma (0.00 -> 0.18, ~315ms) ──────────
            // ── AŞAMA 2: Hızlanan Girdap Dansı (0.18 -> 0.82, ~1120ms) ────────
            // ── AŞAMA 3: Merkezde Birleşme & Süpernova (0.82 -> 1.00, ~315ms) ──

            const isPhase1 = progress < 0.18;
            const isPhase2 = progress >= 0.18 && progress < 0.82;
            const isPhase3 = progress >= 0.82;

            // Oyuncu nesnelerinin konum hesaplamaları
            playerConfigs.forEach((cfg, idx) => {
                const current = entityStatesRef.current[idx];
                if (!current) return;

                let curX = cfg.startX;
                let curY = cfg.startY;
                let curScale = 1;
                let curRot = 0;
                let curOpacity = 1;

                if (isPhase1) {
                    // Sıçrama (Squash & Stretch jump out of grid)
                    const p1 = progress / 0.18;
                    const easeP1 = 1 - Math.pow(1 - p1, 3); // ease-out cubic
                    
                    // Hedef: Yörünge başlangıç noktası
                    const targetAngle = cfg.initialAngle;
                    const targetX = cx + maxRadius * Math.cos(targetAngle);
                    const targetY = cy + maxRadius * Math.sin(targetAngle);

                    curX = cfg.startX + (targetX - cfg.startX) * easeP1;
                    curY = cfg.startY + (targetY - cfg.startY) * easeP1 - Math.sin(p1 * Math.PI) * 28; // Zıplama yayı

                    curScale = 1 + Math.sin(p1 * Math.PI) * 0.35;
                    curRot = p1 * 120;
                    curOpacity = 1;
                } else if (isPhase2) {
                    // Girdap Dansı (Hızlanan içe sarmal dönüş)
                    const p2 = (progress - 0.18) / 0.64; // 0..1
                    
                    // Yarıçap giderek daralır: maxRadius -> 14px ("sarılma" yakınlaşması)
                    const decay = Math.pow(1 - p2, 1.2);
                    const currentRadius = maxRadius * decay + 14;

                    // Açısal hızlanma: Süre ilerledikçe dönüş frekansı katlanır
                    const totalRevs = N === 1 ? 3.2 : (N === 2 ? 3.8 : 3.0);
                    const angleProgress = Math.pow(p2, 1.28);
                    const currentAngle = cfg.initialAngle + Math.PI * 2 * totalRevs * angleProgress;

                    if (N === 1) {
                        // Tek oyuncu: Geniş oval ve figür-8 dalgalı zafer uçuşu
                        const waveX = Math.cos(currentAngle) * 1.25;
                        const waveY = Math.sin(currentAngle) * (0.9 + 0.3 * Math.cos(2 * currentAngle));
                        curX = cx + currentRadius * waveX;
                        curY = cy + currentRadius * waveY;
                    } else if (N === 2) {
                        // 2 Oyuncu: Efsanevi Çift Sarmal (Double-Helix / Yin-Yang Sarılması)
                        // Birbirlerine doğru hızla dönerek sarılırlar
                        curX = cx + currentRadius * Math.cos(currentAngle);
                        curY = cy + currentRadius * Math.sin(currentAngle);
                    } else {
                        // 3+ Oyuncu: Çok kollu yıldız vorteksi
                        curX = cx + currentRadius * Math.cos(currentAngle);
                        curY = cy + currentRadius * Math.sin(currentAngle);
                    }

                    // Dinamik eğim (bank tilt) ve dönüş
                    curScale = 1.15 + Math.sin(p2 * Math.PI * 4) * 0.1;
                    curRot = (currentAngle * 180) / Math.PI + 90 + p2 * 360;
                    curOpacity = 1;
                } else if (isPhase3) {
                    // Merkezde Birleşme & Yıldız Tozuna Dönüşerek Yok Olma
                    const p3 = (progress - 0.82) / 0.18; // 0..1
                    curX = cx + (current.x - cx) * (1 - p3 * 0.35);
                    curY = cy + (current.y - cy) * (1 - p3 * 0.35);
                    
                    curScale = Math.max(0, (1 - p3) * 1.2);
                    curRot = current.rotation + p3 * 720;
                    curOpacity = Math.max(0, 1 - p3 * p3);
                }

                // Ghost Motion Trails (Her oyuncunun arkasında kendi renginde 3 hayalet iz)
                const trails = [...current.trails];
                if (isPhase2 || isPhase1) {
                    trails.unshift({
                        x: curX,
                        y: curY,
                        scale: curScale * 0.82,
                        rotation: curRot,
                        opacity: 0.55,
                    });
                    // Maksimum 3 iz sakla ve eskit
                    while (trails.length > 3) trails.pop();
                    trails.forEach((tr, tIdx) => {
                        tr.opacity = (1 - (tIdx + 1) * 0.28) * curOpacity;
                        tr.scale *= 0.92;
                    });
                } else {
                    trails.length = 0;
                }

                entityStatesRef.current[idx] = {
                    x: curX,
                    y: curY,
                    scale: curScale,
                    rotation: curRot,
                    opacity: curOpacity,
                    trails,
                };
            });

            // ── SÜPERNOVA VE ŞOK DALGASI (Phase 3) ──────────────────────────
            if (isPhase3) {
                const p3 = (progress - 0.82) / 0.18;
                const burstScale = p3 < 0.35 ? p3 * 8.5 : 3.0 + (p3 - 0.35) * 1.5;
                const burstOpacity = p3 < 0.35 ? 1 : Math.max(0, 1 - Math.pow((p3 - 0.35) / 0.65, 1.8));

                burstStateRef.current = {
                    active: true,
                    scale: burstScale,
                    opacity: burstOpacity,
                    shockwaveRadius: Math.pow(p3, 0.7) * Math.min(boardWidth, boardHeight) * 0.7,
                    shockwaveOpacity: Math.max(0, (1 - p3) * 0.85),
                };
            }

            // ── PARÇACIK GÜNCELLEMELERİ ─────────────────────────────────────
            particlesRef.current.forEach(pt => {
                if (progress > 0.1) {
                    pt.x += pt.vx;
                    pt.y += pt.vy;
                    pt.rotation += pt.rotSpeed;
                    
                    if (progress < 0.7) {
                        pt.opacity = Math.min(0.9, pt.opacity + 0.08);
                    } else {
                        const fade = (progress - 0.7) / 0.3;
                        pt.opacity = Math.max(0, 0.9 * (1 - fade));
                    }
                }
            });

            // Animasyon tamamlandığında durumu temizce sonlandır ve tekrar oynatmayı durdur
            if (progress >= 1) {
                isCompletedRef.current = true;
                entityStatesRef.current.forEach(st => {
                    st.opacity = 0;
                    st.scale = 0;
                    st.trails = [];
                });
                burstStateRef.current = {
                    active: false,
                    scale: 0,
                    opacity: 0,
                    shockwaveRadius: 0,
                    shockwaveOpacity: 0,
                };
                particlesRef.current.forEach(pt => {
                    pt.opacity = 0;
                });
                // Tüm animasyon boyunca tek React güncellemesi: bileşenin
                // `null` dönüp DOM'dan çıkması için.
                setTick(t => t + 1);
                return;
            }

            commit();
            animId = requestAnimationFrame(animate);
        };

        animId = requestAnimationFrame(animate);
        return () => {
            isCancelled = true;
            cancelAnimationFrame(animId);
        };
    }, [durationMs, playerConfigs, cx, cy, N, boardWidth, boardHeight]);

    // Animasyon tamamlandıktan sonra boş render et — arka planda gereksiz DOM ve döngü kalmasın
    if (isCompletedRef.current) {
        return null;
    }

    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                width: boardWidth,
                height: boardHeight,
                pointerEvents: 'none',
                zIndex: 150,
                overflow: 'visible',
            }}
        >
            {/* 1. Canlı Zafer Sinematik Vignette & Arka Plan Parıltısı */}
            <div
                style={{
                    position: 'absolute',
                    inset: -40,
                    background: 'radial-gradient(circle at center, rgba(0, 255, 136, 0.12) 0%, rgba(3, 7, 18, 0.45) 75%)',
                    borderRadius: 24,
                    transition: 'opacity 0.4s ease',
                }}
            />

            {/* 2. Uçuşan Zafer Konfetileri ve Yıldız Parçacıkları */}
            {/* Ağaç sabittir; konum/opaklık her karede `commit()` ile yazılır. */}
            <svg
                width={boardWidth}
                height={boardHeight}
                style={{
                    position: 'absolute',
                    inset: 0,
                    overflow: 'visible',
                }}
            >
                {particlesRef.current.map((p, i) => (
                    <g
                        key={p.id}
                        ref={el => { particleRefs.current[i] = el; }}
                        transform={`translate(${p.x}, ${p.y}) rotate(${p.rotation})`}
                        opacity={0}
                        style={{ display: 'none' }}
                    >
                        {p.shape === 'star' ? (
                            <path
                                d="M0,-8 L2,-2 L8,-2 L3,2 L5,8 L0,4 L-5,8 L-3,2 L-8,-2 L-2,-2 Z"
                                fill={p.color}
                                style={{ filter: `drop-shadow(0 0 6px ${p.color})` }}
                                transform={`scale(${p.size / 10})`}
                            />
                        ) : p.shape === 'sparkle' ? (
                            <path
                                d="M0,-10 Q1,-2 10,0 Q1,2 0,10 Q-1,2 -10,0 Q-1,-2 0,-10 Z"
                                fill={p.color}
                                style={{ filter: `drop-shadow(0 0 8px ${p.color})` }}
                                transform={`scale(${p.size / 10})`}
                            />
                        ) : (
                            <circle
                                r={p.size / 2}
                                fill={p.color}
                                style={{ filter: `drop-shadow(0 0 4px ${p.color})` }}
                            />
                        )}
                    </g>
                ))}

                {/* Süpernova Şok Dalgası Halkaları */}
                <circle
                    ref={shockOuterRef}
                    cx={cx}
                    cy={cy}
                    r={0}
                    fill="none"
                    stroke="#00ff88"
                    strokeWidth={3}
                    opacity={0}
                    style={{ display: 'none', filter: 'drop-shadow(0 0 12px #00ff88)' }}
                />
                <circle
                    ref={shockInnerRef}
                    cx={cx}
                    cy={cy}
                    r={0}
                    fill="none"
                    stroke="#ffd700"
                    strokeWidth={2}
                    opacity={0}
                    style={{ display: 'none', filter: 'drop-shadow(0 0 8px #ffd700)' }}
                />
            </svg>

            {/* 3. Uçan ve Dans Eden Oyuncular + Renkli Hareket İzleri */}
            {playerConfigs.map((cfg, idx) => {
                const { primary, glow } = cfg.colorSchema;

                return (
                    <React.Fragment key={cfg.entity.id}>
                        {/* Ghost Motion Trails — sabit sayıda yuva, kullanılmayan gizli */}
                        {Array.from({ length: TRAIL_SLOTS }, (_, tIdx) => (
                            <div
                                key={tIdx}
                                ref={el => {
                                    const slots = trailRefs.current[idx] ?? (trailRefs.current[idx] = []);
                                    slots[tIdx] = el;
                                }}
                                style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    width: 64,
                                    height: 64,
                                    display: 'none',
                                    opacity: 0,
                                    willChange: 'transform, opacity',
                                    filter: `blur(${tIdx + 1.5}px) drop-shadow(0 0 10px ${primary})`,
                                    pointerEvents: 'none',
                                }}
                            >
                                <PlayerGraphic entity={cfg.entity} />
                            </div>
                        ))}

                        {/* Ana Dans Eden Oyuncu */}
                        <div
                            ref={el => { playerRefs.current[idx] = el; }}
                            style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                width: 64,
                                height: 64,
                                transform: `translate3d(${cfg.startX - 32}px, ${cfg.startY - 32}px, 0)`,
                                opacity: 1,
                                willChange: 'transform, opacity',
                                filter: `drop-shadow(0 0 16px ${primary}) drop-shadow(0 0 30px ${glow})`,
                                transition: 'none',
                                zIndex: 160 + idx,
                                pointerEvents: 'none',
                            }}
                        >
                            <PlayerGraphic entity={cfg.entity} />
                        </div>
                    </React.Fragment>
                );
            })}

            {/* 4. Merkezde Süpernova Yıldız Patlaması (Vortex Burst) */}
            <div
                ref={burstRef}
                style={{
                    position: 'absolute',
                    left: cx - 48,
                    top: cy - 48,
                    width: 96,
                    height: 96,
                    display: 'none',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    willChange: 'transform, opacity',
                    pointerEvents: 'none',
                    zIndex: 200,
                }}
            >
                {/* Parlayan Dev 8 Köşeli Altın/Yeşil Zafer Yıldızı */}
                <svg width={96} height={96} viewBox="-48 -48 96 96">
                    <defs>
                        <radialGradient id="supernovaGrad" cx="0%" cy="0%" r="50%">
                            <stop offset="0%" stopColor="#ffffff" />
                            <stop offset="45%" stopColor="#ffd700" />
                            <stop offset="80%" stopColor="#00ff88" />
                            <stop offset="100%" stopColor="rgba(0,255,136,0)" />
                        </radialGradient>
                    </defs>
                    {/* 8 Köşeli Süpernova Işınları */}
                    <path
                        d="M0,-46 L6,-12 L46,0 L6,12 L0,46 L-6,12 L-46,0 L-6,-12 Z"
                        fill="url(#supernovaGrad)"
                        style={{ filter: 'drop-shadow(0 0 24px #ffd700) drop-shadow(0 0 45px #00ff88)' }}
                    />
                    {/* Çapraz Küçük Işınlar */}
                    <path
                        d="M0,-30 L4,-8 L30,0 L4,8 L0,30 L-4,8 L-30,0 L-4,-8 Z"
                        fill="#ffffff"
                        transform="rotate(45)"
                        style={{ filter: 'drop-shadow(0 0 14px #ffffff)' }}
                    />
                    <circle r={14} fill="#ffffff" style={{ filter: 'drop-shadow(0 0 10px #ffffff)' }} />
                </svg>
            </div>
        </div>
    );
};
