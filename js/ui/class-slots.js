/** 多重級別槽（最多 4，第一個 isPrimary） */

import { escapeHtml, getActiveCard } from '../helpers.js';
import { characterLevel } from '../derive.js';

const MAX_SLOTS = 4;
const ORD_LABEL = ['主', '副', '第3', '第4'];

export function mountClassSlots(rootEl, store, meta) {
  rootEl.innerHTML = `
    <div class="head-line">
      <span class="lbl">級別 — class · 多重</span>
      <span class="total">合計 <b data-total-lv>0</b> Lv　·　槽 <b data-slot-count>0</b> / ${MAX_SLOTS}</span>
    </div>
    <div class="grid2">
      <div>
        <div class="slot-stack" data-slot-stack></div>
        <button class="slot-add" data-action="add">
          ＋ 加入級別<span class="hint">最多 ${MAX_SLOTS} 槽　·　特殊狀況</span>
        </button>
      </div>
      <div class="class-side">
        <button class="dice-btn" data-action="roll">
          <span class="die"></span>擲骰起手 1D6+3
        </button>
        <div class="desc">
          · 一般 1〜3 槽<br>
          · 4 槽僅限特殊劇本<br>
          · 主級別決定特技池<br>
          · 等級合計用於派生
        </div>
      </div>
    </div>
  `;

  const stack = rootEl.querySelector('[data-slot-stack]');
  const totalLv = rootEl.querySelector('[data-total-lv]');
  const slotCount = rootEl.querySelector('[data-slot-count]');
  const addBtn = rootEl.querySelector('[data-action="add"]');

  const levelOptions = (() => {
    const basic = meta.levels.filter(l => l.tier === 'basic');
    const advanced = meta.levels.filter(l => l.tier === 'advanced');
    const opt = (l, sel) => `<option value="${l.id}"${sel ? ' selected' : ''}>${escapeHtml(l.name)}</option>`;
    return (selectedId) => `
      <optgroup label="基本職">${basic.map(l => opt(l, l.id === selectedId)).join('')}</optgroup>
      <optgroup label="進階職">${advanced.map(l => opt(l, l.id === selectedId)).join('')}</optgroup>
    `;
  })();

  function classMeta(id) {
    return meta.levels.find(l => l.id === id);
  }

  function render() {
    const card = getActiveCard(store.getState());
    if (!card) {
      stack.innerHTML = '';
      totalLv.textContent = '0';
      slotCount.textContent = '0';
      addBtn.disabled = true;
      return;
    }
    const slots = card.classes;
    stack.innerHTML = slots.map((slot, i) => {
      const m = classMeta(slot.id) || { tier: 'basic', tagEn: '' };
      const tierClass = m.tier === 'advanced' ? 'adv' : 'basic';
      const tierLabel = m.tier === 'advanced' ? '進階' : '基本';
      const isPrimary = i === 0;
      return `<div class="slot${isPrimary ? ' primary' : ''}" data-idx="${i}">
        <div class="ord">${ORD_LABEL[i]}</div>
        <div class="pf-select">
          <select data-action="set-class">${levelOptions(slot.id)}</select>
          <div class="tag-line">
            <span class="${tierClass}">${tierLabel}</span> · ${escapeHtml(m.tagEn || '')}
          </div>
        </div>
        <div class="lvl">
          <button data-action="lv-down" title="降一級">−</button>
          <input type="number" min="1" max="10" value="${slot.level}" data-action="lv-input">
          <button data-action="lv-up" title="升一級">＋</button>
        </div>
        <button class="rm" data-action="remove" title="移除槽">×</button>
      </div>`;
    }).join('');
    totalLv.textContent = characterLevel(slots);
    slotCount.textContent = slots.length;
    addBtn.disabled = slots.length >= MAX_SLOTS;
    addBtn.style.opacity = addBtn.disabled ? '0.4' : '1';
  }

  function update(idx, mutator) {
    const id = store.getState().activeCardId;
    if (!id) return;
    store.updateCard(id, c => {
      if (idx == null) mutator(c);
      else if (c.classes[idx]) mutator(c.classes[idx], c);
    });
  }

  rootEl.addEventListener('click', e => {
    const t = e.target;
    const action = t.dataset?.action;
    if (action === 'add') {
      update(null, c => {
        if (c.classes.length >= MAX_SLOTS) return;
        const def = meta.levels[1] || meta.levels[0]; // 預設劍士
        c.classes.push({
          id: def.id, name: def.name, tier: def.tier,
          level: 1, isPrimary: c.classes.length === 0,
        });
      });
      return;
    }
    if (action === 'roll') {
      const lv = Math.floor(Math.random() * 6) + 4; // 1D6+3 → 4..9
      update(null, c => {
        if (c.classes.length === 0) {
          const def = meta.levels[0];
          c.classes.push({
            id: def.id, name: def.name, tier: def.tier,
            level: lv, isPrimary: true,
          });
        } else {
          c.classes[0].level = lv;
        }
      });
      return;
    }
    const slot = t.closest('.slot');
    if (!slot) return;
    const idx = Number(slot.dataset.idx);
    if (action === 'lv-up') {
      update(idx, sl => { sl.level = Math.min(10, (sl.level || 1) + 1); });
    } else if (action === 'lv-down') {
      update(idx, sl => { sl.level = Math.max(1, (sl.level || 1) - 1); });
    } else if (action === 'remove') {
      if (idx === 0) return; // 主槽不可移
      update(null, c => {
        c.classes.splice(idx, 1);
        if (c.classes[0]) c.classes[0].isPrimary = true;
      });
    }
  });

  rootEl.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset?.action !== 'set-class') return;
    const slot = t.closest('.slot');
    const idx = Number(slot.dataset.idx);
    const newId = t.value;
    const m = classMeta(newId);
    update(idx, sl => {
      sl.id = newId;
      sl.name = m?.name || newId;
      sl.tier = m?.tier || 'basic';
    });
  });

  rootEl.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset?.action !== 'lv-input') return;
    const slot = t.closest('.slot');
    const idx = Number(slot.dataset.idx);
    const v = Math.max(1, Math.min(10, Number(t.value) || 1));
    update(idx, sl => { sl.level = v; });
  });

  store.subscribe(render);
  render();
}
