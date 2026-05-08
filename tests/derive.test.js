import { describe, test, expect } from 'vitest';
import {
  abilityTotal,
  characterLevel,
  deriveBond,
  deriveAll,
  abilityToPercent,
} from '../js/derive.js';
import { defaultCharacter } from '../js/store.js';

describe('abilityTotal', () => {
  test('5 欄相加', () => {
    expect(abilityTotal({ base: 4, mod1: 2, mod2: 1, mod3: 0, special: 0 })).toBe(7);
    expect(abilityTotal({ base: 5, mod1: 2, mod2: 0, mod3: 0, special: 1 })).toBe(8);
  });

  test('缺欄位視為 0', () => {
    expect(abilityTotal({ base: 3 })).toBe(3);
    expect(abilityTotal({})).toBe(0);
  });

  test('負值正確相減', () => {
    expect(abilityTotal({ base: 4, mod1: 0, mod2: 0, mod3: 0, special: -1 })).toBe(3);
  });
});

describe('characterLevel', () => {
  test('級別空陣列 = 0', () => {
    expect(characterLevel([])).toBe(0);
  });

  test('多級別合計', () => {
    expect(characterLevel([
      { id: 'og', level: 4, isPrimary: true },
      { id: 'majutushi', level: 2, isPrimary: false },
    ])).toBe(6);
  });

  test('忽略缺 level 的項', () => {
    expect(characterLevel([{ id: 'x' }, { id: 'y', level: 3 }])).toBe(3);
  });
});

describe('abilityToPercent (slider %)', () => {
  test('1 → 0%, 10 → 100%, 中間線性', () => {
    expect(abilityToPercent(1)).toBeCloseTo(0, 0);
    expect(abilityToPercent(10)).toBeCloseTo(100, 0);
    expect(abilityToPercent(5)).toBeCloseTo(44.4, 0);
  });

  test('低於 1 / 高於 10 各夾在邊界', () => {
    expect(abilityToPercent(0)).toBe(0);
    expect(abilityToPercent(15)).toBe(100);
    expect(abilityToPercent(-5)).toBe(0);
  });
});

describe('deriveBond — 羈絆值合計', () => {
  test('空關係 → 0/0/0', () => {
    expect(deriveBond([])).toEqual({ total: 0, pure: 0, crazy: 0 });
  });

  test('純潔淨色調', () => {
    expect(deriveBond([
      { tone: 'pure', bond: 2 },
      { tone: 'pure', bond: 4 },
    ])).toEqual({ total: 6, pure: 6, crazy: 0 });
  });

  test('混合色調', () => {
    expect(deriveBond([
      { tone: 'pure', bond: 2 },
      { tone: 'crazy', bond: 4 },
      { tone: 'pure', bond: 2 },
      { tone: 'crazy', bond: 4 },
    ])).toEqual({ total: 12, pure: 4, crazy: 8 });
  });

  test('缺 tone 不計入 pure/crazy 但計入 total', () => {
    expect(deriveBond([{ bond: 5 }])).toEqual({ total: 5, pure: 0, crazy: 0 });
  });
});

describe('deriveAll — v3 設計範例（久遠寺 透 LV6 古神道+魔術師）', () => {
  function makeChar() {
    const c = defaultCharacter();
    // 體力 4+2+1 = 7
    c.stats.abilities.physical = { base: 4, mod1: 2, mod2: 1, mod3: 0, special: 0 };
    // 知覺 3+1+1 = 5
    c.stats.abilities.perception = { base: 3, mod1: 1, mod2: 1, mod3: 0, special: 0 };
    // 理智 5+2+0+0+1 = 8
    c.stats.abilities.reason = { base: 5, mod1: 2, mod2: 0, mod3: 0, special: 1 };
    // 意志 4+1+1 = 6
    c.stats.abilities.will = { base: 4, mod1: 1, mod2: 1, mod3: 0, special: 0 };
    c.stats.elements = { earth: 2, water: 3, fire: 5, wind: 1, void: 4 };
    c.classes = [
      { id: 'og', name: '古神道', tier: 'advanced', level: 4, isPrimary: true },
      { id: 'majutushi', name: '魔術師', tier: 'basic', level: 2, isPrimary: false },
    ];
    return c;
  }

  test('屬性合計', () => {
    const d = deriveAll(makeChar());
    expect(d.totals).toEqual({ physical: 7, perception: 5, reason: 8, will: 6 });
  });

  test('characterLevel = 4 + 2 = 6', () => {
    expect(deriveAll(makeChar()).characterLevel).toBe(6);
  });

  test('HP = 体力×6 + Lv×2 = 7×6 + 6×2 = 54', () => {
    expect(deriveAll(makeChar()).hp).toBe(54);
  });

  test('TP = 理智×4 + 意志×2 + Lv = 8×4 + 6×2 + 6 = 50', () => {
    expect(deriveAll(makeChar()).tp).toBe(50);
  });

  test('近戰 = 体7 + Lv/2(3) + 火5 = 15', () => {
    // v3 design demo says 11 with 火1 — 但範例有改 elements.fire=5 所以是 15。把 fire=1 才得 11
    const c = makeChar();
    c.stats.elements.fire = 1;
    expect(deriveAll(c).combat.melee).toBe(11);
  });

  test('射擊 = 知5 + Lv/2(3) + 風1 = 9', () => {
    const c = makeChar();
    c.stats.elements.wind = 1;
    expect(deriveAll(c).combat.ranged).toBe(9);
  });

  test('精神 = 理8 + Lv/2(3) + 空3 = 14', () => {
    const c = makeChar();
    c.stats.elements.void = 3;
    expect(deriveAll(c).combat.psychic).toBe(14);
  });

  test('行動 = 意6 + Lv/2(3) + 風1 = 10', () => {
    const c = makeChar();
    c.stats.elements.wind = 1;
    expect(deriveAll(c).combat.action).toBe(10);
  });

  test('Lv 為奇數 → halfLv 取下整', () => {
    const c = makeChar();
    c.classes = [{ id: 'kenshi', level: 5, isPrimary: true }];
    // halfLv = floor(5/2) = 2
    // 近戰 = physical(7) + 2 + fire = 9 + fire
    c.stats.elements.fire = 0;
    expect(deriveAll(c).combat.melee).toBe(9);
  });

  test('無級別 → Lv = 0', () => {
    const c = makeChar();
    c.classes = [];
    const d = deriveAll(c);
    expect(d.characterLevel).toBe(0);
    expect(d.hp).toBe(7 * 6 + 0); // 42
  });

  test('返回值含 totals/hp/tp/combat/defense/bond/characterLevel', () => {
    const d = deriveAll(makeChar());
    expect(Object.keys(d).sort()).toEqual(
      ['bond', 'characterLevel', 'combat', 'defense', 'hp', 'totals', 'tp'].sort()
    );
  });

  test('defense 預設 0（待 Phase 1-D 接 modifierTable）', () => {
    expect(deriveAll(makeChar()).defense).toBe(0);
  });
});
