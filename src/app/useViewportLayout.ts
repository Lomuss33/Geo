import { useViewportProfile } from './useViewportProfile';

export type { ViewportLayoutMode } from './useViewportProfile';

export const useViewportLayout = () => {
  return useViewportProfile().legacyLayoutMode;
};
