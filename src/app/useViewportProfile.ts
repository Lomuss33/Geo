import { useEffect, useState } from 'react';

export type ViewportLayoutMode = 'monitor' | 'tablet' | 'mobile';
export type ShellMode = 'dual-rail' | 'single-rail' | 'drawer';
export type WorkspaceMode = 'bounded' | 'stacked' | 'mobile';
export type ViewportOrientation = 'landscape' | 'portrait';

export type ViewportProfile = {
  width: number;
  height: number;
  aspectRatio: number;
  orientation: ViewportOrientation;
  shellMode: ShellMode;
  workspaceMode: WorkspaceMode;
  legacyLayoutMode: ViewportLayoutMode;
};

const LEGACY_MONITOR_MIN_WIDTH = 1280;
const LEGACY_MONITOR_MIN_HEIGHT = 720;
const LEGACY_MOBILE_MAX_WIDTH = 767;

const DUAL_RAIL_MIN_WIDTH = 1440;
const DUAL_RAIL_MIN_HEIGHT = 820;
const DUAL_RAIL_MIN_ASPECT_RATIO = 1.45;
const DUAL_RAIL_LEFT_WIDTH = 256;
const DUAL_RAIL_RIGHT_WIDTH = 304;
const DUAL_RAIL_SCENE_MIN_WIDTH = 760;
const DUAL_RAIL_SCENE_MIN_HEIGHT = 560;
const SHELL_GUTTER_PX = 16;

const SINGLE_RAIL_MIN_WIDTH = 960;
const SINGLE_RAIL_MIN_HEIGHT = 640;

const BOUNDED_WORKSPACE_MIN_WIDTH = 1280;
const BOUNDED_WORKSPACE_MIN_HEIGHT = 800;
const BOUNDED_WORKSPACE_MIN_ASPECT_RATIO = 1.35;
const STACKED_WORKSPACE_MIN_WIDTH = 760;

const getLegacyLayoutMode = (
  width: number,
  height: number,
): ViewportLayoutMode => {
  if (width <= LEGACY_MOBILE_MAX_WIDTH) {
    return 'mobile';
  }

  if (
    width >= LEGACY_MONITOR_MIN_WIDTH &&
    height >= LEGACY_MONITOR_MIN_HEIGHT
  ) {
    return 'monitor';
  }

  return 'tablet';
};

const getShellMode = (
  width: number,
  height: number,
  aspectRatio: number,
): ShellMode => {
  const reservedWidth =
    DUAL_RAIL_LEFT_WIDTH + DUAL_RAIL_RIGHT_WIDTH + SHELL_GUTTER_PX * 4;
  const reservedHeight = SHELL_GUTTER_PX * 2;
  const remainingWidth = width - reservedWidth;
  const remainingHeight = height - reservedHeight;

  if (
    width >= DUAL_RAIL_MIN_WIDTH &&
    height >= DUAL_RAIL_MIN_HEIGHT &&
    aspectRatio >= DUAL_RAIL_MIN_ASPECT_RATIO &&
    remainingWidth >= DUAL_RAIL_SCENE_MIN_WIDTH &&
    remainingHeight >= DUAL_RAIL_SCENE_MIN_HEIGHT
  ) {
    return 'dual-rail';
  }

  if (width >= SINGLE_RAIL_MIN_WIDTH && height >= SINGLE_RAIL_MIN_HEIGHT) {
    return 'single-rail';
  }

  return 'drawer';
};

const getWorkspaceMode = (
  width: number,
  height: number,
  aspectRatio: number,
): WorkspaceMode => {
  if (
    width >= BOUNDED_WORKSPACE_MIN_WIDTH &&
    height >= BOUNDED_WORKSPACE_MIN_HEIGHT &&
    aspectRatio >= BOUNDED_WORKSPACE_MIN_ASPECT_RATIO
  ) {
    return 'bounded';
  }

  if (width >= STACKED_WORKSPACE_MIN_WIDTH) {
    return 'stacked';
  }

  return 'mobile';
};

const getViewportDimensions = () => {
  if (typeof window === 'undefined') {
    return {
      width: 1600,
      height: 900,
    };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

export const getViewportProfile = (): ViewportProfile => {
  const { width, height } = getViewportDimensions();
  const safeWidth = Math.max(width, 1);
  const safeHeight = Math.max(height, 1);
  const aspectRatio = safeWidth / safeHeight;
  const orientation: ViewportOrientation =
    safeWidth >= safeHeight ? 'landscape' : 'portrait';

  return {
    width: safeWidth,
    height: safeHeight,
    aspectRatio,
    orientation,
    shellMode: getShellMode(safeWidth, safeHeight, aspectRatio),
    workspaceMode: getWorkspaceMode(safeWidth, safeHeight, aspectRatio),
    legacyLayoutMode: getLegacyLayoutMode(safeWidth, safeHeight),
  };
};

export const useViewportProfile = () => {
  const [profile, setProfile] = useState<ViewportProfile>(getViewportProfile);

  useEffect(() => {
    const handleChange = () => {
      setProfile(getViewportProfile());
    };

    handleChange();
    window.addEventListener('resize', handleChange);

    return () => {
      window.removeEventListener('resize', handleChange);
    };
  }, []);

  return profile;
};
