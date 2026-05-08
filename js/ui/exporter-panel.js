/**
 * 右欄匯出面板 — 接通既有按鈕（Markdown / BBCode / 列印 / ccfolia / 主匯出）
 */

import { getActiveCard } from '../helpers.js';
import { toMarkdown } from '../exporters/markdown.js';
import { exportCharacterJson, exportAllJson, pickAndImportJson } from '../exporters/json-io.js';

function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  // Fallback
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } finally { document.body.removeChild(ta); }
  return Promise.resolve();
}

function flashStatus(el, text, ms = 2000) {
  if (!el) return;
  const original = el.textContent;
  el.textContent = text;
  setTimeout(() => { el.textContent = original; }, ms);
}

export function mountExporterPanel(rootEl, store) {
  // 取按鈕（已在 index.html 中存在）
  const btnPrimary = rootEl.querySelector('.btn.primary');
  const buttons = rootEl.querySelectorAll('.btn-sm');
  const meta = rootEl.querySelector('.export-meta');

  const handlers = {
    primary: () => {
      const card = getActiveCard(store.getState());
      if (!card) { alert('沒有可匯出的角色'); return; }
      const name = exportCharacterJson(card);
      flashStatus(meta, `已匯出 ${name}`);
    },
    Markdown: async () => {
      const card = getActiveCard(store.getState());
      if (!card) { alert('沒有可匯出的角色'); return; }
      const md = toMarkdown(card);
      try {
        await copyToClipboard(md);
        flashStatus(meta, `Markdown 已複製到剪貼簿（${md.length} 字）`);
      } catch (e) {
        // 如複製失敗，開新視窗顯示
        const w = window.open('', '_blank');
        w.document.write(`<pre style="white-space:pre-wrap;font-family:monospace;padding:24px">${md.replace(/[<&]/g, c => ({ '<': '&lt;', '&': '&amp;' }[c]))}</pre>`);
        flashStatus(meta, '在新視窗顯示 Markdown');
      }
    },
    BBCode: () => alert('BBCode 匯出待實作（Phase 2）'),
    'ccfolia': () => alert('ccfolia 匯出待實作（Phase 3）— 需先確認 schema'),
  };

  if (btnPrimary && !btnPrimary.disabled) {
    // already enabled — skip
  }
  if (btnPrimary) {
    btnPrimary.disabled = false;
    btnPrimary.textContent = '⎙ 匯出 JSON';
    btnPrimary.title = '下載當前角色卡為 .json 檔';
    btnPrimary.addEventListener('click', handlers.primary);
  }

  for (const btn of buttons) {
    const label = btn.textContent.trim();
    if (label === 'Markdown') {
      btn.disabled = false;
      btn.title = '產 Markdown 並複製到剪貼簿';
      btn.addEventListener('click', handlers.Markdown);
    } else if (label === 'BBCode') {
      btn.title = 'Phase 2 後啟用';
      btn.addEventListener('click', handlers.BBCode);
    } else if (label === '列印 A4') {
      // 已在 index.html 用 onclick=window.print() 接好
      btn.disabled = false;
    } else if (label === 'ccfolia') {
      btn.title = 'Phase 3 後啟用';
      btn.addEventListener('click', handlers['ccfolia']);
    }
  }

  // 在 export-meta 區插入「匯入」按鈕
  if (meta) {
    const importBtn = document.createElement('button');
    importBtn.className = 'btn-sm';
    importBtn.style.marginTop = '6px';
    importBtn.style.width = '100%';
    importBtn.textContent = '↥ 匯入 JSON';
    importBtn.title = '從本地 .json 檔讀回角色卡';
    importBtn.addEventListener('click', async () => {
      try {
        const result = await pickAndImportJson();
        for (const card of result.cards) {
          // 為避免 id 衝突，重新分配 id
          const newId = crypto.randomUUID();
          const cardCopy = { ...card, id: newId };
          // 直接 push 到 store（透過建立新卡 + 覆蓋的方式）
          const id = store.newCard();
          store.updateCard(id, c => {
            Object.assign(c, cardCopy);
            c.id = id;  // 保持 store 給的 id
          });
        }
        flashStatus(meta, `已匯入 ${result.cards.length} 張角色卡`);
      } catch (e) {
        alert(`匯入失敗：${e.message}`);
      }
    });
    meta.parentElement.insertBefore(importBtn, meta);
  }
}
