import { create } from 'zustand';
import {
  createDefaultAnimationTimeline,
  deserializeAnimationTimeline,
  normalizeAnimationTimeline,
  serializeAnimationTimeline,
} from '../lib/animation';
import { STORAGE_KEYS, DEFAULT_VIEW } from '../lib/constants';
import { cloneView } from '../lib/math';
import { cloneBordersView } from '../lib/bordersBridge';
import { cloneHeadwayView } from '../lib/modeBridge';

export type GlobeViewState = {
  rotation: [number, number, number, number];
  distance: number;
  fov: number;
};

export type AnimationMode = 'geo' | 'headway';
export type ViewerMode = AnimationMode | 'borders';

export type HeadwayViewState = {
  center: [lng: number, lat: number];
  zoom: number;
  bearing: number;
  pitch: number;
};

export type BordersProfileId = 'gdp' | 'population' | 'hierarchy';

export type BordersViewState = {
  center: [lng: number, lat: number];
  zoom: number;
  bearing: number;
  pitch: number;
};

export type BordersSelectedFeature = {
  iso3: string;
  admLevel: 0 | 1 | 2;
  featureId: string;
  name: string;
  metricValue: number | null;
};

export type ViewerPreset = {
  id: string;
  label: string;
  description: string;
  state: GlobeViewState;
};

export type HudTelemetry = {
  lat: number;
  lon: number;
  altitudeKm: number;
  rollDeg: number;
  sunlit: boolean;
};

export type QualityMode = 'performance' | 'balanced' | 'high';
export type AxisLockMode = 'free' | 'axis-lock';
export type HeadwayLayoutLook =
  | 'mission'
  | 'daylight'
  | 'atlas'
  | 'blueprint'
  | 'mono'
  | 'transit';
export type HeadwayLayerKey =
  | 'roads'
  | 'parks'
  | 'buildings'
  | 'placeLabels'
  | 'pois';
export type HeadwayLayerVisibility = Record<HeadwayLayerKey, boolean>;
export type RotationAxis = 'x' | 'y' | null;
export type CompareModeState = 'off' | 'armed' | 'pinned';
export type SelectedCountry = {
  id: string;
  name: string;
  centroid: [lng: number, lat: number];
};
export type GeoOverviewAnchor = {
  lat: number;
  lon: number;
};
export type AnimationCommandKey =
  | 'ud+'
  | 'ud-'
  | 'lr+'
  | 'lr-'
  | 'fb+'
  | 'fb-'
  | 'yaw+'
  | 'yaw-'
  | 'pitch+'
  | 'pitch-'
  | 'roll+'
  | 'roll-';
export type AnimationBlock = {
  id: string;
  command: AnimationCommandKey;
  startMs: number;
  endMs: number;
  amount: number;
  acceleration: number;
  enabled: boolean;
};
export type AnimationTimeline = {
  version: 2;
  mode: AnimationMode;
  totalDurationMs: number;
  startGeoView: GlobeViewState | null;
  startHeadwayView: HeadwayViewState | null;
  blocks: AnimationBlock[];
};
export type AnimationSessionState = {
  workspaceOpen: boolean;
  phase: 'idle' | 'playing';
  startedAtMs: number | null;
  playheadMs: number;
  previewGeoView: GlobeViewState | null;
  previewHeadwayView: HeadwayViewState | null;
};
export type SixDofAxis =
  | 'left-right'
  | 'up-down'
  | 'forward-back'
  | 'yaw'
  | 'pitch'
  | 'roll';
export type RendererTier = 'standard' | 'compatibility' | 'minimal';
export type RendererFailureReason =
  | 'canvas-fallback'
  | 'renderer-init-failed'
  | 'context-lost'
  | null;
export type LoadState =
  | 'booting'
  | 'ready'
  | 'resolving-detail'
  | 'degraded'
  | 'error';
export type RenderState =
  | 'initializing'
  | 'ready'
  | 'context-lost'
  | 'recovering'
  | 'failed';
export type HeadwayRenderState = 'idle' | 'loading' | 'ready' | 'error';
export type BordersRenderState = 'idle' | 'loading' | 'ready' | 'error';

const EMPTY_TELEMETRY: HudTelemetry = {
  lat: 0,
  lon: 0,
  altitudeKm: 0,
  rollDeg: 0,
  sunlit: true,
};

const DEFAULT_HEADWAY_VIEW: HeadwayViewState = {
  center: [-28, 19.5],
  zoom: 1.8,
  bearing: 0,
  pitch: 0,
};

const DEFAULT_BORDERS_VIEW: BordersViewState = {
  center: [-28, 19.5],
  zoom: 1.8,
  bearing: 0,
  pitch: 0,
};

const DEFAULT_ANIMATION_SESSION: AnimationSessionState = {
  workspaceOpen: false,
  phase: 'idle',
  startedAtMs: null,
  playheadMs: 0,
  previewGeoView: null,
  previewHeadwayView: null,
};

const DEFAULT_HEADWAY_LAYER_VISIBILITY: HeadwayLayerVisibility = {
  roads: true,
  parks: true,
  buildings: true,
  placeLabels: true,
  pois: true,
};

const cloneAnimationTimeline = (
  timeline: AnimationTimeline,
): AnimationTimeline => ({
  version: timeline.version,
  mode: timeline.mode,
  totalDurationMs: timeline.totalDurationMs,
  startGeoView: timeline.startGeoView ? cloneView(timeline.startGeoView) : null,
  startHeadwayView: timeline.startHeadwayView
    ? cloneHeadwayView(timeline.startHeadwayView)
    : null,
  blocks: timeline.blocks.map((block) => ({ ...block })),
});

const getAnimationStorageKey = (mode: AnimationMode) =>
  mode === 'geo'
    ? STORAGE_KEYS.animationDraftGeo
    : STORAGE_KEYS.animationDraftHeadway;

const persistAnimationDraft = (timeline: AnimationTimeline) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    getAnimationStorageKey(timeline.mode),
    serializeAnimationTimeline(timeline),
  );
};

export const readStoredAnimationDraft = (mode: AnimationMode) => {
  if (typeof window === 'undefined') {
    return createDefaultAnimationTimeline(mode);
  }

  const stored = window.localStorage.getItem(getAnimationStorageKey(mode));
  const timeline = stored ? deserializeAnimationTimeline(stored) : null;

  return timeline?.mode === mode
    ? timeline
    : createDefaultAnimationTimeline(mode);
};

type ViewerStore = {
  view: GlobeViewState;
  targetView: GlobeViewState;
  telemetry: HudTelemetry;
  viewerMode: ViewerMode;
  headwayView: HeadwayViewState;
  headwayRenderState: HeadwayRenderState;
  headwayErrorMessage: string | null;
  bordersView: BordersViewState;
  bordersRenderState: BordersRenderState;
  bordersErrorMessage: string | null;
  bordersNoticeMessage: string | null;
  bordersProfileId: BordersProfileId;
  bordersFocusedCountryIso: string | null;
  bordersSelectedFeature: BordersSelectedFeature | null;
  showBordersPinpoints: boolean;
  quality: QualityMode;
  headwayLayoutLook: HeadwayLayoutLook;
  headwayLayerVisibility: HeadwayLayerVisibility;
  axisLockMode: AxisLockMode;
  compareModeState: CompareModeState;
  selectedCountry: SelectedCountry | null;
  geoOverviewAnchor: GeoOverviewAnchor | null;
  geoOverviewHeadingDeg: number;
  loadState: LoadState;
  renderState: RenderState;
  rendererTier: RendererTier | null;
  rendererAttempts: RendererTier[];
  rendererFailureReason: RendererFailureReason;
  rendererFailureMessage: string | null;
  showOnboarding: boolean;
  isFullscreen: boolean;
  isFrozen: boolean;
  showBorders: boolean;
  isAnimating: boolean;
  activeAxis: RotationAxis;
  hasInteracted: boolean;
  lastShareUrl: string | null;
  errorMessage: string | null;
  animationDraft: AnimationTimeline;
  animationImportHex: string;
  animationImportError: string | null;
  animationSession: AnimationSessionState;
  setViewerMode: (mode: ViewerMode) => void;
  setHeadwayView: (view: HeadwayViewState) => void;
  setHeadwayRenderState: (state: HeadwayRenderState) => void;
  setHeadwayErrorMessage: (message: string | null) => void;
  setBordersView: (view: BordersViewState) => void;
  setBordersRenderState: (state: BordersRenderState) => void;
  setBordersErrorMessage: (message: string | null) => void;
  setBordersNoticeMessage: (message: string | null) => void;
  setBordersProfileId: (profileId: BordersProfileId) => void;
  setBordersFocusedCountryIso: (iso3: string | null) => void;
  setBordersSelectedFeature: (feature: BordersSelectedFeature | null) => void;
  setShowBordersPinpoints: (enabled: boolean) => void;
  toggleShowBordersPinpoints: () => void;
  setQuality: (quality: QualityMode) => void;
  setHeadwayLayoutLook: (look: HeadwayLayoutLook) => void;
  setHeadwayLayerVisibility: (
    visibility: Partial<HeadwayLayerVisibility>,
  ) => void;
  setAxisLockMode: (mode: AxisLockMode) => void;
  toggleAxisLock: () => void;
  setCompareModeState: (state: CompareModeState) => void;
  setSelectedCountry: (country: SelectedCountry | null) => void;
  setGeoOverviewAnchor: (anchor: GeoOverviewAnchor | null) => void;
  setGeoOverviewHeading: (headingDeg: number) => void;
  clearGeoOverviewState: () => void;
  armCountryCompare: () => void;
  pinCountry: (country: SelectedCountry) => void;
  clearPinnedCountry: () => void;
  disableCountryCompare: () => void;
  setLoadState: (state: LoadState) => void;
  setRenderState: (state: RenderState) => void;
  setRendererDiagnostics: (input: {
    tier?: RendererTier | null;
    attemptedTiers?: RendererTier[];
    reason?: RendererFailureReason;
    message?: string | null;
  }) => void;
  resetRendererDiagnostics: () => void;
  setShowOnboarding: (visible: boolean) => void;
  setFullscreen: (enabled: boolean) => void;
  setFrozen: (enabled: boolean) => void;
  toggleFrozen: () => void;
  setShowBorders: (enabled: boolean) => void;
  toggleShowBorders: () => void;
  setActiveAxis: (axis: RotationAxis) => void;
  setErrorMessage: (message: string | null) => void;
  markInteracted: () => void;
  animateToView: (view: GlobeViewState) => void;
  applyImmediateView: (view: GlobeViewState) => void;
  commitFrame: (
    view: GlobeViewState,
    telemetry: HudTelemetry,
    isAnimating: boolean,
  ) => void;
  setLastShareUrl: (url: string | null) => void;
  openAnimationWorkspace: (input: {
    playheadMs?: number;
    previewGeoView?: GlobeViewState | null;
    previewHeadwayView?: HeadwayViewState | null;
  }) => void;
  closeAnimationWorkspace: () => void;
  setAnimationDraft: (
    next: AnimationTimeline | ((draft: AnimationTimeline) => AnimationTimeline),
  ) => void;
  loadAnimationDraft: (timeline: AnimationTimeline) => void;
  setAnimationImportHex: (hex: string) => void;
  setAnimationImportError: (error: string | null) => void;
  setAnimationPlayhead: (playheadMs: number) => void;
  setAnimationPreviewViews: (input: {
    playheadMs?: number;
    previewGeoView?: GlobeViewState | null;
    previewHeadwayView?: HeadwayViewState | null;
  }) => void;
  startAnimationPlayback: (input: {
    startedAtMs: number;
    playheadMs?: number;
  }) => void;
  stopAnimationPlayback: (input?: { playheadMs?: number }) => void;
};

export const useViewerStore = create<ViewerStore>((set) => ({
  view: cloneView(DEFAULT_VIEW),
  targetView: cloneView(DEFAULT_VIEW),
  telemetry: EMPTY_TELEMETRY,
  viewerMode: 'geo',
  headwayView: { ...DEFAULT_HEADWAY_VIEW },
  headwayRenderState: 'idle',
  headwayErrorMessage: null,
  bordersView: { ...DEFAULT_BORDERS_VIEW },
  bordersRenderState: 'idle',
  bordersErrorMessage: null,
  bordersNoticeMessage: null,
  bordersProfileId: 'gdp',
  bordersFocusedCountryIso: null,
  bordersSelectedFeature: null,
  showBordersPinpoints: true,
  quality: 'balanced',
  headwayLayoutLook: 'mission',
  headwayLayerVisibility: { ...DEFAULT_HEADWAY_LAYER_VISIBILITY },
  axisLockMode: 'free',
  compareModeState: 'off',
  selectedCountry: null,
  geoOverviewAnchor: null,
  geoOverviewHeadingDeg: 0,
  loadState: 'booting',
  renderState: 'initializing',
  rendererTier: null,
  rendererAttempts: [],
  rendererFailureReason: null,
  rendererFailureMessage: null,
  showOnboarding: false,
  isFullscreen: false,
  isFrozen: false,
  showBorders: false,
  isAnimating: false,
  activeAxis: null,
  hasInteracted: false,
  lastShareUrl: null,
  errorMessage: null,
  animationDraft: createDefaultAnimationTimeline('geo'),
  animationImportHex: '',
  animationImportError: null,
  animationSession: DEFAULT_ANIMATION_SESSION,
  setViewerMode: (viewerMode) => set({ viewerMode }),
  setHeadwayView: (headwayView) =>
    set({
      headwayView: cloneHeadwayView(headwayView),
    }),
  setHeadwayRenderState: (headwayRenderState) => set({ headwayRenderState }),
  setHeadwayErrorMessage: (headwayErrorMessage) => set({ headwayErrorMessage }),
  setBordersView: (bordersView) =>
    set({
      bordersView: cloneBordersView(bordersView),
    }),
  setBordersRenderState: (bordersRenderState) => set({ bordersRenderState }),
  setBordersErrorMessage: (bordersErrorMessage) => set({ bordersErrorMessage }),
  setBordersNoticeMessage: (bordersNoticeMessage) =>
    set({ bordersNoticeMessage }),
  setBordersProfileId: (bordersProfileId) => set({ bordersProfileId }),
  setBordersFocusedCountryIso: (bordersFocusedCountryIso) =>
    set({ bordersFocusedCountryIso }),
  setBordersSelectedFeature: (bordersSelectedFeature) =>
    set({
      bordersSelectedFeature:
        bordersSelectedFeature === null
          ? null
          : {
              ...bordersSelectedFeature,
            },
    }),
  setShowBordersPinpoints: (showBordersPinpoints) =>
    set({ showBordersPinpoints }),
  toggleShowBordersPinpoints: () =>
    set((state) => ({ showBordersPinpoints: !state.showBordersPinpoints })),
  setQuality: (quality) => set({ quality }),
  setHeadwayLayoutLook: (headwayLayoutLook) => set({ headwayLayoutLook }),
  setHeadwayLayerVisibility: (visibility) =>
    set((state) => ({
      headwayLayerVisibility: {
        ...state.headwayLayerVisibility,
        ...visibility,
      },
    })),
  setAxisLockMode: (axisLockMode) => set({ axisLockMode, activeAxis: null }),
  toggleAxisLock: () =>
    set((state) => ({
      axisLockMode: state.axisLockMode === 'free' ? 'axis-lock' : 'free',
      activeAxis: null,
    })),
  setCompareModeState: (compareModeState) => set({ compareModeState }),
  setSelectedCountry: (selectedCountry) =>
    set({
      selectedCountry:
        selectedCountry === null
          ? null
          : {
              ...selectedCountry,
              centroid: [
                ...selectedCountry.centroid,
              ] as SelectedCountry['centroid'],
            },
    }),
  setGeoOverviewAnchor: (geoOverviewAnchor) =>
    set({
      geoOverviewAnchor:
        geoOverviewAnchor === null ? null : { ...geoOverviewAnchor },
    }),
  setGeoOverviewHeading: (geoOverviewHeadingDeg) =>
    set({ geoOverviewHeadingDeg }),
  clearGeoOverviewState: () =>
    set({
      geoOverviewAnchor: null,
      geoOverviewHeadingDeg: 0,
    }),
  armCountryCompare: () =>
    set({
      compareModeState: 'armed',
      selectedCountry: null,
    }),
  pinCountry: (country) =>
    set({
      compareModeState: 'pinned',
      selectedCountry: {
        ...country,
        centroid: [...country.centroid] as SelectedCountry['centroid'],
      },
    }),
  clearPinnedCountry: () =>
    set((state) => ({
      compareModeState: state.compareModeState === 'off' ? 'off' : 'armed',
      selectedCountry: null,
    })),
  disableCountryCompare: () =>
    set({
      compareModeState: 'off',
      selectedCountry: null,
    }),
  setLoadState: (loadState) => set({ loadState }),
  setRenderState: (renderState) => set({ renderState }),
  setRendererDiagnostics: ({ tier, attemptedTiers, reason, message }) =>
    set((state) => ({
      rendererTier: tier ?? state.rendererTier,
      rendererAttempts: attemptedTiers ?? state.rendererAttempts,
      rendererFailureReason:
        reason === undefined ? state.rendererFailureReason : reason,
      rendererFailureMessage:
        message === undefined ? state.rendererFailureMessage : message,
    })),
  resetRendererDiagnostics: () =>
    set({
      rendererTier: null,
      rendererAttempts: [],
      rendererFailureReason: null,
      rendererFailureMessage: null,
    }),
  setShowOnboarding: (showOnboarding) => set({ showOnboarding }),
  setFullscreen: (isFullscreen) => set({ isFullscreen }),
  setFrozen: (isFrozen) =>
    set((state) => ({
      isFrozen,
      targetView: isFrozen ? cloneView(state.view) : state.targetView,
      isAnimating: isFrozen ? false : state.isAnimating,
      activeAxis: isFrozen ? null : state.activeAxis,
    })),
  toggleFrozen: () =>
    set((state) => ({
      isFrozen: !state.isFrozen,
      targetView: state.isFrozen ? state.targetView : cloneView(state.view),
      isAnimating: state.isFrozen ? state.isAnimating : false,
      activeAxis: null,
    })),
  setShowBorders: (showBorders) => set({ showBorders }),
  toggleShowBorders: () =>
    set((state) => ({ showBorders: !state.showBorders })),
  setActiveAxis: (activeAxis) => set({ activeAxis }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  markInteracted: () => set({ hasInteracted: true, showOnboarding: false }),
  animateToView: (view) =>
    set((state) =>
      state.isFrozen ? {} : { targetView: cloneView(view), isAnimating: true },
    ),
  applyImmediateView: (view) =>
    set({
      view: cloneView(view),
      targetView: cloneView(view),
      isAnimating: false,
    }),
  commitFrame: (view, telemetry, isAnimating) =>
    set({ view, telemetry, isAnimating }),
  setLastShareUrl: (lastShareUrl) => set({ lastShareUrl }),
  openAnimationWorkspace: ({
    playheadMs = 0,
    previewGeoView,
    previewHeadwayView,
  }) =>
    set({
      animationImportError: null,
      animationSession: {
        workspaceOpen: true,
        phase: 'idle',
        startedAtMs: null,
        playheadMs: Math.max(0, Math.round(playheadMs)),
        previewGeoView:
          previewGeoView === null
            ? null
            : previewGeoView
              ? cloneView(previewGeoView)
              : null,
        previewHeadwayView:
          previewHeadwayView === null
            ? null
            : previewHeadwayView
              ? cloneHeadwayView(previewHeadwayView)
              : null,
      },
    }),
  closeAnimationWorkspace: () =>
    set({
      animationImportError: null,
      animationSession: { ...DEFAULT_ANIMATION_SESSION },
    }),
  setAnimationDraft: (next) =>
    set((state) => {
      const draft =
        typeof next === 'function' ? next(state.animationDraft) : next;
      const normalized = normalizeAnimationTimeline(draft, draft.mode);

      persistAnimationDraft(normalized);

      return {
        animationDraft: cloneAnimationTimeline(normalized),
      };
    }),
  loadAnimationDraft: (timeline) =>
    set(() => {
      const normalized = normalizeAnimationTimeline(timeline, timeline.mode);

      persistAnimationDraft(normalized);

      return {
        animationDraft: cloneAnimationTimeline(normalized),
      };
    }),
  setAnimationImportHex: (animationImportHex) => set({ animationImportHex }),
  setAnimationImportError: (animationImportError) =>
    set({ animationImportError }),
  setAnimationPlayhead: (playheadMs) =>
    set((state) => ({
      animationSession: {
        ...state.animationSession,
        playheadMs: Math.max(0, Math.round(playheadMs)),
      },
    })),
  setAnimationPreviewViews: ({
    playheadMs,
    previewGeoView,
    previewHeadwayView,
  }) =>
    set((state) => ({
      animationSession: {
        ...state.animationSession,
        playheadMs:
          playheadMs === undefined
            ? state.animationSession.playheadMs
            : Math.max(0, Math.round(playheadMs)),
        previewGeoView:
          previewGeoView === undefined
            ? state.animationSession.previewGeoView
            : previewGeoView === null
              ? null
              : cloneView(previewGeoView),
        previewHeadwayView:
          previewHeadwayView === undefined
            ? state.animationSession.previewHeadwayView
            : previewHeadwayView === null
              ? null
              : cloneHeadwayView(previewHeadwayView),
      },
    })),
  startAnimationPlayback: ({ startedAtMs, playheadMs }) =>
    set((state) => ({
      animationSession: {
        ...state.animationSession,
        workspaceOpen: true,
        phase: 'playing',
        startedAtMs,
        playheadMs:
          playheadMs === undefined
            ? state.animationSession.playheadMs
            : Math.max(0, Math.round(playheadMs)),
      },
    })),
  stopAnimationPlayback: (input) =>
    set((state) => ({
      animationSession: {
        ...state.animationSession,
        phase: 'idle',
        startedAtMs: null,
        playheadMs:
          input?.playheadMs === undefined
            ? state.animationSession.playheadMs
            : Math.max(0, Math.round(input.playheadMs)),
      },
    })),
}));
