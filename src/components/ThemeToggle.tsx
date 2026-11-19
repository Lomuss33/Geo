import { useSyncExternalStore } from 'react';

import { changeEvent, readTheme, storageKey, subscribe } from '../lib/theme';

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme);
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      className="text-button theme-toggle"
      type="button"
      aria-label={`Switch to ${next} mode`}
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try {
          window.localStorage.setItem(storageKey, next);
        } catch {
          // The theme still works for this session when storage is unavailable.
        }
        window.dispatchEvent(new Event(changeEvent));
      }}
    >
      {next === 'light' ? 'Light' : 'Dark'} mode
    </button>
  );
}
