type Theme = 'dark' | 'light';
export const storageKey = 'geo:theme';
export const changeEvent = 'geo:theme-change';

export function readTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function initializeTheme() {
  try {
    const saved = window.localStorage.getItem(storageKey);
    document.documentElement.dataset.theme =
      saved === 'light' ? 'light' : 'dark';
  } catch {
    document.documentElement.dataset.theme = 'dark';
  }
}

export function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) {
      initializeTheme();
      callback();
    }
  };
  window.addEventListener(changeEvent, callback);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(changeEvent, callback);
    window.removeEventListener('storage', onStorage);
  };
}
