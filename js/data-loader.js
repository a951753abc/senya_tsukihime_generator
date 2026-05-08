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

export function clearCache() {
  cache.clear();
}
