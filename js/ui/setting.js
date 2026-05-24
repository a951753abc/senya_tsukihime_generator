/** 角色設定 — 4 區塊自由 textarea */

import { bindFields, applyFields, getActiveCard } from '../helpers.js';

const BLOCKS = [
  ['background',  '背景・出自'],
  ['personality', '性格・癖'],
  ['history',     '来歴・劇本連動'],
  ['memo',        '自由メモ'],
];

export function mountSetting(rootEl, store) {
  rootEl.innerHTML = BLOCKS.map(([k, label]) => `
    <div class="setting-block">
      <div class="k">${label}</div>
      <textarea data-field="setting.${k}"></textarea>
    </div>
  `).join('');

  function autosizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  function autosizeAll() {
    rootEl.querySelectorAll('textarea').forEach(autosizeTextarea);
  }

  bindFields(rootEl, store);
  rootEl.addEventListener('input', e => {
    if (e.target.matches('textarea')) autosizeTextarea(e.target);
  });
  store.subscribe(state => {
    applyFields(rootEl, getActiveCard(state));
    autosizeAll();
  });
  applyFields(rootEl, getActiveCard(store.getState()));
  autosizeAll();
}
