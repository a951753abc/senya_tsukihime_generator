/** 載入 data/*.json，含 in-memory cache */

const cache = new Map();

async function load(path) {
  if (cache.has(path)) return cache.get(path);
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  const data = await res.json();
  cache.set(path, data);
  return data;
}

export function loadMeta() {
  return load('./data/meta.json');
}

export function loadLevel(levelId) {
  return load(`./data/levels/${levelId}.json`);
}

export function loadCommonSkills() {
  return load('./data/common-skills.json');
}

export function loadStyles() {
  return load('./data/styles.json');
}

export function loadEmotions() {
  return load('./data/emotions.json');
}

export function clearCache() {
  cache.clear();
}

/** 預載多個級別資料；之後可同步取用 */
export async function preloadLevels(classIds) {
  await Promise.all(
    classIds
      .filter(id => id && !cache.has(`./data/levels/${id}.json`))
      .map(id => loadLevel(id).catch(() => null))
  );
}

/** 取得已載入的級別資料 Map（同步） */
export function getLoadedLevelMap() {
  const map = new Map();
  for (const [path, data] of cache.entries()) {
    const m = path.match(/levels\/([^/]+)\.json$/);
    if (m && data) map.set(m[1], data);
  }
  return map;
}
