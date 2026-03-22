import { beforeEach, describe, expect, it } from 'vitest';
import { createDefaultAnimationTimeline } from '../lib/animation';
import { DEFAULT_VIEW, VIEWER_PRESETS } from '../lib/constants';
import { cloneView, viewsEqual } from '../lib/math';
import { useViewerStore } from './viewerStore';

const DEFAULT_HEADWAY_VIEW = {
  center: [-28, 19.5] as [number, number],
  zoom: 1.8,
  bearing: 0,
  pitch: 0,
};

const DEFAULT_BORDERS_VIEW = {
  center: [-28, 19.5] as [number, number],
  zoom: 1.8,
  bearing: 0,
  pitch: 0,
};

describe('viewerStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useViewerStore.setState({
      view: cloneView(DEFAULT_VIEW),
      targetView: cloneView(DEFAULT_VIEW),
      isAnimating: false,
      isFrozen: false,
      activeAxis: null,
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
      renderState: 'initializing',
      axisLockMode: 'free',
      compareModeState: 'off',
      selectedCountry: null,
      geoOverviewAnchor: null,
      geoOverviewHeadingDeg: 0,
      rendererTier: null,
      rendererAttempts: [],
      rendererFailureReason: null,
      rendererFailureMessage: null,
      showBorders: false,
      animationDraft: createDefaultAnimationTimeline('geo'),
      animationImportHex: '',
      animationImportError: null,
      animationSession: {
        workspaceOpen: false,
        phase: 'idle',
        startedAtMs: null,
        playheadMs: 0,
        previewGeoView: null,
        previewHeadwayView: null,
      },
    });
  });

  it('freezing clears active motion and locks the target to the current view', () => {
    useViewerStore.setState({
      targetView: cloneView(VIEWER_PRESETS[1]!.state),
      isAnimating: true,
      activeAxis: 'x',
    });

    useViewerStore.getState().setFrozen(true);
    const state = useViewerStore.getState();

    expect(state.isFrozen).toBe(true);
    expect(state.isAnimating).toBe(false);
    expect(state.activeAxis).toBeNull();
    expect(viewsEqual(state.targetView, state.view)).toBe(true);
  });

  it('does not start a new animated target while frozen', () => {
    useViewerStore.getState().setFrozen(true);
    useViewerStore.getState().animateToView(VIEWER_PRESETS[2]!.state);
    const state = useViewerStore.getState();

    expect(state.isAnimating).toBe(false);
    expect(viewsEqual(state.targetView, DEFAULT_VIEW)).toBe(true);
  });

  it('tracks render lifecycle states independently from initial capability detection', () => {
    useViewerStore.getState().setRenderState('ready');
    expect(useViewerStore.getState().renderState).toBe('ready');

    useViewerStore.getState().setRenderState('context-lost');
    expect(useViewerStore.getState().renderState).toBe('context-lost');

    useViewerStore.getState().setRenderState('recovering');
    expect(useViewerStore.getState().renderState).toBe('recovering');
  });

  it('stores and resets renderer diagnostics', () => {
    useViewerStore.getState().setRendererDiagnostics({
      tier: 'minimal',
      attemptedTiers: ['standard', 'compatibility', 'minimal'],
      reason: 'renderer-init-failed',
      message: 'All renderer tiers failed.',
    });

    expect(useViewerStore.getState().rendererTier).toBe('minimal');
    expect(useViewerStore.getState().rendererAttempts).toEqual([
      'standard',
      'compatibility',
      'minimal',
    ]);

    useViewerStore.getState().resetRendererDiagnostics();

    expect(useViewerStore.getState().rendererTier).toBeNull();
    expect(useViewerStore.getState().rendererAttempts).toEqual([]);
    expect(useViewerStore.getState().rendererFailureReason).toBeNull();
  });

  it('tracks Headway mode state independently from the Geo renderer', () => {
    useViewerStore.getState().setViewerMode('headway');
    useViewerStore.getState().setHeadwayRenderState('loading');
    useViewerStore.getState().setHeadwayView({
      center: [13, 52],
      zoom: 2.4,
      bearing: 22,
      pitch: 12,
    });

    expect(useViewerStore.getState().viewerMode).toBe('headway');
    expect(useViewerStore.getState().headwayRenderState).toBe('loading');
    expect(useViewerStore.getState().headwayView.center).toEqual([13, 52]);
  });

  it('tracks Borders mode state independently from Geo and Headway', () => {
    useViewerStore.getState().setViewerMode('borders');
    useViewerStore.getState().setBordersRenderState('loading');
    useViewerStore.getState().setBordersView({
      center: [-96, 37.8],
      zoom: 2.7,
      bearing: 14,
      pitch: 20,
    });
    useViewerStore.getState().setBordersProfileId('population');
    useViewerStore.getState().setBordersFocusedCountryIso('USA');
    useViewerStore.getState().setBordersNoticeMessage(
      'USA has no local district pack.',
    );
    useViewerStore.getState().setBordersSelectedFeature({
      iso3: 'USA',
      admLevel: 2,
      featureId: 'USA-DEMO-001',
      name: 'Demo County',
      metricValue: 12,
    });
    useViewerStore.getState().toggleShowBordersPinpoints();

    const state = useViewerStore.getState();

    expect(state.viewerMode).toBe('borders');
    expect(state.bordersRenderState).toBe('loading');
    expect(state.bordersView.center).toEqual([-96, 37.8]);
    expect(state.bordersProfileId).toBe('population');
    expect(state.bordersFocusedCountryIso).toBe('USA');
    expect(state.bordersNoticeMessage).toBe('USA has no local district pack.');
    expect(state.bordersSelectedFeature?.name).toBe('Demo County');
    expect(state.showBordersPinpoints).toBe(false);
  });

  it('defaults Geo drag mode to free orbit and can toggle axis lock', () => {
    expect(useViewerStore.getState().axisLockMode).toBe('free');

    useViewerStore.getState().toggleAxisLock();
    expect(useViewerStore.getState().axisLockMode).toBe('axis-lock');

    useViewerStore.getState().setAxisLockMode('free');
    expect(useViewerStore.getState().axisLockMode).toBe('free');
  });

  it('tracks compare mode transitions and pinned country state', () => {
    useViewerStore.getState().armCountryCompare();
    expect(useViewerStore.getState().compareModeState).toBe('armed');

    useViewerStore.getState().pinCountry({
      id: '076',
      name: 'Brazil',
      centroid: [-54, -10],
    });
    expect(useViewerStore.getState().compareModeState).toBe('pinned');
    expect(useViewerStore.getState().selectedCountry?.name).toBe('Brazil');

    useViewerStore.getState().clearPinnedCountry();
    expect(useViewerStore.getState().compareModeState).toBe('armed');
    expect(useViewerStore.getState().selectedCountry).toBeNull();
  });

  it('disables compare and clears the pinned country', () => {
    useViewerStore.getState().pinCountry({
      id: '076',
      name: 'Brazil',
      centroid: [-54, -10],
    });

    useViewerStore.getState().disableCountryCompare();

    expect(useViewerStore.getState().compareModeState).toBe('off');
    expect(useViewerStore.getState().selectedCountry).toBeNull();
  });

  it('stores and clears transient Geo overview session state', () => {
    useViewerStore.getState().setGeoOverviewAnchor({
      lat: 12.5,
      lon: -43.25,
    });
    useViewerStore.getState().setGeoOverviewHeading(27);

    expect(useViewerStore.getState().geoOverviewAnchor).toEqual({
      lat: 12.5,
      lon: -43.25,
    });
    expect(useViewerStore.getState().geoOverviewHeadingDeg).toBe(27);

    useViewerStore.getState().clearGeoOverviewState();

    expect(useViewerStore.getState().geoOverviewAnchor).toBeNull();
    expect(useViewerStore.getState().geoOverviewHeadingDeg).toBe(0);
  });

  it('opens and closes an animation workspace session', () => {
    useViewerStore.getState().openAnimationWorkspace({
      playheadMs: 300,
      previewGeoView: DEFAULT_VIEW,
    });

    expect(useViewerStore.getState().animationSession.workspaceOpen).toBe(true);
    expect(useViewerStore.getState().animationSession.playheadMs).toBe(300);
    expect(useViewerStore.getState().animationSession.previewGeoView).toMatchObject(
      DEFAULT_VIEW,
    );

    useViewerStore.getState().closeAnimationWorkspace();

    expect(useViewerStore.getState().animationSession.workspaceOpen).toBe(false);
    expect(useViewerStore.getState().animationSession.previewGeoView).toBeNull();
  });

  it('stores normalized animation drafts and autosaves them', () => {
    useViewerStore.getState().setAnimationDraft({
      version: 2,
      mode: 'geo',
      totalDurationMs: 16_000,
      startGeoView: DEFAULT_VIEW,
      startHeadwayView: null,
      blocks: [
        {
          id: 'block-1',
          command: 'lr-',
          startMs: 2_000,
          endMs: 4_000,
          amount: 124,
          acceleration: 1.4,
          enabled: true,
        },
      ],
    });

    expect(useViewerStore.getState().animationDraft.blocks[0]?.acceleration).toBe(1);
    expect(window.localStorage.getItem('geo:animation-draft:geo')).toBeTruthy();
  });

  it('tracks playhead, preview, and playback state inside a workspace session', () => {
    useViewerStore.getState().openAnimationWorkspace({
      previewGeoView: DEFAULT_VIEW,
    });
    useViewerStore.getState().setAnimationPlayhead(250);

    expect(useViewerStore.getState().animationSession.playheadMs).toBe(250);

    useViewerStore.getState().setAnimationPreviewViews({
      previewGeoView: VIEWER_PRESETS[1]!.state,
    });

    expect(useViewerStore.getState().animationSession.previewGeoView).toMatchObject(
      VIEWER_PRESETS[1]!.state,
    );

    useViewerStore.getState().startAnimationPlayback({
      startedAtMs: 100,
      playheadMs: 250,
    });

    expect(useViewerStore.getState().animationSession.phase).toBe('playing');
    expect(useViewerStore.getState().animationSession.workspaceOpen).toBe(true);

    useViewerStore.getState().stopAnimationPlayback({ playheadMs: 900 });

    expect(useViewerStore.getState().animationSession.phase).toBe('idle');
    expect(useViewerStore.getState().animationSession.playheadMs).toBe(900);
    expect(useViewerStore.getState().animationSession.workspaceOpen).toBe(true);
  });
});
