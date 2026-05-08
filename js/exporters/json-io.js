/**
 * 角色卡 JSON 匯入／匯出
 *
 * 匯出：將當前角色（或全部）序列化成 JSON Blob 觸發瀏覽器下載
 * 匯入：開檔案選擇器，讀 .json 後驗證 schemaVersion、push 進 store
 */

const SCHEMA_VERSION = '2.0';

function downloadBlob(blob, filename) {
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
}

function safeFilename(s) {
  return String(s || '無名').replace(/[\\/:*?"<>|]/g, '_').slice(0, 60);
}

export function exportCharacterJson(card) {
  if (!card) throw new Error('No active card');
  const payload = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    type: 'character',
    character: card,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const filename = `${safeFilename(card.meta?.name)}-${card.id.slice(0, 8)}.senya.json`;
  downloadBlob(blob, filename);
  return filename;
}

export function exportAllJson(state) {
  const payload = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    type: 'archive',
    cards: state.cards,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const filename = `senya-all-${state.cards.length}-cards.json`;
  downloadBlob(blob, filename);
  return filename;
}

/**
 * 開檔案選擇器，回傳 Promise<{ kind: 'character'|'archive', cards: [...] }>
 */
export function pickAndImportJson() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error('未選檔案'));
        return;
      }
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const result = parseImportPayload(data);
        resolve(result);
      } catch (e) {
        reject(e);
      }
    });
    document.body.appendChild(input);
    input.click();
    setTimeout(() => document.body.removeChild(input), 100);
  });
}

function parseImportPayload(data) {
  // 容忍幾種格式：
  // 1. 完整 wrapper { schemaVersion, type, character|cards }
  // 2. 直接是 character object
  if (data?.type === 'character' && data.character) {
    if (data.schemaVersion !== SCHEMA_VERSION) {
      throw new Error(`schemaVersion 不符（檔 ${data.schemaVersion}, 需 ${SCHEMA_VERSION}）`);
    }
    return { kind: 'character', cards: [data.character] };
  }
  if (data?.type === 'archive' && Array.isArray(data.cards)) {
    if (data.schemaVersion !== SCHEMA_VERSION) {
      throw new Error(`schemaVersion 不符`);
    }
    return { kind: 'archive', cards: data.cards };
  }
  // 直接是 character
  if (data?.id && data?.stats?.abilities) {
    if (data.schemaVersion && data.schemaVersion !== SCHEMA_VERSION) {
      throw new Error(`schemaVersion 不符`);
    }
    return { kind: 'character', cards: [data] };
  }
  throw new Error('無法辨認的 JSON 格式');
}
