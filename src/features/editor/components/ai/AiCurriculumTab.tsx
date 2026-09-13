'use client';

import { NBtn, Lbl, iStyle } from '../EditorUI';
import { AVAILABLE_MECHANICS } from '../../lib/aiAssistant';
import type { CurriculumLevel } from '../../lib/aiCurriculum';
import type { AiCurriculumEditorApi } from '../../hooks/useAiCurriculumEditor';
import { GameIcon } from '@/components/icons';

/** Tab 2: curriculum level list (left) + edit form (right). */
export default function AiCurriculumTab({ c }: { c: AiCurriculumEditorApi }) {
  const {
    curriculum, currEditId, setCurrEditId, currForm, setCurrForm,
    handleSaveCurriculumLevel, handleDeleteCurriculumLevel, handleToggleMechanic, handleResetDefaults,
  } = c;

  return (
    <div style={{ display: 'flex', gap: 20, flex: 1, overflow: 'hidden' }}>
      {/* Left sidebar: level list */}
      <div style={{ width: 220, borderRight: '1px solid rgba(30,58,95,0.3)', paddingRight: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Lbl style={{ margin: 0 }}>Müfredat Seviyeleri</Lbl>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, background: '#02050c', padding: 6, borderRadius: 8, border: '1px solid rgba(30,58,95,0.3)' }}>
          <button onClick={() => setCurrEditId('new')} style={{ padding: '6px 8px', fontSize: 11, fontWeight: 700, color: '#00ff88', background: currEditId === 'new' ? 'rgba(0,255,136,0.1)' : 'transparent', border: `1px solid ${currEditId === 'new' ? '#00ff88' : 'transparent'}`, borderRadius: 6, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6 }}>
            <GameIcon name="plus" size={11} /> Yeni Seviye Ekle
          </button>
          {curriculum.map(lvl => (
            <div key={lvl.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1px 0' }}>
              <button onClick={() => setCurrEditId(lvl.id)} style={{ flex: 1, padding: '5px 8px', fontSize: 10, color: currEditId === lvl.id ? '#00c4ff' : '#94a3b8', background: currEditId === lvl.id ? 'rgba(0,196,255,0.08)' : 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Lvl {lvl.id}: {lvl.name}
              </button>
              <button onClick={() => handleDeleteCurriculumLevel(lvl.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11, padding: '0 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GameIcon name="close" size={10} />
              </button>
            </div>
          ))}
        </div>
        <NBtn onClick={handleResetDefaults} color="#ef4444" active style={{ padding: '6px 0', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <GameIcon name="warning" size={12} /> Tüm Ayarları Sıfırla
        </NBtn>
      </div>

      {/* Right area: level edit form */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0, color: '#00ff88', fontSize: 13 }}>
            {currEditId === 'new' ? 'Yeni Seviye Ekleme Formu' : `Level ${currEditId} Düzenleme Formu`}
          </h4>
          <NBtn onClick={handleSaveCurriculumLevel} color="#00ff88" active style={{ padding: '5px 16px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <GameIcon name="save" size={12} /> Seviyeyi Müfredata Kaydet
          </NBtn>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ width: 80 }}>
            <Lbl>Seviye ID</Lbl>
            <input type="number" value={currForm.id || ''} onChange={(e) => setCurrForm({ ...currForm, id: Number(e.target.value) })} style={{ ...iStyle, width: '100%' }} disabled={currEditId !== 'new'} />
          </div>
          <div style={{ width: 80 }}>
            <Lbl>Part (Bölüm)</Lbl>
            <input type="number" value={currForm.part || ''} onChange={(e) => setCurrForm({ ...currForm, part: Number(e.target.value) })} style={{ ...iStyle, width: '100%' }} />
          </div>
          <div style={{ flex: 1 }}>
            <Lbl>Seviye Adı</Lbl>
            <input value={currForm.name || ''} onChange={(e) => setCurrForm({ ...currForm, name: e.target.value })} style={{ ...iStyle, width: '100%' }} />
          </div>
          <div style={{ width: 90 }}>
            <Lbl>Zorluk (1-4)</Lbl>
            <select value={currForm.difficulty || 2} onChange={(e) => setCurrForm({ ...currForm, difficulty: Number(e.target.value) as CurriculumLevel['difficulty'] })} style={{ ...iStyle, width: '100%', padding: '5px' }}>
              <option value={1}>1: Kolay</option>
              <option value={2}>2: Orta</option>
              <option value={3}>3: Zor</option>
              <option value={4}>4: Çok Zor</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Lbl>Minimum Hedef Hamle</Lbl>
            <input type="number" value={currForm.targetMovesMin || ''} onChange={(e) => setCurrForm({ ...currForm, targetMovesMin: Number(e.target.value) })} style={{ ...iStyle, width: '100%' }} />
          </div>
          <div style={{ flex: 1 }}>
            <Lbl>Maksimum Hedef Hamle</Lbl>
            <input type="number" value={currForm.targetMovesMax || ''} onChange={(e) => setCurrForm({ ...currForm, targetMovesMax: Number(e.target.value) })} style={{ ...iStyle, width: '100%' }} />
          </div>
        </div>

        <div>
          <Lbl>Seviyede Kullanılan Mekanikler</Lbl>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 8px', background: '#02050c', border: '1px solid rgba(30,58,95,0.3)', borderRadius: 8, padding: 10 }}>
            {AVAILABLE_MECHANICS.map(mech => {
              const isChecked = currForm.mechanics?.includes(mech) ?? false;
              return (
                <label key={mech} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, cursor: 'pointer', color: isChecked ? '#00c4ff' : '#475569' }}>
                  <input type="checkbox" checked={isChecked} onChange={() => handleToggleMechanic(mech)} style={{ accentColor: '#00c4ff' }} />
                  {mech}
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <Lbl>Seviye Açıklaması (Oyuncuya/AI&apos;a Mesaj)</Lbl>
          <textarea value={currForm.description || ''} onChange={(e) => setCurrForm({ ...currForm, description: e.target.value })} style={{ ...iStyle, width: '100%', height: 45, fontFamily: 'inherit', resize: 'vertical' }} />
        </div>

        <div>
          <Lbl>AI İçin Özel Tasarım Talimatları (Örn: Duvar geometrisi, başlangıç yerleri)</Lbl>
          <textarea value={currForm.designInstructions || ''} onChange={(e) => setCurrForm({ ...currForm, designInstructions: e.target.value })} style={{ ...iStyle, width: '100%', height: 60, fontFamily: 'inherit', resize: 'vertical' }} />
        </div>
      </div>
    </div>
  );
}
