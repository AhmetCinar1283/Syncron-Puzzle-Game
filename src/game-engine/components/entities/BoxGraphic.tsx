// components/entities/BoxGraphic.tsx
// High-legibility, tactile physical crate renderer with classic ▣ icon for all themes

import { Entity } from '../../logic/entityTypes';
import { getPlayerColor } from '../playerColors';
import { useGameTheme } from '../../contexts/GameThemeContext';
import { GameIcon } from '@/components/icons';

export const BoxGraphic = ({ entity }: { entity: Entity }) => {
    const { theme } = useGameTheme();
    
    // requiresPower: customData'da varsa ve isPowered değilse soluk göster
    const requiresPower = (entity.customData.requiresPower as boolean) ?? false;
    const isPowered = entity.isElectrified;
    const dimmed = requiresPower && !isPowered;

    const durabilityEnabled = (entity.customData.durabilityEnabled as boolean) ?? false;
    const durability = (entity.customData.durability as number) ?? 3;

    const colorFilterEnabled = (entity.customData.colorFilterEnabled as boolean) ?? false;
    const colorFilterIndex = (entity.customData.colorFilterIndex as number) ?? 0;

    // Renkleri dinamik olarak belirle
    let hex = '#f97316';
    let rgb = '249,115,22';
    if (colorFilterEnabled) {
        const colorSchema = getPlayerColor(colorFilterIndex);
        hex = colorSchema.hex;
        rgb = colorSchema.rgb;
    }

    // Common overlay badges for durability, power, and color filter
    const renderBadges = () => (
        <>
            {requiresPower && (
                <span
                    style={{
                        position: 'absolute',
                        top: 3,
                        right: 3,
                        lineHeight: 1,
                        color: isPowered ? '#fbbf24' : '#64748b',
                        filter: isPowered ? 'drop-shadow(0 0 6px rgba(251,191,36,0.9))' : 'none',
                        userSelect: 'none',
                        zIndex: 5,
                        display: 'inline-flex',
                    }}
                >
                    <GameIcon name="lightning" size={12} color={isPowered ? '#fbbf24' : '#64748b'} />
                </span>
            )}
            {durabilityEnabled && (
                <span
                    style={{
                        position: 'absolute',
                        bottom: 2,
                        right: 4,
                        fontSize: 12,
                        lineHeight: 1,
                        color: dimmed ? '#64748b' : hex,
                        fontWeight: '900',
                        fontFamily: 'monospace',
                        userSelect: 'none',
                        textShadow: '0 0 4px rgba(0,0,0,0.9)',
                        zIndex: 5,
                    }}
                >
                    {durability}
                </span>
            )}
            {colorFilterEnabled && (
                <div
                    style={{
                        position: 'absolute',
                        top: 3,
                        left: 3,
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        backgroundColor: hex,
                        boxShadow: `0 0 5px ${hex}`,
                        zIndex: 5,
                    }}
                />
            )}
        </>
    );

    // Dynamic background and styling per theme while preserving physical crate bevels & classic ▣ icon
    let boxBg = dimmed ? 'rgba(26, 36, 50, 0.9)' : 'rgba(15, 23, 35, 0.95)';
    let borderRadius = 6;

    if (theme === 'arcade') {
        boxBg = dimmed ? '#18181b' : '#27272a';
        borderRadius = 0;
    } else if (theme === 'neon') {
        boxBg = dimmed ? 'rgba(8, 16, 28, 0.9)' : 'rgba(10, 22, 38, 0.95)';
        borderRadius = 4;
    } else if (theme === 'blueprint') {
        boxBg = dimmed ? '#071526' : '#0c274c';
        borderRadius = 2;
    } else if (theme === 'cosmic') {
        boxBg = dimmed ? '#0a0516' : '#140924';
        borderRadius = 6;
    }

    const borderColor = dimmed ? '#475569' : isPowered ? '#fbbf24' : hex;
    const shadowGlow = dimmed 
        ? 'inset 2px 2px 0 rgba(255,255,255,0.08), inset -2px -2px 0 #000' 
        : `inset 2px 2px 0 rgba(255,255,255,0.22), inset -2px -2px 0 #000, 0 0 10px rgba(${rgb}, 0.4), 0 3px 6px rgba(0,0,0,0.5)`;

    return (
        <div style={{
            width: 64, height: 64,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
        }}>
            {/* Physical 3D Crate Body */}
            <div style={{
                width: 52, height: 52,
                borderRadius,
                background: boxBg,
                border: `2px solid ${borderColor}`,
                boxShadow: shadowGlow,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                userSelect: 'none', position: 'relative',
            }}>
                {/* Classic Iconic ▣ Center Symbol */}
                <span style={{
                    fontSize: 18, lineHeight: 1,
                    color: dimmed ? '#475569' : hex,
                    textShadow: dimmed ? 'none' : `0 0 8px rgba(${rgb}, 0.85)`,
                    fontWeight: '900', userSelect: 'none',
                }}>
                    ▣
                </span>

                {renderBadges()}
            </div>
        </div>
    );
};