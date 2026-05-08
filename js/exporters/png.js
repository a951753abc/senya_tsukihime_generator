/**
 * 角色卡 → PNG 截圖（lazy-load html2canvas via CDN dynamic import）
 */

let html2canvasPromise = null;

async function loadHtml2Canvas() {
  if (!html2canvasPromise) {
    html2canvasPromise = import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm')
      .then(m => m.default || m);
  }
  return html2canvasPromise;
}

export async function exportCardPng(rootEl, filename = 'character.png') {
  const html2canvas = await loadHtml2Canvas();
  const canvas = await html2canvas(rootEl, {
    backgroundColor: null,
    scale: 2, // 高 DPI
    logging: false,
    useCORS: true,
  });
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('canvas.toBlob 回傳 null');

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
  return { width: canvas.width, height: canvas.height, sizeBytes: blob.size };
}
