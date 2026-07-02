'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal, NBtn, Lbl, iStyle } from './EditorUI';
import { AI_CURRICULUM, buildCreateLevelPrompt, buildImproveLevelPrompt, generateSystemInstructions } from '../aiCurriculum';
import type { CurriculumLevel } from '../aiCurriculum';
import { 
  getSavedCurriculum, saveCurriculum, 
  getSavedTemplates, saveTemplates, 
  getSavedGameRules, saveGameRules,
  resetAllToDefaults, PromptTemplatePreset
} from '../aiConfigStore';
import { useEditorContext } from '../EditorContext';
import { solvePuzzle } from '@/app/src/games/logic/solver';
import type { LevelData } from '@/app/src/games/types';

interface AiAssistantDialogProps {
  open: boolean;
  onClose: () => void;
}

const AVAILABLE_MECHANICS = [
  'conveyor_up', 'conveyor_down', 'conveyor_left', 'conveyor_right',
  'teleporter_in_A', 'teleporter_out_A', 'teleporter_in_B', 'teleporter_out_B',
  'trampoline_up', 'trampoline_down', 'trampoline_left', 'trampoline_right',
  'direction_toggle', 'direction_deflector', 'ice', 'power_node', 'conveyorPowerRequired',
  'initialBoxes', 'trailCollision', 'rooms', 'reversed'
];

export default function AiAssistantDialog({ open, onClose }: AiAssistantDialogProps) {
  const { generateLevelData, doImportLevelJson } = useEditorContext();

  // Navigation states
  const [activeTab, setActiveTab] = useState<'generator' | 'curriculum' | 'templates' | 'rules'>('generator');
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Core Config States (Persisted in localStorage)
  const [curriculum, setCurriculum] = useState<CurriculumLevel[]>([]);
  const [templates, setTemplates] = useState<PromptTemplatePreset[]>([]);
  const [gameRules, setGameRules] = useState('');

  // Initial load
  useEffect(() => {
    if (open) {
      setCurriculum(getSavedCurriculum());
      setTemplates(getSavedTemplates());
      setGameRules(getSavedGameRules());
    }
  }, [open]);

  // Tab 1: Generator States
  const [selectedLevelId, setSelectedLevelId] = useState<number>(51);
  const [promptMode, setPromptMode] = useState<'create' | 'improve'>('create');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [improvementNotes, setImprovementNotes] = useState<string>(
    'Kestirme yolları engellemek için engeller ekle. Çözüm hamlesini artır.'
  );
  const [copied, setCopied] = useState(false);
  const [aiJsonInput, setAiJsonInput] = useState('');
  const [validationResult, setValidationResult] = useState<{
    status: 'idle' | 'success' | 'unsolvable' | 'error';
    moves?: number;
    solution?: string[];
    errorMsg?: string;
  }>({ status: 'idle' });

  // Tab 2: Curriculum Editor States
  const [currEditId, setCurrEditId] = useState<number | 'new'>(51);
  const [currForm, setCurrForm] = useState<Partial<CurriculumLevel>>({});

  // Tab 3: Template Editor States
  const [tempEditId, setTempEditId] = useState<string>('');
  const [tempName, setTempName] = useState('');
  const [tempType, setTempType] = useState<'create' | 'improve'>('create');
  const [tempText, setTempText] = useState('');

  // Setup initial bindings
  useEffect(() => {
    if (curriculum.length > 0) {
      const exists = curriculum.some(l => l.id === selectedLevelId);
      if (!exists) {
        setSelectedLevelId(curriculum[0].id);
      }
    }
  }, [curriculum, selectedLevelId]);

  // Sync templates selection
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => t.type === promptMode);
  }, [templates, promptMode]);

  useEffect(() => {
    if (filteredTemplates.length > 0) {
      setSelectedTemplateId(filteredTemplates[0].id);
    } else {
      setSelectedTemplateId('');
    }
  }, [filteredTemplates]);

  // Load level meta for generator
  const selectedLevelMeta = useMemo(() => {
    return curriculum.find(l => l.id === selectedLevelId) || curriculum[0];
  }, [curriculum, selectedLevelId]);

  // JSON string of level open in editor
  const currentLevelJsonStr = useMemo(() => {
    if (!open) return '';
    const { level } = generateLevelData();
    if (!level) return '{}';
    return JSON.stringify(level, null, 2);
  }, [generateLevelData, open]);

  // Compile final prompt
  const compiledPrompt = useMemo(() => {
    const activeTemplate = templates.find(t => t.id === selectedTemplateId);
    if (!activeTemplate) return 'Lütfen bir şablon seçin.';

    if (promptMode === 'create') {
      if (!selectedLevelMeta) return 'Lütfen müfredattan bir seviye seçin.';
      return buildCreateLevelPrompt(selectedLevelMeta, activeTemplate.template, gameRules);
    } else {
      return buildImproveLevelPrompt(currentLevelJsonStr, improvementNotes, activeTemplate.template, gameRules);
    }
  }, [promptMode, selectedLevelMeta, selectedTemplateId, templates, gameRules, currentLevelJsonStr, improvementNotes]);

  // Copy prompt to clipboard
  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(compiledPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Run Solver to Validate AI JSON
  const handleVerifyJson = () => {
    if (!aiJsonInput.trim()) {
      setValidationResult({ status: 'error', errorMsg: 'Lütfen AI tarafından üretilen JSON verisini girin.' });
      return;
    }

    try {
      let cleanInput = aiJsonInput.trim();
      if (cleanInput.startsWith('```json')) {
        cleanInput = cleanInput.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (cleanInput.startsWith('```')) {
        cleanInput = cleanInput.replace(/^```/, '').replace(/```$/, '').trim();
      }

      const parsed = JSON.parse(cleanInput) as LevelData;
      
      if (!parsed.width || !parsed.height || !parsed.grid || !parsed.initialObjects) {
        setValidationResult({ 
          status: 'error', 
          errorMsg: 'JSON geçerli ancak Syncron seviye yapısına uymuyor (width, height, grid veya initialObjects eksik).' 
        });
        return;
      }

      const solveResult = solvePuzzle(parsed, 25, 4000);

      if (solveResult.solvable && solveResult.solution) {
        setValidationResult({
          status: 'success',
          moves: solveResult.moveCount,
          solution: solveResult.solution
        });
      } else {
        setValidationResult({
          status: 'unsolvable',
          errorMsg: 'Harita çözülebilir durumda değil! AI yolu bloke etmiş veya geçersiz hedefler eklemiş.'
        });
      }
    } catch (e: any) {
      setValidationResult({ 
        status: 'error', 
        errorMsg: `JSON Hata: ${e.message}` 
      });
    }
  };

  // Import Validated Level into Editor
  const handleImportToEditor = () => {
    let cleanInput = aiJsonInput.trim();
    if (!cleanInput) return;
    
    if (cleanInput.startsWith('```json')) {
      cleanInput = cleanInput.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleanInput.startsWith('```')) {
      cleanInput = cleanInput.replace(/^```/, '').replace(/```$/, '').trim();
    }

    try {
      const parsed = JSON.parse(cleanInput) as LevelData;
      if (!parsed.width || !parsed.height || !parsed.grid || !parsed.initialObjects) {
        alert('Seviye şeması geçersiz (width, height, grid veya initialObjects eksik).');
        return;
      }
    } catch (e: any) {
      alert(`Geçersiz JSON formatı: ${e.message}`);
      return;
    }

    const err = doImportLevelJson(cleanInput);
    if (err) {
      alert(`İçe aktarma başarısız: ${err}`);
    } else {
      onClose();
    }
  };

  // --- Tab 2: Curriculum CRUD Handlers ---
  useEffect(() => {
    if (currEditId === 'new') {
      const nextId = curriculum.length > 0 ? Math.max(...curriculum.map(l => l.id)) + 1 : 51;
      setCurrForm({
        id: nextId,
        part: 3,
        name: 'Yeni Bölüm',
        difficulty: 2,
        targetMovesMin: 5,
        targetMovesMax: 10,
        mechanics: [],
        description: '',
        designInstructions: '',
      });
    } else {
      const level = curriculum.find(l => l.id === currEditId);
      if (level) {
        setCurrForm({ ...level });
      }
    }
  }, [currEditId, curriculum]);

  const handleSaveCurriculumLevel = () => {
    if (!currForm.id || !currForm.name) {
      alert('Lütfen Seviye ID ve Adını doldurun.');
      return;
    }

    let updatedList = [...curriculum];
    const index = updatedList.findIndex(l => l.id === currForm.id);

    if (currEditId === 'new') {
      if (curriculum.some(l => l.id === currForm.id)) {
        alert('Bu Seviye ID zaten mevcut!');
        return;
      }
      updatedList.push(currForm as CurriculumLevel);
    } else {
      if (index > -1) {
        updatedList[index] = currForm as CurriculumLevel;
      }
    }

    updatedList.sort((a, b) => a.id - b.id);
    setCurriculum(updatedList);
    saveCurriculum(updatedList);
    setCurrEditId(currForm.id);
    alert('Müfredat seviyesi başarıyla kaydedildi.');
  };

  const handleDeleteCurriculumLevel = (id: number) => {
    if (!window.confirm(`Level ${id} müfredattan kalıcı olarak silinecek. Emin misiniz?`)) return;
    const updatedList = curriculum.filter(l => l.id !== id);
    setCurriculum(updatedList);
    saveCurriculum(updatedList);
    if (currEditId === id) {
      setCurrEditId(updatedList[0]?.id ?? 'new');
    }
    alert('Seviye müfredattan silindi.');
  };

  const handleResetDefaults = () => {
    if (!window.confirm('Tüm müfredat, şablonlar ve oyun kuralları varsayılan fabrika ayarlarına sıfırlanacak! Emin misiniz?')) return;
    resetAllToDefaults();
    setCurriculum(getSavedCurriculum());
    setTemplates(getSavedTemplates());
    setGameRules(getSavedGameRules());
    alert('Tüm veriler başarıyla sıfırlandı.');
  };

  // --- Tab 3: Template Editor Handlers ---
  useEffect(() => {
    if (templates.length > 0) {
      const initialId = tempEditId || templates[0].id;
      const t = templates.find(item => item.id === initialId) || templates[0];
      setTempEditId(t.id);
      setTempName(t.name);
      setTempType(t.type);
      setTempText(t.template);
    }
  }, [tempEditId, templates]);

  const handleSaveTemplate = () => {
    if (!tempName.trim() || !tempText.trim()) {
      alert('Lütfen şablon adını ve içeriğini doldurun.');
      return;
    }

    let updated = [...templates];
    const index = updated.findIndex(t => t.id === tempEditId);

    const preset: PromptTemplatePreset = {
      id: tempEditId || `custom_${Date.now()}`,
      name: tempName,
      type: tempType,
      template: tempText,
    };

    if (index > -1 && tempEditId) {
      updated[index] = preset;
    } else {
      updated.push(preset);
    }

    setTemplates(updated);
    saveTemplates(updated);
    setTempEditId(preset.id);
    alert('Prompt şablonu kaydedildi.');
  };

  const handleNewTemplateClick = () => {
    setTempEditId('');
    setTempName('Yeni Özel Şablon');
    setTempType('create');
    setTempText('{{SYSTEM_INSTRUCTIONS}}\n\n### YENİ TASARIM TALEBİ\nSeviye ID: {{LEVEL_ID}}\n...');
  };

  const handleDeleteTemplate = (id: string) => {
    if (id.startsWith('default_')) {
      alert('Varsayılan şablonlar silinemez!');
      return;
    }
    if (!window.confirm('Bu şablonu silmek istediğinize emin misiniz?')) return;
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    saveTemplates(updated);
    setTempEditId(updated[0]?.id ?? '');
    alert('Şablon silindi.');
  };

  // --- Tab 4: Rules Editor Handlers ---
  const handleSaveRules = () => {
    if (!gameRules.trim()) {
      alert('Kurallar boş olamaz.');
      return;
    }
    saveGameRules(gameRules);
    alert('Oyun kuralları prompt referansı başarıyla güncellendi.');
  };

  const handleResetRulesDefault = () => {
    if (!window.confirm('Oyun kuralları sistem varsayılanlarına sıfırlanacaktır. Onaylıyor musunuz?')) return;
    const def = generateSystemInstructions();
    setGameRules(def);
    saveGameRules(def);
    alert('Kurallar varsayılana sıfırlandı.');
  };

  // Toggle checklist item for mechanics in Tab 2
  const handleToggleMechanic = (mech: string) => {
    const list = currForm.mechanics || [];
    const newList = list.includes(mech) ? list.filter(m => m !== mech) : [...list, mech];
    setCurrForm({ ...currForm, mechanics: newList });
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ 
        width: isFullScreen ? '97vw' : 920, 
        height: isFullScreen ? '93vh' : '82vh', 
        maxHeight: '93vh',
        display: 'flex', 
        flexDirection: 'column', 
        gap: 12,
        transition: 'all 0.25s ease-in-out'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,196,255,0.15)', paddingBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, color: '#00c4ff', textShadow: '0 0 8px rgba(0,196,255,0.4)', letterSpacing: '0.06em', fontWeight: 800 }}>
              🤖 AI BULMACA TASARIM LABİLESİ
            </h3>
            <button 
              onClick={() => setIsFullScreen(!isFullScreen)}
              style={{
                background: 'rgba(0,196,255,0.06)',
                border: '1px solid rgba(0,196,255,0.25)',
                borderRadius: 4, color: '#00c4ff', fontSize: 10, padding: '2px 8px', cursor: 'pointer', fontWeight: 700
              }}
            >
              {isFullScreen ? '🗗 Küçük Ekran' : '🗖 Tam Ekran'}
            </button>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {/* Tab Headers */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(30,58,95,0.3)', paddingBottom: 2, gap: 4 }}>
          <button onClick={() => setActiveTab('generator')} style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', background: activeTab === 'generator' ? 'rgba(0,196,255,0.08)' : 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === 'generator' ? '#00c4ff' : 'transparent'}`, color: activeTab === 'generator' ? '#00c4ff' : '#475569', cursor: 'pointer' }}>
            🤖 Prompt Generator
          </button>
          <button onClick={() => setActiveTab('curriculum')} style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', background: activeTab === 'curriculum' ? 'rgba(0,255,136,0.08)' : 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === 'curriculum' ? '#00ff88' : 'transparent'}`, color: activeTab === 'curriculum' ? '#00ff88' : '#475569', cursor: 'pointer' }}>
            📚 Müfredat Düzenleyici
          </button>
          <button onClick={() => setActiveTab('templates')} style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', background: activeTab === 'templates' ? 'rgba(167,139,250,0.08)' : 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === 'templates' ? '#a78bfa' : 'transparent'}`, color: activeTab === 'templates' ? '#a78bfa' : '#475569', cursor: 'pointer' }}>
            📝 Şablonlar
          </button>
          <button onClick={() => setActiveTab('rules')} style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', background: activeTab === 'rules' ? 'rgba(251,191,36,0.08)' : 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === 'rules' ? '#fbbf24' : 'transparent'}`, color: activeTab === 'rules' ? '#fbbf24' : '#475569', cursor: 'pointer' }}>
            ⚙️ Oyun Kuralları (Referans)
          </button>
        </div>

        {/* Tab Body */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* TAB 1: GENERATOR */}
          {activeTab === 'generator' && (
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
          )}

          {/* TAB 2: CURRICULUM EDITOR */}
          {activeTab === 'curriculum' && (
            <div style={{ display: 'flex', gap: 20, flex: 1, overflow: 'hidden' }}>
              {/* Left sidebar: level list */}
              <div style={{ width: 220, borderRight: '1px solid rgba(30,58,95,0.3)', paddingRight: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Lbl style={{ margin: 0 }}>Müfredat Seviyeleri</Lbl>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, background: '#02050c', padding: 6, borderRadius: 8, border: '1px solid rgba(30,58,95,0.3)' }}>
                  <button onClick={() => setCurrEditId('new')} style={{ padding: '6px 8px', fontSize: 11, fontWeight: 700, color: '#00ff88', background: currEditId === 'new' ? 'rgba(0,255,136,0.1)' : 'transparent', border: `1px solid ${currEditId === 'new' ? '#00ff88' : 'transparent'}`, borderRadius: 6, cursor: 'pointer', textAlign: 'left' }}>
                    ➕ Yeni Seviye Ekle
                  </button>
                  {curriculum.map(lvl => (
                    <div key={lvl.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1px 0' }}>
                      <button onClick={() => setCurrEditId(lvl.id)} style={{ flex: 1, padding: '5px 8px', fontSize: 10, color: currEditId === lvl.id ? '#00c4ff' : '#94a3b8', background: currEditId === lvl.id ? 'rgba(0,196,255,0.08)' : 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Lvl {lvl.id}: {lvl.name}
                      </button>
                      <button onClick={() => handleDeleteCurriculumLevel(lvl.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11, padding: '0 6px' }}>✕</button>
                    </div>
                  ))}
                </div>
                <NBtn onClick={handleResetDefaults} color="#ef4444" active style={{ padding: '6px 0', fontSize: 10 }}>
                  ⚠️ Tüm Ayarları Sıfırla
                </NBtn>
              </div>

              {/* Right area: level edit form */}
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, color: '#00ff88', fontSize: 13 }}>
                    {currEditId === 'new' ? 'Yeni Seviye Ekleme Formu' : `Level ${currEditId} Düzenleme Formu`}
                  </h4>
                  <NBtn onClick={handleSaveCurriculumLevel} color="#00ff88" active style={{ padding: '5px 16px', fontSize: 11 }}>
                    💾 Seviyeyi Müfredata Kaydet
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
                    <select value={currForm.difficulty || 2} onChange={(e) => setCurrForm({ ...currForm, difficulty: Number(e.target.value) as any })} style={{ ...iStyle, width: '100%', padding: '5px' }}>
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
                  <Lbl>Seviye Açıklaması (Oyuncuya/AI'a Mesaj)</Lbl>
                  <textarea value={currForm.description || ''} onChange={(e) => setCurrForm({ ...currForm, description: e.target.value })} style={{ ...iStyle, width: '100%', height: 45, fontFamily: 'inherit', resize: 'vertical' }} />
                </div>

                <div>
                  <Lbl>AI İçin Özel Tasarım Talimatları (Örn: Duvar geometrisi, başlangıç yerleri)</Lbl>
                  <textarea value={currForm.designInstructions || ''} onChange={(e) => setCurrForm({ ...currForm, designInstructions: e.target.value })} style={{ ...iStyle, width: '100%', height: 60, fontFamily: 'inherit', resize: 'vertical' }} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TEMPLATES */}
          {activeTab === 'templates' && (
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
                    <select value={tempType} onChange={(e) => setTempType(e.target.value as any)} style={{ ...iStyle, width: '100%', padding: '5px' }}>
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
                      <div><strong style={{ color: '#00c4ff' }}>{"{{SYSTEM_INSTRUCTIONS}}"}</strong>: Alt taraftaki sekmede yer alan oyunun tüm fizik ve kural setini ekler.</div>
                      
                      {tempType === 'create' ? (
                        <>
                          <div><strong style={{ color: '#00c4ff' }}>{"{{LEVEL_ID}}"}</strong>: Seviye numarası.</div>
                          <div><strong style={{ color: '#00c4ff' }}>{"{{LEVEL_PART}}"}</strong>: Seviyenin ait olduğu part ID.</div>
                          <div><strong style={{ color: '#00c4ff' }}>{"{{LEVEL_NAME}}"}</strong>: Seviyenin başlığı.</div>
                          <div><strong style={{ color: '#00c4ff' }}>{"{{LEVEL_DIFFICULTY}}"}</strong>: Seviye zorluğu (1-4).</div>
                          <div><strong style={{ color: '#00c4ff' }}>{"{{LEVEL_MOVES_MIN}}"}</strong> / <strong style={{ color: '#00c4ff' }}>{"{{LEVEL_MOVES_MAX}}"}</strong>: Hedef hamle sayıları.</div>
                          <div><strong style={{ color: '#00c4ff' }}>{"{{LEVEL_MECHANICS}}"}</strong>: Seviyede kullanılması istenen mekanikler.</div>
                          <div><strong style={{ color: '#00c4ff' }}>{"{{LEVEL_DESCRIPTION}}"}</strong>: Seviye amacı.</div>
                          <div><strong style={{ color: '#00c4ff' }}>{"{{LEVEL_DESIGN_INSTRUCTIONS}}"}</strong>: Seviye tasarım ipuçları.</div>
                        </>
                      ) : (
                        <>
                          <div><strong style={{ color: '#00c4ff' }}>{"{{CURRENT_LEVEL_JSON}}"}</strong>: Editörde yüklü olan haritanın ham JSON verisi.</div>
                          <div><strong style={{ color: '#00c4ff' }}>{"{{IMPROVEMENT_NOTES}}"}</strong>: Yapay zekaya verilecek geliştirmeler / notlar.</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: RULES EDITOR */}
          {activeTab === 'rules' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, color: '#fbbf24', fontSize: 13 }}>
                  Sistem Yönergeleri &amp; Oyun Fiziği Referans Kılavuzu
                </h4>
                <div style={{ display: 'flex', gap: 8 }}>
                  <NBtn onClick={handleResetRulesDefault} style={{ padding: '5px 12px', fontSize: 11 }}>
                    ↩ Varsayılana Dön
                  </NBtn>
                  <NBtn onClick={handleSaveRules} color="#fbbf24" active style={{ padding: '5px 16px', fontSize: 11 }}>
                    💾 Kuralları Kaydet
                  </NBtn>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Lbl>Yapay zekaya oyunun çalışma kurallarını ve JSON format şemasını aktaran metin:</Lbl>
                <textarea value={gameRules} onChange={(e) => setGameRules(e.target.value)} style={{ ...iStyle, flex: 1, fontFamily: 'monospace', fontSize: 10, background: '#02050c', resize: 'none' }} />
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(30,58,95,0.3)', paddingTop: 8 }}>
          <NBtn onClick={onClose} style={{ padding: '5px 20px', fontSize: 12 }}>Kapat</NBtn>
        </div>
      </div>
    </Modal>
  );
}
