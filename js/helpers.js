/**
 * 共用工具：DOM、路徑式欄位綁定、HTML 跳脫
 */

export function getActiveCard(state) {
  if (!state?.activeCardId) return null;
  return state.cards.find(c => c.id === state.activeCardId) || null;
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[<>&"']/g, c => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/** 取巢狀路徑值，例如 getPath(obj, "stats.abilities.physical.base") */
export function getPath(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

/** 寫入巢狀路徑（自動建立缺的物件） */
export function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => {
    if (o[k] == null || typeof o[k] !== 'object') o[k] = {};
    return o[k];
  }, obj);
  target[last] = value;
}

function readInputValue(inp) {
  if (inp.type === 'number') {
    if (inp.value === '' || inp.value === '-') return 0;
    const n = Number(inp.value);
    return Number.isFinite(n) ? n : 0;
  }
  if (inp.type === 'checkbox') return inp.checked;
  return inp.value;
}

function writeInputValue(inp, v) {
  if (inp.type === 'checkbox') {
    inp.checked = !!v;
  } else {
    const s = v == null ? '' : String(v);
    if (inp.value !== s) inp.value = s;
  }
}

/**
 * 對 root 內所有 [data-field="path.to.value"] 元素：
 * - 監聽 input 事件 → store.updateCard 寫入路徑
 */
export function bindFields(rootEl, store) {
  rootEl.addEventListener('input', e => {
    const inp = e.target;
    const path = inp.dataset?.field;
    if (!path) return;
    const id = store.getState().activeCardId;
    if (!id) return;
    const value = readInputValue(inp);
    store.updateCard(id, c => setPath(c, path, value));
  });
}

/**
 * 把 card 當前狀態套到 root 內所有 [data-field] 元素。
 * 跳過目前 focus 中的元素以避免覆蓋使用者打字。
 */
export function applyFields(rootEl, card) {
  if (!card) return;
  rootEl.querySelectorAll('[data-field]').forEach(inp => {
    if (inp === document.activeElement) return;
    const v = getPath(card, inp.dataset.field);
    writeInputValue(inp, v);
  });
}
