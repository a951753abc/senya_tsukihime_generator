import { describe, test, expect, beforeEach, vi } from 'vitest';
import { createStore, defaultCharacter, SCHEMA_VERSION, LS_KEY } from '../js/store.js';

beforeEach(() => {
  localStorage.clear();
});

describe('defaultCharacter shape', () => {
  test('schemaVersion = 2.0', () => {
    expect(defaultCharacter().schemaVersion).toBe(SCHEMA_VERSION);
    expect(SCHEMA_VERSION).toBe('2.0');
  });

  test('id 為 UUID 字串', () => {
    const c = defaultCharacter();
    expect(typeof c.id).toBe('string');
    expect(c.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  test('meta 含必要欄位 + ISO 時間戳', () => {
    const c = defaultCharacter();
    expect(c.meta).toMatchObject({
      name: '', yomi: '', player: '', campaign: '', seal: ''
    });
    expect(c.meta.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(c.meta.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('personal 5 欄位空字串', () => {
    expect(defaultCharacter().personal).toEqual({
      race: '', society: '', age: '', gender: '', appearance: ''
    });
  });

  test('progression 預設 remainingExp=0、initial=空字串（characterLevel 派生不入庫）', () => {
    expect(defaultCharacter().progression).toEqual({
      remainingExp: 0, initial: ''
    });
  });

  test('classes 為空陣列（無預設級別）', () => {
    expect(defaultCharacter().classes).toEqual([]);
  });

  test('styles 為空陣列', () => {
    expect(defaultCharacter().styles).toEqual([]);
  });

  test('stats.abilities 4 屬性，每個 5 欄全 0', () => {
    const a = defaultCharacter().stats.abilities;
    for (const k of ['physical', 'perception', 'reason', 'will']) {
      expect(a[k]).toEqual({ base: 0, mod1: 0, mod2: 0, mod3: 0, special: 0 });
    }
  });

  test('stats.elements 5 元素全 0 + extras 空陣列', () => {
    const s = defaultCharacter().stats;
    expect(s.elements).toEqual({ earth: 0, water: 0, fire: 0, wind: 0, void: 0 });
    expect(s.elementsExtra).toEqual([]);
  });

  test('skills 三組空陣列', () => {
    expect(defaultCharacter().skills).toEqual({
      equipped: [], common: [], infiniteDestruction: []
    });
  });

  test('items 三階空陣列', () => {
    expect(defaultCharacter().items).toEqual({
      tier1to3: [], tier4to6: [], tier7to9: []
    });
  });

  test('relationships 空陣列', () => {
    expect(defaultCharacter().relationships).toEqual([]);
  });

  test('setting 4 區塊空字串', () => {
    expect(defaultCharacter().setting).toEqual({
      background: '', personality: '', history: '', memo: ''
    });
  });

  test('session 預設值', () => {
    const s = defaultCharacter().session;
    expect(s.sessionNum).toBe(0);
    expect(s.loopCurrent).toBe(0);
    expect(s.loopTotal).toBe(0);
  });

  test('每次呼叫產生不同 id', () => {
    expect(defaultCharacter().id).not.toBe(defaultCharacter().id);
  });
});

describe('createStore — 基本 CRUD', () => {
  test('初始狀態 cards 空陣列、無 active', () => {
    const store = createStore();
    expect(store.getState().cards).toEqual([]);
    expect(store.getState().activeCardId).toBe(null);
  });

  test('newCard 加一張並設為 active，回傳 id', () => {
    const store = createStore();
    const id = store.newCard();
    expect(typeof id).toBe('string');
    expect(store.getState().cards).toHaveLength(1);
    expect(store.getState().cards[0].id).toBe(id);
    expect(store.getState().activeCardId).toBe(id);
  });

  test('newCard 多張 + activeCardId 跟著最後一張', () => {
    const store = createStore();
    const a = store.newCard();
    const b = store.newCard();
    const c = store.newCard();
    expect(store.getState().cards).toHaveLength(3);
    expect(store.getState().activeCardId).toBe(c);
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
  });

  test('setActiveCard 切換 active', () => {
    const store = createStore();
    const a = store.newCard();
    const b = store.newCard();
    store.setActiveCard(a);
    expect(store.getState().activeCardId).toBe(a);
  });

  test('updateCard 用 mutator pattern 修改 + 觸發 subscribe', () => {
    const store = createStore();
    const id = store.newCard();
    const cb = vi.fn();
    store.subscribe(cb);

    store.updateCard(id, c => {
      c.meta.name = '久遠寺 透';
      c.meta.yomi = 'クオンジ・トオル';
    });

    expect(cb).toHaveBeenCalled();
    const card = store.getState().cards[0];
    expect(card.meta.name).toBe('久遠寺 透');
    expect(card.meta.yomi).toBe('クオンジ・トオル');
  });

  test('updateCard 自動更新 meta.updatedAt', async () => {
    const store = createStore();
    const id = store.newCard();
    const before = store.getState().cards[0].meta.updatedAt;
    await new Promise(r => setTimeout(r, 5));
    store.updateCard(id, c => { c.meta.name = '改'; });
    const after = store.getState().cards[0].meta.updatedAt;
    expect(after > before).toBe(true);
  });

  test('updateCard 不存在的 id 不丟錯、不變更', () => {
    const store = createStore();
    store.newCard();
    const before = JSON.stringify(store.getState());
    store.updateCard('nonexistent-id', c => { c.meta.name = '不會被改'; });
    expect(JSON.stringify(store.getState())).toBe(before);
  });

  test('deleteCard 移除指定 + active 自動切到剩下第一張', () => {
    const store = createStore();
    const a = store.newCard();
    const b = store.newCard();
    store.deleteCard(a);
    expect(store.getState().cards).toHaveLength(1);
    expect(store.getState().cards[0].id).toBe(b);
    expect(store.getState().activeCardId).toBe(b);
  });

  test('deleteCard 最後一張 → activeCardId = null', () => {
    const store = createStore();
    const a = store.newCard();
    store.deleteCard(a);
    expect(store.getState().cards).toEqual([]);
    expect(store.getState().activeCardId).toBe(null);
  });

  test('deleteCard 非 active 卡，active 不變', () => {
    const store = createStore();
    const a = store.newCard();
    const b = store.newCard();
    store.setActiveCard(a);
    store.deleteCard(b);
    expect(store.getState().activeCardId).toBe(a);
    expect(store.getState().cards.map(c => c.id)).toEqual([a]);
  });
});

describe('createStore — 巢狀欄位 mutation', () => {
  test('深層欄位（abilities.base）改動正常', () => {
    const store = createStore();
    const id = store.newCard();
    store.updateCard(id, c => {
      c.stats.abilities.physical.base = 4;
      c.stats.abilities.physical.mod1 = 2;
    });
    expect(store.getState().cards[0].stats.abilities.physical).toEqual({
      base: 4, mod1: 2, mod2: 0, mod3: 0, special: 0
    });
  });

  test('classes 多級別槽 push', () => {
    const store = createStore();
    const id = store.newCard();
    store.updateCard(id, c => {
      c.classes.push({ id: 'og', name: '古神道', tier: 'advanced', level: 4, isPrimary: true });
      c.classes.push({ id: 'majutushi', name: '魔術師', tier: 'basic', level: 2, isPrimary: false });
    });
    const classes = store.getState().cards[0].classes;
    expect(classes).toHaveLength(2);
    expect(classes[0]).toMatchObject({ id: 'og', isPrimary: true });
    expect(classes[1]).toMatchObject({ id: 'majutushi', isPrimary: false });
  });

  test('relationships 加 + bond 計算', () => {
    const store = createStore();
    const id = store.newCard();
    store.updateCard(id, c => {
      c.relationships.push({ name: '霧宮 茜', isNpc: false, emotion: '獨占欲', tone: 'crazy', bond: 4, note: '' });
      c.relationships.push({ name: '朱鷺宮 縁', isNpc: false, emotion: '信賴', tone: 'pure', bond: 2, note: '' });
    });
    expect(store.getState().cards[0].relationships).toHaveLength(2);
  });
});

describe('createStore — LocalStorage persistence', () => {
  test('LS_KEY 命名清楚', () => {
    expect(LS_KEY).toBe('senya-generator-state-v2');
  });

  test('newCard 之後 LS 立即同步', () => {
    const store = createStore();
    store.newCard();
    const saved = JSON.parse(localStorage.getItem(LS_KEY));
    expect(saved.cards).toHaveLength(1);
  });

  test('重啟新 store 讀回上次狀態', () => {
    const s1 = createStore();
    const id = s1.newCard();
    s1.updateCard(id, c => { c.meta.name = '永続テスト'; });

    const s2 = createStore();
    expect(s2.getState().cards).toHaveLength(1);
    expect(s2.getState().cards[0].meta.name).toBe('永続テスト');
    expect(s2.getState().activeCardId).toBe(id);
  });

  test('LS 損壞時 fallback 到空狀態', () => {
    localStorage.setItem(LS_KEY, '{ broken json');
    const store = createStore();
    expect(store.getState().cards).toEqual([]);
    expect(store.getState().activeCardId).toBe(null);
  });

  test('LS schemaVersion 不符時忽略舊資料', () => {
    localStorage.setItem(LS_KEY, JSON.stringify({
      schemaVersion: '1.0',
      cards: [{ id: 'old', meta: {} }],
      activeCardId: 'old'
    }));
    const store = createStore();
    expect(store.getState().cards).toEqual([]);
    expect(store.getState().activeCardId).toBe(null);
  });
});

describe('createStore — pub/sub', () => {
  test('subscribe 回傳 unsubscribe 函式', () => {
    const store = createStore();
    const cb = vi.fn();
    const unsub = store.subscribe(cb);
    store.newCard();
    expect(cb).toHaveBeenCalledTimes(1);
    unsub();
    store.newCard();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test('多個 subscriber 都收到通知', () => {
    const store = createStore();
    const a = vi.fn();
    const b = vi.fn();
    store.subscribe(a);
    store.subscribe(b);
    store.newCard();
    expect(a).toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
  });
});
