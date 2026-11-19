import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { useViewportProfile } from './useViewportProfile';
import { useAnimationSessionDriver } from './useAnimationSessionDriver';
import { ViewerShortcuts } from './ViewerShortcuts';
import { AnimationPlaybackOverlay } from '../components/AnimationPlaybackOverlay';
import { AnimationWorkspace } from '../components/AnimationWorkspace';
import { BrandPanel } from '../components/BrandPanel';
import { BordersLegend } from '../components/BordersLegend';
import { ControlDock } from '../components/ControlDock';
import { CountryExplorer } from '../components/CountryExplorer';
import { navigateGeography } from '../lib/geographyNavigation';
import { CountryCompareOverlay } from '../components/CountryCompareOverlay';
import { HudPanel } from '../components/HudPanel';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { OnboardingModal } from '../components/OnboardingModal';
import { SceneFallback } from '../components/SceneFallback';
import {
  applyHumanViewConstraint,
  deriveSurfaceAnchor,
  isHumanViewActive,
  surfaceAnchoredGeoView,
} from '../lib/camera';
import {
  canPlayAnimationTimeline,
  createDefaultAnimationTimeline,
  deserializeAnimationTimeline,
  getAnimationPreviewAtTime,
  serializeAnimationTimeline,
} from '../lib/animation';
import {
  COMPARE_MAX_DISTANCE,
  COMPARE_MIN_DISTANCE,
  DEFAULT_VIEW,
  STORAGE_KEYS,
  VIEWER_PRESETS,
} from '../lib/constants';
import { clamp } from '../lib/math';
import { bordersFromGeo, geoFromBorders } from '../lib/bordersBridge';
import {
  getBordersCountryName,
  loadBordersCountryIndex,
  type BordersCountryIndexRecord,
} from '../lib/bordersData';
import { geoFromHeadway, headwayFromGeo } from '../lib/modeBridge';
import {
  resetBordersAxes,
  resetGeoAxes,
  resetHeadwayAxes,
} from '../lib/navigation';
import { formatRendererTier } from '../lib/renderer';
import {
  buildViewUrl,
  shouldLiveSyncViewUrl,
  updateUrlWithView,
} from '../lib/viewState';
import { GlobeCanvas } from '../scene/GlobeCanvas';
import { BordersMap } from '../scene/BordersMap';
import { HeadwayMap } from '../scene/HeadwayMap';
import type {
  AnimationMode,
  AnimationTimeline,
  BordersViewState,
  GeoOverviewAnchor,
  HeadwayLayerVisibility,
  HeadwayLayoutLook,
  HeadwayViewState,
  QualityMode,
  SelectedCountry,
  ViewerMode,
  ViewerPreset,
} from '../state/viewerStore';
import { readStoredAnimationDraft, useViewerStore } from '../state/viewerStore';
import type { ShellMode, ViewportLayoutMode } from './useViewportProfile';

const TimeAtlasWorkspace = lazy(
  () => import('../components/TimeAtlasWorkspace'),
);

type RailState = {
  leftOpen: boolean;
  rightOpen: boolean;
  leftMinimized: boolean;
  rightMinimized: boolean;
};

type RailAction =
  | {
      type: 'sync-layout';
      shellMode: ShellMode;
      layoutMode: ViewportLayoutMode;
    }
  | {
      type: 'open-left';
      shellMode: ShellMode;
      layoutMode: ViewportLayoutMode;
    }
  | {
      type: 'open-right';
      shellMode: ShellMode;
      layoutMode: ViewportLayoutMode;
    }
  | {
      type: 'close-left';
      shellMode: ShellMode;
      layoutMode: ViewportLayoutMode;
    }
  | {
      type: 'close-right';
      shellMode: ShellMode;
      layoutMode: ViewportLayoutMode;
    };

function RailTriggerIcon({ side }: { side: 'left' | 'right' }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      {side === 'left' ? (
        <>
          <path
            d="M5 5h2v14H5zM12 8l-3 4 3 4"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path
            d="M15 8h4M15 12h4M15 16h4"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </>
      ) : (
        <>
          <path
            d="M17 5h2v14h-2zM12 8l3 4-3 4"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path
            d="M5 8h4M5 12h4M5 16h4"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </>
      )}
    </svg>
  );
}

function RailActionIcon({ action }: { action: 'close' | 'minimize' }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      {action === 'minimize' ? (
        <path
          d="M7 16h10"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      ) : (
        <path
          d="M8 8l8 8M16 8l-8 8"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      )}
    </svg>
  );
}

function createRailState(input: {
  shellMode: ShellMode;
  layoutMode: ViewportLayoutMode;
}): RailState {
  const { shellMode, layoutMode } = input;

  if (shellMode === 'dual-rail') {
    return {
      leftOpen: true,
      rightOpen: true,
      leftMinimized: false,
      rightMinimized: false,
    };
  }

  if (layoutMode !== 'mobile') {
    return {
      leftOpen: true,
      rightOpen: true,
      leftMinimized: false,
      rightMinimized: false,
    };
  }

  return {
    leftOpen: false,
    rightOpen: false,
    leftMinimized: false,
    rightMinimized: false,
  };
}

function railStateReducer(state: RailState, action: RailAction): RailState {
  switch (action.type) {
    case 'sync-layout':
      return createRailState(action);
    case 'open-left':
      if (action.shellMode === 'dual-rail') {
        return { ...state, leftOpen: true, leftMinimized: false };
      }

      if (action.layoutMode !== 'mobile') {
        return { ...state, leftOpen: true, leftMinimized: false };
      }

      return {
        ...state,
        leftOpen: true,
        rightOpen: false,
        leftMinimized: false,
        rightMinimized: false,
      };
    case 'open-right':
      if (action.shellMode === 'dual-rail') {
        return { ...state, rightOpen: true, rightMinimized: false };
      }

      if (action.layoutMode !== 'mobile') {
        return { ...state, rightOpen: true, rightMinimized: false };
      }

      return {
        ...state,
        leftOpen: false,
        rightOpen: true,
        leftMinimized: false,
        rightMinimized: false,
      };
    case 'close-left':
      if (action.shellMode === 'dual-rail') {
        return { ...state, leftOpen: false, leftMinimized: true };
      }

      return { ...state, leftOpen: false };
    case 'close-right':
      if (action.shellMode === 'dual-rail') {
        return { ...state, rightOpen: false, rightMinimized: true };
      }

      return { ...state, rightOpen: false };
    default:
      return state;
  }
}

const resolveAnimationMode = (mode: ViewerMode): AnimationMode =>
  mode === 'headway' ? 'headway' : 'geo';

function App() {
  const viewportProfile = useViewportProfile();
  const {
    legacyLayoutMode: layoutMode,
    orientation,
    shellMode,
    workspaceMode,
  } = viewportProfile;
  const telemetry = useViewerStore((state) => state.telemetry);
  const viewerMode = useViewerStore((state) => state.viewerMode);
  const headwayView = useViewerStore((state) => state.headwayView);
  const bordersView = useViewerStore((state) => state.bordersView);
  const headwayRenderState = useViewerStore(
    (state) => state.headwayRenderState,
  );
  const bordersRenderState = useViewerStore(
    (state) => state.bordersRenderState,
  );
  const headwayErrorMessage = useViewerStore(
    (state) => state.headwayErrorMessage,
  );
  const bordersErrorMessage = useViewerStore(
    (state) => state.bordersErrorMessage,
  );
  const bordersNoticeMessage = useViewerStore(
    (state) => state.bordersNoticeMessage,
  );
  const bordersProfileId = useViewerStore((state) => state.bordersProfileId);
  const bordersFocusedCountryIso = useViewerStore(
    (state) => state.bordersFocusedCountryIso,
  );
  const bordersSelectedFeature = useViewerStore(
    (state) => state.bordersSelectedFeature,
  );
  const quality = useViewerStore((state) => state.quality);
  const headwayLayoutLook = useViewerStore((state) => state.headwayLayoutLook);
  const headwayLayerVisibility = useViewerStore(
    (state) => state.headwayLayerVisibility,
  );
  const axisLockMode = useViewerStore((state) => state.axisLockMode);
  const compareModeState = useViewerStore((state) => state.compareModeState);
  const selectedCountry = useViewerStore((state) => state.selectedCountry);
  const geoOverviewAnchor = useViewerStore((state) => state.geoOverviewAnchor);
  const geoOverviewHeadingDeg = useViewerStore(
    (state) => state.geoOverviewHeadingDeg,
  );
  const loadState = useViewerStore((state) => state.loadState);
  const renderState = useViewerStore((state) => state.renderState);
  const rendererTier = useViewerStore((state) => state.rendererTier);
  const rendererAttempts = useViewerStore((state) => state.rendererAttempts);
  const rendererFailureReason = useViewerStore(
    (state) => state.rendererFailureReason,
  );
  const rendererFailureMessage = useViewerStore(
    (state) => state.rendererFailureMessage,
  );
  const showOnboarding = useViewerStore((state) => state.showOnboarding);
  const isFrozen = useViewerStore((state) => state.isFrozen);
  const showBorders = useViewerStore((state) => state.showBorders);
  const showBordersPinpoints = useViewerStore(
    (state) => state.showBordersPinpoints,
  );
  const activeAxis = useViewerStore((state) => state.activeAxis);
  const errorMessage = useViewerStore((state) => state.errorMessage);
  const view = useViewerStore((state) => state.view);
  const animationDraft = useViewerStore((state) => state.animationDraft);
  const animationImportHex = useViewerStore(
    (state) => state.animationImportHex,
  );
  const animationImportError = useViewerStore(
    (state) => state.animationImportError,
  );
  const animationSession = useViewerStore((state) => state.animationSession);
  const animateToView = useViewerStore((state) => state.animateToView);
  const applyImmediateView = useViewerStore(
    (state) => state.applyImmediateView,
  );
  const setViewerMode = useViewerStore((state) => state.setViewerMode);
  const setHeadwayView = useViewerStore((state) => state.setHeadwayView);
  const setBordersView = useViewerStore((state) => state.setBordersView);
  const setHeadwayRenderState = useViewerStore(
    (state) => state.setHeadwayRenderState,
  );
  const setBordersRenderState = useViewerStore(
    (state) => state.setBordersRenderState,
  );
  const setHeadwayErrorMessage = useViewerStore(
    (state) => state.setHeadwayErrorMessage,
  );
  const setBordersErrorMessage = useViewerStore(
    (state) => state.setBordersErrorMessage,
  );
  const setBordersNoticeMessage = useViewerStore(
    (state) => state.setBordersNoticeMessage,
  );
  const setBordersProfileId = useViewerStore(
    (state) => state.setBordersProfileId,
  );
  const setBordersFocusedCountryIso = useViewerStore(
    (state) => state.setBordersFocusedCountryIso,
  );
  const setBordersSelectedFeature = useViewerStore(
    (state) => state.setBordersSelectedFeature,
  );
  const setQuality = useViewerStore((state) => state.setQuality);
  const setHeadwayLayoutLook = useViewerStore(
    (state) => state.setHeadwayLayoutLook,
  );
  const setHeadwayLayerVisibility = useViewerStore(
    (state) => state.setHeadwayLayerVisibility,
  );
  const setAxisLockMode = useViewerStore((state) => state.setAxisLockMode);
  const setGeoOverviewAnchor = useViewerStore(
    (state) => state.setGeoOverviewAnchor,
  );
  const setGeoOverviewHeading = useViewerStore(
    (state) => state.setGeoOverviewHeading,
  );
  const clearGeoOverviewState = useViewerStore(
    (state) => state.clearGeoOverviewState,
  );
  const armCountryCompare = useViewerStore((state) => state.armCountryCompare);
  const pinCountry = useViewerStore((state) => state.pinCountry);
  const clearPinnedCountry = useViewerStore(
    (state) => state.clearPinnedCountry,
  );
  const disableCountryCompare = useViewerStore(
    (state) => state.disableCountryCompare,
  );
  const setLoadState = useViewerStore((state) => state.setLoadState);
  const setRenderState = useViewerStore((state) => state.setRenderState);
  const setRendererDiagnostics = useViewerStore(
    (state) => state.setRendererDiagnostics,
  );
  const resetRendererDiagnostics = useViewerStore(
    (state) => state.resetRendererDiagnostics,
  );
  const setErrorMessage = useViewerStore((state) => state.setErrorMessage);
  const setShowOnboarding = useViewerStore((state) => state.setShowOnboarding);
  const setFullscreen = useViewerStore((state) => state.setFullscreen);
  const setLastShareUrl = useViewerStore((state) => state.setLastShareUrl);
  const toggleFrozen = useViewerStore((state) => state.toggleFrozen);
  const toggleAxisLock = useViewerStore((state) => state.toggleAxisLock);
  const toggleShowBorders = useViewerStore((state) => state.toggleShowBorders);
  const toggleShowBordersPinpoints = useViewerStore(
    (state) => state.toggleShowBordersPinpoints,
  );
  const openAnimationWorkspace = useViewerStore(
    (state) => state.openAnimationWorkspace,
  );
  const closeAnimationWorkspace = useViewerStore(
    (state) => state.closeAnimationWorkspace,
  );
  const setAnimationDraft = useViewerStore((state) => state.setAnimationDraft);
  const loadAnimationDraft = useViewerStore(
    (state) => state.loadAnimationDraft,
  );
  const setAnimationImportHex = useViewerStore(
    (state) => state.setAnimationImportHex,
  );
  const setAnimationImportError = useViewerStore(
    (state) => state.setAnimationImportError,
  );
  const setAnimationPlayhead = useViewerStore(
    (state) => state.setAnimationPlayhead,
  );
  const startAnimationPlayback = useViewerStore(
    (state) => state.startAnimationPlayback,
  );
  const stopAnimationPlayback = useViewerStore(
    (state) => state.stopAnimationPlayback,
  );

  const [shareLabel, setShareLabel] = useState('Copy share link');
  const [timeAtlasOpen, setTimeAtlasOpen] = useState(false);
  const [geoCanvasKey, setGeoCanvasKey] = useState(0);
  const [headwayInstanceKey, setHeadwayInstanceKey] = useState(0);
  const [bordersInstanceKey, setBordersInstanceKey] = useState(0);
  const [bordersCountryIndex, setBordersCountryIndex] = useState<
    BordersCountryIndexRecord[] | null
  >(null);
  const [railState, dispatchRailState] = useReducer(
    railStateReducer,
    { shellMode, layoutMode },
    createRailState,
  );
  const hasInitializedNonMobileRailsRef = useRef(false);
  const recoveryTimerRef = useRef<number | null>(null);
  const contextRecoveryTimerRef = useRef<number | null>(null);
  const liveSyncViewUrl = useMemo(() => shouldLiveSyncViewUrl(), []);

  useEffect(() => {
    const storedQuality = window.localStorage.getItem(
      STORAGE_KEYS.quality,
    ) as QualityMode | null;
    const storedRotationMode = window.localStorage.getItem(
      STORAGE_KEYS.rotationMode,
    );
    const storedHeadwayLayoutLook = window.localStorage.getItem(
      STORAGE_KEYS.headwayLayoutLook,
    ) as HeadwayLayoutLook | null;
    const storedHeadwayLayerVisibility = window.localStorage.getItem(
      STORAGE_KEYS.headwayLayerVisibility,
    );

    if (
      storedQuality === 'performance' ||
      storedQuality === 'balanced' ||
      storedQuality === 'high'
    ) {
      setQuality(storedQuality);
    }

    if (storedRotationMode === 'free' || storedRotationMode === 'axis-lock') {
      setAxisLockMode(storedRotationMode);
    }

    if (
      storedHeadwayLayoutLook === 'mission' ||
      storedHeadwayLayoutLook === 'daylight' ||
      storedHeadwayLayoutLook === 'atlas' ||
      storedHeadwayLayoutLook === 'blueprint' ||
      storedHeadwayLayoutLook === 'mono' ||
      storedHeadwayLayoutLook === 'transit'
    ) {
      setHeadwayLayoutLook(storedHeadwayLayoutLook);
    }

    if (storedHeadwayLayerVisibility) {
      try {
        const parsed = JSON.parse(
          storedHeadwayLayerVisibility,
        ) as Partial<HeadwayLayerVisibility>;
        setHeadwayLayerVisibility({
          roads: parsed.roads ?? true,
          parks: parsed.parks ?? true,
          buildings: parsed.buildings ?? true,
          placeLabels: parsed.placeLabels ?? true,
          pois: parsed.pois ?? true,
        });
      } catch {
        // Ignore invalid persisted Headway layer visibility.
      }
    }
  }, [
    setAxisLockMode,
    setHeadwayLayerVisibility,
    setHeadwayLayoutLook,
    setQuality,
  ]);

  useEffect(() => {
    loadAnimationDraft(
      readStoredAnimationDraft(
        resolveAnimationMode(useViewerStore.getState().viewerMode),
      ),
    );
  }, [loadAnimationDraft]);

  useEffect(() => {
    const handleFullscreenChange = () =>
      setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [setFullscreen]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.quality, quality);
  }, [quality]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.rotationMode, axisLockMode);
  }, [axisLockMode]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEYS.headwayLayoutLook,
      headwayLayoutLook,
    );
  }, [headwayLayoutLook]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEYS.headwayLayerVisibility,
      JSON.stringify(headwayLayerVisibility),
    );
  }, [headwayLayerVisibility]);

  useEffect(
    () => () => {
      if (recoveryTimerRef.current) {
        window.clearTimeout(recoveryTimerRef.current);
      }
      if (contextRecoveryTimerRef.current) {
        window.clearTimeout(contextRecoveryTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    document.body.classList.add('body--fixed-layout');
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    return () => {
      document.body.classList.remove('body--fixed-layout');
    };
  }, [layoutMode]);

  useEffect(() => {
    let cancelled = false;

    loadBordersCountryIndex()
      .then((countryIndex) => {
        if (!cancelled) {
          setBordersCountryIndex(countryIndex);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBordersCountryIndex(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    dispatchRailState({ type: 'sync-layout', shellMode, layoutMode });
  }, [layoutMode, shellMode]);

  useEffect(() => {
    hasInitializedNonMobileRailsRef.current = false;
  }, [layoutMode, shellMode]);

  useEffect(() => {
    if (layoutMode === 'mobile' || showOnboarding) {
      return;
    }

    if (hasInitializedNonMobileRailsRef.current) {
      return;
    }

    const timerId = window.setTimeout(() => {
      dispatchRailState({ type: 'sync-layout', shellMode, layoutMode });
      hasInitializedNonMobileRailsRef.current = true;
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [layoutMode, shellMode, showOnboarding]);

  const syncCurrentUrl = useCallback(
    (
      nextMode: ViewerMode,
      nextView = view,
      nextHeadwayView = headwayView,
      nextBordersView = bordersView,
      nextBordersProfileId = bordersProfileId,
      nextBordersFocusedCountryIso = bordersFocusedCountryIso,
    ) => {
      if (!liveSyncViewUrl) {
        return;
      }

      updateUrlWithView(nextView, {
        viewerMode: nextMode,
        headwayView: nextMode === 'headway' ? nextHeadwayView : null,
        bordersView: nextMode === 'borders' ? nextBordersView : null,
        bordersProfileId: nextMode === 'borders' ? nextBordersProfileId : null,
        bordersFocusedCountryIso:
          nextMode === 'borders' ? nextBordersFocusedCountryIso : null,
      });
    },
    [
      bordersFocusedCountryIso,
      bordersProfileId,
      bordersView,
      headwayView,
      liveSyncViewUrl,
      view,
    ],
  );

  const commitAnimationPreview = useCallback(
    (input: {
      geoView?: typeof view | null;
      headwayView?: HeadwayViewState | null;
    }) => {
      if (input.headwayView) {
        const nextGeoView = geoFromHeadway(input.headwayView);
        setHeadwayView(input.headwayView);
        applyImmediateView(nextGeoView);
        syncCurrentUrl('headway', nextGeoView, input.headwayView);
        return;
      }

      if (input.geoView) {
        applyImmediateView(input.geoView);
        syncCurrentUrl('geo', input.geoView);
      }
    },
    [applyImmediateView, setHeadwayView, syncCurrentUrl],
  );

  const bordersFocusedCountryName = useMemo(
    () => getBordersCountryName(bordersCountryIndex, bordersFocusedCountryIso),
    [bordersCountryIndex, bordersFocusedCountryIso],
  );

  const openDraftWorkspace = useCallback(
    (draft: AnimationTimeline, playheadMs = 0) => {
      const preview = getAnimationPreviewAtTime(draft, playheadMs);
      openAnimationWorkspace({
        playheadMs: preview.playheadMs,
        previewGeoView: preview.geoView,
        previewHeadwayView: preview.headwayView,
      });
    },
    [openAnimationWorkspace],
  );

  const closeWorkspaceWithPreview = useCallback(() => {
    if (viewerMode === 'geo' && animationSession.previewGeoView) {
      commitAnimationPreview({ geoView: animationSession.previewGeoView });
    } else if (
      viewerMode === 'headway' &&
      animationSession.previewHeadwayView
    ) {
      commitAnimationPreview({
        headwayView: animationSession.previewHeadwayView,
      });
    }

    closeAnimationWorkspace();
  }, [
    animationSession.previewGeoView,
    animationSession.previewHeadwayView,
    closeAnimationWorkspace,
    commitAnimationPreview,
    viewerMode,
  ]);

  const stopPlaybackAtPreview = useCallback(() => {
    if (viewerMode === 'geo' && animationSession.previewGeoView) {
      commitAnimationPreview({ geoView: animationSession.previewGeoView });
    } else if (
      viewerMode === 'headway' &&
      animationSession.previewHeadwayView
    ) {
      commitAnimationPreview({
        headwayView: animationSession.previewHeadwayView,
      });
    }

    stopAnimationPlayback({ playheadMs: animationSession.playheadMs });
  }, [
    animationSession.playheadMs,
    animationSession.previewGeoView,
    animationSession.previewHeadwayView,
    commitAnimationPreview,
    stopAnimationPlayback,
    viewerMode,
  ]);

  const loadDraftForMode = (
    mode: AnimationMode,
    draftOverride?: AnimationTimeline,
  ) => {
    loadAnimationDraft(draftOverride ?? readStoredAnimationDraft(mode));
  };

  const scheduleReadyState = () => {
    if (recoveryTimerRef.current) {
      window.clearTimeout(recoveryTimerRef.current);
    }

    recoveryTimerRef.current = window.setTimeout(() => {
      setRendererDiagnostics({ reason: null, message: null });
      setRenderState('ready');
      recoveryTimerRef.current = null;
    }, 220);
  };

  const shareView = async () => {
    const shareGeoView =
      viewerMode === 'borders' ? geoFromBorders(bordersView) : view;
    const url = buildViewUrl(shareGeoView, window.location.href, {
      viewerMode,
      headwayView: viewerMode === 'headway' ? headwayView : null,
      bordersView: viewerMode === 'borders' ? bordersView : null,
      bordersProfileId: viewerMode === 'borders' ? bordersProfileId : null,
      bordersFocusedCountryIso:
        viewerMode === 'borders' ? bordersFocusedCountryIso : null,
    });

    try {
      await navigator.clipboard.writeText(url);
      setLastShareUrl(url);
      setShareLabel('Link copied');
      window.setTimeout(() => setShareLabel('Copy share link'), 1_800);
    } catch {
      setShareLabel('Copy failed');
      window.setTimeout(() => setShareLabel('Copy share link'), 1_800);
    }
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setFullscreen(true);
      return;
    }

    await document.exitFullscreen();
    setFullscreen(false);
  };

  const openPreset = (preset: ViewerPreset) => {
    if (viewerMode === 'geo') {
      clearGeoOverviewState();
      animateToView(applyGeoConstraint(preset.state, { anchor: null }));
      return;
    }

    if (viewerMode === 'borders') {
      const nextBordersView = bordersFromGeo(preset.state);
      const nextGeoView = geoFromBorders(nextBordersView);

      setBordersView(nextBordersView);
      applyImmediateView(nextGeoView);
      syncCurrentUrl(
        'borders',
        nextGeoView,
        headwayView,
        nextBordersView,
        bordersProfileId,
        bordersFocusedCountryIso,
      );
      return;
    }

    const nextHeadwayView = headwayFromGeo(preset.state);
    const nextGeoView = geoFromHeadway(nextHeadwayView);

    setHeadwayView(nextHeadwayView);
    applyImmediateView(nextGeoView);
    syncCurrentUrl('headway', nextGeoView, nextHeadwayView);
  };

  const openPresetByIndex = (index: number) => {
    const preset = VIEWER_PRESETS[index];

    if (!preset) {
      return;
    }

    openPreset(preset);
  };

  const changeViewerMode = (
    nextMode: ViewerMode,
    options?: { animationDraft?: AnimationTimeline },
  ) => {
    if (nextMode === viewerMode) {
      if (options?.animationDraft && nextMode !== 'borders') {
        loadDraftForMode(
          resolveAnimationMode(nextMode),
          options.animationDraft,
        );
      }
      return;
    }

    disableCountryCompare();

    if (nextMode === 'borders') {
      clearGeoOverviewState();
      setBordersErrorMessage(null);
      setBordersNoticeMessage(null);
      setBordersRenderState('loading');
      setViewerMode('borders');
      syncCurrentUrl(
        'borders',
        geoFromBorders(bordersView),
        headwayView,
        bordersView,
        bordersProfileId,
        bordersFocusedCountryIso,
      );
      return;
    }

    if (nextMode === 'headway') {
      clearGeoOverviewState();
      const nextHeadwayView = headwayFromGeo(view);
      setHeadwayErrorMessage(null);
      setBordersNoticeMessage(null);
      setHeadwayView(nextHeadwayView);
      setHeadwayRenderState('loading');
      setViewerMode('headway');
      loadDraftForMode(
        resolveAnimationMode('headway'),
        options?.animationDraft,
      );
      syncCurrentUrl('headway', view, nextHeadwayView);
      return;
    }

    const nextGeoView =
      viewerMode === 'borders'
        ? geoFromBorders(bordersView)
        : geoFromHeadway(headwayView);

    clearGeoOverviewState();
    applyImmediateView(nextGeoView);
    setViewerMode('geo');
    setHeadwayRenderState('idle');
    setHeadwayErrorMessage(null);
    setBordersRenderState('idle');
    setBordersNoticeMessage(null);
    loadDraftForMode(resolveAnimationMode('geo'), options?.animationDraft);
    syncCurrentUrl('geo', nextGeoView);
  };

  const changeQuality = (nextQuality: QualityMode) => {
    if (nextQuality === quality) {
      return;
    }

    if (viewerMode !== 'geo') {
      setQuality(nextQuality);
      return;
    }

    remountGeoRenderer(nextQuality);
  };

  const applyGeoConstraint = useCallback(
    (
      nextView: typeof view,
      options?: {
        sourceDistance?: number;
        anchor?: GeoOverviewAnchor | null;
        headingDeg?: number;
      },
    ) =>
      applyHumanViewConstraint(nextView, {
        sourceDistance: options?.sourceDistance ?? view.distance,
        anchor:
          options?.anchor === undefined ? geoOverviewAnchor : options.anchor,
        headingDeg:
          options?.headingDeg === undefined
            ? geoOverviewHeadingDeg
            : options.headingDeg,
      }),
    [geoOverviewAnchor, geoOverviewHeadingDeg, view.distance],
  );

  const applyGeoView = (nextView: typeof view) => {
    const constrained = applyGeoConstraint(nextView);
    applyImmediateView(constrained);
    syncCurrentUrl('geo', constrained);
  };

  const applyHeadwayView = (nextView: HeadwayViewState) => {
    const normalized = nextView;
    const nextGeoView = geoFromHeadway(normalized);

    setHeadwayView(normalized);
    applyImmediateView(nextGeoView);
    syncCurrentUrl('headway', nextGeoView, normalized);
  };

  const applyBordersView = (nextView: BordersViewState) => {
    const normalized = nextView;
    const nextGeoView = geoFromBorders(normalized);

    setBordersView(normalized);
    applyImmediateView(nextGeoView);
    syncCurrentUrl(
      'borders',
      nextGeoView,
      headwayView,
      normalized,
      bordersProfileId,
      bordersFocusedCountryIso,
    );
  };

  const handleToggleCompareMode = () => {
    if (!isSceneAvailable || viewerMode !== 'geo') {
      return;
    }

    if (compareModeState === 'off') {
      armCountryCompare();
      return;
    }

    disableCountryCompare();
  };

  const handleClearPinnedCountry = () => {
    clearPinnedCountry();
  };

  const handleExitCompareMode = () => {
    disableCountryCompare();
  };

  const handleCountryPick = (country: SelectedCountry) => {
    if (viewerMode !== 'geo') {
      return;
    }

    const compareDistance = clamp(
      view.distance,
      COMPARE_MIN_DISTANCE,
      COMPARE_MAX_DISTANCE,
    );

    if (Math.abs(compareDistance - view.distance) > 1e-6) {
      const clampedView = applyGeoConstraint(
        {
          ...view,
          distance: compareDistance,
        },
        {
          sourceDistance: view.distance,
        },
      );

      applyImmediateView(clampedView);
      syncCurrentUrl('geo', clampedView);
    }

    pinCountry(country);
  };

  const handleAxisReset = () => {
    if (!isSceneAvailable || isFrozen) {
      return;
    }

    if (viewerMode === 'geo') {
      if (geoOverviewAnchor || isHumanViewActive(view.distance)) {
        const anchor = deriveSurfaceAnchor(view);
        setGeoOverviewAnchor({
          lat: anchor.anchorLat,
          lon: anchor.anchorLon,
        });
        setGeoOverviewHeading(0);
        applyGeoView(
          surfaceAnchoredGeoView({
            lat: anchor.anchorLat,
            lon: anchor.anchorLon,
            headingDeg: 0,
            distance: view.distance,
            baseFov: view.fov,
          }),
        );
        return;
      }

      clearGeoOverviewState();
      applyGeoView(resetGeoAxes(view));
      return;
    }

    if (viewerMode === 'borders') {
      applyBordersView(resetBordersAxes(bordersView));
      return;
    }

    applyHeadwayView(resetHeadwayAxes(headwayView));
  };

  const handleToggleAxisLock = () => {
    const nextMode = axisLockMode === 'free' ? 'axis-lock' : 'free';

    toggleAxisLock();

    if (viewerMode === 'headway' && nextMode === 'axis-lock') {
      applyHeadwayView(resetHeadwayAxes(headwayView));
      return;
    }

    if (viewerMode === 'borders' && nextMode === 'axis-lock') {
      applyBordersView(resetBordersAxes(bordersView));
    }
  };

  const handleResetHome = () => {
    if (isFrozen) {
      return;
    }

    if (viewerMode === 'geo') {
      clearGeoOverviewState();
      animateToView(applyGeoConstraint(DEFAULT_VIEW, { anchor: null }));
      return;
    }

    if (viewerMode === 'borders') {
      applyBordersView(bordersFromGeo(DEFAULT_VIEW));
      return;
    }

    const nextHeadwayView = headwayFromGeo(DEFAULT_VIEW);
    applyHeadwayView(nextHeadwayView);
  };

  const handleContextLost = () => {
    if (recoveryTimerRef.current) {
      window.clearTimeout(recoveryTimerRef.current);
      recoveryTimerRef.current = null;
    }
    if (contextRecoveryTimerRef.current) {
      window.clearTimeout(contextRecoveryTimerRef.current);
      contextRecoveryTimerRef.current = null;
    }

    const recoveryQuality =
      quality === 'high'
        ? 'balanced'
        : quality === 'balanced'
          ? 'performance'
          : 'performance';

    setRendererDiagnostics({
      reason: 'context-lost',
      message:
        recoveryQuality !== quality
          ? `The graphics context was interrupted while rendering. Geo is retrying in ${recoveryQuality} mode to stabilize the session.`
          : 'The graphics context was interrupted while rendering. Geo is retrying with the lightest graphics mode available.',
    });
    setRenderState('context-lost');

    contextRecoveryTimerRef.current = window.setTimeout(() => {
      contextRecoveryTimerRef.current = null;
      remountGeoRenderer(recoveryQuality, 'recovering');
    }, 160);
  };

  const handleContextRestored = () => {
    if (contextRecoveryTimerRef.current) {
      window.clearTimeout(contextRecoveryTimerRef.current);
      contextRecoveryTimerRef.current = null;
    }
    setRenderState('recovering');
    scheduleReadyState();
  };

  const handleRendererReady = (input: {
    tier: 'standard' | 'compatibility' | 'minimal';
    attemptedTiers: ('standard' | 'compatibility' | 'minimal')[];
  }) => {
    if (recoveryTimerRef.current) {
      window.clearTimeout(recoveryTimerRef.current);
      recoveryTimerRef.current = null;
    }
    if (contextRecoveryTimerRef.current) {
      window.clearTimeout(contextRecoveryTimerRef.current);
      contextRecoveryTimerRef.current = null;
    }

    setRendererDiagnostics({
      tier: input.tier,
      attemptedTiers: input.attemptedTiers,
      reason: null,
      message: null,
    });
    setRenderState('ready');
  };

  const handleRendererFailed = (input: {
    tier: 'standard' | 'compatibility' | 'minimal' | null;
    attemptedTiers: ('standard' | 'compatibility' | 'minimal')[];
    reason: 'canvas-fallback' | 'renderer-init-failed' | 'context-lost' | null;
    message: string | null;
  }) => {
    if (recoveryTimerRef.current) {
      window.clearTimeout(recoveryTimerRef.current);
      recoveryTimerRef.current = null;
    }
    if (contextRecoveryTimerRef.current) {
      window.clearTimeout(contextRecoveryTimerRef.current);
      contextRecoveryTimerRef.current = null;
    }

    setRendererDiagnostics(input);
    setRenderState('failed');
  };

  const remountGeoRenderer = (
    nextQuality?: QualityMode,
    nextRenderState: 'initializing' | 'recovering' = 'initializing',
  ) => {
    if (recoveryTimerRef.current) {
      window.clearTimeout(recoveryTimerRef.current);
      recoveryTimerRef.current = null;
    }
    if (contextRecoveryTimerRef.current) {
      window.clearTimeout(contextRecoveryTimerRef.current);
      contextRecoveryTimerRef.current = null;
    }

    if (nextQuality) {
      setQuality(nextQuality);
    }

    setErrorMessage(null);
    setLoadState('booting');
    resetRendererDiagnostics();
    setRenderState(nextRenderState);
    setGeoCanvasKey((key) => key + 1);
  };

  const retryRenderer = () => {
    remountGeoRenderer();
  };

  const retrySafeMode = () => {
    remountGeoRenderer('performance');
  };

  const handleHeadwayLoading = () => {
    setHeadwayErrorMessage(null);
    setHeadwayRenderState('loading');
  };

  const handleHeadwayReady = () => {
    setHeadwayErrorMessage(null);
    setHeadwayRenderState('ready');
    syncCurrentUrl('headway', view, headwayView);
  };

  const handleHeadwayError = (message: string) => {
    setHeadwayErrorMessage(message);
    setHeadwayRenderState('error');
  };

  const handleHeadwayViewChange = (nextView: HeadwayViewState) => {
    const normalized =
      axisLockMode === 'axis-lock' ? resetHeadwayAxes(nextView) : nextView;
    const nextGeoView = geoFromHeadway(normalized);

    setHeadwayView(normalized);
    applyImmediateView(nextGeoView);
    syncCurrentUrl('headway', nextGeoView, normalized);
  };

  const retryHeadway = () => {
    setHeadwayErrorMessage(null);
    setHeadwayRenderState('loading');
    setHeadwayInstanceKey((key) => key + 1);
  };

  const handleBordersLoading = () => {
    setBordersErrorMessage(null);
    setBordersNoticeMessage(null);
    setBordersRenderState('loading');
  };

  const handleBordersReady = () => {
    setBordersErrorMessage(null);
    setBordersNoticeMessage(null);
    setBordersRenderState('ready');
    syncCurrentUrl(
      'borders',
      geoFromBorders(bordersView),
      headwayView,
      bordersView,
      bordersProfileId,
      bordersFocusedCountryIso,
    );
  };

  const handleBordersError = (message: string) => {
    setBordersNoticeMessage(null);
    setBordersErrorMessage(message);
    setBordersRenderState('error');
  };

  const handleBordersNotice = (message: string | null) => {
    setBordersNoticeMessage(message);
  };

  const handleBordersViewChange = (nextView: BordersViewState) => {
    const normalized =
      axisLockMode === 'axis-lock' ? resetBordersAxes(nextView) : nextView;
    const nextGeoView = geoFromBorders(normalized);

    setBordersView(normalized);
    applyImmediateView(nextGeoView);
    syncCurrentUrl(
      'borders',
      nextGeoView,
      headwayView,
      normalized,
      bordersProfileId,
      bordersFocusedCountryIso,
    );
  };

  const handleBordersFocusCountry = (iso3: string | null) => {
    setBordersFocusedCountryIso(iso3);
    if (!iso3 || bordersSelectedFeature?.iso3 !== iso3) {
      setBordersSelectedFeature(null);
    }
    syncCurrentUrl(
      'borders',
      geoFromBorders(bordersView),
      headwayView,
      bordersView,
      bordersProfileId,
      iso3,
    );
  };

  const handleBordersSelectFeature = (
    nextFeature: typeof bordersSelectedFeature,
  ) => {
    setBordersSelectedFeature(nextFeature);
    if (nextFeature && nextFeature.iso3 !== bordersFocusedCountryIso) {
      setBordersFocusedCountryIso(nextFeature.iso3);
      syncCurrentUrl(
        'borders',
        geoFromBorders(bordersView),
        headwayView,
        bordersView,
        bordersProfileId,
        nextFeature.iso3,
      );
    }
  };

  const retryBorders = () => {
    setBordersErrorMessage(null);
    setBordersNoticeMessage(null);
    setBordersRenderState('loading');
    setBordersInstanceKey((key) => key + 1);
  };

  const titleMessage = useMemo(() => {
    if (viewerMode === 'borders' && bordersRenderState === 'error') {
      return 'Borders offline';
    }

    if (viewerMode === 'headway' && headwayRenderState === 'error') {
      return 'Headway offline';
    }

    if (renderState === 'failed') {
      return 'Renderer offline';
    }

    if (loadState === 'degraded') {
      return 'High detail unavailable';
    }

    if (loadState === 'error') {
      return 'Scene initialization failed';
    }

    return '';
  }, [
    bordersRenderState,
    headwayRenderState,
    loadState,
    renderState,
    viewerMode,
  ]);

  const isSceneAvailable =
    viewerMode === 'geo'
      ? renderState !== 'failed'
      : viewerMode === 'headway'
        ? headwayRenderState !== 'error'
        : bordersRenderState !== 'error';
  const isAnimationWorkspaceOpen = animationSession.workspaceOpen;
  const isAnimationPlaying = animationSession.phase === 'playing';
  const canPlayAnimation =
    viewerMode !== 'borders' &&
    isSceneAvailable &&
    !isFrozen &&
    canPlayAnimationTimeline(animationDraft);

  const handleClearAnimationDraft = () => {
    if (viewerMode === 'borders') {
      return;
    }

    const animationMode = resolveAnimationMode(viewerMode);
    loadDraftForMode(
      animationMode,
      createDefaultAnimationTimeline(animationMode),
    );
    setAnimationImportError(null);
    setAnimationPlayhead(0);
  };

  const handleOpenAnimationWorkspace = () => {
    if (
      viewerMode === 'borders' ||
      (viewerMode === 'geo' ? renderState : headwayRenderState) !== 'ready'
    ) {
      return;
    }

    setAnimationImportError(null);
    openDraftWorkspace(animationDraft, 0);
  };

  const handleLoadAnimationHex = () => {
    const imported = deserializeAnimationTimeline(animationImportHex);

    if (!imported) {
      setAnimationImportError('Invalid animation hex.');
      return;
    }

    setAnimationImportHex(serializeAnimationTimeline(imported));
    setAnimationImportError(null);

    if (viewerMode !== 'borders' && imported.mode === viewerMode) {
      loadAnimationDraft(imported);
      setAnimationPlayhead(0);
      return;
    }

    if (imported.mode === 'headway') {
      disableCountryCompare();
      const nextHeadwayView = headwayFromGeo(view);
      setHeadwayErrorMessage(null);
      setHeadwayView(nextHeadwayView);
      setHeadwayRenderState('loading');
      setViewerMode('headway');
      loadAnimationDraft(imported);
      syncCurrentUrl('headway', view, nextHeadwayView);
      openDraftWorkspace(imported, 0);
      return;
    }

    disableCountryCompare();
    const nextGeoView =
      viewerMode === 'borders'
        ? geoFromBorders(bordersView)
        : geoFromHeadway(headwayView);
    applyImmediateView(nextGeoView);
    setViewerMode('geo');
    setHeadwayRenderState('idle');
    setHeadwayErrorMessage(null);
    loadAnimationDraft(imported);
    syncCurrentUrl('geo', nextGeoView);
    openDraftWorkspace(imported, 0);
  };

  const handlePlayAnimationFromDock = () => {
    if (viewerMode === 'borders' || !canPlayAnimation) {
      return;
    }

    setAnimationImportError(null);
    openDraftWorkspace(animationDraft, 0);
    startAnimationPlayback({
      startedAtMs: window.performance.now(),
      playheadMs: 0,
    });
  };

  const handlePlayAnimationFromWorkspace = () => {
    if (viewerMode === 'borders' || !canPlayAnimation) {
      return;
    }

    setAnimationImportError(null);
    startAnimationPlayback({
      startedAtMs: window.performance.now(),
      playheadMs: animationSession.playheadMs,
    });
  };

  useAnimationSessionDriver({
    draft: animationDraft,
    onPlaybackComplete: ({
      playheadMs,
      geoView,
      headwayView: nextHeadwayView,
    }) => {
      commitAnimationPreview({
        geoView,
        headwayView: nextHeadwayView,
      });
      stopAnimationPlayback({ playheadMs });
    },
  });

  useEffect(() => {
    if (!animationSession.workspaceOpen) {
      return;
    }

    if (
      (viewerMode === 'geo' && renderState !== 'ready') ||
      (viewerMode === 'headway' && headwayRenderState === 'error') ||
      viewerMode === 'borders'
    ) {
      closeAnimationWorkspace();
    }
  }, [
    animationSession.workspaceOpen,
    closeAnimationWorkspace,
    headwayRenderState,
    renderState,
    viewerMode,
  ]);

  const warningCard = ((viewerMode === 'geo' &&
    (renderState === 'failed' || loadState === 'error')) ||
    (viewerMode === 'headway' && headwayRenderState === 'error') ||
    (viewerMode === 'borders' && bordersRenderState === 'error')) && (
    <section className="hud-card hud-card--warning" role="status">
      <span className="panel-kicker">{titleMessage}</span>
      {viewerMode === 'borders' ? (
        <p>
          {bordersErrorMessage ??
            'The Borders atlas could not load its local thematic assets.'}
        </p>
      ) : viewerMode === 'headway' ? (
        <p>
          {headwayErrorMessage ??
            'The Headway basemap is currently unavailable.'}
        </p>
      ) : renderState === 'failed' ? (
        <>
          <p>
            {rendererFailureMessage ??
              'Geo could not initialize a working WebGL renderer.'}
          </p>
          <dl className="renderer-diagnostics">
            <div>
              <dt>Last tier</dt>
              <dd>{formatRendererTier(rendererTier)}</dd>
            </div>
            <div>
              <dt>Tried</dt>
              <dd>
                {rendererAttempts.length > 0
                  ? rendererAttempts
                      .map((tier) => formatRendererTier(tier))
                      .join(' / ')
                  : 'None'}
              </dd>
            </div>
            <div>
              <dt>Reason</dt>
              <dd>{rendererFailureReason ?? 'Unknown'}</dd>
            </div>
          </dl>
        </>
      ) : (
        <p>{errorMessage ?? 'The viewer is running with reduced fidelity.'}</p>
      )}
    </section>
  );

  const activeRenderState =
    viewerMode === 'geo'
      ? renderState
      : viewerMode === 'headway'
        ? headwayRenderState
        : bordersRenderState;
  const activeRenderer =
    viewerMode === 'geo' ? (
      <GlobeCanvas
        compareModeState={compareModeState}
        quality={quality}
        selectedCountryId={selectedCountry?.id ?? null}
        showBorders={showBorders}
        isFrozen={isFrozen}
        canvasInstanceKey={geoCanvasKey}
        onContextLost={handleContextLost}
        onCountryPick={handleCountryPick}
        onContextRestored={handleContextRestored}
        onRendererReady={handleRendererReady}
        onRendererFailed={handleRendererFailed}
      />
    ) : viewerMode === 'headway' ? (
      <HeadwayMap
        axisLockMode={axisLockMode}
        headwayLayerVisibility={headwayLayerVisibility}
        headwayLayoutLook={headwayLayoutLook}
        isFrozen={isFrozen}
        key={headwayInstanceKey}
        quality={quality}
        shellMode={shellMode}
        showBorders={showBorders}
        view={headwayView}
        onError={handleHeadwayError}
        onLoading={handleHeadwayLoading}
        onReady={handleHeadwayReady}
        onViewChange={handleHeadwayViewChange}
      />
    ) : (
      <BordersMap
        axisLockMode={axisLockMode}
        focusedCountryIso={bordersFocusedCountryIso}
        isFrozen={isFrozen}
        key={bordersInstanceKey}
        onError={handleBordersError}
        onFocusCountry={handleBordersFocusCountry}
        onLoading={handleBordersLoading}
        onNotice={handleBordersNotice}
        onReady={handleBordersReady}
        onSelectFeature={handleBordersSelectFeature}
        onViewChange={handleBordersViewChange}
        profileId={bordersProfileId}
        quality={quality}
        selectedFeature={bordersSelectedFeature}
        shellMode={shellMode}
        showPinpoints={showBordersPinpoints}
        view={bordersView}
      />
    );

  const compactStatusLabel =
    viewerMode === 'borders'
      ? bordersRenderState === 'error'
        ? 'Borders offline'
        : isFrozen
          ? 'Borders paused'
          : 'Borders atlas'
      : viewerMode === 'headway'
        ? headwayRenderState === 'error'
          ? 'Headway offline'
          : 'Headway live'
        : renderState === 'failed'
          ? 'Renderer offline'
          : isFrozen
            ? 'Geo paused'
            : telemetry.sunlit
              ? 'Geo sunlit'
              : 'Geo night';
  const handleOpenLeftRail = () => {
    dispatchRailState({ type: 'open-left', shellMode, layoutMode });
  };

  const handleOpenRightRail = () => {
    dispatchRailState({ type: 'open-right', shellMode, layoutMode });
  };

  const handleCloseLeftRail = () => {
    dispatchRailState({ type: 'close-left', shellMode, layoutMode });
  };

  const handleCloseRightRail = () => {
    dispatchRailState({ type: 'close-right', shellMode, layoutMode });
  };

  const leftRailVisible =
    shellMode === 'dual-rail'
      ? railState.leftOpen && !railState.leftMinimized
      : railState.leftOpen;
  const rightRailVisible =
    shellMode === 'dual-rail'
      ? railState.rightOpen && !railState.rightMinimized
      : railState.rightOpen;

  const leftRailContent = (
    <>
      <BrandPanel compact />
      <HudPanel
        telemetry={telemetry}
        activeAxis={activeAxis}
        axisLockMode={axisLockMode}
        bordersErrorMessage={bordersErrorMessage}
        bordersFocusedCountryIso={bordersFocusedCountryIso}
        bordersFocusedCountryName={bordersFocusedCountryName}
        bordersNoticeMessage={bordersNoticeMessage}
        bordersProfileId={bordersProfileId}
        bordersRenderState={bordersRenderState}
        bordersSelectedFeature={bordersSelectedFeature}
        bordersView={bordersView}
        compareModeState={compareModeState}
        headwayRenderState={headwayRenderState}
        headwayView={headwayView}
        isFrozen={isFrozen}
        renderState={renderState}
        rendererTier={rendererTier}
        selectedCountry={selectedCountry}
        viewerMode={viewerMode}
      />
      {viewerMode === 'borders' && bordersRenderState !== 'error' ? (
        <BordersLegend
          focusedCountryIso={bordersFocusedCountryIso}
          focusedCountryName={bordersFocusedCountryName}
          noticeMessage={bordersNoticeMessage}
          profileId={bordersProfileId}
        />
      ) : null}
      {warningCard}
    </>
  );

  const rightRailContent = (
    <ControlDock
      onOpenTimeAtlas={() => {
        if (isAnimationPlaying) stopPlaybackAtPreview();
        setTimeAtlasOpen(true);
      }}
      geographyControls={
        <CountryExplorer
          countryIndex={bordersCountryIndex}
          onNavigate={navigateGeography}
          disabled={isFrozen || isAnimationPlaying}
        />
      }
      animationDraft={animationDraft}
      axisLockMode={axisLockMode}
      bordersProfileId={bordersProfileId}
      compareModeState={compareModeState}
      headwayLayerVisibility={headwayLayerVisibility}
      headwayLayoutLook={headwayLayoutLook}
      isFrozen={isFrozen}
      isSceneAvailable={isSceneAvailable}
      isSceneReady={activeRenderState === 'ready'}
      onBordersProfileChange={(profileId) => {
        setBordersProfileId(profileId);
        syncCurrentUrl(
          'borders',
          geoFromBorders(bordersView),
          headwayView,
          bordersView,
          profileId,
          bordersFocusedCountryIso,
        );
      }}
      onAxisReset={handleAxisReset}
      onFullscreen={toggleFullscreen}
      onHeadwayLayoutLookChange={setHeadwayLayoutLook}
      onHeadwayLayerToggle={(layer) =>
        setHeadwayLayerVisibility({
          [layer]: !headwayLayerVisibility[layer],
        })
      }
      onHelp={() => setShowOnboarding(true)}
      onModeChange={changeViewerMode}
      onOpenAnimationWorkspace={handleOpenAnimationWorkspace}
      onPlayAnimation={handlePlayAnimationFromDock}
      onPresetSelect={openPreset}
      onQualityChange={changeQuality}
      onShare={shareView}
      onToggleAxisLock={handleToggleAxisLock}
      onToggleBorders={toggleShowBorders}
      onToggleBordersPinpoints={toggleShowBordersPinpoints}
      onToggleCompare={handleToggleCompareMode}
      onToggleFrozen={toggleFrozen}
      presets={VIEWER_PRESETS}
      quality={quality}
      shareLabel={shareLabel}
      showBorders={showBorders}
      showBordersPinpoints={showBordersPinpoints}
      layoutMode={layoutMode}
      viewerMode={viewerMode}
    />
  );

  const appShellClassName = `app-shell app-shell--${layoutMode} app-shell--${shellMode} app-shell--${orientation}`;

  if (timeAtlasOpen)
    return (
      <Suspense
        fallback={<p className="telemetry-note">Loading Time atlas…</p>}
      >
        <TimeAtlasWorkspace onClose={() => setTimeAtlasOpen(false)} />
      </Suspense>
    );

  return (
    <main className={appShellClassName}>
      {isAnimationWorkspaceOpen ? (
        <>
          <div className="space-backdrop" aria-hidden="true" />
          <div
            className={`scene-host scene-host--workspace scene-host--${layoutMode} scene-host--${shellMode}`}
            data-renderer-state={activeRenderState}
            data-viewer-mode={viewerMode}
          >
            {activeRenderer}
          </div>
          <AnimationWorkspace
            canPlay={canPlayAnimation}
            draft={animationDraft}
            importError={animationImportError}
            importHex={animationImportHex}
            key={resolveAnimationMode(viewerMode)}
            onClearDraft={handleClearAnimationDraft}
            onClose={closeWorkspaceWithPreview}
            onDraftChange={setAnimationDraft}
            onImportHexChange={setAnimationImportHex}
            onImportHexLoad={handleLoadAnimationHex}
            onPlay={handlePlayAnimationFromWorkspace}
            onPlayheadChange={setAnimationPlayhead}
            open={isAnimationWorkspaceOpen}
            phase={animationSession.phase}
            playheadMs={animationSession.playheadMs}
            workspaceMode={workspaceMode}
            viewerMode={resolveAnimationMode(viewerMode)}
          />
          {isAnimationPlaying ? (
            <AnimationPlaybackOverlay
              onStop={stopPlaybackAtPreview}
              playheadMs={animationSession.playheadMs}
              totalDurationMs={animationDraft.totalDurationMs}
            />
          ) : null}
        </>
      ) : (
        <>
          <div className="space-backdrop" aria-hidden="true" />
          <div
            className={`scene-host scene-host--viewer scene-host--${layoutMode} scene-host--${shellMode}`}
            data-renderer-state={activeRenderState}
            data-viewer-mode={viewerMode}
          >
            {activeRenderer}
          </div>
          <div
            className={`overlay-shell overlay-shell--${layoutMode} overlay-shell--${shellMode}`}
          >
            {!leftRailVisible ? (
              <button
                aria-controls="left-overlay-rail"
                aria-label="Open status rail"
                aria-expanded={leftRailVisible}
                className="overlay-tab overlay-tab--left"
                onClick={handleOpenLeftRail}
                type="button"
              >
                <span className="overlay-tab__glyph">
                  <RailTriggerIcon side="left" />
                </span>
              </button>
            ) : null}
            {!rightRailVisible ? (
              <button
                aria-controls="right-overlay-rail"
                aria-label="Open control rail"
                aria-expanded={rightRailVisible}
                className="overlay-tab overlay-tab--right"
                onClick={handleOpenRightRail}
                type="button"
              >
                <span className="overlay-tab__glyph">
                  <RailTriggerIcon side="right" />
                </span>
              </button>
            ) : null}

            <aside
              className={`overlay-rail overlay-rail--left ${
                leftRailVisible
                  ? 'overlay-rail--open'
                  : 'overlay-rail--collapsed'
              } ${railState.leftMinimized ? 'overlay-rail--minimized' : ''}`}
              id="left-overlay-rail"
            >
              <div className="overlay-rail__chrome">
                <div className="overlay-rail__eyebrow">
                  <span className="overlay-rail__label-chip">Status</span>
                  <span className="status-pill status-pill--axis">
                    {compactStatusLabel}
                  </span>
                </div>
                <button
                  aria-label={
                    shellMode === 'dual-rail'
                      ? 'Minimize status rail'
                      : 'Close status rail'
                  }
                  className="rail-icon-button"
                  onClick={handleCloseLeftRail}
                  type="button"
                >
                  <RailActionIcon
                    action={shellMode === 'dual-rail' ? 'minimize' : 'close'}
                  />
                </button>
              </div>
              <div className="overlay-rail__scroll">{leftRailContent}</div>
            </aside>

            <aside
              className={`overlay-rail overlay-rail--right ${
                rightRailVisible
                  ? 'overlay-rail--open'
                  : 'overlay-rail--collapsed'
              } ${railState.rightMinimized ? 'overlay-rail--minimized' : ''}`}
              id="right-overlay-rail"
            >
              <div className="overlay-rail__chrome">
                <div className="overlay-rail__eyebrow">
                  <span className="overlay-rail__label-chip">Controls</span>
                  <span className="status-pill status-pill--axis">
                    {viewerMode === 'geo'
                      ? 'Geo controls'
                      : viewerMode === 'headway'
                        ? 'Headway controls'
                        : 'Borders controls'}
                  </span>
                </div>
                <button
                  aria-label={
                    shellMode === 'dual-rail'
                      ? 'Minimize control rail'
                      : 'Close control rail'
                  }
                  className="rail-icon-button"
                  onClick={handleCloseRightRail}
                  type="button"
                >
                  <RailActionIcon
                    action={shellMode === 'dual-rail' ? 'minimize' : 'close'}
                  />
                </button>
              </div>
              <div className="overlay-rail__scroll">{rightRailContent}</div>
            </aside>
          </div>
        </>
      )}

      {!isAnimationWorkspaceOpen && viewerMode === 'geo' ? (
        <CountryCompareOverlay
          compareModeState={compareModeState}
          onExit={handleExitCompareMode}
          onRelease={handleClearPinnedCountry}
          selectedCountry={selectedCountry}
          view={view}
        />
      ) : null}

      {!isAnimationWorkspaceOpen &&
        viewerMode === 'geo' &&
        (renderState === 'failed' ||
          renderState === 'context-lost' ||
          renderState === 'recovering') && (
          <div className="scene-status-layer">
            <SceneFallback
              title={
                renderState === 'failed'
                  ? '3D renderer unavailable right now.'
                  : renderState === 'context-lost'
                    ? 'Graphics context lost.'
                    : 'Rebuilding renderer.'
              }
              body={
                renderState === 'failed'
                  ? 'Geo could not initialize WebGL in this browser session. The shell stays active so you can retry the renderer or switch to a safer graphics mode.'
                  : renderState === 'context-lost'
                    ? 'Geo was running, but the WebGL context was interrupted. Geo is already preparing a safer renderer recovery in the current shell.'
                    : 'The renderer is remounting with the last known camera state. If the globe does not return, reload the page.'
              }
              action={
                <div className="button-row">
                  <button
                    className="secondary-button"
                    onClick={retryRenderer}
                    type="button"
                  >
                    Retry renderer
                  </button>
                  {renderState === 'failed' ? (
                    <button
                      className="secondary-button"
                      onClick={retrySafeMode}
                      type="button"
                    >
                      Safe graphics mode
                    </button>
                  ) : null}
                  <button
                    className="secondary-button"
                    onClick={() => window.location.reload()}
                    type="button"
                  >
                    Reload page
                  </button>
                </div>
              }
            />
          </div>
        )}

      {!isAnimationWorkspaceOpen &&
        viewerMode === 'headway' &&
        headwayRenderState === 'error' && (
          <div className="scene-status-layer">
            <SceneFallback
              title="Headway view unavailable right now."
              body={
                headwayErrorMessage ??
                'The Headway basemap could not load its style or vector tiles. You can retry it or switch back to the cinematic Geo globe.'
              }
              action={
                <div className="button-row">
                  <button
                    className="secondary-button"
                    onClick={retryHeadway}
                    type="button"
                  >
                    Retry Headway
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => changeViewerMode('geo')}
                    type="button"
                  >
                    Switch to Geo
                  </button>
                </div>
              }
            />
          </div>
        )}

      {!isAnimationWorkspaceOpen &&
        viewerMode === 'borders' &&
        bordersRenderState === 'error' && (
          <div className="scene-status-layer">
            <SceneFallback
              title="Borders view unavailable right now."
              body={
                bordersErrorMessage ??
                'The Borders atlas could not load its local globe assets. You can retry it or switch back to Geo.'
              }
              action={
                <div className="button-row">
                  <button
                    className="secondary-button"
                    onClick={retryBorders}
                    type="button"
                  >
                    Retry Borders
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => changeViewerMode('geo')}
                    type="button"
                  >
                    Switch to Geo
                  </button>
                </div>
              }
            />
          </div>
        )}

      <ViewerShortcuts
        bordersView={bordersView}
        headwayView={headwayView}
        isAnimationPlaying={isAnimationPlaying}
        isAnimationWorkspaceOpen={isAnimationWorkspaceOpen}
        isFrozen={isFrozen}
        isSceneAvailable={isSceneAvailable}
        onApplyBordersView={applyBordersView}
        onApplyGeoView={applyGeoView}
        onApplyHeadwayView={applyHeadwayView}
        onAxisReset={handleAxisReset}
        onCloseAnimationWorkspace={closeWorkspaceWithPreview}
        onOpenHelp={() => setShowOnboarding(true)}
        onPresetSelect={openPresetByIndex}
        onResetHome={handleResetHome}
        onStopAnimation={stopPlaybackAtPreview}
        onToggleAxisLock={handleToggleAxisLock}
        onToggleFrozen={toggleFrozen}
        showOnboarding={showOnboarding}
        view={view}
        viewerMode={viewerMode}
      />

      {!isAnimationWorkspaceOpen ? <LoadingOverlay /> : null}
      {!isAnimationWorkspaceOpen ? (
        <OnboardingModal
          open={showOnboarding}
          onDismiss={() => {
            window.localStorage.setItem(STORAGE_KEYS.onboarding, 'true');
            setShowOnboarding(false);
          }}
        />
      ) : null}
    </main>
  );
}

export default App;
