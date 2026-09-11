'use client';

import { NBtn, Lbl, iStyle } from '../EditorUI';
import type { AiPromptGeneratorApi } from '../../hooks/useAiPromptGenerator';

/** Tab 1: prompt builder (left) + AI JSON verify/import (right). */
export default function AiGeneratorTab({ g }: { g: AiPromptGeneratorApi }) {
  const {
    curriculum, selectedLevelId, setSelectedLevelId, promptMode, setPromptMode,
    selectedTemplateId, setSelectedTemplateId, filteredTemplates, selectedLevelMeta,
    improvementNotes, setImprovementNotes, compiledPrompt, copied, handleCopyPrompt,
    aiJsonInput, setAiJsonInput, validationResult, handleVerifyJson, handleImportToEditor,
  } = g;

  return (
    <div style={{ display: 'flex', gap: 20, flex: 1, overflow: 'hidden' }}>
      {/* Generator Settings & Prompts */}
      <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: 10, borderRight: '1px solid rgba(30,58,95,0.3)', paddingRight: 16, overflowY: 'auto' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <NBtn active={promptMode === 'create'} onClick={() => setPromptMode('create')} color="#00ff88" style={{ flex: 1, padding: '4px 0', fontSize: 10 }}>
            🆕 Seviye Üret (Create)
          </NBtn>
          <NBtn active={promptMode === 'improve'} onClick={() => setPromptMode('improve')} color="#fbbf24" style={{ flex: 1, padding: '4px 0', fontSize: 10 }}>
            🛠️ Seviye İyileştir (Improve)
          </NBtn>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Lbl>Şablon Seçimi</Lbl>
            <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)} style={{ ...iStyle, width: '100%', padding: '4px 6px' }}>
              {filteredTemplates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
              {filteredTemplates.length === 0 && <option value="">Şablon Bulunamadı</option>}
            </select>
          </div>
          {promptMode === 'create' && (
            <div style={{ flex: 1.2 }}>
              <Lbl>Müfredat Hedefi</Lbl>
              <select value={selectedLevelId} onChange={(e) => setSelectedLevelId(Number(e.target.value))} style={{ ...iStyle, width: '100%', padding: '4px 6px' }}>
                {curriculum.map(lvl => (
                  <option key={lvl.id} value={lvl.id}>Lvl {lvl.id}: {lvl.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {promptMode === 'create' ? (
          selectedLevelMeta && (
            <div style={{ background: 'rgba(0,255,136,0.03)', border: '1px solid rgba(0,255,136,0.12)', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#94a3b8' }}>
              <strong>Mekanikler:</strong> {selectedLevelMeta.mechanics.join(', ') || 'Yok'}<br/>
              <strong>Hedef Rota:</strong> {selectedLevelMeta.targetMovesMin}-{selectedLevelMeta.targetMovesMax} Hamle (Zorluk: {selectedLevelMeta.difficulty})<br/>
              <strong>Açıklama:</strong> {selectedLevelMeta.description}
            </div>
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Lbl>İyileştirme Notları</Lbl>
            <textarea value={improvementNotes} onChange={(e) => setImprovementNotes(e.target.value)} style={{ ...iStyle, width: '100%', height: 50, fontFamily: 'inherit', resize: 'vertical' }} />
          </div>
        )}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 180 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Lbl style={{ margin: 0 }}>Oluşturulan Prompt</Lbl>
            <button onClick={handleCopyPrompt} style={{ background: copied ? 'rgba(0,255,136,0.15)' : 'rgba(0,196,255,0.1)', border: `1px solid ${copied ? '#00ff88' : 'rgba(0,196,255,0.3)'}`, color: copied ? '#00ff88' : '#00c4ff', borderRadius: 4, padding: '2px 10px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
              {copied ? '✓ Kopyalandı!' : '📋 Promptu Kopyala'}
            </button>
          </div>
          <textarea readOnly value={compiledPrompt} style={{ ...iStyle, flex: 1, fontFamily: 'monospace', fontSize: 10, background: '#040812', color: '#475569', resize: 'none' }} onClick={(e) => (e.target as HTMLTextAreaElement).select()} />
        </div>
      </div>

      {/* AI Output Verification & Solver */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Lbl>AI JSON Yanıtını Buraya Yapıştırın</Lbl>
        <textarea value={aiJsonInput} onChange={(e) => setAiJsonInput(e.target.value)} placeholder='AI tarafından verilen JSON çıktısını yapıştırın...' style={{ ...iStyle, flex: 1, fontFamily: 'monospace', fontSize: 10, background: '#02050c', resize: 'none' }} />

        <div style={{ display: 'flex', gap: 8 }}>
          <NBtn onClick={handleVerifyJson} color="#00c4ff" active style={{ flex: 1, padding: '7px 0', fontSize: 11, fontWeight: 700 }}>
            ⚡ Çözümü Simüle Et (Solver)
          </NBtn>
          <NBtn disabled={validationResult.status === 'error' || !aiJsonInput.trim()} onClick={handleImportToEditor} color={validationResult.status === 'unsolvable' ? '#fbbf24' : '#00ff88'} active={validationResult.status !== 'error' && !!aiJsonInput.trim()} style={{ flex: 1, padding: '7px 0', fontSize: 11, fontWeight: 700 }}>
            📥 Editöre Aktar (Import)
          </NBtn>
        </div>

        <div style={{ minHeight: 70 }}>
          {validationResult.status === 'success' && (
            <div style={{ background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: 8, padding: '8px 12px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#00ff88', marginBottom: 2 }}>
                ✓ BAŞARILI: Çözülebilir! ({validationResult.moves} Hamle)
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace', maxHeight: 35, overflowY: 'auto' }}>
                <strong>Yol:</strong> {validationResult.solution?.join(', ').toUpperCase()}
              </div>
            </div>
          )}
          {validationResult.status === 'unsolvable' && (
            <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#fbbf24' }}>
              <strong>⚠ UYARI: BULMACA ÇÖZÜLEMEDİ (YİNE DE İÇE AKTARILABİLİR)</strong>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{validationResult.errorMsg}</div>
            </div>
          )}
          {validationResult.status === 'error' && (
            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#ef4444' }}>
              <strong>✕ HATA</strong>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{validationResult.errorMsg}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
