import { useEffect, useState } from 'react';

export type ViewportLayoutMode = 'monitor' | 'tablet' | 'mobile';

const MONITOR_MIN_WIDTH = 1280;
const MONITOR_MIN_HEIGHT = 720;
const MOBILE_MAX_WIDTH = 767;

const getViewportLayoutMode = (): ViewportLayoutMode => {
  if (typeof window === 'undefined') {
    return 'monitor';
  }

  const { innerHeight, innerWidth } = window;

  if (innerWidth <= MOBILE_MAX_WIDTH) {
    return 'mobile';
  }

  if (innerWidth >= MONITOR_MIN_WIDTH && innerHeight >= MONITOR_MIN_HEIGHT) {
    return 'monitor';
  }

  return 'tablet';
};

export const useViewportLayout = () => {
  const [layoutMode, setLayoutMode] = useState<ViewportLayoutMode>(
    getViewportLayoutMode,
  );

  useEffect(() => {
    const handleChange = () => {
      setLayoutMode(getViewportLayoutMode());
    };

    handleChange();
    window.addEventListener('resize', handleChange);

    return () => {
      window.removeEventListener('resize', handleChange);
    };
  }, []);

  return layoutMode;
};
