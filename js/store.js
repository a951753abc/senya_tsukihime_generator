/**
 * 角色卡狀態 store — pub/sub + LocalStorage 自動同步
 * Schema 對齊 data/schema/character.json (v2.0)
 */

export const SCHEMA_VERSION = '2.0';
export const LS_KEY = 'senya-generator-state-v2';

const ABILITY_KEYS = ['physical', 'perception', 'reason', 'will'];
const ELEMENT_KEYS = ['earth', 'water', 'fire', 'wind', 'void'];

function emptyAbilityCell() {
  return { base: 0, mod1: 0, mod2: 0, mod3: 0, special: 0 };
}

export function defaultCharacter() {
  const now = new Date().toISOString();
  const abilities = {};
  for (const k of ABILITY_KEYS) abilities[k] = emptyAbilityCell();

  const elements = {};
  for (const k of ELEMENT_KEYS) elements[k] = 0;

  return {
    id: crypto.randomUUID(),
    schemaVersion: SCHEMA_VERSION,
    meta: {
      name: '', yomi: '', player: '', campaign: '', seal: '',
      createdAt: now, updatedAt: now,
    },
    personal: {
      race: '', society: '', age: '', gender: '', appearance: '',
    },
    progression: {
      remainingExp: 0,
      initial: '',
    },
    classes: [],
    styles: [],
    stats: {
      abilities,
      elements,
      elementsExtra: [],
    },
    skills: {
      equipped: [],
      common: [],
      infiniteDestruction: [],
    },
    items: {
      tier1to3: [],
      tier4to6: [],
      tier7to9: [],
    },
    relationships: [],
    setting: {
      background: '', personality: '', history: '', memo: '',
    },
    session: {
      sessionNum: 0,
      loopCurrent: 0,
      loopTotal: 0,
      lastSavedAt: null,
      lastExportedAt: null,
    },
  };
}

function emptyState() {
  return { schemaVersion: SCHEMA_VERSION, cards: [], activeCardId: null };
}

function loadFromLS() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    if (parsed?.schemaVersion !== SCHEMA_VERSION) return emptyState();
    if (!Array.isArray(parsed.cards)) return emptyState();
    return parsed;
  } catch {
    return emptyState();
  }
}

function saveToLS(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    // quota exceeded or LS disabled — fail silent
  }
}

export function createStore() {
  let state = loadFromLS();
  const subs = new Set();

  function notify() {
    saveToLS(state);
    for (const cb of subs) cb(state);
  }

  return {
    getState() {
      return state;
    },

    subscribe(cb) {
      subs.add(cb);
      return () => subs.delete(cb);
    },

    newCard() {
      const card = defaultCharacter();
      state = {
        ...state,
        cards: [...state.cards, card],
        activeCardId: card.id,
      };
      notify();
      return card.id;
    },

    setActiveCard(id) {
      if (state.activeCardId === id) return;
      state = { ...state, activeCardId: id };
      notify();
    },

    updateCard(id, mutator) {
      const idx = state.cards.findIndex(c => c.id === id);
      if (idx === -1) return;
      const next = structuredClone(state.cards[idx]);
      mutator(next);
      next.meta.updatedAt = new Date().toISOString();
      const cards = state.cards.slice();
      cards[idx] = next;
      state = { ...state, cards };
      notify();
    },

    deleteCard(id) {
      const cards = state.cards.filter(c => c.id !== id);
      let activeCardId = state.activeCardId;
      if (activeCardId === id) {
        activeCardId = cards[0]?.id ?? null;
      }
      state = { ...state, cards, activeCardId };
      notify();
    },
  };
}
