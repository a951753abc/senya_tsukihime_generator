if (typeof localStorage === 'undefined' || typeof localStorage.clear !== 'function') {
  const data = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem(key) {
        return data.has(key) ? data.get(key) : null;
      },
      setItem(key, value) {
        data.set(key, String(value));
      },
      removeItem(key) {
        data.delete(key);
      },
      clear() {
        data.clear();
      },
    },
    configurable: true,
  });
}
