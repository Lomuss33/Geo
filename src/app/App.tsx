import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { useViewportLayout } from './useViewportLayout';
import { useAnimationSessionDriver } from './useAnimationSessionDriver';
import { ViewerShortcuts } from './ViewerShortcuts';
import { AnimationPlaybackOverlay } from '../components/AnimationPlaybackOverlay';
import { AnimationWorkspace } from '../components/AnimationWorkspace';
import { BrandPanel } from '../components/BrandPanel';
import { ControlDock } from '../components/ControlDock';
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
  DEFAULT_VIEW,
  STORAGE_KEYS,
  VIEWER_PRESETS,
  viewFromLatLon,
} from '../lib/constants';
import { geoFromHeadway, headwayFromGeo } from '../lib/modeBridge';
import { resetGeoAxes, resetHeadwayAxes } from '../lib/navigation';
import { formatRendererTier } from '../lib/renderer';
import {
  buildViewUrl,
  shouldLiveSyncViewUrl,
  updateUrlWithView,
} from '../lib/viewState';
import { GlobeCanvas } from '../scene/GlobeCanvas';
import { HeadwayMap } from '../scene/HeadwayMap';
import type {
  AnimationTimeline,
  GeoOverviewAnchor,
  HeadwayViewState,
  QualityMode,
  SelectedCountry,
  ViewerMode,
  ViewerPreset,
} from '../state/viewerStore';
import { readStoredAnimationDraft, useViewerStore } from '../state/viewerStore';
import type { ViewportLayoutMode } from './useViewportLayout';

type RailState = {
  leftOpen: boolean;
  rightOpen: boolean;
  leftMinimized: boolean;
  rightMinimized: boolean;
};

type RailAction =
  | { type: 'sync-layout'; layoutMode: ViewportLayoutMode }
  | { type: 'open-left'; layoutMode: ViewportLayoutMode }
  | { type: 'open-right'; layoutMode: ViewportLayoutMode }
  | { type: 'close-left'; layoutMode: ViewportLayoutMode }
  | { type: 'close-right'; layoutMode: ViewportLayoutMode };

function createRailState(layoutMode: ViewportLayoutMode): RailState {
  if (layoutMode === 'monitor') {
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
      return createRailState(action.layoutMode);
    case 'open-left':
      if (action.layoutMode === 'monitor') {
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
      if (action.layoutMode === 'monitor') {
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
      if (action.layoutMode === 'monitor') {
        return { ...state, leftOpen: false, leftMinimized: true };
      }

      return { ...state, leftOpen: false };
    case 'close-right':
      if (action.layoutMode === 'monitor') {
        return { ...state, rightOpen: false, rightMinimized: true };
      }

      return { ...state, rightOpen: false };
    default:
      return state;
  }
}

function App() {
  const layoutMode = useViewportLayout();
  const telemetry = useViewerStore((state) => state.telemetry);
  const viewerMode = useViewerStore((state) => state.viewerMode);
  const headwayView = useViewerStore((state) => state.headwayView);
  const headwayRenderState = useViewerStore(
    (state) => state.headwayRenderState,
  );
  const headwayErrorMessage = useViewerStore(
    (state) => state.headwayErrorMessage,
  );
  const quality = useViewerStore((state) => state.quality);
  const axisLockMode = useViewerStore((state) => state.axisLockMode);
  const compareModeState = useViewerStore((state) => state.compareModeState);
  const selectedCountry = useViewerStore((state) => state.selectedCountry);
  const geoOverviewAnchor = useViewerStore(
    (state) => state.geoOverviewAnchor,
  );
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
  const setHeadwayRenderState = useViewerStore(
    (state) => state.setHeadwayRenderState,
  );
  const setHeadwayErrorMessage = useViewerStore(
    (state) => state.setHeadwayErrorMessage,
  );
  const setQuality = useViewerStore((state) => state.setQuality);
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
  const clearPinnedCountry = useViewerStore((state) => state.clearPinnedCountry);
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
  const [geoCanvasKey, setGeoCanvasKey] = useState(0);
  const [headwayInstanceKey, setHeadwayInstanceKey] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [railState, dispatchRailState] = useReducer(
    railStateReducer,
    layoutMode,
    createRailState,
  );
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
    const onboardingDismissed =
      window.localStorage.getItem(STORAGE_KEYS.onboarding) === 'true';

    if (
      storedQuality === 'performance' ||
      storedQuality === 'balanced' ||
      storedQuality === 'high'
    ) {
      setQuality(storedQuality);
    }

    if (
      storedRotationMode === 'free' ||
      storedRotationMode === 'axis-lock'
    ) {
      setAxisLockMode(storedRotationMode);
    }

    if (onboardingDismissed) {
      setShowOnboarding(false);
    }
  }, [setAxisLockMode, setQuality, setShowOnboarding]);

  useEffect(() => {
    loadAnimationDraft(readStoredAnimationDraft(useViewerStore.getState().viewerMode));
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
    dispatchRailState({ type: 'sync-layout', layoutMode });
  }, [layoutMode]);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const syncCurrentUrl = useCallback(
    (
      nextMode: ViewerMode,
      nextView = view,
      nextHeadwayView = headwayView,
    ) => {
      if (!liveSyncViewUrl) {
        return;
      }

      updateUrlWithView(nextView, {
        viewerMode: nextMode,
        headwayView: nextMode === 'headway' ? nextHeadwayView : null,
      });
    },
    [headwayView, liveSyncViewUrl, view],
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
    mode: ViewerMode,
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
    const url = buildViewUrl(view, window.location.href, {
      viewerMode,
      headwayView: viewerMode === 'headway' ? headwayView : null,
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
      if (options?.animationDraft) {
        loadDraftForMode(nextMode, options.animationDraft);
      }
      return;
    }

    disableCountryCompare();

    if (nextMode === 'headway') {
      clearGeoOverviewState();
      const nextHeadwayView = headwayFromGeo(view);
      setHeadwayErrorMessage(null);
      setHeadwayView(nextHeadwayView);
      setHeadwayRenderState('loading');
      setViewerMode('headway');
      loadDraftForMode('headway', options?.animationDraft);
      syncCurrentUrl('headway', view, nextHeadwayView);
      return;
    }

    clearGeoOverviewState();
    const nextGeoView = geoFromHeadway(headwayView);
    applyImmediateView(nextGeoView);
    setViewerMode('geo');
    setHeadwayRenderState('idle');
    setHeadwayErrorMessage(null);
    loadDraftForMode('geo', options?.animationDraft);
    syncCurrentUrl('geo', nextGeoView);
  };

  const changeQuality = (nextQuality: QualityMode) => {
    if (nextQuality === quality) {
      return;
    }

    if (viewerMode === 'headway') {
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
          options?.anchor === undefined
            ? geoOverviewAnchor
            : options.anchor,
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

  const handleCountryPick = (country: SelectedCountry) => {
    if (viewerMode !== 'geo') {
      return;
    }

    const [lon, lat] = country.centroid;
    if (geoOverviewAnchor || isHumanViewActive(view.distance)) {
      setGeoOverviewAnchor({ lat, lon });
      animateToView(
        applyGeoConstraint(
          surfaceAnchoredGeoView({
            lat,
            lon,
            headingDeg: geoOverviewHeadingDeg,
            distance: view.distance,
            baseFov: view.fov,
          }),
          {
            anchor: { lat, lon },
          },
        ),
      );
    } else {
      clearGeoOverviewState();
      animateToView(
        applyGeoConstraint(
          {
            ...viewFromLatLon(lat, lon, view.distance, 0),
            fov: view.fov,
          },
          { anchor: null, headingDeg: 0 },
        ),
      );
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

    applyHeadwayView(resetHeadwayAxes(headwayView));
  };

  const handleToggleAxisLock = () => {
    const nextMode = axisLockMode === 'free' ? 'axis-lock' : 'free';

    toggleAxisLock();

    if (viewerMode === 'headway' && nextMode === 'axis-lock') {
      applyHeadwayView(resetHeadwayAxes(headwayView));
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

  const titleMessage = useMemo(() => {
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
  }, [headwayRenderState, loadState, renderState, viewerMode]);

  const defaultPresetsOpen = layoutMode === 'monitor' && viewportWidth >= 1440;

  const isSceneAvailable =
    viewerMode === 'geo'
      ? renderState !== 'failed'
      : headwayRenderState !== 'error';
  const isAnimationWorkspaceOpen = animationSession.workspaceOpen;
  const isAnimationPlaying = animationSession.phase === 'playing';
  const canPlayAnimation =
    isSceneAvailable && !isFrozen && canPlayAnimationTimeline(animationDraft);

  const handleClearAnimationDraft = () => {
    loadDraftForMode(viewerMode, createDefaultAnimationTimeline(viewerMode));
    setAnimationImportError(null);
    setAnimationPlayhead(0);
  };

  const handleOpenAnimationWorkspace = () => {
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

    if (imported.mode === viewerMode) {
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
    const nextGeoView = geoFromHeadway(headwayView);
    applyImmediateView(nextGeoView);
    setViewerMode('geo');
    setHeadwayRenderState('idle');
    setHeadwayErrorMessage(null);
    loadAnimationDraft(imported);
    syncCurrentUrl('geo', nextGeoView);
    openDraftWorkspace(imported, 0);
  };

  const handlePlayAnimationFromDock = () => {
    if (!canPlayAnimation) {
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
    if (!canPlayAnimation) {
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
      (viewerMode === 'headway' && headwayRenderState === 'error')
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

  const warningCard =
    ((viewerMode === 'geo' &&
      (renderState === 'failed' || loadState === 'error')) ||
      (viewerMode === 'headway' && headwayRenderState === 'error')) && (
      <section className="hud-card hud-card--warning" role="status">
        <span className="panel-kicker">{titleMessage}</span>
        {viewerMode === 'headway' ? (
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
          <p>
            {errorMessage ?? 'The viewer is running with reduced fidelity.'}
          </p>
        )}
      </section>
    );

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
    ) : (
      <HeadwayMap
        axisLockMode={axisLockMode}
        isFrozen={isFrozen}
        key={headwayInstanceKey}
        quality={quality}
        showBorders={showBorders}
        view={headwayView}
        onError={handleHeadwayError}
        onLoading={handleHeadwayLoading}
        onReady={handleHeadwayReady}
        onViewChange={handleHeadwayViewChange}
      />
    );

  const compactStatusLabel =
    viewerMode === 'headway'
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
    dispatchRailState({ type: 'open-left', layoutMode });
  };

  const handleOpenRightRail = () => {
    dispatchRailState({ type: 'open-right', layoutMode });
  };

  const handleCloseLeftRail = () => {
    dispatchRailState({ type: 'close-left', layoutMode });
  };

  const handleCloseRightRail = () => {
    dispatchRailState({ type: 'close-right', layoutMode });
  };

  const leftRailVisible =
    layoutMode === 'monitor'
      ? railState.leftOpen && !railState.leftMinimized
      : railState.leftOpen;
  const rightRailVisible =
    layoutMode === 'monitor'
      ? railState.rightOpen && !railState.rightMinimized
      : railState.rightOpen;

  const leftRailContent = (
    <>
      <BrandPanel compact={layoutMode === 'mobile'} />
      <HudPanel
        telemetry={telemetry}
        activeAxis={activeAxis}
        axisLockMode={axisLockMode}
        compareModeState={compareModeState}
        headwayRenderState={headwayRenderState}
        headwayView={headwayView}
        isFrozen={isFrozen}
        renderState={renderState}
        rendererTier={rendererTier}
        selectedCountry={selectedCountry}
        viewerMode={viewerMode}
      />
      {warningCard}
    </>
  );

  const rightRailContent = (
    <ControlDock
      animationDraft={animationDraft}
      axisLockMode={axisLockMode}
      compareModeState={compareModeState}
      defaultPresetsOpen={defaultPresetsOpen}
      isFrozen={isFrozen}
      isSceneAvailable={isSceneAvailable}
      onAxisReset={handleAxisReset}
      onFullscreen={toggleFullscreen}
      onHelp={() => setShowOnboarding(true)}
      onModeChange={changeViewerMode}
      onOpenAnimationWorkspace={handleOpenAnimationWorkspace}
      onPlayAnimation={handlePlayAnimationFromDock}
      onPresetSelect={openPreset}
      onQualityChange={changeQuality}
      onShare={shareView}
      onToggleCompare={handleToggleCompareMode}
      onToggleBorders={toggleShowBorders}
      onToggleFrozen={toggleFrozen}
      onToggleAxisLock={handleToggleAxisLock}
      presets={VIEWER_PRESETS}
      quality={quality}
      shareLabel={shareLabel}
      showBorders={showBorders}
      viewerMode={viewerMode}
    />
  );

  return (
    <main className={`app-shell app-shell--${layoutMode}`}>
      {isAnimationWorkspaceOpen ? (
        <>
          <div className="space-backdrop" aria-hidden="true" />
          <div className={`scene-host scene-host--workspace scene-host--${layoutMode}`}>
            {activeRenderer}
          </div>
          <AnimationWorkspace
            canPlay={canPlayAnimation}
            draft={animationDraft}
            importError={animationImportError}
            importHex={animationImportHex}
            key={viewerMode}
            layoutMode={layoutMode}
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
            viewerMode={viewerMode}
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
          <div className={`scene-host scene-host--viewer scene-host--${layoutMode}`}>
            {activeRenderer}
          </div>
          <div className={`overlay-shell overlay-shell--${layoutMode}`}>
            <button
              aria-controls="left-overlay-rail"
              aria-expanded={leftRailVisible}
              className="overlay-tab overlay-tab--left"
              onClick={handleOpenLeftRail}
              type="button"
            >
              <span className="overlay-tab__label">Status</span>
              <small>{compactStatusLabel}</small>
            </button>
            <button
              aria-controls="right-overlay-rail"
              aria-expanded={rightRailVisible}
              className="overlay-tab overlay-tab--right"
              onClick={handleOpenRightRail}
              type="button"
            >
              <span className="overlay-tab__label">Controls</span>
              <small>{viewerMode === 'geo' ? 'Geo' : 'Headway'}</small>
            </button>

            <aside
              className={`overlay-rail overlay-rail--left ${
                leftRailVisible ? 'overlay-rail--open' : 'overlay-rail--collapsed'
              } ${railState.leftMinimized ? 'overlay-rail--minimized' : ''}`}
              id="left-overlay-rail"
            >
              <div className="overlay-rail__chrome">
                <div className="overlay-rail__eyebrow">
                  <span className="panel-kicker">Status rail</span>
                  <span className="status-pill status-pill--axis">{compactStatusLabel}</span>
                </div>
                <button
                  aria-label={layoutMode === 'monitor' ? 'Minimize status rail' : 'Close status rail'}
                  className="text-button"
                  onClick={handleCloseLeftRail}
                  type="button"
                >
                  {layoutMode === 'monitor' ? 'Minimize' : 'Close'}
                </button>
              </div>
              <div className="overlay-rail__scroll">{leftRailContent}</div>
            </aside>

            <aside
              className={`overlay-rail overlay-rail--right ${
                rightRailVisible ? 'overlay-rail--open' : 'overlay-rail--collapsed'
              } ${railState.rightMinimized ? 'overlay-rail--minimized' : ''}`}
              id="right-overlay-rail"
            >
              <div className="overlay-rail__chrome">
                <div className="overlay-rail__eyebrow">
                  <span className="panel-kicker">Control rail</span>
                  <span className="status-pill status-pill--axis">
                    {viewerMode === 'geo' ? 'Geo controls' : 'Headway controls'}
                  </span>
                </div>
                <button
                  aria-label={layoutMode === 'monitor' ? 'Minimize control rail' : 'Close control rail'}
                  className="text-button"
                  onClick={handleCloseRightRail}
                  type="button"
                >
                  {layoutMode === 'monitor' ? 'Minimize' : 'Close'}
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
          onClear={handleClearPinnedCountry}
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

      <ViewerShortcuts
        headwayView={headwayView}
        isAnimationPlaying={isAnimationPlaying}
        isAnimationWorkspaceOpen={isAnimationWorkspaceOpen}
        isFrozen={isFrozen}
        isSceneAvailable={isSceneAvailable}
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
