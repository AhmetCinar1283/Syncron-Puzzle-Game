// components/entities/PlayerGraphic.tsx
// High-legibility, theme-adaptive humanoid player entity renderer for Syncron

import { Entity } from '../../logic/entityTypes';
import { getPlayerColor } from '../playerColors';
import { useGameTheme } from '../../contexts/GameThemeContext';
import { GameIcon } from '@/components/icons';

export const PlayerGraphic = ({ entity }: { entity: Entity }) => {
    const { themeConfig } = useGameTheme();
    const playerIndex = (entity.customData.playerIndex as number) ?? 0;
    const mode = (entity.customData.mode as 'normal' | 'reversed') ?? 'normal';
    const isReversed = mode === 'reversed';
    const isLocked = Boolean(entity.customData.isLocked);
    
    const { primary, glow } = getPlayerColor(playerIndex);
    const styleType = themeConfig.player.styleType;

    // High contrast dark tones for classic retro player indices
    const textColors = ['#003320', '#002233', '#1a0033', '#3a1000', '#330018', '#332500'];
    const classicTextColor = textColors[playerIndex % textColors.length] ?? '#002233';

    // 1. CLASSIC RETRO (High contrast friendly character face & monospace arrow mouth)
    if (styleType === 'classic_arrow') {
        const bg = primary;
        return (
            <div style={{
                width: 64, height: 64,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
            }}>
                <div style={{
                    width: 46, height: 46,
                    borderRadius: '50%',
                    backgroundColor: bg,
                    boxShadow: `0 0 12px ${bg}, 0 0 24px ${glow}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    cursor: 'default', userSelect: 'none',
                }}>
                    {isLocked ? (
                        <GameIcon name="lock" size={20} color={classicTextColor} />
                    ) : (
                        <>
                            {/* Round Character Eyes with Blink */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                marginBottom: 2.5,
                                animation: 'playerBlink 4s infinite',
                                transformOrigin: 'center',
                            }}>
                                <div style={{
                                    width: 5,
                                    height: 5,
                                    borderRadius: '50%',
                                    backgroundColor: classicTextColor,
                                }} />
                                <div style={{
                                    width: 5,
                                    height: 5,
                                    borderRadius: '50%',
                                    backgroundColor: classicTextColor,
                                }} />
                            </div>
                            {/* Expressive Monospace Mouth */}
                            <span style={{
                                fontSize: 15,
                                lineHeight: 1,
                                color: classicTextColor,
                                fontWeight: '900',
                                fontFamily: 'monospace',
                            }}>
                                {isReversed ? '▼' : '▲'}
                            </span>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // 2. RETRO ARCADE 8-BIT (Chunky pixel robot face & crisp pixel arrow mouth - Golden Benchmark)
    if (styleType === 'arcade_sprite') {
        return (
            <div style={{
                width: 64, height: 64,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
            }}>
                <div style={{
                    width: 44, height: 44,
                    backgroundColor: primary,
                    boxShadow: '0 0 0 2px #000, inset 3px 3px 0 rgba(255,255,255,0.8), inset -3px -3px 0 rgba(0,0,0,0.8)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    cursor: 'default', userSelect: 'none',
                }}>
                    {isLocked ? (
                        <GameIcon name="lock" size={20} color="#000000" />
                    ) : (
                        <>
                            {/* 8-bit Robot Face Eyes with Blink */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                marginBottom: 2,
                                animation: 'playerBlink 4s infinite',
                                transformOrigin: 'center',
                            }}>
                                <div style={{ width: 4, height: 4, background: '#000000' }} />
                                <div style={{ width: 4, height: 4, background: '#000000' }} />
                            </div>
                            {/* 8-bit Pixel Mouth */}
                            <span style={{
                                fontSize: 15,
                                lineHeight: 1,
                                color: '#000000',
                                fontWeight: '900',
                                fontFamily: 'monospace',
                            }}>
                                {isReversed ? '▼' : '▲'}
                            </span>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // 3. NEON CYBER (Futuristic cyber droid with crisp glowing optics & monospace mouth)
    if (styleType === 'neon_crosshair') {
        return (
            <div style={{
                width: 64, height: 64,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
            }}>
                {/* Thin animated cyber outer ring */}
                <div style={{
                    position: 'absolute',
                    width: 52, height: 52,
                    borderRadius: '50%',
                    border: `1px dashed ${primary}`,
                    opacity: isReversed ? 0.9 : 0.45,
                    animation: isReversed ? 'playerPulse 1.3s infinite linear' : undefined,
                }} />
                
                {/* Core Player Token */}
                <div style={{
                    width: 44, height: 44,
                    borderRadius: '50%',
                    background: 'rgba(8, 16, 28, 0.95)',
                    border: `2px solid ${primary}`,
                    boxShadow: `0 0 10px ${primary}, inset 0 0 8px ${glow}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    cursor: 'default', userSelect: 'none',
                    zIndex: 2,
                }}>
                    {isLocked ? (
                        <GameIcon name="lock" size={20} color="#cbd5e1" />
                    ) : (
                        <>
                            {/* Cyber Droid Glowing Eyes */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                marginBottom: 2.5,
                                animation: 'playerBlink 4.2s infinite',
                                transformOrigin: 'center',
                            }}>
                                <div style={{
                                    width: 5,
                                    height: 5,
                                    borderRadius: '50%',
                                    backgroundColor: '#ffffff',
                                    boxShadow: `0 0 4px ${primary}`,
                                }} />
                                <div style={{
                                    width: 5,
                                    height: 5,
                                    borderRadius: '50%',
                                    backgroundColor: '#ffffff',
                                    boxShadow: `0 0 4px ${primary}`,
                                }} />
                            </div>
                            {/* Glowing Neon Monospace Mouth */}
                            <span style={{
                                fontSize: 15,
                                lineHeight: 1,
                                color: '#ffffff',
                                fontFamily: 'monospace',
                                textShadow: `0 0 6px ${primary}`,
                                fontWeight: '900',
                            }}>
                                {isReversed ? '▼' : '▲'}
                            </span>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // 4. BLUEPRINT DRAFT (CAD drafting coordinate points & technical monospace mouth)
    if (styleType === 'blueprint_reticle') {
        return (
            <div style={{
                width: 64, height: 64,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
            }}>
                {/* Drafting corner ticks in player color */}
                <svg width={52} height={52} viewBox="0 0 52 52" style={{ position: 'absolute', pointerEvents: 'none' }}>
                    <path d="M2 10V2h8M42 2h8v8M50 42v8h-8M10 50H2v-8" stroke={primary} strokeWidth="2" fill="none" opacity="0.8" />
                </svg>

                {/* Core Token */}
                <div style={{
                    width: 44, height: 44,
                    borderRadius: '50%',
                    background: '#07182e',
                    border: `2.5px solid ${primary}`,
                    boxShadow: `0 0 12px ${primary}, inset 0 0 8px ${glow}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    cursor: 'default', userSelect: 'none',
                    zIndex: 2,
                }}>
                    {isLocked ? (
                        <GameIcon name="lock" size={20} color="#cbd5e1" />
                    ) : (
                        <>
                            {/* Blueprint Drafting Points */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                marginBottom: 2.5,
                                animation: 'playerBlink 4.4s infinite',
                                transformOrigin: 'center',
                            }}>
                                <div style={{
                                    width: 4.5,
                                    height: 4.5,
                                    borderRadius: '50%',
                                    backgroundColor: primary,
                                    boxShadow: `0 0 3px ${primary}`,
                                }} />
                                <div style={{
                                    width: 4.5,
                                    height: 4.5,
                                    borderRadius: '50%',
                                    backgroundColor: primary,
                                    boxShadow: `0 0 3px ${primary}`,
                                }} />
                            </div>
                            {/* Technical Drafting Monospace Mouth */}
                            <span style={{
                                fontSize: 15,
                                lineHeight: 1,
                                color: '#ffffff',
                                fontWeight: '900',
                                fontFamily: 'monospace',
                            }}>
                                {isReversed ? '▼' : '▲'}
                            </span>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // 5. COSMIC VOID (Deep obsidian space orb with celestial starlight eyes & mouth)
    return (
        <div style={{
            width: 64, height: 64,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
        }}>
            {/* Soft celestial orbit ring in player color */}
            <svg width={52} height={52} viewBox="0 0 52 52" style={{ position: 'absolute', pointerEvents: 'none' }}>
                <circle cx="26" cy="26" r="23" stroke={primary} strokeWidth="1.2" strokeDasharray="4 4" fill="none" opacity="0.65" />
                <circle cx="47" cy="21" r="2" fill={primary} style={{ filter: `drop-shadow(0 0 4px ${primary})` }} />
            </svg>

            {/* Core Obsidian Orb */}
            <div style={{
                width: 44, height: 44,
                borderRadius: '50%',
                background: 'radial-gradient(circle, #1a0f30 0%, #080412 100%)',
                border: `2.5px solid ${primary}`,
                boxShadow: `0 0 14px ${primary}, inset 0 0 8px ${glow}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'default', userSelect: 'none',
                zIndex: 2,
            }}>
                {isLocked ? (
                    <GameIcon name="lock" size={20} color="#cbd5e1" />
                ) : (
                    <>
                        {/* Celestial Starlight Eyes */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            marginBottom: 2.5,
                            animation: 'playerBlink 4.6s infinite',
                            transformOrigin: 'center',
                        }}>
                            <div style={{
                                width: 5,
                                height: 5,
                                borderRadius: '50%',
                                backgroundColor: '#ffffff',
                                boxShadow: `0 0 4px #ffffff, 0 0 8px ${primary}`,
                            }} />
                            <div style={{
                                width: 5,
                                height: 5,
                                borderRadius: '50%',
                                backgroundColor: '#ffffff',
                                boxShadow: `0 0 4px #ffffff, 0 0 8px ${primary}`,
                            }} />
                        </div>
                        {/* Astral Starlight Monospace Mouth */}
                        <span style={{
                            fontSize: 15,
                            lineHeight: 1,
                            color: '#ffffff',
                            fontWeight: '900',
                            fontFamily: 'monospace',
                            textShadow: `0 0 6px ${primary}`,
                        }}>
                            {isReversed ? '▼' : '▲'}
                        </span>
                    </>
                )}
            </div>
        </div>
    );
};
