/** 4 屬性 ・ 5 欄分解（base/mod1/mod2/mod3/special）+ slider 視覺 + 6 欄表
 *
 * 行為：
 * - base / special：玩家手填（6 欄表的兩個 input）
 * - mod1/mod2/mod3：預設自動從級別槽 1/2/3 的 baseAbilities 帶入；也可切到手動保存玩家輸入
 * - 合計 = base + mod1 + mod2 + mod3 + special（即時刷新 slider/total/sum）
 */

import { bindFields, applyFields, getActiveCard } from '../helpers.js';
import { loadLevel } from '../data-loader.js';
import { abilityTotal, abilityBonus, abilityToPercent } from '../derive.js';

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
const AUTO_MOD_KEYS = ['mod1', 'mod2', 'mod3'];

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
      <div class="num">
        <span data-total>0</span><small>/10</small>
        <span data-bonus title="能力紅利 = ⌊合計/3⌋（判定用）" style="display:block;font-size:9px;color:var(--shu);font-weight:500;letter-spacing:.1em;margin-top:2px">紅利 0</span>
      </div>
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
        const isAuto = AUTO_MOD_KEYS.includes(k);
        const cls = isAuto ? 'cell-inp auto' : 'cell-inp';
        const title = isAuto ? `級別槽 ${k.slice(-1)} 基本能力修正` : '玩家自填';
        const autoAttr = isAuto ? ' data-auto-mod' : '';
        return `<td><input type="number" class="${cls}" data-field="stats.abilities.${key}.${k}"${autoAttr} title="${title}"></td>`;
      }).join('')}
      <td class="sum" data-sum-cell="${key}">0</td>
    </tr>
  `;
}

function formatBdValue(n) {
  if (n === 0 || n == null) return '—';
  return n > 0 ? `+${n}` : String(n);
}

export function abilityModFromClassBase(baseAbilities) {
  return {
    physical: baseAbilities?.physical || 0,
    perception: baseAbilities?.perception || 0,
    reason: baseAbilities?.reason || 0,
    will: baseAbilities?.will || 0,
  };
}

export function shouldSyncAbilityMods(card) {
  return card?.stats?.abilityModsManual !== true;
}

export function mountAttrs(rootEl, store) {
  rootEl.innerHTML = `
    <div class="attrs">
      ${ABILITIES.map(([k, n, y]) => attrSliderHtml(k, n, y)).join('')}
    </div>
    <div class="stat-table-bar">
      <div class="stat-table-hint">
        <span>編輯：</span>
        <b>基礎 / 特殊</b> 玩家自填　·
        <b>級1～3 修正</b> <span data-mod-mode-label>自動跟隨級別槽</span>
      </div>
      <label class="stat-mode-toggle">
        <input type="checkbox" data-action="toggle-ability-mods-manual">
        <span>手動調整級別修正</span>
      </label>
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
    if (!shouldSyncAbilityMods(card)) return;
    const slots = card.classes.slice(0, 3);  // 最多 mod3，4th slot 不影響屬性
    const slotIds = slots.map(cls => cls?.id || '');
    // 千夜月姬規則：級別的基本能力只套用一次；升級只影響 modifierTable。
    const slotMods = await Promise.all(slots.map(async cls => {
      if (!cls?.id) return null;
      const data = await getLevelCached(cls.id);
      return data?.baseAbilities ? abilityModFromClassBase(data.baseAbilities) : null;
    }));
    while (slotMods.length < 3) slotMods.push(null);

    const fresh = getActiveCard(store.getState());
    if (!fresh || fresh.id !== card.id || !shouldSyncAbilityMods(fresh)) return;
    const freshSlotIds = fresh.classes.slice(0, 3).map(cls => cls?.id || '');
    if (slotIds.join('\u0000') !== freshSlotIds.join('\u0000')) return;

    // 比對 store；若不同則同步級別基本能力到 mod1/2/3。
    let needsUpdate = false;
    for (let i = 0; i < 3; i++) {
      const expected = slotMods[i] || { physical: 0, perception: 0, reason: 0, will: 0 };
      for (const [k] of ABILITIES) {
        if ((fresh.stats.abilities[k][`mod${i + 1}`] || 0) !== (expected[k] || 0)) {
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
    const manualMods = !shouldSyncAbilityMods(card);
    const toggle = rootEl.querySelector('[data-action="toggle-ability-mods-manual"]');
    if (toggle && toggle !== document.activeElement) toggle.checked = manualMods;
    const modeLabel = rootEl.querySelector('[data-mod-mode-label]');
    if (modeLabel) modeLabel.textContent = manualMods ? '手動保存輸入值' : '自動跟隨級別槽';
    rootEl.querySelectorAll('[data-auto-mod]').forEach(inp => {
      inp.readOnly = !manualMods;
      inp.classList.toggle('locked', !manualMods);
      inp.title = manualMods ? '手動調整級別修正' : '自動跟隨級別槽；開啟手動後可編輯';
    });
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
      const bonusEl = attr.querySelector('[data-bonus]');
      if (bonusEl) bonusEl.textContent = `紅利 ${abilityBonus(total)}`;
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

  rootEl.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset?.action !== 'toggle-ability-mods-manual') return;
    const id = store.getState().activeCardId;
    if (!id) return;
    store.updateCard(id, c => {
      c.stats ||= {};
      c.stats.abilityModsManual = t.checked;
    });
  });

  bindFields(rootEl, store);
  store.subscribe(update);
  update();
}
