/**
 * 技能系統：左欄 skill picker + 中欄 equipped-strip + sk-detail
 * 一個模組同時管理三個 root，因為它們共用 highlighted skill 狀態
 */

import { escapeHtml, getActiveCard } from '../helpers.js';
import { loadLevel, loadCommonSkills } from '../data-loader.js';

const COMMON_PSEUDO_ID = '__common__';
const FILTER_CATEGORIES = ['主動', '反應', '常時'];

function skillKey(classId, name) {
  return `${classId || COMMON_PSEUDO_ID}::${name}`;
}

export async function mountSkills({ pickerEl, equippedEl, detailEl }, store) {
  const commonData = await loadCommonSkills();
  const levelCache = new Map();
  let highlightedKey = null;
  const filters = { search: '', equippedOnly: false, categories: new Set() };

  async function getLevel(classId) {
    if (!levelCache.has(classId)) levelCache.set(classId, await loadLevel(classId));
    return levelCache.get(classId);
  }

  async function buildGroups(card) {
    const groups = [];
    if (!card) return groups;
    for (const cls of card.classes) {
      try {
        const data = await getLevel(cls.id);
        groups.push({
          title: `${data.name} — ${cls.isPrimary ? '主級別' : '副級別'}`,
          classId: cls.id,
          skills: [
            ...data.skills.general.map(s => ({ ...s, classId: cls.id, source: 'general' })),
            ...data.skills.extra.map(s => ({ ...s, classId: cls.id, source: 'extra' })),
          ],
        });
      } catch (e) {
        console.warn(`載入級別 ${cls.id} 失敗`, e);
      }
    }
    if (commonData.skills.length > 0) {
      groups.push({
        title: '共通特技',
        classId: COMMON_PSEUDO_ID,
        skills: commonData.skills.map(s => ({ ...s, classId: null, source: 'common' })),
      });
    }
    return groups;
  }

  function isEquipped(card, key) {
    return !!card?.skills?.equipped?.some(s => skillKey(s.classId, s.name) === key);
  }

  function passesFilter(sk, card) {
    if (filters.equippedOnly && !isEquipped(card, skillKey(sk.classId, sk.name))) return false;
    if (filters.categories.size > 0) {
      const ok = [...filters.categories].some(c => (sk.category || '').includes(c));
      if (!ok) return false;
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const hay = `${sk.name} ${sk.category} ${sk.cost} ${sk.effect}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  async function renderPicker() {
    const card = getActiveCard(store.getState());
    const groups = await buildGroups(card);
    const totalEquipped = card?.skills?.equipped?.length || 0;
    const primaryName = card?.classes?.[0]?.name || '無';
    // 蒐集每個級別的 initialNote
    const initialNotes = [];
    if (card?.classes) {
      for (const cls of card.classes) {
        try {
          const data = await getLevel(cls.id);
          if (data.initialNote) {
            initialNotes.push({ name: data.name || cls.name, note: data.initialNote });
          }
        } catch {}
      }
    }

    let listHtml = '';
    let totalVisible = 0;
    for (const g of groups) {
      const visible = g.skills.filter(s => passesFilter(s, card));
      if (visible.length === 0) continue;
      totalVisible += visible.length;
      listHtml += `<div class="skp-group-h">${escapeHtml(g.title)} <span class="ct">${visible.length}</span></div>`;
      for (const sk of visible) {
        const key = skillKey(sk.classId, sk.name);
        const eq = isEquipped(card, key);
        const meta = [sk.category, sk.limit].filter(x => x && x !== '無' && x !== '—').join(' · ');
        listHtml += `<div class="skp-item${eq ? ' selected' : ''}"
          data-key="${escapeHtml(key)}" data-classid="${sk.classId || ''}" data-name="${escapeHtml(sk.name)}">
          <div class="check${eq ? ' on' : ''}"></div>
          <div>
            <div class="nm">${escapeHtml(sk.name)}</div>
            <div class="meta">${escapeHtml(meta || '—')}</div>
          </div>
          <div class="skp-cost">${escapeHtml(sk.cost || '—')}</div>
        </div>`;
      }
    }
    if (totalVisible === 0 && groups.length === 0) {
      listHtml = `<div style="padding:24px 0; text-align:center; color:var(--ink-300); font-family:var(--f-mono); font-size:11px;">
        尚未指定級別<br>從中欄「級別」加入主級別後此處顯示可選特技
      </div>`;
    } else if (totalVisible === 0) {
      listHtml = `<div style="padding:24px 0; text-align:center; color:var(--ink-300); font-family:var(--f-mono); font-size:11px;">
        無符合的特技
      </div>`;
    }

    const filterChips = [
      `<span class="skp-chip${filters.equippedOnly ? ' on' : ''}" data-filter="equipped">已習得 ${totalEquipped}</span>`,
      ...FILTER_CATEGORIES.map(cat =>
        `<span class="skp-chip${filters.categories.has(cat) ? ' on' : ''}" data-filter="cat" data-cat="${cat}">${cat}</span>`
      ),
    ].join('');

    pickerEl.innerHTML = `
      <div class="sec-label">
        <span class="glyph">特技</span><span>skill picker</span><span class="rule"></span>
        <span class="ord">${totalEquipped} 習得</span>
      </div>
      <div class="skp-search">
        <input placeholder="検索 — 名稱・效果・分類" data-search value="${escapeHtml(filters.search)}">
      </div>
      <div class="skp-filters">${filterChips}</div>
      <div class="skp-list">${listHtml}</div>
      ${initialNotes.length > 0 ? `
        <div style="border-top:1px solid var(--ink-500); padding:var(--s-3) 0 0; margin-top:var(--s-3); font-family:var(--f-mono); font-size:10px; color:var(--ink-300); line-height:1.5">
          ${initialNotes.map(n => `
            <div style="margin-bottom:4px">
              <span style="color:var(--gold);font-family:var(--f-heading);letter-spacing:.2em">初期 · ${escapeHtml(n.name)}</span><br>
              <span style="color:var(--ink-200)">${escapeHtml(n.note)}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      <div class="skp-foot">
        <span>已習得　<b>${totalEquipped}</b>　·　主：${escapeHtml(primaryName)}</span>
      </div>
    `;
    // 保留搜尋 input 焦點
    if (document.activeElement && document.activeElement.dataset.search !== undefined) {
      const inp = pickerEl.querySelector('[data-search]');
      if (inp) {
        inp.focus();
        inp.setSelectionRange(inp.value.length, inp.value.length);
      }
    }
  }

  function renderEquipped() {
    const card = getActiveCard(store.getState());
    const equipped = card?.skills?.equipped || [];
    if (equipped.length === 0) {
      equippedEl.innerHTML = `<span class="eq-chip" style="opacity:.5; cursor:default">尚未選擇特技</span>`;
      return;
    }
    equippedEl.innerHTML = equipped.map(s => {
      const key = skillKey(s.classId, s.name);
      const on = highlightedKey === key ? ' on' : '';
      return `<span class="eq-chip${on}" data-key="${escapeHtml(key)}">${escapeHtml(s.name)}${on ? ' <span class="x">●</span>' : ''}</span>`;
    }).join('');
  }

  function renderDetail() {
    const card = getActiveCard(store.getState());
    const equipped = card?.skills?.equipped || [];
    if (equipped.length === 0) {
      detailEl.style.display = 'none';
      return;
    }
    if (!highlightedKey || !equipped.some(s => skillKey(s.classId, s.name) === highlightedKey)) {
      const first = equipped[0];
      highlightedKey = skillKey(first.classId, first.name);
    }
    const sk = equipped.find(s => skillKey(s.classId, s.name) === highlightedKey);
    if (!sk) { detailEl.style.display = 'none'; return; }

    detailEl.style.display = '';
    const cls = card.classes.find(c => c.id === sk.classId);
    const sourceLabel = sk.classId ? (cls?.name || sk.classId) : '共通';

    const advancedHtml = (sk.secondaryCondition || sk.additionalEffect) ? `
      <div class="sk-advanced">
        <div class="sk-adv-block shu">
          <div class="k">二段條件</div>
          <div class="v">${escapeHtml(sk.secondaryCondition || '—').replace(/\n/g, '<br>')}</div>
        </div>
        <div class="sk-adv-block gold">
          <div class="k">追加效果</div>
          <div class="v">${escapeHtml(sk.additionalEffect || '—').replace(/\n/g, '<br>')}</div>
        </div>
      </div>` : '';
    const emoHtml = sk.emotionReward ? `
      <div class="sk-emo">
        <span class="lbl">情緒獎勵</span>
        <span class="pill-g">${escapeHtml(sk.emotionReward)}</span>
      </div>` : '';

    detailEl.innerHTML = `
      <span class="pin">SELECTED</span>
      <div class="head">
        <div class="nm">${escapeHtml(sk.name)}${sk.yomi ? `<span class="yomi">${escapeHtml(sk.yomi)}</span>` : ''}</div>
        <div class="badges">
          <span class="sk-badge shu">${escapeHtml(sk.category || '—')}</span>
          <span class="sk-badge">${escapeHtml(sourceLabel)}</span>
        </div>
      </div>
      <div class="grid">
        <div class="sk-cell"><div class="k">分類</div><div class="v">${escapeHtml(sk.category || '—')}</div></div>
        <div class="sk-cell"><div class="k">代價</div><div class="v">${escapeHtml(sk.cost || '—')}</div></div>
        <div class="sk-cell"><div class="k">取得限制</div><div class="v">${escapeHtml(sk.limit || '無')}</div></div>
        <div class="sk-cell"><div class="k">情緒獎勵</div><div class="v">${escapeHtml(sk.emotionReward || '—')}</div></div>
      </div>
      <div class="sk-effect">${escapeHtml(sk.effect || '—').replace(/\n/g, '<br>')}</div>
      ${advancedHtml}
      ${emoHtml}
    `;
  }

  async function renderAll() {
    await renderPicker();
    renderEquipped();
    renderDetail();
  }

  // ---- Events ----
  pickerEl.addEventListener('click', async e => {
    const filter = e.target.closest('.skp-chip');
    if (filter) {
      const f = filter.dataset.filter;
      if (f === 'equipped') filters.equippedOnly = !filters.equippedOnly;
      else if (f === 'cat') {
        const cat = filter.dataset.cat;
        filters.categories.has(cat) ? filters.categories.delete(cat) : filters.categories.add(cat);
      }
      renderPicker();
      return;
    }
    const item = e.target.closest('.skp-item');
    if (!item) return;
    const card = getActiveCard(store.getState());
    if (!card) return;
    const classId = item.dataset.classid || null;
    const name = item.dataset.name;
    const key = skillKey(classId, name);
    if (isEquipped(card, key)) {
      store.updateCard(card.id, c => {
        c.skills.equipped = c.skills.equipped.filter(
          s => !(s.name === name && (s.classId || null) === (classId || null))
        );
      });
    } else {
      let full;
      if (classId) {
        const data = await getLevel(classId);
        full = [...data.skills.general, ...data.skills.extra].find(s => s.name === name);
      } else {
        full = commonData.skills.find(s => s.name === name);
      }
      if (!full) return;
      const skillObj = {
        name: full.name,
        yomi: '',
        classId: classId,
        category: full.category || '',
        cost: full.cost || '',
        limit: full.limit || '',
        effect: full.effect || '',
        secondaryCondition: '',
        additionalEffect: '',
        emotionReward: '',
      };
      store.updateCard(card.id, c => {
        c.skills.equipped.push(skillObj);
      });
      highlightedKey = key;
    }
  });

  pickerEl.addEventListener('input', e => {
    if (e.target.matches('[data-search]')) {
      filters.search = e.target.value;
      renderPicker();
    }
  });

  equippedEl.addEventListener('click', e => {
    const chip = e.target.closest('.eq-chip');
    if (!chip || !chip.dataset.key) return;
    highlightedKey = chip.dataset.key;
    renderEquipped();
    renderDetail();
  });

  // 當 store 變動（含 active card 切換、技能勾選），全部重繪
  let lastActiveId = null;
  store.subscribe(() => {
    const cur = store.getState().activeCardId;
    if (cur !== lastActiveId) {
      lastActiveId = cur;
      highlightedKey = null;  // 切換角色時重置 highlight
    }
    renderAll();
  });
  lastActiveId = store.getState().activeCardId;
  await renderAll();
}
