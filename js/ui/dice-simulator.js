/** 2D6 判定模擬器 + 1D6+3 起手骰 */

import { getActiveCard } from '../helpers.js';
import { deriveAll } from '../derive.js';
import { getLoadedLevelMap } from '../data-loader.js';

const COMBAT_KEYS = [
  ['melee',   '近戰'],
  ['ranged',  '射擊'],
  ['psychic', '精神'],
  ['action',  '行動'],
];

function roll(n, sides) {
  const dice = [];
  for (let i = 0; i < n; i++) dice.push(1 + Math.floor(Math.random() * sides));
  return dice;
}

function classifyAchievement(diceSum) {
  if (diceSum === 12) return 'crit';
  if (diceSum === 2)  return 'fumble';
  return 'normal';
}

export function mountDiceSimulator(rootEl, store) {
  const history = [];   // 最近 10 次

  // === 一次性建立 DOM 結構（不會被重建，避免 input 焦點/值丟失） ===
  rootEl.innerHTML = `
    <div style="background:var(--ink-700);border:1px solid var(--ink-500);border-radius:var(--r-md);padding:var(--s-4);margin-top:var(--s-3)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--s-3)">
        <div style="font-family:var(--f-heading);font-size:11px;letter-spacing:.4em;color:var(--ink-200);text-transform:uppercase">擲骰</div>
        <div style="font-family:var(--f-mono);font-size:9px;color:var(--ink-300)">2D6 + 戰鬥值 + 修正</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 80px 56px;gap:6px;align-items:stretch">
        <select data-action="combat-select" style="background:var(--ink-800);border:1px solid var(--ink-500);color:var(--ink-100);padding:6px;font-family:var(--f-body);font-size:11px;border-radius:var(--r-sm);outline:none"></select>
        <input data-action="modifier" type="number" value="0" placeholder="修正"
          style="background:var(--ink-800);border:1px solid var(--ink-500);color:var(--ink-100);padding:6px;font-family:var(--f-mono);text-align:center;border-radius:var(--r-sm);outline:none">
        <button data-action="roll-2d6"
          style="background:var(--shu);border:0;color:#fff;font-family:var(--f-heading);font-size:11px;letter-spacing:.2em;cursor:pointer;border-radius:var(--r-sm)">擲</button>
      </div>
      <button data-action="roll-1d6plus3" style="margin-top:6px;width:100%;padding:7px;background:transparent;border:1px dashed var(--ink-400);color:var(--ink-200);border-radius:var(--r-sm);font-family:var(--f-heading);letter-spacing:.2em;font-size:11px;cursor:pointer">起手 1D6+3</button>
      <div data-history style="margin-top:8px;max-height:140px;overflow:auto"></div>
    </div>
  `;

  const select = rootEl.querySelector('[data-action="combat-select"]');
  const modInp = rootEl.querySelector('[data-action="modifier"]');
  const histEl = rootEl.querySelector('[data-history]');

  // 更新下拉選項中的「+數值」（戰鬥值會跟 store 變動）
  function updateCombatSelect() {
    const card = getActiveCard(store.getState());
    const d = card ? deriveAll(card, getLoadedLevelMap()) : null;
    const prevValue = select.value || 'melee';
    select.innerHTML = COMBAT_KEYS.map(([k, label]) => {
      const v = d ? d.combat[k] : 0;
      return `<option value="${k}">${label} (+${v})</option>`;
    }).join('');
    select.value = prevValue;
  }

  // 渲染 history（只動 histEl，不影響 input/select）
  function renderHistory() {
    if (history.length === 0) {
      histEl.innerHTML = `<div style="font-family:var(--f-mono);font-size:10px;color:var(--ink-300);text-align:center;padding:8px">尚無紀錄</div>`;
      return;
    }
    histEl.innerHTML = history.map(h => {
      const flagColor = h.flag === 'crit' ? 'var(--gold)' : h.flag === 'fumble' ? 'var(--shu-soft)' : 'var(--ink-100)';
      const flagLabel = h.flag === 'crit' ? '會心' : h.flag === 'fumble' ? '大失敗' : '';
      return `<div style="display:flex;justify-content:space-between;font-family:var(--f-mono);font-size:10px;padding:3px 4px;border-bottom:1px dashed var(--ink-500)">
        <span>${h.label}</span>
        <span style="color:var(--ink-200)">${h.dice.join('+')}=${h.diceSum} +${h.bonus}${h.modifier ? ` +${h.modifier}` : ''}</span>
        <span style="color:${flagColor};font-weight:700">${h.total}${flagLabel ? ` ${flagLabel}` : ''}</span>
      </div>`;
    }).join('');
  }

  function pushHistory(item) {
    history.unshift(item);
    if (history.length > 10) history.pop();
    renderHistory();
  }

  rootEl.addEventListener('click', e => {
    const action = e.target.dataset?.action;
    if (action === 'roll-2d6') {
      const card = getActiveCard(store.getState());
      const d = card ? deriveAll(card, getLoadedLevelMap()) : null;
      const key = select.value || 'melee';
      const bonus = d ? (d.combat[key] || 0) : 0;
      const modifier = Number(modInp.value) || 0;
      const dice = roll(2, 6);
      const diceSum = dice[0] + dice[1];
      const total = diceSum + bonus + modifier;
      const labelMap = Object.fromEntries(COMBAT_KEYS);
      pushHistory({
        label: labelMap[key], dice, diceSum, bonus, modifier, total,
        flag: classifyAchievement(diceSum),
      });
    } else if (action === 'roll-1d6plus3') {
      const dice = roll(1, 6);
      const total = dice[0] + 3;
      pushHistory({
        label: '起手', dice, diceSum: dice[0], bonus: 3, modifier: 0, total, flag: 'normal',
      });
    }
  });

  store.subscribe(updateCombatSelect);
  updateCombatSelect();
  renderHistory();
}
