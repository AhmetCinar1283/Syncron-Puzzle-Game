'use client';

import { NBtn, Lbl, iStyle } from '../EditorUI';
import type { AiTemplateEditorApi } from '../../hooks/useAiTemplateEditor';

const VAR_STYLE = { color: '#00c4ff' };

/** Tab 3: prompt template list (left) + editor with placeholder guide (right). */
export default function AiTemplatesTab({ t: api }: { t: AiTemplateEditorApi }) {
  const {
    templates, tempEditId, setTempEditId, tempName, setTempName, tempType, setTempType, tempText, setTempText,
    handleSaveTemplate, handleNewTemplateClick, handleDeleteTemplate,
  } = api;

  return (
    <div style={{ display: 'flex', gap: 20, flex: 1, overflow: 'hidden' }}>
      {/* Template selector & CRUD buttons */}
      <div style={{ width: 220, borderRight: '1px solid rgba(30,58,95,0.3)', paddingRight: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Lbl style={{ margin: 0 }}>Prompt Şablonları</Lbl>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, background: '#02050c', padding: 6, borderRadius: 8, border: '1px solid rgba(30,58,95,0.3)' }}>
          <button onClick={handleNewTemplateClick} style={{ padding: '6px 8px', fontSize: 11, fontWeight: 700, color: '#a78bfa', background: !tempEditId ? 'rgba(167,139,250,0.1)' : 'transparent', border: `1px solid ${!tempEditId ? '#a78bfa' : 'transparent'}`, borderRadius: 6, cursor: 'pointer', textAlign: 'left', marginBottom: 6 }}>
            ➕ Yeni Şablon Ekle
          </button>
          {templates.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1px 0' }}>
              <button onClick={() => setTempEditId(t.id)} style={{ flex: 1, padding: '5px 8px', fontSize: 10, color: tempEditId === t.id ? '#a78bfa' : '#94a3b8', background: tempEditId === t.id ? 'rgba(167,139,250,0.08)' : 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.name} ({t.type === 'create' ? 'Yeni' : 'Geliştir'})
              </button>
              <button disabled={t.id.startsWith('default_')} onClick={() => handleDeleteTemplate(t.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11, padding: '0 6px', opacity: t.id.startsWith('default_') ? 0.2 : 1 }}>✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Editing space & guide */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0, color: '#a78bfa', fontSize: 13 }}>
            {!tempEditId ? 'Yeni Şablon Oluşturuluyor' : `Şablonu Düzenle: "${tempName}"`}
          </h4>
          <NBtn onClick={handleSaveTemplate} color="#a78bfa" active style={{ padding: '5px 16px', fontSize: 11 }}>
            💾 Şablonu Kaydet
          </NBtn>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1.5 }}>
            <Lbl>Şablon İsmi</Lbl>
            <input value={tempName} onChange={(e) => setTempName(e.target.value)} style={{ ...iStyle, width: '100%' }} />
          </div>
          <div style={{ flex: 1 }}>
            <Lbl>Şablon Tipi</Lbl>
            <select value={tempType} onChange={(e) => setTempType(e.target.value as 'create' | 'improve')} style={{ ...iStyle, width: '100%', padding: '5px' }}>
              <option value="create">Yeni Seviye Çizdirme (Create)</option>
              <option value="improve">Mevcut Seviye Geliştirme (Improve)</option>
            </select>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', gap: 12, overflow: 'hidden' }}>
          {/* Editor text area */}
          <div style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
            <Lbl>Şablon Gövdesi (Markdown / Metin)</Lbl>
            <textarea value={tempText} onChange={(e) => setTempText(e.target.value)} style={{ ...iStyle, flex: 1, fontFamily: 'monospace', fontSize: 10, background: '#02050c', resize: 'none' }} />
          </div>

          {/* Variables Guide */}
          <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(167,139,250,0.02)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 8, padding: 10, fontSize: 10, color: '#94a3b8' }}>
            <h5 style={{ margin: '0 0 6px', color: '#a78bfa', fontSize: 11 }}>Kullanılabilir Değişkenler</h5>
            <p style={{ margin: '0 0 10px', fontSize: 9, color: '#64748b' }}>Aşağıdaki etiketler prompt derlenirken otomatik olarak doldurulacaktır:</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div><strong style={VAR_STYLE}>{"{{SYSTEM_INSTRUCTIONS}}"}</strong>: Alt taraftaki sekmede yer alan oyunun tüm fizik ve kural setini ekler.</div>

              {tempType === 'create' ? (
                <>
                  <div><strong style={VAR_STYLE}>{"{{LEVEL_ID}}"}</strong>: Seviye numarası.</div>
                  <div><strong style={VAR_STYLE}>{"{{LEVEL_PART}}"}</strong>: Seviyenin ait olduğu part ID.</div>
                  <div><strong style={VAR_STYLE}>{"{{LEVEL_NAME}}"}</strong>: Seviyenin başlığı.</div>
                  <div><strong style={VAR_STYLE}>{"{{LEVEL_DIFFICULTY}}"}</strong>: Seviye zorluğu (1-4).</div>
                  <div><strong style={VAR_STYLE}>{"{{LEVEL_MOVES_MIN}}"}</strong> / <strong style={VAR_STYLE}>{"{{LEVEL_MOVES_MAX}}"}</strong>: Hedef hamle sayıları.</div>
                  <div><strong style={VAR_STYLE}>{"{{LEVEL_MECHANICS}}"}</strong>: Seviyede kullanılması istenen mekanikler.</div>
                  <div><strong style={VAR_STYLE}>{"{{LEVEL_DESCRIPTION}}"}</strong>: Seviye amacı.</div>
                  <div><strong style={VAR_STYLE}>{"{{LEVEL_DESIGN_INSTRUCTIONS}}"}</strong>: Seviye tasarım ipuçları.</div>
                </>
              ) : (
                <>
                  <div><strong style={VAR_STYLE}>{"{{CURRENT_LEVEL_JSON}}"}</strong>: Editörde yüklü olan haritanın ham JSON verisi.</div>
                  <div><strong style={VAR_STYLE}>{"{{IMPROVEMENT_NOTES}}"}</strong>: Yapay zekaya verilecek geliştirmeler / notlar.</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
