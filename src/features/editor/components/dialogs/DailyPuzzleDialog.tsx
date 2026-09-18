'use client';

/**
 * DOSYA AMACI: Editördeki "Günlük Bulmaca olarak kaydet" diyaloğu (admin). Par
 * kaynağı seçilir (çözücü ya da test modunda oynanan admin çözümü), durum / yedek
 * havuz / tarih belirlenir. Doğrulama worker'da çözüm oynatılarak yapılır.
 */
import { useState } from 'react';
import { useT } from '@/contexts/LanguageContext';
import { Lbl, Modal, NBtn, iStyle } from '../EditorUI';
import type { DailyPuzzleEditor, DailySaveForm } from '../../hooks/useDailyPuzzleEditor';

interface DailyPuzzleDialogProps {
  daily: DailyPuzzleEditor;
  defaultTitle: string;
}

function translateOr(t: (k: string) => string, key: string, fallbackKey: string): string {
  const value = t(key);
  return value === key ? t(fallbackKey) : value;
}

export default function DailyPuzzleDialog({ daily, defaultTitle }: DailyPuzzleDialogProps) {
  const t = useT();
  const [form, setForm] = useState<DailySaveForm>({
    title: defaultTitle,
    status: 'approved',
    inPool: false,
    assignDate: '',
    useAdminSolution: !daily.solverSolution && !!daily.adminSolution,
  });
  const update = (patch: Partial<DailySaveForm>) => setForm((f) => ({ ...f, ...patch }));
  const { state, solverSolution, adminSolution } = daily;
  const busy = state.kind === 'solving' || state.kind === 'saving';

  return (
    <Modal onClose={daily.closeDialog}>
      <div style={{ width: 'min(88vw, 380px)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, color: '#ffd700', letterSpacing: '0.06em' }}>
          {daily.puzzleId ? t('daily_admin.editor_update_title') : t('daily_admin.editor_save_title')}
        </h3>

        <div>
          <Lbl>{t('daily_admin.field_title')}</Lbl>
          <input value={form.title} onChange={(e) => update({ title: e.target.value })} maxLength={100} style={{ ...iStyle, width: '100%' }} />
        </div>

        <div>
          <Lbl>{t('daily_admin.field_par_source')}</Lbl>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
            <input type="radio" checked={!form.useAdminSolution} onChange={() => update({ useAdminSolution: false })} />
            {solverSolution
              ? t('daily_admin.solver_found', { n: solverSolution.moves.length })
              : t('daily_admin.solver_none')}
            <NBtn onClick={daily.runSolver} disabled={busy} color="#00c4ff" active style={{ marginLeft: 'auto' }}>
              {state.kind === 'solving' ? t('daily_admin.solving') : t('daily_admin.run_solver')}
            </NBtn>
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#94a3b8' }}>
            <input type="radio" checked={form.useAdminSolution} disabled={!adminSolution} onChange={() => update({ useAdminSolution: true })} />
            {adminSolution
              ? t('daily_admin.admin_solution', { n: adminSolution.moves.length })
              : t('daily_admin.admin_solution_hint')}
          </label>
          {form.useAdminSolution && (
            <p style={{ margin: '6px 0 0', fontSize: 11, color: '#fbbf24' }}>{t('daily_admin.par_not_optimal')}</p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <Lbl>{t('daily_admin.field_status')}</Lbl>
            <select value={form.status} onChange={(e) => update({ status: e.target.value as DailySaveForm['status'] })} style={iStyle}>
              <option value="approved">{t('daily_admin.status_approved')}</option>
              <option value="draft">{t('daily_admin.status_draft')}</option>
            </select>
          </div>
          <div>
            <Lbl>{t('daily_admin.field_date')}</Lbl>
            <input type="date" value={form.assignDate} disabled={form.status !== 'approved'} onChange={(e) => update({ assignDate: e.target.value })} style={iStyle} />
          </div>
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#94a3b8' }}>
          <input type="checkbox" checked={form.inPool} onChange={(e) => update({ inPool: e.target.checked })} />
          {t('daily_admin.field_pool')}
        </label>

        {state.kind === 'error' && (
          <p style={{ margin: 0, fontSize: 12, color: '#f87171' }}>{translateOr(t, state.key, 'daily_admin.error_generic')}</p>
        )}
        {state.kind === 'saved' && (
          <p style={{ margin: 0, fontSize: 12, color: '#00ff88' }}>{t('daily_admin.saved', { n: state.par })}</p>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <NBtn onClick={() => daily.save(form)} disabled={busy} color="#ffd700" active style={{ padding: '7px 20px', fontSize: 12 }}>
            {state.kind === 'saving' ? t('daily_admin.saving') : t('daily_admin.save')}
          </NBtn>
          <NBtn onClick={daily.closeDialog} style={{ padding: '7px 16px', fontSize: 12 }}>{t('common.cancel')}</NBtn>
        </div>
      </div>
    </Modal>
  );
}
