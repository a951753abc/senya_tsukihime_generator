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

describe('deriveAll — 千夜月姬權威公式', () => {
  function richChar() {
    const c = defaultCharacter();
    // 假設 attrs.js 已 sync 好（mod_i = baseAbility[k] × cls.level）
    // 體 7 = 4+2+1，知 5 = 3+1+1，理 8 = 5+2+0+0+1，意 6 = 4+1+1
    c.stats.abilities.physical   = { base: 4, mod1: 2, mod2: 1, mod3: 0, special: 0 };
    c.stats.abilities.perception = { base: 3, mod1: 1, mod2: 1, mod3: 0, special: 0 };
    c.stats.abilities.reason     = { base: 5, mod1: 2, mod2: 0, mod3: 0, special: 1 };
    c.stats.abilities.will       = { base: 4, mod1: 1, mod2: 1, mod3: 0, special: 0 };
    c.classes = [
      { id: 'og', name: '古神道', tier: 'advanced', level: 4, isPrimary: true },
      { id: 'majutushi', name: '魔術師', tier: 'basic', level: 2, isPrimary: false },
    ];
    return c;
  }

  test('屬性合計', () => {
    const d = deriveAll(richChar());
    expect(d.totals).toEqual({ physical: 7, perception: 5, reason: 8, will: 6 });
  });

  test('能力紅利 = ⌊合計/3⌋', () => {
    const d = deriveAll(richChar());
    expect(d.bonus).toEqual({ physical: 2, perception: 1, reason: 2, will: 2 });
  });

  test('characterLevel = 4 + 2 = 6', () => {
    expect(deriveAll(richChar()).characterLevel).toBe(6);
  });

  test('無 levelDataMap：modSum 全 0，戰鬥值 = 紅利+紅利', () => {
    const d = deriveAll(richChar());
    expect(d.modSum).toEqual({ melee: 0, ranged: 0, psychic: 0, action: 0, hp: 0, tp: 0, defense: 0 });
    expect(d.combat.melee).toBe(2 + 1);
    expect(d.combat.ranged).toBe(1 + 2);
    expect(d.combat.psychic).toBe(2 + 2);
    expect(d.combat.action).toBe(2 + 2);
    expect(d.defense).toBe(0);
  });

  test('HP = (紅利_體+紅利_理) × max(角色等級, 5) + modSum.hp，無 modSum 時 = 4×6 = 24', () => {
    expect(deriveAll(richChar()).hp).toBe((2 + 2) * 6);
  });

  test('TP = (紅利_知+紅利_意) × 5 + modSum.tp，無 modSum 時 = 3×5 = 15', () => {
    expect(deriveAll(richChar()).tp).toBe((1 + 2) * 5);
  });

  test('角色等級 < 5 時 HP 公式取 max(等級, 5)', () => {
    const c = richChar();
    c.classes = [{ id: 'og', level: 2, isPrimary: true }];
    // bonus 不變（abilities 沒重 sync 在這 test 中），HP = (2+2) × 5 = 20
    expect(deriveAll(c).hp).toBe((2 + 2) * 5);
  });

  test('帶 levelDataMap：戰鬥值 + modifierTable 修正', () => {
    const ogData = {
      modifierTable: {
        melee:   [-1, 0, 2, 3, 4, 5, 6, 7, 8, 9],
        ranged:  [-1, 0, 2, 3, 4, 5, 6, 7, 8, 9],
        psychic: [-1, 2, 3, 4, 7, 9, 11, 13, 15, 17],
        action:  [-2,-1, 0, 1, 3, 4, 5, 6, 7, 8],
        hp:      [ 0, 5,11,17,20,22,24,26,28,30],
        tp:      [ 4, 6, 8,11,14,16,17,18,19,20],
        defense: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      },
    };
    const map = new Map([['og', ogData]]);
    const c = richChar();
    c.classes = [{ id: 'og', level: 4, isPrimary: true }];  // og lv4 → idx 3
    const d = deriveAll(c, map);
    // og lv4 mods: melee=3, hp=17, tp=11, defense=0
    expect(d.modSum.melee).toBe(3);
    expect(d.modSum.hp).toBe(17);
    expect(d.modSum.tp).toBe(11);
    expect(d.combat.melee).toBe(2 + 1 + 3); // bonus_phys + bonus_perc + mod_melee
    expect(d.hp).toBe((2 + 2) * 5 + 17);     // (紅利體+紅利理) × max(4,5) + 17
    expect(d.defense).toBe(0);
  });

  test('多級別槽：modSum 累加每槽', () => {
    const ogData = { modifierTable: { melee:[0,0,0,0], ranged:[0,0,0,0], psychic:[0,0,0,0], action:[0,0,0,0], hp:[1,2,3,4], tp:[1,2,3,4], defense:[0,0,0,0] } };
    const mjData = { modifierTable: { melee:[0,0,0,0], ranged:[0,0,0,0], psychic:[0,0,0,0], action:[0,0,0,0], hp:[10,20,30,40], tp:[5,10,15,20], defense:[0,0,0,0] } };
    const map = new Map([['og', ogData], ['majutushi', mjData]]);
    const c = richChar();
    c.classes = [
      { id: 'og', level: 3, isPrimary: true },          // hp 3
      { id: 'majutushi', level: 2, isPrimary: false },  // hp 20
    ];
    const d = deriveAll(c, map);
    expect(d.modSum.hp).toBe(3 + 20);
  });

  test('元素是純資訊欄，不進戰鬥值', () => {
    const c = richChar();
    c.stats.elements.fire = 99;
    c.stats.elements.wind = 99;
    expect(deriveAll(c).combat.melee).toBe(2 + 1); // 不受 fire 影響
    expect(deriveAll(c).combat.ranged).toBe(1 + 2);
  });

  test('class.level > 10 取最後一級的 modifier', () => {
    const ogData = { modifierTable: { melee:[1,1,1,1,1,1,1,1,1,9], ranged:[0,0,0,0,0,0,0,0,0,0], psychic:[0,0,0,0,0,0,0,0,0,0], action:[0,0,0,0,0,0,0,0,0,0], hp:[0,0,0,0,0,0,0,0,0,0], tp:[0,0,0,0,0,0,0,0,0,0], defense:[0,0,0,0,0,0,0,0,0,0] } };
    const map = new Map([['og', ogData]]);
    const c = richChar();
    c.classes = [{ id: 'og', level: 15, isPrimary: true }];
    expect(deriveAll(c, map).modSum.melee).toBe(9);  // index 9（最後一格）
  });

  test('返回值含完整 keys', () => {
    const d = deriveAll(richChar());
    expect(Object.keys(d).sort()).toEqual(
      ['bond', 'bonus', 'characterLevel', 'combat', 'defense', 'hp', 'modSum', 'tp', 'totals'].sort()
    );
  });
});

describe('deriveAll — 你舉的範例：起始選擇魔術師三等', () => {
  test('魔術師 LV3 純單一級別，公式驗算', () => {
    const c = defaultCharacter();
    // 規則：mod_1 = baseAbility × level
    // 魔術師 baseAbility = {體 2, 知 3, 理 5, 意 2}, level=3
    c.stats.abilities.physical   = { base: 0, mod1: 2*3, mod2: 0, mod3: 0, special: 0 }; // 6
    c.stats.abilities.perception = { base: 0, mod1: 3*3, mod2: 0, mod3: 0, special: 0 }; // 9
    c.stats.abilities.reason     = { base: 0, mod1: 5*3, mod2: 0, mod3: 0, special: 0 }; // 15
    c.stats.abilities.will       = { base: 0, mod1: 2*3, mod2: 0, mod3: 0, special: 0 }; // 6
    c.classes = [{ id: 'majutushi', level: 3, isPrimary: true }];

    // 魔術師 modifierTable @ lv3 (idx=2)
    const mjData = {
      modifierTable: {
        melee:   [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8],
        ranged:  [ 0, 1, 2, 3, 6, 8,10,12,14,16],
        psychic: [ 0, 1, 2, 3, 6, 8,10,12,14,16],
        action:  [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8],
        hp:      [ 0, 3, 9,15,20,22,24,26,28,30],
        tp:      [ 8,11,13,15,17,20,23,26,28,30],
        defense: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      },
    };
    const map = new Map([['majutushi', mjData]]);
    const d = deriveAll(c, map);

    expect(d.totals).toEqual({ physical: 6, perception: 9, reason: 15, will: 6 });
    expect(d.bonus).toEqual({ physical: 2, perception: 3, reason: 5, will: 2 });
    expect(d.modSum.melee).toBe(1);
    expect(d.modSum.hp).toBe(9);
    expect(d.modSum.tp).toBe(13);
    expect(d.combat.melee).toBe(2 + 3 + 1);   // 6
    expect(d.combat.ranged).toBe(3 + 5 + 2);  // 10
    expect(d.combat.psychic).toBe(5 + 2 + 2); // 9
    expect(d.combat.action).toBe(2 + 2 + 1);  // 5
    expect(d.hp).toBe((2 + 5) * 5 + 9);       // 7×5 + 9 = 44
    expect(d.tp).toBe((3 + 2) * 5 + 13);      // 5×5 + 13 = 38
  });
});
