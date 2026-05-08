/** 角色卡頂部：姓名 / 讀み / 玩家名稱 */

import { bindFields, applyFields, getActiveCard } from '../helpers.js';

export function mountCardHead(rootEl, store) {
  rootEl.innerHTML = `
    <div>
      <label class="pf-label">姓名 — name</label>
      <input class="pf-input big" data-field="meta.name" placeholder="角色姓名">
    </div>
    <div>
      <label class="pf-label">讀み — yomi</label>
      <input class="pf-input" data-field="meta.yomi" placeholder="假名 / 拼音">
    </div>
    <div>
      <label class="pf-label">玩家名稱 — player</label>
      <input class="pf-input" data-field="meta.player" placeholder="自己的名字">
    </div>
  `;

  bindFields(rootEl, store);
  store.subscribe(state => applyFields(rootEl, getActiveCard(state)));
  applyFields(rootEl, getActiveCard(store.getState()));
}
