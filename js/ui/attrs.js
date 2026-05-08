/** 4 屬性 ・ 5 欄分解（base/mod1/mod2/mod3/special）+ slider 視覺 + 6 欄表 */

import { bindFields, applyFields, getActiveCard } from '../helpers.js';
import { abilityTotal, abilityToPercent } from '../derive.js';

const ABILITIES = [
  ['physical',   '體力', 'TAIRYOKU'],
  ['perception', '知覺', 'CHIKAKU'],
  ['reason',     '理智', 'RICHI'],
  ['will',       '意志', 'ISHI'],
];

const COLS = [
  ['base',    '基礎'],
  ['mod1',    '級1修正'],
  ['mod2',    '級2修正'],
  ['mod3',    '級3修正'],
  ['special', '特殊'],
];

function attrSliderHtml(key, name, yomi) {
  return `
    <div class="attr" data-ability="${key}">
      <div class="nm">${name}<small>${yomi}</small></div>
      <div class="slider">
        <span class="track"></span>
        <span class="ticks">${'<i></i>'.repeat(10)}</span>
        <span class="fill" data-fill style="width:0%"></span>
        <span class="thumb" data-thumb style="left:0%"></span>
      </div>
      <div class="num"><span data-total>0</span><small>/10</small></div>
      <div class="breakdown" data-breakdown>
        ${COLS.map(([k, label]) => `<span>${label} <b data-bd="${k}">—</b></span>`).join('')}
      </div>
    </div>
  `;
}

function statTableRowHtml(key, name) {
  return `
    <tr>
      <td>${name}</td>
      ${COLS.map(([k]) =>
        `<td><input type="number" class="cell-inp" data-field="stats.abilities.${key}.${k}"></td>`
      ).join('')}
      <td class="sum" data-sum-cell="${key}">0</td>
    </tr>
  `;
}

function formatBdValue(n) {
  if (n === 0 || n == null) return '—';
  return n > 0 ? `+${n}` : String(n);
}

export function mountAttrs(rootEl, store) {
  rootEl.innerHTML = `
    <div class="attrs">
      ${ABILITIES.map(([k, n, y]) => attrSliderHtml(k, n, y)).join('')}
    </div>
    <table class="stat-table">
      <thead>
        <tr>
          <th>能力名</th>
          ${COLS.map(([_, label]) => `<th>${label}</th>`).join('')}
          <th>合計</th>
        </tr>
      </thead>
      <tbody>
        ${ABILITIES.map(([k, n]) => statTableRowHtml(k, n)).join('')}
      </tbody>
    </table>
  `;

  function update() {
    const card = getActiveCard(store.getState());
    applyFields(rootEl, card);
    if (!card) return;
    for (const [k] of ABILITIES) {
      const cell = card.stats.abilities[k];
      const total = abilityTotal(cell);
      const pct = abilityToPercent(total);
      const attr = rootEl.querySelector(`.attr[data-ability="${k}"]`);
      if (!attr) continue;
      attr.querySelector('[data-fill]').style.width = `${pct}%`;
      const thumb = attr.querySelector('[data-thumb]');
      thumb.style.left = `${pct}%`;
      thumb.classList.toggle('shu', total >= 7);
      attr.querySelector('[data-total]').textContent = total;
      // breakdown
      for (const [colKey] of COLS) {
        const bd = attr.querySelector(`[data-bd="${colKey}"]`);
        const v = cell[colKey] || 0;
        bd.textContent = formatBdValue(v);
        bd.className = v > 0 ? 'pos' : (v < 0 ? 'neg' : '');
      }
      // table sum cell
      const sumCell = rootEl.querySelector(`[data-sum-cell="${k}"]`);
      if (sumCell) sumCell.textContent = total;
    }
  }

  bindFields(rootEl, store);
  store.subscribe(update);
  update();
}
