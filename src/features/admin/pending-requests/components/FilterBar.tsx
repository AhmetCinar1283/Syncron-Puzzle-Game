import type { T } from '@/contexts/LanguageContext';
import { CELL_FILTER_KEYS, DIFFICULTY_COLORS } from '../lib/helpers';

export function FilterBar({
  t,
  search,
  setSearch,
  filterDifficulty,
  setFilterDifficulty,
  filterCellTypes,
  toggleCellType,
  clearCellTypes,
}: {
  t: T;
  search: string;
  setSearch: (v: string) => void;
  filterDifficulty: number | null;
  setFilterDifficulty: (v: number | null) => void;
  filterCellTypes: Set<string>;
  toggleCellType: (types: readonly string[]) => void;
  clearCellTypes: () => void;
}) {
  return (
    <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(251,191,36,0.1)', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('admin.search_placeholder')}
          style={{ flex: 1, minWidth: 160, background: '#060d1a', border: '1px solid rgba(30,58,95,0.6)', color: '#94a3b8', borderRadius: 6, padding: '5px 10px', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setFilterDifficulty(null)}
            style={{ padding: '4px 10px', fontSize: 10, borderRadius: 5, border: `1px solid ${filterDifficulty === null ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.1)'}`, background: filterDifficulty === null ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.02)', color: filterDifficulty === null ? '#fbbf24' : '#475569', cursor: 'pointer' }}
          >{t('admin.difficulty_all')}</button>
          {[1, 2, 3, 4].map((d) => (
            <button
              key={d}
              onClick={() => setFilterDifficulty(filterDifficulty === d ? null : d)}
              style={{ padding: '4px 10px', fontSize: 10, borderRadius: 5, border: `1px solid ${filterDifficulty === d ? DIFFICULTY_COLORS[d] + '99' : 'rgba(255,255,255,0.1)'}`, background: filterDifficulty === d ? DIFFICULTY_COLORS[d] + '22' : 'rgba(255,255,255,0.02)', color: filterDifficulty === d ? DIFFICULTY_COLORS[d] : '#475569', cursor: 'pointer' }}
            >{t(`difficulty.${d}`)}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 9, color: '#1e3a5f', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t('admin.grid_content')}</span>
        {CELL_FILTER_KEYS.map((g) => {
          const active = g.types.some((type) => filterCellTypes.has(type));
          return (
            <button
              key={g.key}
              onClick={() => toggleCellType(g.types)}
              style={{ padding: '3px 9px', fontSize: 10, borderRadius: 5, border: `1px solid ${active ? 'rgba(0,196,255,0.5)' : 'rgba(255,255,255,0.1)'}`, background: active ? 'rgba(0,196,255,0.12)' : 'rgba(255,255,255,0.02)', color: active ? '#00c4ff' : '#475569', cursor: 'pointer' }}
            >{t(g.key)}</button>
          );
        })}
        {filterCellTypes.size > 0 && (
          <button onClick={clearCellTypes} style={{ padding: '3px 9px', fontSize: 10, borderRadius: 5, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', cursor: 'pointer' }}>{t('admin.clear_filters')}</button>
        )}
      </div>
    </div>
  );
}
