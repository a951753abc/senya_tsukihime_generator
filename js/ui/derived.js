/** 右欄派生儀表板：HP / TP / 4 戰鬥值 / 防禦 / 羈絆合計 */

import { getActiveCard } from '../helpers.js';
import { deriveAll } from '../derive.js';

export function mountDerived(rootEl, store) {
  // 結構已在 index.html，這裡只更新值
  const $ = sel => rootEl.querySelector(sel);

  function update() {
    const card = getActiveCard(store.getState());
    if (!card) {
      // 沒有 active card 時清空
      $('[data-d="hp"]').textContent = '—';
      $('[data-d="tp"]').textContent = '—';
      ['melee', 'ranged', 'psychic', 'action'].forEach(k => {
        const el = $(`[data-d-combat="${k}"] [data-v]`);
        if (el) el.textContent = '—';
      });
      $('[data-d="defense"]').textContent = '—';
      $('[data-d="bond-total"]').textContent = '—';
      $('[data-d="bond-note"]').textContent = '';
      return;
    }
    const d = deriveAll(card);

    // HP
    const hpBig = $('[data-d="hp"]');
    const hpMax = $('[data-d="hp-max"]');
    hpBig.textContent = d.hp;
    if (hpMax) hpMax.textContent = `/ ${d.hp} MAX`;
    const hpBar = $('[data-d="hp-bar"]');
    if (hpBar) hpBar.style.width = '100%';

    // TP
    const tpBig = $('[data-d="tp"]');
    const tpMax = $('[data-d="tp-max"]');
    tpBig.textContent = d.tp;
    if (tpMax) tpMax.textContent = `/ ${d.tp} MAX`;
    const tpBar = $('[data-d="tp-bar"]');
    if (tpBar) tpBar.style.width = '100%';

    // 4 戰鬥值
    const lv = d.characterLevel;
    const halfLv = Math.floor(lv / 2);
    const breakdowns = {
      melee:   `体${d.totals.physical}+Lv/2(${halfLv})+火${card.stats.elements.fire}`,
      ranged:  `知${d.totals.perception}+Lv/2(${halfLv})+風${card.stats.elements.wind}`,
      psychic: `理${d.totals.reason}+Lv/2(${halfLv})+空${card.stats.elements.void}`,
      action:  `意${d.totals.will}+Lv/2(${halfLv})+風${card.stats.elements.wind}`,
    };
    for (const k of ['melee', 'ranged', 'psychic', 'action']) {
      const box = $(`[data-d-combat="${k}"]`);
      if (!box) continue;
      box.querySelector('[data-v]').textContent = d.combat[k];
      const bd = box.querySelector('[data-bd]');
      if (bd) bd.textContent = breakdowns[k];
    }

    // 防禦
    $('[data-d="defense"]').textContent = d.defense;

    // 羈絆
    $('[data-d="bond-total"]').textContent = d.bond.total;
    $('[data-d="bond-note"]').textContent = `潔淨 ${d.bond.pure}　·　瘋狂 ${d.bond.crazy}`;
  }

  store.subscribe(update);
  update();
}
