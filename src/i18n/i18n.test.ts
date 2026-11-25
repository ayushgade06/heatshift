import { describe, expect, it } from 'vitest';
import { fmtDuration, LANGS, STRINGS, t } from './strings';

describe('i18n', () => {
  const keys = Object.keys(STRINGS.en);

  it.each(LANGS)('%s defines every key with the same placeholders', (lang) => {
    expect(Object.keys(STRINGS[lang]).sort()).toEqual([...keys].sort());
    for (const k of keys) {
      const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
      expect(STRINGS[lang][k as keyof typeof STRINGS.en].trim(), `${lang}.${k}`).not.toBe('');
      expect(ph(STRINGS[lang][k as keyof typeof STRINGS.en]), `${lang}.${k}`).toEqual(ph(STRINGS.en[k as keyof typeof STRINGS.en]));
    }
  });

  it('fills placeholders', () => {
    expect(t('en', 'cardPattern', { time: '14:00', work: 50, rest: 10 })).toBe('14:00: work 50 min, rest 10 min in shade');
    expect(t('en', 'cardPattern')).toContain('{time}');
  });

  it('formats durations', () => {
    expect(fmtDuration('en', 350)).toBe('5 h 50 m');
    expect(fmtDuration('en', 480)).toBe('8 h');
    expect(fmtDuration('en', 40)).toBe('40 m');
  });
});
