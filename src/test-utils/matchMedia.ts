import { vi } from 'vitest';

type LegacyMediaQueryListener = (
  this: MediaQueryList,
  ev: MediaQueryListEvent,
) => void;
type Listener =
  | EventListenerOrEventListenerObject
  | LegacyMediaQueryListener;

const notifyListener = (
  listener: Listener,
  event: MediaQueryListEvent,
) => {
  if (typeof listener === 'function') {
    listener.call(
      {
        matches: event.matches,
        media: event.media,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => true,
      } as MediaQueryList,
      event,
    );
    return;
  }

  listener.handleEvent(event);
};

export const installMatchMediaMock = (initialPortrait = false) => {
  let portrait = initialPortrait;
  const listeners = new Map<string, Set<Listener>>();

  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => {
      const queryListeners = listeners.get(query) ?? new Set<Listener>();
      listeners.set(query, queryListeners);

      return {
        get matches() {
          return query.includes('(orientation: portrait)') ? portrait : false;
        },
        media: query,
        onchange: null,
        addEventListener: (_: string, listener: EventListenerOrEventListenerObject) => {
          queryListeners.add(listener);
        },
        removeEventListener: (
          _: string,
          listener: EventListenerOrEventListenerObject,
        ) => {
          queryListeners.delete(listener);
        },
        addListener: (
          listener:
            | ((this: MediaQueryList, ev: MediaQueryListEvent) => void)
            | null,
        ) => {
          if (!listener) {
            return;
          }
          queryListeners.add(listener);
        },
        removeListener: (
          listener:
            | ((this: MediaQueryList, ev: MediaQueryListEvent) => void)
            | null,
        ) => {
          if (!listener) {
            return;
          }
          queryListeners.delete(listener);
        },
        dispatchEvent: (event: MediaQueryListEvent) => {
          queryListeners.forEach((listener) => notifyListener(listener, event));
          return true;
        },
      } satisfies MediaQueryList;
    }),
  );

  return {
    setPortrait(nextPortrait: boolean) {
      portrait = nextPortrait;
      for (const [query, queryListeners] of listeners.entries()) {
        if (!query.includes('(orientation: portrait)')) {
          continue;
        }

        const event = {
          matches: portrait,
          media: query,
        } as MediaQueryListEvent;

        queryListeners.forEach((listener) => notifyListener(listener, event));
      }
    },
  };
};
