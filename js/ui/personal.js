/** 個人資料 + progression（角色等級為派生顯示） */

import { bindFields, applyFields, getActiveCard } from '../helpers.js';
import { characterLevel } from '../derive.js';

export function mountPersonal(rootEl, store) {
  rootEl.innerHTML = `
    <div class="pf span2">
      <label class="pf-label">種族</label>
      <input class="pf-input" data-field="personal.race">
    </div>
    <div class="pf span4">
      <label class="pf-label">地域社會</label>
      <input class="pf-input" data-field="personal.society">
    </div>
    <div class="pf">
      <label class="pf-label">年齢</label>
      <input class="pf-input" data-field="personal.age">
    </div>
    <div class="pf">
      <label class="pf-label">性別</label>
      <input class="pf-input" data-field="personal.gender">
    </div>
    <div class="pf span4">
      <label class="pf-label">外貌（髪／瞳／肌／身）</label>
      <input class="pf-input" data-field="personal.appearance">
    </div>
    <div class="pf span2">
      <label class="pf-label">角色等級（派生）</label>
      <input class="pf-input" data-derived-level readonly title="自動：所有級別槽 level 加總">
    </div>
    <div class="pf span2">
      <label class="pf-label">剩餘經驗點</label>
      <input class="pf-input" type="number" min="0" data-field="progression.remainingExp">
    </div>
    <div class="pf span2">
      <label class="pf-label">初始級別 / 初始等級</label>
      <input class="pf-input" data-field="progression.initial" placeholder="例：古神道 / 4">
    </div>
  `;

  const derivedLv = rootEl.querySelector('[data-derived-level]');

  function update() {
    const card = getActiveCard(store.getState());
    applyFields(rootEl, card);
    if (card && derivedLv !== document.activeElement) {
      derivedLv.value = String(characterLevel(card.classes));
    }
  }

  bindFields(rootEl, store);
  store.subscribe(update);
  update();
}
