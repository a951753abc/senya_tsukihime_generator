import { describe, test, expect } from 'vitest';
import { defaultCharacter } from '../js/store.js';
import { toCcfolia } from '../js/exporters/ccfolia.js';

describe('toCcfolia', () => {
  test('產出 ccfolia character payload 結構正確', () => {
    const out = toCcfolia(defaultCharacter());
    expect(out.kind).toBe('character');
    expect(out.data).toBeDefined();
    expect(out.data.name).toBe('無名');
    expect(out.data.params).toBeInstanceOf(Array);
    expect(out.data.status).toBeInstanceOf(Array);
    expect(typeof out.data.commands).toBe('string');
  });

  test('豐富角色：name / params 含戰鬥值 / status 含 HP/TP', () => {
    const c = defaultCharacter();
    c.meta.name = '久遠寺 透';
    c.meta.player = 'A';
    c.classes = [
      { id: 'og', name: '古神道', tier: 'advanced', level: 4, isPrimary: true },
      { id: 'majutushi', name: '魔術師', tier: 'basic', level: 2, isPrimary: false },
    ];
    c.stats.abilities.physical = { base: 4, mod1: 2, mod2: 1, mod3: 0, special: 0 };
    c.stats.abilities.reason = { base: 5, mod1: 2, mod2: 0, mod3: 0, special: 1 };
    c.stats.abilities.will = { base: 4, mod1: 1, mod2: 1, mod3: 0, special: 0 };
    const out = toCcfolia(c);
    expect(out.data.name).toBe('久遠寺 透');
    const findParam = (label) => out.data.params.find(p => p.label === label)?.value;
    expect(findParam('體力')).toBe('7');
    expect(findParam('理智')).toBe('8');
    expect(findParam('級別')).toBe('古神道LV4/魔術師LV2');
    const hp = out.data.status.find(s => s.label === 'HP');
    expect(typeof hp.value).toBe('number');
    expect(hp.max).toBe(hp.value);
    expect(out.data.commands).toContain('2d6');
    expect(out.data.commands).toContain('近戰');
  });
});
