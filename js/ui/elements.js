/** 5 元素（地水火風空）+ 例外屬性（自由追加） */

import { bindFields, applyFields, getActiveCard, escapeHtml } from '../helpers.js';

const ELEMS = [
  ['earth', '地'],
  ['water', '水'],
  ['fire',  '火'],
  ['wind',  '風'],
  ['void',  '空'],
];

export function mountElements(rootEl, store) {
  rootEl.innerHTML = `
    <div class="elem-row">
      <div class="label">五大</div>
      ${ELEMS.map(([k, n]) => `
        <div class="elem" data-elem="${k}">
          <span class="gl">${n}</span>
          <input class="v" type="number" min="0" data-field="stats.elements.${k}" data-elem-input>
        </div>
      `).join('')}
    </div>
    <div class="elem-extra">
      <div class="label">例外</div>
      <div class="chips" data-chips></div>
      <span class="hint">劇本／流派專用屬性</span>
    </div>
  `;

  // 把 input 樣式對齊原本 .v 的字級
  rootEl.querySelectorAll('[data-elem-input]').forEach(inp => {
    Object.assign(inp.style, {
      flex: '1', textAlign: 'right', background: 'transparent',
      border: '0', outline: 'none', font: 'inherit', width: '100%',
    });
  });

  const chipsEl = rootEl.querySelector('[data-chips]');

  function renderChips() {
    const card = getActiveCard(store.getState());
    if (!card) { chipsEl.innerHTML = ''; return; }
    const extras = card.stats.elementsExtra || [];
    chipsEl.innerHTML = extras.map((e, i) => `
      <span class="elem-x" data-idx="${i}">
        <span class="nm">${escapeHtml(e.name)}</span>
        <input class="v" type="number" data-extra-val data-idx="${i}" value="${e.value}">
        <span class="x" data-action="rm" data-idx="${i}" title="移除">×</span>
      </span>
    `).join('') + `
      <button class="add" data-action="add-extra">＋ 自定義屬性</button>
    `;
    // style overrides for inline input
    chipsEl.querySelectorAll('[data-extra-val]').forEach(inp => {
      Object.assign(inp.style, {
        background: 'transparent', border: 'none', outline: 'none',
        font: 'inherit', width: '32px', textAlign: 'center',
        color: 'var(--shu)', fontFamily: 'var(--f-mono)', fontWeight: '700',
      });
    });
  }

  function update() {
    const card = getActiveCard(store.getState());
    applyFields(rootEl, card);
    // 高亮最高值的 elem
    if (card) {
      let max = -Infinity, maxKey = null;
      for (const [k] of ELEMS) {
        const v = card.stats.elements[k] || 0;
        if (v > max) { max = v; maxKey = k; }
      }
      rootEl.querySelectorAll('.elem').forEach(e => {
        e.classList.toggle('active', e.dataset.elem === maxKey && max > 0);
      });
    }
    renderChips();
  }

  bindFields(rootEl, store);

  rootEl.addEventListener('click', e => {
    const action = e.target.dataset?.action;
    const id = store.getState().activeCardId;
    if (!id) return;
    if (action === 'add-extra') {
      const name = prompt('屬性名稱（如 月、影、血）');
      if (!name) return;
      store.updateCard(id, c => {
        c.stats.elementsExtra.push({ name: name.trim(), value: 0 });
      });
    } else if (action === 'rm') {
      const idx = Number(e.target.dataset.idx);
      store.updateCard(id, c => {
        c.stats.elementsExtra.splice(idx, 1);
      });
    }
  });

  rootEl.addEventListener('input', e => {
    const t = e.target;
    if (!t.dataset?.extraVal && !t.hasAttribute('data-extra-val')) return;
    const idx = Number(t.dataset.idx);
    const v = Number(t.value) || 0;
    const id = store.getState().activeCardId;
    if (!id) return;
    store.updateCard(id, c => {
      if (c.stats.elementsExtra[idx]) c.stats.elementsExtra[idx].value = v;
    });
  });

  store.subscribe(update);
  update();
}
