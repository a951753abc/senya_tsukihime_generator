/** 角色關係表 — name / 感情(下拉) / 色調 / 羈絆 / 備註 + 合計 */

import { escapeHtml, getActiveCard } from '../helpers.js';
import { loadEmotions } from '../data-loader.js';
import { deriveBond } from '../derive.js';

export async function mountRelationships(rootEl, store) {
  const data = await loadEmotions();
  const emotions = data.emotions;
  // 依 section 分組（基本／黑色／LARP 等）
  const bySection = new Map();
  for (const e of emotions) {
    const s = e.section || '其他';
    if (!bySection.has(s)) bySection.set(s, []);
    bySection.get(s).push(e);
  }
  const findEmotion = (name) => emotions.find(e => e.name === name);

  function emotionOptions(currentName) {
    const groups = [...bySection.entries()].map(([section, list]) => {
      const opts = list.map(e => {
        const sel = e.name === currentName ? ' selected' : '';
        return `<option value="${escapeHtml(e.name)}"${sel}>${escapeHtml(e.name)}（${e.tone === 'pure' ? '潔淨' : '瘋狂'} ${e.bond}）</option>`;
      }).join('');
      return `<optgroup label="${escapeHtml(section)}">${opts}</optgroup>`;
    }).join('');
    return `<select data-action="set-emotion">
      <option value=""${currentName ? '' : ' selected'}>—</option>
      ${groups}
    </select>`;
  }

  function rowHtml(r, i) {
    const npc = r.isNpc ? 'checked' : '';
    const bondClass = (r.bond || 0) >= 0 ? 'pos' : 'neg';
    const tone = r.tone === 'pure' ? 'pure' : r.tone === 'crazy' ? 'crazy' : '';
    const toneLabel = r.tone === 'pure' ? '潔淨' : r.tone === 'crazy' ? '瘋狂' : '—';
    return `<tr data-idx="${i}">
      <td class="nm">
        <input data-action="set-name" value="${escapeHtml(r.name || '')}" placeholder="角色名"
          style="background:transparent;border:0;outline:none;font:inherit;color:inherit;width:100%">
        <label style="display:flex;align-items:center;gap:4px;font-family:var(--f-mono);font-size:9px;color:var(--paper-700);margin-top:2px;cursor:pointer">
          <input type="checkbox" data-action="set-npc" ${npc} style="margin:0">NPC
        </label>
      </td>
      <td>${emotionOptions(r.emotion)}</td>
      <td>
        <span class="rel-emotion">
          <span class="tone ${tone}"></span>${toneLabel}
        </span>
      </td>
      <td>
        <input type="number" data-action="set-bond" value="${r.bond ?? 0}"
          style="background:transparent;border:0;outline:none;font:inherit;color:inherit;width:48px;font-family:var(--f-mono);font-weight:700"
          class="rel-bond ${bondClass}">
      </td>
      <td>
        <input data-action="set-note" value="${escapeHtml(r.note || '')}" placeholder="備註"
          style="background:transparent;border:0;outline:none;font:inherit;color:inherit;width:100%">
        <button data-action="rm" style="float:right;background:transparent;border:0;color:var(--paper-300);cursor:pointer;font-family:var(--f-mono)"
          title="移除">×</button>
      </td>
    </tr>`;
  }

  function render() {
    const card = getActiveCard(store.getState());
    if (!card) { rootEl.innerHTML = ''; return; }
    const rels = card.relationships || [];
    const bond = deriveBond(rels);

    const tableBody = rels.length === 0
      ? `<tr><td colspan="4" style="text-align:center;color:var(--paper-300);font-style:italic;padding:18px">尚無關係，點下方「+ 追加關係」開始記錄</td><td></td></tr>`
      : rels.map((r, i) => rowHtml(r, i)).join('');

    rootEl.innerHTML = `
      <table class="rel-table">
        <thead>
          <tr><th style="width:140px">角色名</th><th style="width:160px">感情</th><th style="width:60px">色調</th><th style="width:60px">羈絆値</th><th>備註</th></tr>
        </thead>
        <tbody>${tableBody}</tbody>
      </table>
      <div class="rel-foot">
        <button data-action="add" style="background:transparent;border:0;cursor:pointer;color:var(--paper-700);font-family:var(--f-heading);letter-spacing:.2em">+ 追加關係</button>
        <span>羈絆値合計　<b>${bond.total}</b>　·　潔淨 ${bond.pure}　/　瘋狂 ${bond.crazy}</span>
      </div>
    `;
  }

  function updateRel(idx, mutator) {
    const id = store.getState().activeCardId;
    if (!id) return;
    store.updateCard(id, c => {
      if (c.relationships[idx]) mutator(c.relationships[idx], c);
    });
  }

  rootEl.addEventListener('click', e => {
    const t = e.target;
    const action = t.dataset?.action;
    const id = store.getState().activeCardId;
    if (!id) return;
    if (action === 'add') {
      store.updateCard(id, c => {
        c.relationships.push({
          name: '', isNpc: false, emotion: '', tone: '', bond: 0, note: '',
        });
      });
      return;
    }
    if (action === 'rm') {
      const tr = t.closest('tr');
      if (!tr) return;
      const idx = Number(tr.dataset.idx);
      store.updateCard(id, c => { c.relationships.splice(idx, 1); });
    }
  });

  rootEl.addEventListener('input', e => {
    const t = e.target;
    const action = t.dataset?.action;
    const tr = t.closest('tr');
    if (!tr) return;
    const idx = Number(tr.dataset.idx);
    if (action === 'set-name') {
      updateRel(idx, r => { r.name = t.value; });
    } else if (action === 'set-npc') {
      updateRel(idx, r => { r.isNpc = t.checked; });
    } else if (action === 'set-bond') {
      updateRel(idx, r => { r.bond = Number(t.value) || 0; });
    } else if (action === 'set-note') {
      updateRel(idx, r => { r.note = t.value; });
    }
  });

  rootEl.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset?.action !== 'set-emotion') return;
    const tr = t.closest('tr');
    if (!tr) return;
    const idx = Number(tr.dataset.idx);
    const name = t.value;
    const ref = name ? findEmotion(name) : null;
    updateRel(idx, r => {
      r.emotion = name;
      if (ref) {
        r.tone = ref.tone;
        // 預設羈絆從 reference；若已有非預設值則保留（user override）
        if (!r.bond) r.bond = ref.bond * (ref.tone === 'crazy' ? 1 : 1);
      } else {
        r.tone = '';
      }
    });
  });

  store.subscribe(render);
  render();
}
