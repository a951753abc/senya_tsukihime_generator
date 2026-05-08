/**
 * URL share — 把角色卡序列化壓縮塞 location.hash
 *
 * 流程：
 *   encode: card → JSON.stringify → gzip(CompressionStream) → base64url
 *   decode: 反向
 *
 * 用 hash 而非 query 因為 hash 不送 server。
 * 大角色卡（含設定 textarea）約 2~5KB；壓縮後 1~2KB；URL 限制通常 8KB，OK。
 */

const SCHEMA_VERSION = '2.0';
const HASH_PREFIX = '#data=';

async function gzipString(str) {
  const blob = new Blob([str]);
  const stream = blob.stream().pipeThrough(new CompressionStream('gzip'));
  const compressed = await new Response(stream).arrayBuffer();
  return new Uint8Array(compressed);
}

async function gunzipBytes(bytes) {
  const blob = new Blob([bytes]);
  const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
  const text = await new Response(stream).text();
  return text;
}

function bytesToBase64url(bytes) {
  // Uint8Array → binary string → btoa → URL-safe
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBytes(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function encodeCardToUrl(card) {
  const payload = {
    schemaVersion: SCHEMA_VERSION,
    type: 'character',
    character: card,
  };
  const json = JSON.stringify(payload);
  const gz = await gzipString(json);
  const b64 = bytesToBase64url(gz);
  const url = `${location.origin}${location.pathname}${HASH_PREFIX}${b64}`;
  return { url, originalSize: json.length, compressedSize: gz.length };
}

export async function decodeUrlHash(hash = location.hash) {
  if (!hash || !hash.startsWith(HASH_PREFIX)) return null;
  const b64 = hash.slice(HASH_PREFIX.length);
  if (!b64) return null;
  try {
    const bytes = base64urlToBytes(b64);
    const json = await gunzipBytes(bytes);
    const payload = JSON.parse(json);
    if (payload?.schemaVersion !== SCHEMA_VERSION) {
      throw new Error(`schemaVersion 不符（${payload?.schemaVersion}）`);
    }
    if (payload.type !== 'character' || !payload.character) {
      throw new Error('payload type 不是 character');
    }
    return payload.character;
  } catch (e) {
    throw new Error(`URL 解碼失敗：${e.message}`);
  }
}

export function clearUrlHash() {
  history.replaceState(null, '', location.pathname);
}
