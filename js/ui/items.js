/** 道具 3 階列表（tier1to3 / tier4to6 / tier7to9） */

import { escapeHtml, getActiveCard } from '../helpers.js';

const TIERS = [
  ['tier1to3', '道具', '等級 1〜3'],
  ['tier4to6', '道具', '等級 4〜6'],
  ['tier7to9', '道具', '等級 7〜9'],
];

export function mountItems(rootEl, store) {
  function render() {
    const card = getActiveCard(store.getState());
    if (!card) { rootEl.innerHTML = ''; return; }
    const items = card.items || { tier1to3: [], tier4to6: [], tier7to9: [] };
    rootEl.innerHTML = TIERS.map(([key, name, tier]) => {
      const list = items[key] || [];
      const lis = list.length === 0
        ? `<li class="empty">—— 空欄 ——</li>`
        : list.map((it, i) => {
          const lv = it.level ? ` (${escapeHtml(String(it.level))})` : '';
          const note = it.note ? ` — ${escapeHtml(it.note)}` : '';
          return `<li>
            <span class="dot"></span>
            <span style="flex:1">${escapeHtml(it.name)}${lv}${note}</span>
            <span style="cursor:pointer; color:var(--paper-300); padding:0 4px"
                  data-action="rm" data-tier="${key}" data-idx="${i}" title="移除">×</span>
          </li>`;
        }).join('');
      return `<div class="item-col">
        <div class="h"><span class="name">${name}</span><span class="tier">${tier}</span></div>
        <ul>${lis}</ul>
        <button class="add" data-action="add" data-tier="${key}">＋ 添加</button>
      </div>`;
    }).join('');
  }

  rootEl.addEventListener('click', e => {
    const t = e.target;
    const action = t.dataset?.action;
    const tier = t.dataset?.tier;
    const id = store.getState().activeCardId;
    if (!id || !action) return;

    if (action === 'add') {
      const name = prompt('道具名稱（必填）');
      if (!name || !name.trim()) return;
      const lvStr = prompt('等級（可選，1-9，留空跳過）') || '';
      const level = lvStr.trim() ? Math.max(1, Math.min(9, Number(lvStr) || 0)) || null : null;
      const note = prompt('備註（可選）') || '';
      store.updateCard(id, c => {
        c.items[tier].push({
          name: name.trim(),
          level,
          note: note.trim(),
        });
      });
    } else if (action === 'rm') {
      const idx = Number(t.dataset.idx);
      store.updateCard(id, c => {
        c.items[tier].splice(idx, 1);
      });
    }
  });

  store.subscribe(render);
  render();
}
