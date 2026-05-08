/**
 * 右欄匯出面板 — 接通既有按鈕（Markdown / BBCode / 列印 / ccfolia / 主匯出 / 匯入 / Share / PNG）
 */

import { getActiveCard } from '../helpers.js';
import { toMarkdown } from '../exporters/markdown.js';
import { toBBCode } from '../exporters/bbcode.js';
import { toCcfolia } from '../exporters/ccfolia.js';
import { exportCardPng } from '../exporters/png.js';
import { exportCharacterJson, pickAndImportJson } from '../exporters/json-io.js';
import { encodeCardToUrl } from '../exporters/url-share.js';
import { preloadLevels, getLoadedLevelMap } from '../data-loader.js';

async function withLevelData(card) {
  await preloadLevels(card.classes.map(c => c.id).filter(Boolean));
  return getLoadedLevelMap();
}

function safeFilename(s) {
  return String(s || '無名').replace(/[\\/:*?"<>|]/g, '_').slice(0, 60);
}

function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}

function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } finally { document.body.removeChild(ta); }
  return Promise.resolve();
}

function flashStatus(el, text, ms = 2400) {
  if (!el) return;
  if (!el._origText) el._origText = el.innerHTML;
  el.innerHTML = `<span style="color:var(--gold)">${text}</span>`;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.innerHTML = el._origText; }, ms);
}

export function mountExporterPanel(rootEl, store) {
  const meta = rootEl.querySelector('.export-meta');
  const btnPrimary = rootEl.querySelector('.btn.primary');
  const buttons = rootEl.querySelectorAll('.btn-sm');

  function getCard() {
    const card = getActiveCard(store.getState());
    if (!card) { alert('沒有可匯出的角色'); return null; }
    return card;
  }

  // 主鈕：JSON 匯出
  if (btnPrimary) {
    btnPrimary.disabled = false;
    btnPrimary.textContent = '⎙ 匯出 JSON';
    btnPrimary.addEventListener('click', () => {
      const card = getCard(); if (!card) return;
      const fn = exportCharacterJson(card);
      flashStatus(meta, `已匯出 ${fn}`);
    });
  }

  for (const btn of buttons) {
    const label = btn.textContent.trim();
    if (label === 'Markdown') {
      btn.disabled = false;
      btn.title = '產 Markdown 並複製到剪貼簿';
      btn.addEventListener('click', async () => {
        const card = getCard(); if (!card) return;
        const map = await withLevelData(card);
        const md = toMarkdown(card, map);
        try {
          await copyToClipboard(md);
          flashStatus(meta, `Markdown 已複製（${md.length} 字）`);
        } catch {
          window.open('').document.write(`<pre style="white-space:pre-wrap;font-family:monospace;padding:24px">${md.replace(/[<&]/g, c => ({ '<': '&lt;', '&': '&amp;' }[c]))}</pre>`);
        }
      });
    } else if (label === 'BBCode') {
      btn.disabled = false;
      btn.title = '產 BBCode 並複製到剪貼簿';
      btn.addEventListener('click', async () => {
        const card = getCard(); if (!card) return;
        const map = await withLevelData(card);
        const bb = toBBCode(card, map);
        try {
          await copyToClipboard(bb);
          flashStatus(meta, `BBCode 已複製（${bb.length} 字）`);
        } catch {
          window.open('').document.write(`<pre style="white-space:pre-wrap;font-family:monospace;padding:24px">${bb.replace(/[<&]/g, c => ({ '<': '&lt;', '&': '&amp;' }[c]))}</pre>`);
        }
      });
    } else if (label === '列印 A4') {
      btn.disabled = false;
      // 已用 onclick=window.print() 接好（保留），這裡多綁一個以策安全
    } else if (label === 'ccfolia') {
      btn.disabled = false;
      btn.title = 'ccfolia 角色卡 JSON 下載（schema 為通用格式，user 實測後若有偏差再調）';
      btn.addEventListener('click', async () => {
        const card = getCard(); if (!card) return;
        const map = await withLevelData(card);
        const obj = toCcfolia(card, map);
        downloadJson(obj, `${safeFilename(card.meta?.name)}.ccfolia.json`);
        flashStatus(meta, `已匯出 ccfolia JSON`);
      });
    }
  }

  // 額外按鈕：匯入 / Share URL / PNG
  if (meta) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px';
    wrap.innerHTML = `
      <button class="btn-sm" data-extra="import">↥ 匯入</button>
      <button class="btn-sm" data-extra="share">🔗 Share URL</button>
      <button class="btn-sm" data-extra="png" style="grid-column:span 2">🖼 截圖 PNG</button>
    `;
    meta.parentElement.insertBefore(wrap, meta);

    wrap.querySelector('[data-extra="import"]').addEventListener('click', async () => {
      try {
        const r = await pickAndImportJson();
        for (const card of r.cards) {
          const id = store.newCard();
          store.updateCard(id, c => { Object.assign(c, card, { id }); });
        }
        flashStatus(meta, `已匯入 ${r.cards.length} 張`);
      } catch (e) {
        if (e.message !== '未選檔案') alert(`匯入失敗：${e.message}`);
      }
    });

    wrap.querySelector('[data-extra="share"]').addEventListener('click', async () => {
      const card = getCard(); if (!card) return;
      try {
        const { url, originalSize, compressedSize } = await encodeCardToUrl(card);
        await copyToClipboard(url);
        flashStatus(meta, `Share URL 已複製（${compressedSize}/${originalSize}b 壓縮）`);
      } catch (e) {
        alert(`Share URL 失敗：${e.message}`);
      }
    });

    wrap.querySelector('[data-extra="png"]').addEventListener('click', async () => {
      const card = getCard(); if (!card) return;
      const cardEl = document.querySelector('.card');
      if (!cardEl) { alert('找不到 .card 元素'); return; }
      flashStatus(meta, `截圖中… 首次需下載 html2canvas`, 30000);
      try {
        const r = await exportCardPng(cardEl, `${safeFilename(card.meta?.name)}.png`);
        flashStatus(meta, `PNG 已下載（${r.width}×${r.height}）`);
      } catch (e) {
        alert(`PNG 截圖失敗：${e.message}`);
      }
    });
  }
}
