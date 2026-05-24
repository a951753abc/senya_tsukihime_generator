/**
 * 技能系統 v4：左欄 picker（2 行 effect 預覽 / 點擊展開 / 看選分離 / 分類色 pill）
 *                + 中欄 equipped-strip + sk-detail
 *
 * 三個 root 共用 highlightedKey + expandedKey 狀態。
 */

import { escapeHtml, getActiveCard } from '../helpers.js';
import { loadLevel, loadCommonSkills, loadMeta } from '../data-loader.js';
import { abilityTotal } from '../derive.js';

const COMMON_PSEUDO_ID = '__common__';
const SORT_MODES = ['級別', '分類', '代價'];
const FILTER_CATEGORIES = ['主動', '反應', '常時', '特殊'];

function skillKey(classId, name) {
  return `${classId || COMMON_PSEUDO_ID}::${name}`;
}

function categoryGroup(cat) {
  if (!cat) return '特殊';
  // 常時 = passive
  if (cat.includes('常時') || cat.includes('常时')) return '常時';
  // 中斷 = reaction（千夜月姬以「中斷」表示打斷對方行動的反應技）
  if (cat.includes('中斷') || cat.includes('反應') || cat.includes('反应')) return '反應';
  // 主動：通用/準備/進攻/攻擊類型 等都歸主動
  if (cat.includes('主動')
   || cat.includes('通用')
   || cat.includes('準備')
   || cat.includes('進攻')
   || cat.includes('攻擊')
   || cat.includes('通常')) return '主動';
  return '特殊';
}

function costGroup(cost) {
  if (!cost || cost === '—' || cost === '-' || cost === '無') return '無代價';
  const hasTp = /TP/i.test(cost);
  const hasHp = /HP|代價傷害/i.test(cost);
  if (hasTp && hasHp) return '混合';
  if (hasHp) return 'HP';
  if (hasTp) return 'TP';
  return '其他';
}

const ABILITY_NAME_MAP = {
  '體力': 'physical', '体力': 'physical',
  '知覺': 'perception', '知觉': 'perception',
  '理智': 'reason',
  '意志': 'will',
};

/**
 * 嘗試把 limit 文字拆成 chip 段，並判定每段是否符合
 * 例：「古神道 Lv1+」 → { text: '古神道 Lv1+', met: 是否有 og class lv>=1 }
 *     「理智 5+」    → { text: '理智 5+', met: physical total >= 5 }
 */
function evaluatePrereqs(limit, card, levelMetaById) {
  if (!limit || limit === '無' || limit === '—' || !card) return [];
  // 用「,／、 」拆段
  const parts = limit.split(/[,、，;；]\s*|\s\s+/).map(s => s.trim()).filter(Boolean);
  return parts.map(text => {
    let met = null;  // null = 無法判定，true/false = 結果

    // ability check: 體力 5+ / 知覺 6+ / etc.
    const abMatch = text.match(/^(體力|体力|知覺|知觉|理智|意志)\s*(\d+)\+?$/);
    if (abMatch) {
      const k = ABILITY_NAME_MAP[abMatch[1]];
      const need = Number(abMatch[2]);
      const total = abilityTotal(card.stats.abilities[k]);
      met = total >= need;
    }

    // class level check: <name> Lv<N>+ — 根據 levelMetaById 比對
    if (met === null) {
      const lvMatch = text.match(/^(\S+?)\s*Lv?\s*(\d+)\+?$/i);
      if (lvMatch) {
        const className = lvMatch[1];
        const need = Number(lvMatch[2]);
        // 找 class by name
        const cls = card.classes.find(c => (c.name === className) || (c.id === className));
        met = !!cls && (cls.level >= need);
      }
    }

    return { text, met };
  });
}

export async function mountSkills({ pickerEl, equippedEl, detailEl }, store) {
  const commonData = await loadCommonSkills();
  const meta = await loadMeta();
  const levelCache = new Map();
  const levelMetaById = new Map(meta.levels.map(l => [l.id, l]));

  let highlightedKey = null;
  const expanded = new Set();
  const dismissedInitBanners = new Set();  // banner 被關閉時記住，當輪 session 不再彈

  const filters = {
    search: '',
    equippedOnly: false,
    unmetOnly: false,
    categories: new Set(),
    sortMode: '級別',
  };

  async function getLevel(classId) {
    if (!levelCache.has(classId)) levelCache.set(classId, await loadLevel(classId));
    return levelCache.get(classId);
  }

  async function gatherAllSkills(card) {
    if (!card) return [];
    const all = [];
    for (const cls of card.classes) {
      try {
        const data = await getLevel(cls.id);
        const cm = levelMetaById.get(cls.id) || {};
        for (const s of data.skills.general) {
          all.push({ ...s, classId: cls.id, className: data.name || cls.name, source: 'general',
                     classRole: cls.isPrimary ? 'primary' : 'sub', classMeta: cm });
        }
        for (const s of data.skills.extra) {
          all.push({ ...s, classId: cls.id, className: data.name || cls.name, source: 'extra',
                     classRole: cls.isPrimary ? 'primary' : 'sub', classMeta: cm });
        }
      } catch (e) {
        console.warn(`載入級別 ${cls.id} 失敗`, e);
      }
    }
    for (const s of commonData.skills) {
      all.push({ ...s, classId: null, className: '共通特技', source: 'common', classRole: 'common' });
    }
    return all;
  }

  function isEquipped(card, key) {
    return !!card?.skills?.equipped?.some(s => skillKey(s.classId, s.name) === key);
  }

  function passesFilter(sk, card) {
    const key = skillKey(sk.classId, sk.name);
    if (filters.equippedOnly && !isEquipped(card, key)) return false;
    if (filters.categories.size > 0) {
      if (!filters.categories.has(categoryGroup(sk.category))) return false;
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const hay = `${sk.name} ${sk.category} ${sk.cost} ${sk.effect} ${sk.limit || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.unmetOnly) {
      const prereqs = evaluatePrereqs(sk.limit, card, levelMetaById);
      const anyUnmet = prereqs.some(p => p.met === false);
      if (!anyUnmet) return false;
    }
    return true;
  }

  function buildGroups(skills) {
    const mode = filters.sortMode;
    if (mode === '級別') {
      const byClass = new Map();
      for (const s of skills) {
        const k = s.classId || COMMON_PSEUDO_ID;
        if (!byClass.has(k)) byClass.set(k, { title: s.className, role: s.classRole, items: [] });
        byClass.get(k).items.push(s);
      }
      // 主級別 → 副級別 → 共通
      const order = ['primary', 'sub', 'common'];
      const groups = [];
      for (const role of order) {
        for (const [k, g] of byClass) {
          if (g.role === role) groups.push({ ...g, key: k });
        }
      }
      return groups;
    }
    if (mode === '分類') {
      const groups = FILTER_CATEGORIES.map(cat => ({ title: cat, role: 'common', items: [], key: `cat-${cat}` }));
      const map = new Map(groups.map(g => [g.title, g]));
      for (const s of skills) {
        const c = categoryGroup(s.category);
        map.get(c)?.items.push(s);
      }
      return groups.filter(g => g.items.length > 0);
    }
    if (mode === '代價') {
      const order = ['無代價', 'TP', 'HP', '混合', '其他'];
      const map = new Map(order.map(o => [o, { title: o, role: 'common', items: [], key: `cost-${o}` }]));
      for (const s of skills) {
        const g = costGroup(s.cost);
        map.get(g)?.items.push(s);
      }
      return order.map(o => map.get(o)).filter(g => g.items.length > 0);
    }
    return [];
  }

  function renderItemHtml(sk, card) {
    const key = skillKey(sk.classId, sk.name);
    const eq = isEquipped(card, key);
    const isExp = expanded.has(key);
    const cat = categoryGroup(sk.category);
    const prereqs = evaluatePrereqs(sk.limit, card, levelMetaById);
    const costNone = !sk.cost || sk.cost === '—' || sk.cost === '-' || sk.cost === '無';
    const costHtml = costNone
      ? `<span class="skp-cost none">— · 無代價</span>`
      : `<span class="skp-cost"><b>${escapeHtml(sk.cost)}</b></span>`;

    const prereqHtml = prereqs.length === 0
      ? `<div class="skp-prereq"><span class="pin">前提</span><span>無</span></div>`
      : `<div class="skp-prereq">
          <span class="pin">前提</span>
          ${prereqs.map((p, i) => {
            const cls = p.met === false ? 'req-x' : (p.met === true ? 'req' : '');
            return `${i > 0 ? '<span>·</span>' : ''}<span class="${cls}">${escapeHtml(p.text)}</span>`;
          }).join('')}
        </div>`;

    const advHtml = (sk.secondaryCondition || sk.additionalEffect || sk.emotionReward) ? `
      <div class="adv-grid">
        ${sk.secondaryCondition ? `<div class="adv shu"><span class="k">二段條件</span>${escapeHtml(sk.secondaryCondition)}</div>` : ''}
        ${sk.additionalEffect ? `<div class="adv gold"><span class="k">追加效果</span>${escapeHtml(sk.additionalEffect)}</div>` : ''}
        ${sk.emotionReward ? `<div class="adv"><span class="k">情緒獎勵</span>${escapeHtml(sk.emotionReward)}</div>` : ''}
      </div>` : '';

    const expandHtml = `
      <div class="skp-expand">
        ${advHtml}
        <div class="skp-actions">
          <button class="skp-add-btn" data-toggle-equip>
            <span class="ic">${eq ? '✓' : '＋'}</span>${eq ? '已習得 — 點此移除' : '習得此技能'}
          </button>
          <button class="skp-link-btn" data-link-detail>⤴ 中央詳情</button>
        </div>
      </div>`;

    const classes = ['skp-item'];
    if (eq) classes.push('equipped');
    if (isExp) classes.push('expanded');

    return `<div class="${classes.join(' ')}" data-key="${escapeHtml(key)}" data-classid="${sk.classId || ''}" data-name="${escapeHtml(sk.name)}">
      <div class="skp-row">
        <span class="nm">${escapeHtml(sk.name)}</span>
        ${sk.yomi ? `<span class="yomi">${escapeHtml(sk.yomi)}</span>` : ''}
        <span class="skp-cat" data-c="${cat}">${cat}</span>
      </div>
      <div class="skp-status">
        ${costHtml}
        <span class="check"></span>
        <span class="chev">▾</span>
      </div>
      ${prereqHtml}
      <div class="skp-effect">${escapeHtml(sk.effect || '—').replace(/\n/g, '<br>')}</div>
      ${expandHtml}
    </div>`;
  }

  async function renderPicker({ preserveScroll = true } = {}) {
    const previousList = pickerEl.querySelector('.skp-list');
    const previousScrollTop = preserveScroll ? (previousList?.scrollTop || 0) : 0;
    const card = getActiveCard(store.getState());
    const all = await gatherAllSkills(card);
    const filtered = all.filter(s => passesFilter(s, card));
    const totalEquipped = card?.skills?.equipped?.length || 0;
    const primaryName = card?.classes?.[0]?.name || '無';
    const totalCount = all.length;
    const filteredCount = filtered.length;

    const groups = buildGroups(filtered);
    // 各 group 已習得數量（用於「✕ 清空 N」按鈕）
    function equippedCountFor(g) {
      if (!card?.skills?.equipped) return 0;
      // 對 級別模式：g.key 是 classId（含 COMMON_PSEUDO_ID）
      if (filters.sortMode === '級別') {
        if (g.key === COMMON_PSEUDO_ID) {
          return card.skills.equipped.filter(s => !s.classId).length;
        }
        return card.skills.equipped.filter(s => s.classId === g.key).length;
      }
      // 分類 / 代價模式：依 group items 的名稱集合判定
      const setOfNames = new Set(g.items.map(it => skillKey(it.classId, it.name)));
      return card.skills.equipped.filter(s => setOfNames.has(skillKey(s.classId, s.name))).length;
    }

    const groupsHtml = groups.map(g => {
      const roleLabel = g.role === 'primary' ? '主級別' : (g.role === 'sub' ? '副級別' : (g.role === 'common' ? '全職通用' : ''));
      const roleClass = g.role || 'common';
      const eqN = equippedCountFor(g);
      const clearKey = filters.sortMode === '級別' ? (g.key || '') : '';
      const clearBtn = filters.sortMode === '級別' && clearKey
        ? `<button class="clear" data-clear-group="${escapeHtml(clearKey)}"${eqN === 0 ? ' disabled' : ''}>✕ 清空 ${eqN}</button>`
        : '';
      return `<div class="skp-group-h">
        <span>${escapeHtml(g.title)}</span>
        <span class="lbl-r">
          <span class="role ${roleClass}">${roleLabel}</span>
          <span class="ct">${g.items.length}</span>
          ${clearBtn}
        </span>
      </div>` + g.items.map(s => renderItemHtml(s, card)).join('');
    }).join('');

    const listHtml = groupsHtml || `<div style="padding:32px var(--s-5); text-align:center; color:var(--ink-300); font-family:var(--f-mono); font-size:11px">
      ${all.length === 0 ? '尚未指定級別<br>從中欄「級別」加入主級別後此處顯示可選特技' : '無符合的特技'}
    </div>`;

    // 初始技能 banners（搬到搜尋下方顯眼位置；可關閉）
    const initialNotes = [];
    if (card?.classes) {
      for (const cls of card.classes) {
        try {
          const data = await getLevel(cls.id);
          if (data.initialNote && !dismissedInitBanners.has(cls.id)) {
            initialNotes.push({
              classId: cls.id,
              name: data.name || cls.name,
              role: cls.isPrimary ? '主級別' : '副級別',
              note: data.initialNote,
            });
          }
        } catch {}
      }
    }
    const initialBannersHtml = initialNotes.map(n => `
      <div class="skp-init" data-init-banner="${escapeHtml(n.classId)}">
        <div class="ic">初</div>
        <div class="body">
          <div class="ttl">級別初始 <b>${escapeHtml(n.name)} · ${n.role}</b></div>
          <div class="txt">${escapeHtml(n.note)}</div>
        </div>
        <div class="close" data-close-init="${escapeHtml(n.classId)}" title="關閉提示">✕</div>
      </div>
    `).join('');

    const sortSegHtml = SORT_MODES.map(m =>
      `<button class="${m === filters.sortMode ? 'on' : ''}" data-sort="${m}">${m}</button>`
    ).join('');

    const filterChips = [
      `<span class="skp-chip${filters.equippedOnly ? ' on' : ''}" data-filter="equipped">已習得 ${totalEquipped}</span>`,
      `<span class="skp-chip${filters.unmetOnly ? ' on' : ''}" data-filter="unmet">未達條件</span>`,
      ...FILTER_CATEGORIES.map(cat =>
        `<span class="skp-chip${filters.categories.has(cat) ? ' cat-on' : ''}" data-filter="cat" data-cat="${cat}">${cat}</span>`
      ),
    ].join('');

    pickerEl.innerHTML = `
      <div class="sec-label">
        <span class="glyph">特技</span><span>skill picker</span><span class="rule"></span>
        <span class="ord">${totalEquipped} 習得</span>
      </div>
      <div class="skp-search">
        <input placeholder="検索 — 特技名／效果關鍵字／分類" data-search value="${escapeHtml(filters.search)}">
      </div>
      ${initialBannersHtml}
      <div class="skp-bar">
        <div class="seg" role="tablist">${sortSegHtml}</div>
        <span class="spacer"></span>
        <button class="clear-all" data-clear-all${totalEquipped === 0 ? ' disabled' : ''}>✕ 清空全部 ${totalEquipped}</button>
        <span class="count"><b>${filteredCount}</b> 候補</span>
      </div>
      <div class="skp-filters">${filterChips}</div>
      <div class="skp-list">${listHtml}</div>
      <div class="skp-foot">
        <span class="legend">
          <span><i class="a"></i>主動</span>
          <span><i class="r"></i>反應</span>
          <span><i class="p"></i>常時</span>
        </span>
        <span>習得 <b>${totalEquipped}</b> · 主：${escapeHtml(primaryName)}</span>
      </div>
    `;

    // 保留搜尋焦點
    if (document.activeElement?.dataset?.search !== undefined) {
      const inp = pickerEl.querySelector('[data-search]');
      if (inp) {
        inp.focus();
        inp.setSelectionRange(inp.value.length, inp.value.length);
      }
    }

    const nextList = pickerEl.querySelector('.skp-list');
    if (nextList) nextList.scrollTop = previousScrollTop;
  }

  // ---- Equipped-strip + sk-detail（保留 v3 行為） ----
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
    if (equipped.length === 0) { detailEl.style.display = 'none'; return; }
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

  async function renderAll(options = {}) {
    await renderPicker(options);
    renderEquipped();
    renderDetail();
  }

  // ---- 事件處理 ----
  async function toggleEquip(card, classId, name) {
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
      store.updateCard(card.id, c => {
        c.skills.equipped.push({
          name: full.name, yomi: '', classId,
          category: full.category || '',
          cost: full.cost || '',
          limit: full.limit || '',
          effect: full.effect || '',
          secondaryCondition: '', additionalEffect: '', emotionReward: '',
        });
      });
      highlightedKey = key;
    }
  }

  pickerEl.addEventListener('click', async e => {
    const card = getActiveCard(store.getState());
    if (!card) return;
    const t = e.target;

    // 初始技能 banner 關閉
    const closeBtn = t.closest('[data-close-init]');
    if (closeBtn) {
      dismissedInitBanners.add(closeBtn.dataset.closeInit);
      renderPicker();
      return;
    }

    // 清空全部
    const clearAllBtn = t.closest('[data-clear-all]');
    if (clearAllBtn) {
      if (clearAllBtn.disabled) return;
      const total = card.skills.equipped.length;
      if (!confirm(`確定要清空全部 ${total} 個已習得特技？此動作不可復原（除非從匯出 JSON 還原）。`)) return;
      store.updateCard(card.id, c => { c.skills.equipped = []; });
      expanded.clear();
      highlightedKey = null;
      return;
    }

    // 清空單一級別
    const clearGrpBtn = t.closest('[data-clear-group]');
    if (clearGrpBtn) {
      if (clearGrpBtn.disabled) return;
      const grpKey = clearGrpBtn.dataset.clearGroup;
      const targetClassId = grpKey === COMMON_PSEUDO_ID ? null : grpKey;
      const matched = card.skills.equipped.filter(
        s => (s.classId || null) === targetClassId
      );
      if (matched.length === 0) return;
      const grpName = grpKey === COMMON_PSEUDO_ID
        ? '共通'
        : (levelMetaById.get(grpKey)?.name || grpKey);
      if (!confirm(`確定要清空「${grpName}」的 ${matched.length} 個已習得特技？`)) return;
      store.updateCard(card.id, c => {
        c.skills.equipped = c.skills.equipped.filter(
          s => (s.classId || null) !== targetClassId
        );
      });
      return;
    }

    // sort seg
    const sortBtn = t.closest('[data-sort]');
    if (sortBtn) {
      filters.sortMode = sortBtn.dataset.sort;
      renderPicker();
      return;
    }
    // filter chip
    const filterEl = t.closest('.skp-chip');
    if (filterEl) {
      const f = filterEl.dataset.filter;
      if (f === 'equipped') filters.equippedOnly = !filters.equippedOnly;
      else if (f === 'unmet') filters.unmetOnly = !filters.unmetOnly;
      else if (f === 'cat') {
        const cat = filterEl.dataset.cat;
        filters.categories.has(cat) ? filters.categories.delete(cat) : filters.categories.add(cat);
      }
      renderPicker();
      return;
    }
    // item interactions
    const item = t.closest('.skp-item');
    if (!item) return;
    const classId = item.dataset.classid || null;
    const name = item.dataset.name;
    const key = skillKey(classId, name);

    // check 或 add-btn → toggle equip（不展開）
    if (t.closest('.check') || t.closest('[data-toggle-equip]')) {
      e.stopPropagation();
      await toggleEquip(card, classId, name);
      return;
    }
    // link-btn → 跳到中央 detail（需要先 equip）
    if (t.closest('[data-link-detail]')) {
      e.stopPropagation();
      if (!isEquipped(card, key)) await toggleEquip(card, classId, name);
      highlightedKey = key;
      // 滾動 sk-detail 進視野
      detailEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      renderEquipped();
      renderDetail();
      return;
    }
    // 其他 click on row body → toggle expand（單開：摺疊其他）
    if (expanded.has(key)) {
      expanded.delete(key);
    } else {
      expanded.clear();
      expanded.add(key);
    }
    renderPicker();
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

  let lastActiveId = store.getState().activeCardId;
  store.subscribe(() => {
    const cur = store.getState().activeCardId;
    let preserveScroll = true;
    if (cur !== lastActiveId) {
      lastActiveId = cur;
      highlightedKey = null;
      expanded.clear();
      preserveScroll = false;
    }
    renderAll({ preserveScroll });
  });
  await renderAll({ preserveScroll: false });
}
