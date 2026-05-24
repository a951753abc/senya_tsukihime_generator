import { describe, test, expect } from 'vitest';
import { abilityModFromClassBase } from '../js/ui/attrs.js';

describe('abilityModFromClassBase', () => {
  test('級別基本能力只套用一次，不乘上級別等級', () => {
    const baseAbilities = { physical: 2, perception: 3, reason: 5, will: 2 };
    expect(abilityModFromClassBase(baseAbilities)).toEqual({
      physical: 2,
      perception: 3,
      reason: 5,
      will: 2,
    });
  });

  test('缺欄位視為 0', () => {
    expect(abilityModFromClassBase({ physical: 4 })).toEqual({
      physical: 4,
      perception: 0,
      reason: 0,
      will: 0,
    });
  });
});
