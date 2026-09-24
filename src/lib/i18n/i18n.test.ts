/**
 * DOSYA AMACI: Çeviri paketlerinin tutarlılık testleri. Her dilin (1) İngilizce'de
 * olmayan fazladan anahtar taşımadığını, (2) oyuncuya dönük anahtarların hepsini
 * içerdiğini ve (3) `{n}`, `{name}` gibi yer tutucuların İngilizce ile aynı olduğunu doğrular.
 * Yönetici/editör arayüzü yalnızca en + tr'de çevrilir, diğer dillerde İngilizce'ye düşer.
 */
import { describe, expect, it } from 'vitest';
import en from './en';
import tr from './tr';
import ptBR from './pt-BR';
import ru from './ru';
import es from './es';
import de from './de';
import fr from './fr';
import pl from './pl';
import { LANGS, nextLang, translate, type Lang } from './index';

const PLAYER_ONLY_LANGS: Record<string, Record<string, string>> = {
  'pt-BR': ptBR,
  ru,
  es,
  de,
  fr,
  pl,
};

/** Yalnızca geliştirici/yönetici görür; oyuncu dillerinde çevrilmesi zorunlu değil. */
const ADMIN_ONLY_KEYS = new Set([
  'nav.admin', 'nav.level_parts', 'nav.daily_calendar', 'nav.pending_levels', 'nav.level_analytics',
  'nav.reports', 'nav.users', 'home.editor', 'home.editor_sub', 'home.admin', 'home.admin_sub',
  'ticker.editor', 'ticker.admin', 'levels.delete_title', 'levels.delete_body', 'levels.delete_warning',
  'levels.delete_yes', 'support.admin_note', 'support.admin_note_placeholder', 'support.admin_note_save',
  'support.mark_read', 'support.status_updated', 'support.priority_updated', 'support.note_updated',
  'support.filter_status', 'support.filter_category', 'support.order_by', 'support.user_info',
  'support.unread',
]);
const ADMIN_ONLY_PREFIXES = ['admin.', 'editor.', 'daily_admin.', 'time.', 'list.'];

const isAdminOnly = (key: string) =>
  ADMIN_ONLY_KEYS.has(key) || ADMIN_ONLY_PREFIXES.some((p) => key.startsWith(p));

const placeholders = (s: string) =>
  [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

describe('i18n: en ↔ tr', () => {
  it('aynı anahtar kümesine sahip', () => {
    expect(Object.keys(tr).sort()).toEqual(Object.keys(en).sort());
  });
});

describe.each(Object.entries(PLAYER_ONLY_LANGS))('i18n: %s', (_code, dict) => {
  it('İngilizce\'de olmayan fazladan anahtar içermez', () => {
    expect(Object.keys(dict).filter((k) => !(k in en))).toEqual([]);
  });

  it('oyuncuya dönük tüm anahtarları içerir', () => {
    const missing = Object.keys(en).filter((k) => !isAdminOnly(k) && !(k in dict));
    expect(missing).toEqual([]);
  });

  it('yer tutucular İngilizce ile aynı', () => {
    const mismatched = Object.keys(dict).filter((k) => placeholders(dict[k]) !== placeholders(en[k]));
    expect(mismatched).toEqual([]);
  });

  it('boş çeviri yok', () => {
    expect(Object.keys(dict).filter((k) => dict[k].trim() === '' && en[k].trim() !== '')).toEqual([]);
  });
});

describe('i18n: LANGS ve translate', () => {
  it('sekiz dil, benzersiz kodlarla tanımlı', () => {
    const codes = LANGS.map((l) => l.code);
    expect(codes).toEqual(['en', 'tr', 'pt-BR', 'ru', 'es', 'de', 'fr', 'pl']);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('nextLang listeyi döngüsel dolaşır', () => {
    let current: Lang = 'en';
    const seen: Lang[] = [];
    for (let i = 0; i < LANGS.length; i++) {
      seen.push(current);
      current = nextLang(current);
    }
    expect(current).toBe('en');
    expect(seen).toEqual(LANGS.map((l) => l.code));
  });

  it('eksik anahtarda İngilizce\'ye, o da yoksa anahtara düşer', () => {
    expect(translate('de', 'admin.title')).toBe(en['admin.title']);
    expect(translate('de', 'olmayan.anahtar')).toBe('olmayan.anahtar');
  });

  it('değişkenleri yerleştirir', () => {
    expect(translate('ru', 'win.solved_in', { n: 12 })).toContain('12');
    expect(translate('pl', 'home.play_next', { sector: 2, level: 5 })).toMatch(/2.*5/);
  });
});
