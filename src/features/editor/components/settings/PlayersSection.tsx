'use client';

import { useEditorContext } from '../../EditorContext';
import { useT } from '@/contexts/LanguageContext';
import { getPlayerColor } from '@/game-engine/components/playerColors';
import { SectionHeading } from './settingsShared';
import { GameIcon } from '@/components/icons';

/** Per-player cards: position (clear), movement mode, lock-on-target. */
export default function PlayersSection() {
  const { objects, setObjects } = useEditorContext();
  const t = useT();

  return (
    <div>
      <SectionHeading color="#00ff88">Players</SectionHeading>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {objects.map((obj) => {
          const { hex: color } = getPlayerColor(obj.id - 1);
          return (
            <div key={obj.id} style={{
              flexShrink: 0,
              padding: '8px 10px', minWidth: 140,
              background: 'rgba(0,255,136,0.04)',
              border: `1px solid rgba(0,255,136,0.2)`,
              borderRadius: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: color, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <GameIcon name="user" size={12} color={color} /> Player {obj.id}
                </span>
              </div>
              <div style={{ fontSize: 10, color: obj.row !== null ? color : '#334155', marginBottom: 6, display: 'flex', alignItems: 'center' }}>
                {obj.row !== null ? `${obj.roomId ?? 'main'} (${obj.row}, ${obj.col})` : t('editor.not_placed')}
                {obj.row !== null && (
                  <button
                    onClick={() => setObjects((os) => os.map((o) => o.id === obj.id ? { ...o, row: null, col: null } : o))}
                    style={{ marginLeft: 4, fontSize: 9, background: 'none', border: 'none', color: '#334155', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                  ><GameIcon name="close" size={9} /></button>
                )}
              </div>

              {/* Mode selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 6 }}>
                <span style={{ fontSize: 8, color: '#64748b', fontWeight: 'bold' }}>Mode:</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['normal', 'reversed'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setObjects((os) => os.map((o) => o.id === obj.id ? { ...o, mode: m } : o))}
                      style={{
                        flex: 1, padding: '3px 4px', fontSize: 8, fontWeight: 700,
                        background: obj.mode === m ? `${color}20` : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${obj.mode === m ? color : 'rgba(255,255,255,0.1)'}`,
                        color: obj.mode === m ? color : '#64748b',
                        borderRadius: 4, cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {m === 'normal' ? 'Normal' : 'Reversed'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lock on target */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                <input
                  type="checkbox" checked={obj.lockOnTarget}
                  onChange={(e) => setObjects((os) => os.map((o) => o.id === obj.id ? { ...o, lockOnTarget: e.target.checked } : o))}
                  style={{ accentColor: color, width: 11, height: 11 }}
                />
                <span style={{ fontSize: 9, color: obj.lockOnTarget ? color : '#475569' }}>Lock on Target</span>
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
