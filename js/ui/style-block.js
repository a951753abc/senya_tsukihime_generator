/**
 * 風格區塊：chips（選中的風格）+ 下拉新增 + derived 表（每個風格 4 連動欄位 + 合計）
 */

import { escapeHtml, getActiveCard } from '../helpers.js';
import { loadStyles } from '../data-loader.js';

const CATEGORY_ORDER = ['起源系', '通用系', '限定系'];

export async function mountStyleBlock(rootEl, store) {
  const data = await loadStyles();
  const all = data.styles;
  const byCategory = {};
  for (const cat of CATEGORY_ORDER) byCategory[cat] = [];
  for (const s of all) (byCategory[s.category] || (byCategory[s.category] = [])).push(s);

  function findRef(name) {
    return all.find(s => s.name === name);
  }

  function chipHtml(s, i) {
    const isPrimary = i === 0;
    const ord = isPrimary ? '主' : (i < 9 ? `0${i + 1}` : String(i + 1));
    return `<span class="style-tag${isPrimary ? ' primary' : ''}" data-idx="${i}" title="點擊設為主風格">
      <span class="ord">${ord}</span>${escapeHtml(s.name)}
      <span class="x" data-action="rm" data-idx="${i}" title="移除">×</span>
    </span>`;
  }

  function dropdownHtml(usedNames) {
    const groups = CATEGORY_ORDER.map(cat => {
      const list = (byCategory[cat] || []).filter(s => !usedNames.has(s.name));
      if (list.length === 0) return '';
      const opts = list.map(s => {
        const restriction = s.classRestriction && s.classRestriction !== '無'
          ? ` 〔${s.classRestriction}〕` : '';
        return `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}${escapeHtml(restriction)}</option>`;
      }).join('');
      return `<optgroup label="${cat}（${list.length}）">${opts}</optgroup>`;
    }).join('');
    return `<select class="style-pick" data-action="add">
      <option value="" selected disabled>＋ 追加風格</option>
      ${groups}
    </select>`;
  }

  function derivedHtml(styles) {
    if (styles.length === 0) {
      return `<div class="style-row">
        <div class="cell" style="grid-column:1/-1;text-align:center;color:var(--paper-300);font-family:var(--f-mono);font-size:11px">
          尚未選擇風格
        </div>
      </div>`;
    }
    let rows = styles.map((s, i) => `
      <div class="style-row${i === 0 ? ' primary' : ''}">
        <div class="cell style-name"><span class="marker"></span>${escapeHtml(s.name)}</div>
        <div class="cell">${escapeHtml(s.classification || '—')}</div>
        <div class="cell">${escapeHtml(s.antithesis || '—')}</div>
        <div class="cell">${escapeHtml(s.compensation || '—')}</div>
        <div class="cell">${escapeHtml(s.emotion || '—')}</div>
      </div>
    `).join('');
    const mergeTagsFor = (key) => styles.map((s, i) => {
      if (!s[key]) return '';
      return `<span class="merge-tag${i === 0 ? ' shu' : ''}">${escapeHtml(s[key])}</span>`;
    }).join('');
    rows += `
      <div class="style-row total-row">
        <div class="cell">合計／統合</div>
        <div class="cell">${mergeTagsFor('classification') || '—'}</div>
        <div class="cell">${mergeTagsFor('antithesis') || '—'}</div>
        <div class="cell">${mergeTagsFor('compensation') || '—'}</div>
        <div class="cell">${mergeTagsFor('emotion') || '—'}</div>
      </div>`;
    return rows;
  }

  function render() {
    const card = getActiveCard(store.getState());
    if (!card) { rootEl.innerHTML = ''; return; }
    const styles = card.styles || [];
    const usedNames = new Set(styles.map(s => s.name));

    rootEl.innerHTML = `
      <div class="style-head">
        <span class="lbl">風格 — style</span>
        <div class="style-chips">
          ${styles.map((s, i) => chipHtml(s, i)).join('')}
          ${dropdownHtml(usedNames)}
        </div>
      </div>
      <div class="style-derived">
        <div class="h">風格</div>
        <div class="h">分類</div>
        <div class="h">背反律</div>
        <div class="h">代償</div>
        <div class="h">獲得感情</div>
        ${derivedHtml(styles)}
      </div>
      <div class="style-hint">
        <span><b>連動：</b>風格決定其下四欄；新增／移除即時同步。</span>
        <span><b>主風格：</b>第一個為主，朱色標記。</span>
        <span><b>切換主：</b>點任一風格 chip → 升為主。</span>
      </div>
    `;
  }

  rootEl.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset?.action !== 'add') return;
    const name = t.value;
    if (!name) return;
    const ref = findRef(name);
    if (!ref) return;
    const id = store.getState().activeCardId;
    if (!id) return;
    store.updateCard(id, c => {
      c.styles.push({
        name: ref.name,
        classification: ref.classification || '',
        antithesis: ref.antithesis || '',
        compensation: ref.compensation || '',
        emotion: ref.emotion || '',
        isPrimary: c.styles.length === 0,
        description: ref.description || '',
        classRestriction: ref.classRestriction || '',
        representative: ref.representative || '',
      });
    });
    t.value = '';
  });

  rootEl.addEventListener('click', e => {
    const t = e.target;
    const action = t.dataset?.action;
    const id = store.getState().activeCardId;
    if (!id) return;

    if (action === 'rm') {
      e.stopPropagation();
      const idx = Number(t.dataset.idx);
      store.updateCard(id, c => {
        c.styles.splice(idx, 1);
        c.styles.forEach((s, i) => { s.isPrimary = i === 0; });
      });
      return;
    }

    const tag = t.closest('.style-tag');
    if (tag) {
      const idx = Number(tag.dataset.idx);
      if (idx === 0) return;  // 已是主
      store.updateCard(id, c => {
        const [picked] = c.styles.splice(idx, 1);
        c.styles.unshift(picked);
        c.styles.forEach((s, i) => { s.isPrimary = i === 0; });
      });
    }
  });

  store.subscribe(render);
  render();
}
