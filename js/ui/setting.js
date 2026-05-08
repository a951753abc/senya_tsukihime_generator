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

  bindFields(rootEl, store);
  store.subscribe(state => applyFields(rootEl, getActiveCard(state)));
  applyFields(rootEl, getActiveCard(store.getState()));
}
