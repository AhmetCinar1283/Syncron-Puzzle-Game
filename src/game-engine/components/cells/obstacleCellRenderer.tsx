import { Cell } from '../../logic/cellTypes';
import { useGameTheme } from '../../contexts/GameThemeContext';

export const ObstacleCellRenderer = ({ cell: _cell }: { cell: Cell }) => {
    const { theme } = useGameTheme();

    // 1. Classic Retro (Tactile Navy / Steel 3D beveled block)
    if (theme === 'legacy') {
        return (
            <div style={{
                width: 64, height: 64,
                background: '#162338',
                border: '2px solid #293f61',
                boxShadow: 'inset 2px 2px 0 rgba(147, 197, 253, 0.25), inset -2px -2px 0 #070d17',
                boxSizing: 'border-box',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <div style={{
                    width: 44, height: 44,
                    background: '#1f3350',
                    border: '1px solid #142236',
                    boxShadow: 'inset 2px 2px 0 rgba(147, 197, 253, 0.2), inset -2px -2px 0 #0d1624',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <div style={{
                        width: 24, height: 24,
                        border: '1px solid rgba(147, 197, 253, 0.15)',
                    }} />
                </div>
            </div>
        );
    }

    // 2. Retro Arcade (Iconic 8-bit stepped pixel 3D beveled brick)
    if (theme === 'arcade') {
        return (
            <div style={{
                width: 64, height: 64,
                background: '#18181b',
                border: '2px solid #52525b',
                boxShadow: 'inset 2px 2px 0 #71717a, inset -2px -2px 0 #09090b',
                boxSizing: 'border-box',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <div style={{
                    width: 44, height: 44,
                    background: '#27272a',
                    border: '2px solid #3f3f46',
                    boxShadow: 'inset 2px 2px 0 #52525b, inset -2px -2px 0 #18181b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <div style={{
                        width: 16, height: 16,
                        background: '#18181b',
                        boxShadow: 'inset 1px 1px 0 #000, 1px 1px 0 #52525b',
                    }} />
                </div>
            </div>
        );
    }

    // 3. Neon Cyber (Dark Cybernetic 3D beveled block with neon edge)
    if (theme === 'neon') {
        return (
            <div style={{
                width: 64, height: 64,
                background: '#091322',
                border: '2px solid rgba(0, 255, 136, 0.4)',
                boxShadow: 'inset 2px 2px 0 rgba(0, 255, 136, 0.4), inset -2px -2px 0 #02060e, 0 0 10px rgba(0, 255, 136, 0.15)',
                boxSizing: 'border-box',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '4px',
            }}>
                <div style={{
                    width: 44, height: 44,
                    background: '#0e1d33',
                    border: '1.5px solid rgba(0, 255, 136, 0.3)',
                    boxShadow: 'inset 2px 2px 0 rgba(0, 255, 136, 0.35), inset -2px -2px 0 #050b14',
                    borderRadius: '2px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <div style={{
                        width: 22, height: 22,
                        border: '1px solid rgba(0, 255, 136, 0.35)',
                        boxShadow: 'inset 0 0 6px rgba(0, 255, 136, 0.15)',
                    }} />
                </div>
            </div>
        );
    }

    // 4. Blueprint Draft (Technical CAD 3D beveled drafting block)
    if (theme === 'blueprint') {
        return (
            <div style={{
                width: 64, height: 64,
                background: '#0a2346',
                border: '2px solid #38bdf8',
                boxShadow: 'inset 2px 2px 0 rgba(125, 211, 252, 0.5), inset -2px -2px 0 #030d1a',
                boxSizing: 'border-box',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '2px',
            }}>
                <div style={{
                    width: 44, height: 44,
                    background: '#0f3261',
                    border: '1.5px solid #0284c7',
                    boxShadow: 'inset 2px 2px 0 rgba(56, 189, 248, 0.5), inset -2px -2px 0 #061933',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                }}>
                    {/* CAD cross */}
                    <div style={{ position: 'absolute', top: 21, left: 12, right: 12, height: 1.5, background: 'rgba(125, 211, 252, 0.6)' }} />
                    <div style={{ position: 'absolute', left: 21, top: 12, bottom: 12, width: 1.5, background: 'rgba(125, 211, 252, 0.6)' }} />
                </div>
            </div>
        );
    }

    // 5. Cosmic Void (Obsidian Monolith 3D beveled stone block)
    return (
        <div style={{
            width: 64, height: 64,
            background: '#0d071b',
            border: '2px solid rgba(167, 139, 250, 0.45)',
            boxShadow: 'inset 2px 2px 0 rgba(196, 181, 253, 0.35), inset -2px -2px 0 #04010a',
            boxSizing: 'border-box',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '4px',
        }}>
            <div style={{
                width: 44, height: 44,
                background: '#160b2b',
                border: '1.5px solid rgba(139, 92, 246, 0.35)',
                boxShadow: 'inset 2px 2px 0 rgba(167, 139, 250, 0.4), inset -2px -2px 0 #070310',
                borderRadius: '2px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <div style={{
                    width: 22, height: 22,
                    background: 'radial-gradient(circle, #241144 0%, #120624 100%)',
                    border: '1px solid rgba(196, 181, 253, 0.2)',
                }} />
            </div>
        </div>
    );
};
