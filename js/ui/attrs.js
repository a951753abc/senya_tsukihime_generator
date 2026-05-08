/** 4 屬性 ・ 5 欄分解（base/mod1/mod2/mod3/special）+ slider 視覺 + 6 欄表
 *
 * 行為：
 * - base / special：玩家手填（6 欄表的兩個 input）
 * - mod1/mod2/mod3：自動從級別槽 1/2/3 的 baseAbilities 帶入（changes class → re-sync）
 * - 合計 = base + mod1 + mod2 + mod3 + special（即時刷新 slider/total/sum）
 */

import { bindFields, applyFields, getActiveCard } from '../helpers.js';
import { loadLevel } from '../data-loader.js';
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
      ${COLS.map(([k]) => {
        const isAuto = k === 'mod1' || k === 'mod2' || k === 'mod3';
        const cls = isAuto ? 'cell-inp auto' : 'cell-inp';
        const title = isAuto ? `自動：跟隨級別槽 ${k.slice(-1)} 的基本能力（可手動覆蓋；改級別會重新同步）` : '玩家自填';
        return `<td><input type="number" class="${cls}" data-field="stats.abilities.${key}.${k}" title="${title}"></td>`;
      }).join('')}
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
    <div class="stat-table-hint">
      <span>編輯：</span>
      <b>基礎 / 特殊</b> 玩家自填　·
      <b>級1～3 修正</b> 自動跟隨級別槽（改級別會重新同步）
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

  // ---- 自動同步 mod1/2/3 ----
  const levelCache = new Map();
  async function getLevelCached(id) {
    if (!id) return null;
    if (!levelCache.has(id)) {
      try { levelCache.set(id, await loadLevel(id)); }
      catch { levelCache.set(id, null); }
    }
    return levelCache.get(id);
  }

  async function syncMods(card) {
    const slots = card.classes.slice(0, 3);  // 最多 mod3，4th slot 不影響屬性
    const slotMods = await Promise.all(slots.map(async cls => {
      if (!cls?.id) return null;
      const data = await getLevelCached(cls.id);
      return data?.baseAbilities || null;
    }));
    // 補滿到 3 個 slot
    while (slotMods.length < 3) slotMods.push(null);

    // 比對 store
    let needsUpdate = false;
    for (let i = 0; i < 3; i++) {
      const expected = slotMods[i] || { physical: 0, perception: 0, reason: 0, will: 0 };
      for (const [k] of ABILITIES) {
        if ((card.stats.abilities[k][`mod${i + 1}`] || 0) !== (expected[k] || 0)) {
          needsUpdate = true;
        }
      }
    }
    if (!needsUpdate) return;
    store.updateCard(card.id, c => {
      for (let i = 0; i < 3; i++) {
        const expected = slotMods[i] || { physical: 0, perception: 0, reason: 0, will: 0 };
        for (const [k] of ABILITIES) {
          c.stats.abilities[k][`mod${i + 1}`] = expected[k] || 0;
        }
      }
    });
  }

  function update() {
    const card = getActiveCard(store.getState());
    if (!card) return;
    // fire-and-forget；若實際觸發 store update 會自動再次 render（短路退出）
    syncMods(card);

    applyFields(rootEl, card);
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
