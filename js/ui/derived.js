/** 右欄派生儀表板：HP / TP / 4 戰鬥值 / 防禦 / 羈絆合計 */

import { getActiveCard } from '../helpers.js';
import { deriveAll } from '../derive.js';
import { preloadLevels, getLoadedLevelMap } from '../data-loader.js';

export function mountDerived(rootEl, store) {
  const $ = sel => rootEl.querySelector(sel);
  const pct = (current, max) => {
    if (!max || max <= 0) return 0;
    return Math.max(0, Math.min(100, (current / max) * 100));
  };

  function writeResourceInputs(card) {
    rootEl.querySelectorAll('[data-resource-field]').forEach(inp => {
      if (inp === document.activeElement) return;
      const value = card.resources?.[inp.dataset.resourceField];
      inp.value = value == null ? '' : String(value);
    });
  }

  async function update() {
    const card = getActiveCard(store.getState());
    if (!card) {
      $('[data-d="hp"]').textContent = '—';
      $('[data-d="tp"]').textContent = '—';
      ['melee', 'ranged', 'psychic', 'action'].forEach(k => {
        const el = $(`[data-d-combat="${k}"] [data-v]`);
        if (el) el.textContent = '—';
      });
      $('[data-d="defense"]').textContent = '—';
      $('[data-d="bond-total"]').textContent = '—';
      $('[data-d="bond-note"]').textContent = '';
      rootEl.querySelectorAll('[data-resource-field]').forEach(inp => { inp.value = ''; });
      return;
    }
    // 預載各級別資料 → 取 levelDataMap
    await preloadLevels(card.classes.map(c => c.id).filter(Boolean));
    const levelDataMap = getLoadedLevelMap();
    const d = deriveAll(card, levelDataMap);

    // HP
    $('[data-d="hp"]').textContent = d.hpCurrent;
    const hpMax = $('[data-d="hp-max"]');
    if (hpMax) hpMax.textContent = `/ ${d.hp} MAX`;
    const hpBar = $('[data-d="hp-bar"]');
    if (hpBar) hpBar.style.width = `${pct(d.hpCurrent, d.hp)}%`;

    // TP
    $('[data-d="tp"]').textContent = d.tpCurrent;
    const tpMax = $('[data-d="tp-max"]');
    if (tpMax) tpMax.textContent = `/ ${d.tp} MAX`;
    const tpBar = $('[data-d="tp-bar"]');
    if (tpBar) tpBar.style.width = `${pct(d.tpCurrent, d.tp)}%`;
    writeResourceInputs(card);

    // 4 戰鬥值 — breakdown 顯示「紅利+紅利+級別修正」
    const b = d.bonus;
    const m = d.modSum;
    const fmtMod = n => n > 0 ? `+${n}` : (n < 0 ? `${n}` : '+0');
    const breakdowns = {
      melee:   `紅利 体${b.physical}+知${b.perception} ${fmtMod(m.melee)}`,
      ranged:  `紅利 知${b.perception}+理${b.reason} ${fmtMod(m.ranged)}`,
      psychic: `紅利 理${b.reason}+意${b.will} ${fmtMod(m.psychic)}`,
      action:  `紅利 体${b.physical}+意${b.will} ${fmtMod(m.action)}`,
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

  rootEl.addEventListener('input', e => {
    const inp = e.target;
    const field = inp.dataset?.resourceField;
    if (!field) return;
    const id = store.getState().activeCardId;
    if (!id) return;
    const value = inp.value === ''
      ? null
      : (Number.isFinite(Number(inp.value)) ? Number(inp.value) : null);
    store.updateCard(id, c => {
      c.resources ||= {};
      c.resources[field] = value;
    });
  });

  store.subscribe(update);
  update();
}
