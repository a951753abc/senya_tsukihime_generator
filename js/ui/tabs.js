/** 多角色 tabs（含新增、刪除、切換） */

import { escapeHtml } from '../helpers.js';
import { characterLevel } from '../derive.js';

export function mountTabs(rootEl, store) {
  function render() {
    const state = store.getState();
    const html = state.cards.map(card => {
      const seal = card.meta.seal || (card.meta.name && card.meta.name.charAt(0)) || '？';
      const lv = characterLevel(card.classes);
      const isActive = card.id === state.activeCardId;
      const name = card.meta.name || '無名';
      return `<div class="tab${isActive ? ' active' : ''}" data-id="${escapeHtml(card.id)}">
        <span class="seal">${escapeHtml(seal)}</span>
        <span class="nm">${escapeHtml(name)}</span>
        <span class="lv">L${lv}</span>
        <span class="x" data-action="delete" title="刪除">×</span>
      </div>`;
    }).join('');
    rootEl.innerHTML = html + `<button class="tab add" data-action="new">＋ 新規</button>`;
  }

  rootEl.addEventListener('click', e => {
    const target = e.target;
    if (target.dataset?.action === 'new') {
      store.newCard();
      return;
    }
    if (target.dataset?.action === 'delete') {
      e.stopPropagation();
      const tab = target.closest('.tab');
      if (!tab) return;
      const card = store.getState().cards.find(c => c.id === tab.dataset.id);
      const name = card?.meta?.name || '無名';
      if (confirm(`刪除角色「${name}」？此操作無法復原。`)) {
        store.deleteCard(tab.dataset.id);
      }
      return;
    }
    const tab = target.closest('.tab');
    if (tab && tab.dataset.id) {
      store.setActiveCard(tab.dataset.id);
    }
  });

  store.subscribe(render);
  render();
}
