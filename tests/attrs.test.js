import { afterEach, beforeEach, describe, test, expect, vi } from 'vitest';
import { abilityModFromClassBase, mountAttrs, shouldSyncAbilityMods } from '../js/ui/attrs.js';
import { clearCache } from '../js/data-loader.js';
import { createStore } from '../js/store.js';

const LEVELS = {
  './data/levels/majutushi.json': {
    baseAbilities: { physical: 2, perception: 3, reason: 5, will: 2 },
  },
  './data/levels/og.json': {
    baseAbilities: { physical: 1, perception: 2, reason: 4, will: 3 },
  },
};

let originalFetch;

beforeEach(() => {
  localStorage.clear();
  originalFetch = globalThis.fetch;
  globalThis.fetch = vi.fn(async path => ({
    ok: Boolean(LEVELS[path]),
    status: LEVELS[path] ? 200 : 404,
    json: async () => LEVELS[path],
  }));
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  clearCache();
  document.body.innerHTML = '';
});

function tick() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

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

describe('shouldSyncAbilityMods', () => {
  test('預設會自動同步級別修正', () => {
    expect(shouldSyncAbilityMods({ stats: {} })).toBe(true);
    expect(shouldSyncAbilityMods({ stats: { abilityModsManual: false } })).toBe(true);
  });

  test('手動模式停止自動同步級別修正', () => {
    expect(shouldSyncAbilityMods({ stats: { abilityModsManual: true } })).toBe(false);
  });
});

describe('mountAttrs', () => {
  test('級別修正可切成手動並保留玩家輸入', async () => {
    const store = createStore();
    const id = store.newCard();
    store.updateCard(id, c => {
      c.classes = [{ id: 'majutushi', name: '魔術師', tier: 'basic', level: 3, isPrimary: true }];
    });

    const root = document.createElement('section');
    document.body.appendChild(root);
    mountAttrs(root, store);
    await tick();
    await tick();

    const physicalMod1 = root.querySelector('[data-field="stats.abilities.physical.mod1"]');
    expect(physicalMod1.value).toBe('2');
    expect(physicalMod1.readOnly).toBe(true);

    const toggle = root.querySelector('[data-action="toggle-ability-mods-manual"]');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
    await tick();

    expect(store.getState().cards[0].stats.abilityModsManual).toBe(true);
    expect(physicalMod1.readOnly).toBe(false);

    physicalMod1.value = '9';
    physicalMod1.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();

    store.updateCard(id, c => {
      c.classes[0].id = 'og';
      c.classes[0].name = '古神道';
    });
    await tick();
    await tick();

    expect(store.getState().cards[0].stats.abilities.physical.mod1).toBe(9);
    expect(root.querySelector('[data-field="stats.abilities.physical.mod1"]').value).toBe('9');
  });
});
