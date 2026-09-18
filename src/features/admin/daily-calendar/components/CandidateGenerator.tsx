'use client';

/**
 * DOSYA AMACI: Aday üretici paneli: sade form (zorluk, boyut, oyuncu, adet), üretilen
 * adayların önizlemesi ve par'ı; her aday için "onayla ve kaydet" ya da "editörde düzenle".
 */
import { useState } from 'react';
import { useT } from '@/contexts/LanguageContext';
import { Badge, Button, Card, Input, Select } from '@/components/ui';
import LevelMiniPreview from '@/game-engine/components/LevelMiniPreview';
import type { CandidateForm } from '../lib/candidateFilters';
import { CANDIDATE_LIMITS } from '../lib/candidateFilters';
import type { DailyCandidate, useCandidateGenerator } from '../hooks/useCandidateGenerator';

type Generator = ReturnType<typeof useCandidateGenerator>;

function CandidateCard({ candidate, generator }: { candidate: DailyCandidate; generator: Generator }) {
  const t = useT();
  const [title, setTitle] = useState('');
  const [inPool, setInPool] = useState(false);
  const [assignDate, setAssignDate] = useState('');
  const busy = generator.busyKey === candidate.key;

  return (
    <Card padding="sm" className="flex flex-col gap-2">
      <div className="flex min-h-[90px] items-center justify-center"><LevelMiniPreview level={candidate.level} /></div>
      <div className="flex items-center gap-2">
        <Badge color="sky">par {candidate.par}</Badge>
        {candidate.savedId && <Badge color="emerald">{t('daily_admin.saved_short')}</Badge>}
      </div>
      <Input placeholder={t('daily_admin.field_title')} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
      <Input type="date" value={assignDate} onChange={(e) => setAssignDate(e.target.value)} aria-label={t('daily_admin.field_date')} />
      <label className="flex items-center gap-2 text-xs" style={{ color: '#94a3b8' }}>
        <input type="checkbox" checked={inPool} onChange={(e) => setInPool(e.target.checked)} />
        {t('daily_admin.field_pool')}
      </label>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" color="emerald" loading={busy} onClick={() => generator.approve(candidate, { title, inPool, assignDate })}>
          {t(candidate.savedId ? 'daily_admin.update_saved' : 'daily_admin.approve_save')}
        </Button>
        <Button size="sm" color="sky" onClick={() => generator.editInEditor(candidate)}>{t('daily_admin.edit_in_editor')}</Button>
        <Button size="sm" color="neutral" variant="ghost" onClick={() => generator.discard(candidate.key)}>{t('daily_admin.discard')}</Button>
      </div>
    </Card>
  );
}

export function CandidateGenerator({ generator }: { generator: Generator }) {
  const t = useT();
  const { form, setForm } = generator;
  const update = (patch: Partial<CandidateForm>) => setForm({ ...form, ...patch });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <Select label={t('daily_admin.gen_difficulty')} value={form.difficulty} onChange={(e) => update({ difficulty: Number(e.target.value) as CandidateForm['difficulty'] })}>
          {[1, 2, 3, 4].map((d) => <option key={d} value={d}>{t(`difficulty.${d}`)}</option>)}
        </Select>
        <Input
          label={t('daily_admin.gen_size')}
          type="number"
          min={CANDIDATE_LIMITS.minSize}
          max={CANDIDATE_LIMITS.maxSize}
          value={form.size}
          onChange={(e) => update({ size: Number(e.target.value) })}
        />
        <Select label={t('daily_admin.gen_players')} value={form.playerCount} onChange={(e) => update({ playerCount: Number(e.target.value) as CandidateForm['playerCount'] })}>
          {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
        </Select>
        <Input
          label={t('daily_admin.gen_count')}
          type="number"
          min={1}
          max={CANDIDATE_LIMITS.maxCount}
          value={form.count}
          onChange={(e) => update({ count: Number(e.target.value) })}
        />
        <Button color="amber" variant="solid" loading={generator.generating} onClick={generator.generate}>{t('daily_admin.generate')}</Button>
      </div>
      <p className="m-0 text-xs" style={{ color: '#64748b' }}>{t('daily_admin.generator_hint')}</p>
      {generator.errorKey && <p className="m-0 text-sm" style={{ color: '#f87171' }}>{t(generator.errorKey)}</p>}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {generator.candidates.map((c) => <CandidateCard key={c.key} candidate={c} generator={generator} />)}
      </div>
    </div>
  );
}
