import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import {
  createDefaultAnimationTimeline,
  serializeAnimationTimeline,
} from '../lib/animation';
import { getAllCountries } from '../lib/countryGeometry';
import {
  COMPARE_MAX_DISTANCE,
  DEFAULT_VIEW,
  viewFromLatLon,
} from '../lib/constants';
import { cloneView } from '../lib/math';
import { useViewerStore } from '../state/viewerStore';

const encodeHex = (value: string) =>
  Array.from(new TextEncoder().encode(value), (byte) =>
    byte.toString(16).padStart(2, '0').toUpperCase(),
  ).join('');

const compareCountry = getAllCountries()[0]!;
const createSelectedCountry = () => ({
  id: compareCountry.id,
  name: compareCountry.name,
  centroid: [...compareCountry.centroid] as [number, number],
});

vi.mock('../lib/bordersData', () => ({
  loadBordersCountryIndex: vi.fn(async () => [
    {
      iso3: 'USA',
      name: 'United States',
      region: 'North America',
      hasAdm1: true,
      hasAdm2: true,
    },
  ]),
  getBordersCountryName: (
    countryIndex: Array<{ iso3: string; name: string }> | null,
    iso3: string | null,
  ) => countryIndex?.find((record) => record.iso3 === iso3)?.name ?? null,
  formatBordersSelectionValue: (_profileId: string, value: number | null) =>
    value == null ? 'Unavailable' : value.toString(),
}));

vi.mock('../components/BordersLegend', () => ({
  BordersLegend: ({
    profileId,
    focusedCountryIso,
    focusedCountryName,
    noticeMessage,
  }: {
    profileId: 'gdp' | 'population' | 'hierarchy';
    focusedCountryIso: string | null;
    focusedCountryName: string | null;
    noticeMessage: string | null;
  }) => (
    <div data-testid="borders-legend">
      <span>{`Legend ${profileId}`}</span>
      <span>
        {focusedCountryIso
          ? `Legend focus ${focusedCountryName ?? focusedCountryIso}`
          : 'Legend focus none'}
      </span>
      <span>{noticeMessage ?? 'Legend note clear'}</span>
    </div>
  ),
}));

vi.mock('../scene/GlobeCanvas', () => ({
  GlobeCanvas: ({
    onContextLost,
    onContextRestored,
    onRendererFailed,
    onCountryPick,
    quality,
    showBorders,
    isFrozen,
  }: {
    onContextLost: () => void;
    onContextRestored: () => void;
    onRendererFailed: (failure: {
      tier: 'standard' | 'compatibility' | 'minimal' | null;
      attemptedTiers: ('standard' | 'compatibility' | 'minimal')[];
      reason:
        | 'canvas-fallback'
        | 'renderer-init-failed'
        | 'context-lost'
        | null;
      message: string | null;
    }) => void;
    onCountryPick: (country: {
      id: string;
      name: string;
      centroid: [number, number];
    }) => void;
    quality: 'performance' | 'balanced' | 'high';
    showBorders: boolean;
    isFrozen: boolean;
  }) => (
    <div data-testid="globe-canvas">
      <span>{`Quality ${quality}`}</span>
      <button onClick={onContextLost} type="button">
        Simulate context loss
      </button>
      <button onClick={onContextRestored} type="button">
        Simulate context restore
      </button>
      <button
        onClick={() =>
          onRendererFailed({
            tier: 'minimal',
            attemptedTiers: ['standard', 'compatibility', 'minimal'],
            reason: 'renderer-init-failed',
            message: 'All renderer tiers failed.',
          })
        }
        type="button"
      >
        Simulate renderer failure
      </button>
      <button
        onClick={() =>
          onCountryPick({
            id: compareCountry.id,
            name: compareCountry.name,
            centroid: [...compareCountry.centroid] as [number, number],
          })
        }
        type="button"
      >
        Simulate country pick
      </button>
      <span>{showBorders ? 'Borders enabled' : 'Borders disabled'}</span>
      <span>{isFrozen ? 'Frozen' : 'Live'}</span>
    </div>
  ),
}));

vi.mock('../scene/HeadwayMap', () => ({
  HeadwayMap: ({
    view,
    quality,
    headwayLayoutLook,
    headwayLayerVisibility,
    shellMode,
    showBorders,
    isFrozen,
    axisLockMode,
    onReady,
    onError,
    onViewChange,
  }: {
    view: {
      center: [number, number];
      zoom: number;
      bearing: number;
      pitch: number;
    };
    quality: 'performance' | 'balanced' | 'high';
    headwayLayoutLook:
      | 'mission'
      | 'daylight'
      | 'atlas'
      | 'blueprint'
      | 'mono'
      | 'transit';
    headwayLayerVisibility: {
      roads: boolean;
      parks: boolean;
      buildings: boolean;
      placeLabels: boolean;
      pois: boolean;
    };
    shellMode: 'dual-rail' | 'single-rail' | 'drawer';
    showBorders: boolean;
    isFrozen: boolean;
    axisLockMode: 'free' | 'axis-lock';
    onReady: () => void;
    onError: (message: string) => void;
    onViewChange: (view: {
      center: [number, number];
      zoom: number;
      bearing: number;
      pitch: number;
    }) => void;
  }) => (
    <div data-testid="headway-map">
      <span>{`Headway ${view.center[1].toFixed(1)},${view.center[0].toFixed(1)} @ ${view.zoom.toFixed(1)}`}</span>
      <span>{`Headway quality ${quality}`}</span>
      <span>{`Headway look ${headwayLayoutLook}`}</span>
      <span>{`Headway roads ${headwayLayerVisibility.roads ? 'on' : 'off'}`}</span>
      <span>{`Headway shell ${shellMode}`}</span>
      <span>
        {showBorders ? 'Headway borders enabled' : 'Headway borders disabled'}
      </span>
      <span>{isFrozen ? 'Headway frozen' : 'Headway live'}</span>
      <span>
        {axisLockMode === 'axis-lock' ? 'Headway axis lock' : 'Headway free'}
      </span>
      <button onClick={onReady} type="button">
        Simulate headway ready
      </button>
      <button onClick={() => onError('Headway boot failed.')} type="button">
        Simulate headway error
      </button>
      <button
        onClick={() =>
          onViewChange({
            center: [13, 52],
            zoom: 2.4,
            bearing: 22,
            pitch: 12,
          })
        }
        type="button"
      >
        Move headway map
      </button>
    </div>
  ),
}));

vi.mock('../scene/BordersMap', () => ({
  BordersMap: ({
    view,
    profileId,
    focusedCountryIso,
    selectedFeature,
    showPinpoints,
    quality,
    shellMode,
    isFrozen,
    axisLockMode,
    onReady,
    onError,
    onNotice,
    onViewChange,
    onFocusCountry,
    onSelectFeature,
  }: {
    view: {
      center: [number, number];
      zoom: number;
      bearing: number;
      pitch: number;
    };
    profileId: 'gdp' | 'population' | 'hierarchy';
    focusedCountryIso: string | null;
    selectedFeature: { name: string } | null;
    showPinpoints: boolean;
    quality: 'performance' | 'balanced' | 'high';
    shellMode: 'dual-rail' | 'single-rail' | 'drawer';
    isFrozen: boolean;
    axisLockMode: 'free' | 'axis-lock';
    onReady: () => void;
    onError: (message: string) => void;
    onNotice: (message: string | null) => void;
    onViewChange: (view: {
      center: [number, number];
      zoom: number;
      bearing: number;
      pitch: number;
    }) => void;
    onFocusCountry: (iso3: string | null) => void;
    onSelectFeature: (
      feature: {
        iso3: string;
        admLevel: 2;
        featureId: string;
        name: string;
        metricValue: number | null;
      } | null,
    ) => void;
  }) => (
    <div data-testid="borders-map">
      <span>{`Borders ${view.center[1].toFixed(1)},${view.center[0].toFixed(1)} @ ${view.zoom.toFixed(1)}`}</span>
      <span>{`Borders profile ${profileId}`}</span>
      <span>{`Borders quality ${quality}`}</span>
      <span>{`Borders shell ${shellMode}`}</span>
      <span>
        {showPinpoints ? 'Borders pinpoints on' : 'Borders pinpoints off'}
      </span>
      <span>
        {focusedCountryIso
          ? `Borders focus ${focusedCountryIso}`
          : 'Borders focus none'}
      </span>
      <span>
        {selectedFeature
          ? `Borders selected ${selectedFeature.name}`
          : 'Borders selected none'}
      </span>
      <span>{isFrozen ? 'Borders frozen' : 'Borders live'}</span>
      <span>
        {axisLockMode === 'axis-lock' ? 'Borders axis lock' : 'Borders free'}
      </span>
      <button onClick={onReady} type="button">
        Simulate borders ready
      </button>
      <button onClick={() => onError('Borders boot failed.')} type="button">
        Simulate borders error
      </button>
      <button
        onClick={() => onNotice('USA has no local district pack.')}
        type="button"
      >
        Emit borders notice
      </button>
      <button
        onClick={() =>
          onViewChange({
            center: [10, 48],
            zoom: 3.4,
            bearing: 18,
            pitch: 20,
          })
        }
        type="button"
      >
        Move borders map
      </button>
      <button onClick={() => onFocusCountry('USA')} type="button">
        Focus USA
      </button>
      <button
        onClick={() =>
          onSelectFeature({
            iso3: 'USA',
            admLevel: 2,
            featureId: 'USA-DEMO-001',
            name: 'Demo County',
            metricValue: 12,
          })
        }
        type="button"
      >
        Select county
      </button>
    </div>
  ),
}));

vi.mock('../lib/countryProjection', () => ({
  projectCountryOutlineToViewport: vi.fn(() => ({
    path: 'M100 100 L220 140 L170 220',
    bounds: {
      left: 100,
      top: 100,
      right: 220,
      bottom: 220,
    },
    hasVisibleGeometry: true,
  })),
}));

describe('App', () => {
  const setViewport = (width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: width,
      writable: true,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: height,
      writable: true,
    });
    window.dispatchEvent(new Event('resize'));
  };

  const openAnimationSection = () => {
    const toggle = screen.getByRole('button', {
      name: /toggle animation section/i,
    });

    if (toggle.getAttribute('aria-expanded') !== 'true') {
      fireEvent.click(toggle);
    }
  };

  beforeEach(() => {
    vi.useRealTimers();
    vi.stubEnv('MODE', 'pages');
    setViewport(1600, 900);
    window.history.replaceState({}, '', '/Geo/');
    window.localStorage.clear();
    useViewerStore.setState({
      loadState: 'ready',
      renderState: 'ready',
      viewerMode: 'geo',
      view: cloneView(DEFAULT_VIEW),
      targetView: cloneView(DEFAULT_VIEW),
      headwayView: {
        center: [-28, 19.5],
        zoom: 1.8,
        bearing: 0,
        pitch: 0,
      },
      headwayRenderState: 'idle',
      headwayErrorMessage: null,
      bordersView: {
        center: [-28, 19.5],
        zoom: 1.8,
        bearing: 0,
        pitch: 0,
      },
      bordersRenderState: 'idle',
      bordersErrorMessage: null,
      bordersNoticeMessage: null,
      bordersProfileId: 'gdp',
      bordersFocusedCountryIso: null,
      bordersSelectedFeature: null,
      showBordersPinpoints: true,
      rendererTier: null,
      rendererAttempts: [],
      rendererFailureReason: null,
      rendererFailureMessage: null,
      quality: 'balanced',
      headwayLayoutLook: 'mission',
      headwayLayerVisibility: {
        roads: true,
        parks: true,
        buildings: true,
        placeLabels: true,
        pois: true,
      },
      axisLockMode: 'free',
      compareModeState: 'off',
      selectedCountry: null,
      showOnboarding: false,
      isFrozen: false,
      showBorders: false,
      activeAxis: null,
      errorMessage: null,
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

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('renders the dual-rail monitor shell with open rails and expanded control dock sections', () => {
    render(<App />);

    expect(document.querySelector('.app-shell--dual-rail')).not.toBeNull();
    expect(document.querySelector('.overlay-shell--monitor')).not.toBeNull();
    expect(document.querySelector('.overlay-rail--left')).not.toBeNull();
    expect(document.querySelector('.overlay-rail--right')).not.toBeNull();
    expect(screen.getByLabelText(/viewer overview/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/viewer controls/i)).toBeInTheDocument();
    expect(screen.getByTestId('globe-canvas')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /open status rail/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /open control rail/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /toggle motion section/i }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('button', { name: /toggle animation section/i }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('button', { name: /toggle viewpoints section/i }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('button', { name: /open editor/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^play$/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /minimize status rail/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /minimize control rail/i }),
    ).toBeInTheDocument();
  });

  it('renders a single-rail shell with the control rail open by default', () => {
    setViewport(1366, 768);
    render(<App />);

    expect(document.querySelector('.app-shell--single-rail')).not.toBeNull();
    expect(document.querySelector('.overlay-shell--monitor')).not.toBeNull();
    expect(
      screen.queryByRole('button', { name: /open status rail/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /open control rail/i }),
    ).not.toBeInTheDocument();
    expect(document.querySelector('.overlay-rail--right')).toHaveClass(
      'overlay-rail--open',
    );
    expect(document.querySelector('.overlay-rail--left')).toHaveClass(
      'overlay-rail--open',
    );
    expect(
      screen.getByRole('button', { name: /close control rail/i }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /close control rail/i }),
    );
    expect(document.querySelector('.overlay-rail--right')).toHaveClass(
      'overlay-rail--collapsed',
    );
    expect(
      screen.getByRole('button', { name: /open control rail/i }),
    ).toBeInTheDocument();
  });

  it('renders the mobile shell with edge tabs and opens one panel at a time', () => {
    setViewport(390, 844);
    render(<App />);

    expect(document.querySelector('.app-shell--drawer')).not.toBeNull();
    expect(document.querySelector('.overlay-shell--mobile')).not.toBeNull();
    fireEvent.click(
      document.querySelector('.overlay-tab--right') as HTMLElement,
    );
    expect(screen.getByLabelText(/viewer controls/i)).toBeInTheDocument();
    expect(document.querySelector('.overlay-rail--right')).toHaveClass(
      'overlay-rail--open',
    );
    expect(document.querySelector('.overlay-tab--right')).toBeNull();
    expect(document.querySelector('.overlay-tab--left')).not.toBeNull();
    expect(
      screen.getByRole('button', { name: /toggle animation section/i }),
    ).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(
      document.querySelector('.overlay-tab--left') as HTMLElement,
    );
    expect(screen.getByText(/explore\. learn\. create\./i)).toBeInTheDocument();
    expect(document.querySelector('.overlay-rail--left')).toHaveClass(
      'overlay-rail--open',
    );
    expect(document.querySelector('.overlay-rail--right')).toHaveClass(
      'overlay-rail--collapsed',
    );
    expect(document.querySelector('.overlay-tab--left')).toBeNull();
    expect(document.querySelector('.overlay-tab--right')).not.toBeNull();
  });

  it('keeps the control rail open by default for non-mobile drawer layouts', () => {
    setViewport(900, 1200);
    render(<App />);

    expect(document.querySelector('.app-shell--drawer')).not.toBeNull();
    expect(document.querySelector('.overlay-shell--tablet')).not.toBeNull();
    expect(document.querySelector('.overlay-rail--right')).toHaveClass(
      'overlay-rail--open',
    );
    expect(document.querySelector('.overlay-rail--left')).toHaveClass(
      'overlay-rail--open',
    );
    expect(document.querySelector('.overlay-tab--left')).toBeNull();
    expect(document.querySelector('.overlay-tab--right')).toBeNull();
  });

  it('updates the Geo compare button label across off, armed, and pinned states', () => {
    render(<App />);

    expect(screen.queryByTestId('country-compare-overlay')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /^compare$/i }));
    expect(
      screen.getByRole('button', { name: /pick country/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('country-compare-armed')).toBeInTheDocument();

    act(() => {
      useViewerStore.getState().pinCountry(createSelectedCountry());
    });

    expect(
      screen.getByRole('button', { name: /compare active/i }),
    ).toBeInTheDocument();
  });

  it('cancels armed compare from the overlay and returns to off', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /^compare$/i }));
    fireEvent.click(
      screen.getByRole('button', { name: /cancel compare mode/i }),
    );

    expect(useViewerStore.getState().compareModeState).toBe('off');
    expect(screen.queryByTestId('country-compare-overlay')).toBeNull();
    expect(
      screen.getByRole('button', { name: /^compare$/i }),
    ).toBeInTheDocument();
  });

  it('disables compare in Headway and clears any pinned country on mode switch', () => {
    useViewerStore.setState({
      compareModeState: 'pinned',
      selectedCountry: createSelectedCountry(),
    });

    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /headway/i }));

    expect(useViewerStore.getState().compareModeState).toBe('off');
    expect(useViewerStore.getState().selectedCountry).toBeNull();
    expect(
      screen.getByRole('button', { name: /compare \(geo only\)/i }),
    ).toBeDisabled();
  });

  it('switches into Borders mode, exposes profile controls, and disables animation tools', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('tab', { name: /borders/i }));
    openAnimationSection();

    expect(screen.getByTestId('borders-map')).toBeInTheDocument();
    expect(screen.getByTestId('borders-legend')).toBeInTheDocument();
    expect(screen.getByText(/borders profile gdp/i)).toBeInTheDocument();
    expect(
      screen.getByText(/borders animation is not part of v1/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open editor/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^play$/i })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /compare \(geo only\)/i }),
    ).toBeDisabled();
  });

  it('preserves the Borders camera when switching away and back', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('tab', { name: /borders/i }));
    fireEvent.click(screen.getByRole('button', { name: /move borders map/i }));
    fireEvent.click(screen.getByRole('tab', { name: /headway/i }));
    fireEvent.click(screen.getByRole('tab', { name: /borders/i }));

    expect(useViewerStore.getState().bordersView.center).toEqual([10, 48]);
    expect(useViewerStore.getState().bordersView.zoom).toBeCloseTo(3.4, 3);
    expect(screen.getByText(/borders 48\.0,10\.0 @ 3\.4/i)).toBeInTheDocument();
  });

  it('shows Borders focus names and soft notices in the HUD rail', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('tab', { name: /borders/i }));
    fireEvent.click(screen.getByRole('button', { name: /focus usa/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/focus: united states \(usa\)/i),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole('button', { name: /emit borders notice/i }),
    );

    expect(
      screen.getAllByText(/usa has no local district pack\./i)[0],
    ).toBeInTheDocument();
    expect(useViewerStore.getState().bordersNoticeMessage).toBe(
      'USA has no local district pack.',
    );
  });

  it('releases the pinned compare outline and returns to armed mode', () => {
    useViewerStore.setState({
      compareModeState: 'pinned',
      selectedCountry: createSelectedCountry(),
    });

    render(<App />);

    expect(screen.getByTestId('country-compare-overlay')).toBeInTheDocument();
    expect(screen.queryByText(/centered and pinned/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/live compare outline\. drag and zoom stay active\./i),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /release outline for/i }),
    );

    expect(useViewerStore.getState().compareModeState).toBe('armed');
    expect(useViewerStore.getState().selectedCountry).toBeNull();
    expect(screen.getByTestId('country-compare-armed')).toBeInTheDocument();
  });

  it('exits compare completely from the pinned overlay done action', () => {
    useViewerStore.setState({
      compareModeState: 'pinned',
      selectedCountry: createSelectedCountry(),
    });

    render(<App />);

    fireEvent.click(
      screen.getByRole('button', { name: /done with compare mode/i }),
    );

    expect(useViewerStore.getState().compareModeState).toBe('off');
    expect(useViewerStore.getState().selectedCountry).toBeNull();
    expect(screen.queryByTestId('country-compare-overlay')).toBeNull();
  });

  it('pins compare without recentering the globe and only clamps distance into the compare band', () => {
    const initialView = viewFromLatLon(18, -30, 4.4, 12);

    useViewerStore.setState({
      view: cloneView(initialView),
      targetView: cloneView(initialView),
      compareModeState: 'armed',
      selectedCountry: null,
    });

    render(<App />);

    fireEvent.click(
      screen.getByRole('button', { name: /simulate country pick/i }),
    );

    const nextView = useViewerStore.getState().view;
    const targetView = useViewerStore.getState().targetView;

    expect(useViewerStore.getState().compareModeState).toBe('pinned');
    expect(useViewerStore.getState().selectedCountry?.id).toBe(
      compareCountry.id,
    );
    expect(useViewerStore.getState().geoOverviewAnchor).toBeNull();
    expect(nextView.distance).toBeCloseTo(COMPARE_MAX_DISTANCE, 6);
    expect(targetView).toEqual(nextView);
  });

  it('keeps pinned compare active while the overlay renders and buttons remain usable', () => {
    useViewerStore.setState({
      compareModeState: 'pinned',
      selectedCountry: createSelectedCountry(),
      isFrozen: false,
    });

    render(<App />);

    expect(screen.getByTestId('country-compare-overlay')).toBeInTheDocument();
    expect(useViewerStore.getState().compareModeState).toBe('pinned');
    expect(useViewerStore.getState().isFrozen).toBe(false);

    fireEvent.click(
      screen.getByRole('button', { name: /release outline for/i }),
    );

    expect(useViewerStore.getState().compareModeState).toBe('armed');

    act(() => {
      useViewerStore.getState().pinCountry(createSelectedCountry());
    });

    fireEvent.click(
      screen.getByRole('button', { name: /done with compare mode/i }),
    );

    expect(useViewerStore.getState().compareModeState).toBe('off');
    expect(useViewerStore.getState().isFrozen).toBe(false);
  });

  it('opens the animation workspace from the control dock', () => {
    render(<App />);

    openAnimationSection();
    fireEvent.click(screen.getByRole('button', { name: /open editor/i }));

    expect(screen.getByLabelText(/animation workspace/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/animation workspace/i)).toHaveClass(
      'animation-workspace--bounded',
    );
    expect(screen.queryByLabelText(/viewer controls/i)).toBeNull();
    expect(
      screen.getByRole('button', { name: /play from playhead/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole('spinbutton', { name: /latitude/i }),
    ).toBeInTheDocument();
  });

  it('opens the animation workspace in stacked mode for short landscape viewports', () => {
    setViewport(844, 390);
    render(<App />);

    openAnimationSection();
    fireEvent.click(screen.getByRole('button', { name: /open editor/i }));

    expect(screen.getByLabelText(/animation workspace/i)).toHaveClass(
      'animation-workspace--stacked',
    );
  });

  it('opens the workspace from the stored draft start pose instead of the live view', () => {
    const storedStartView = viewFromLatLon(22, 13, 2.9);
    const liveView = viewFromLatLon(-34, -120, 3.9);

    useViewerStore.setState({
      view: cloneView(liveView),
      targetView: cloneView(liveView),
      animationDraft: {
        ...createDefaultAnimationTimeline('geo'),
        startGeoView: storedStartView,
      },
    });

    render(<App />);
    openAnimationSection();
    fireEvent.click(screen.getByRole('button', { name: /open editor/i }));

    expect(
      useViewerStore.getState().animationSession.previewGeoView,
    ).not.toBeNull();
    expect(
      useViewerStore.getState().animationSession.previewGeoView?.distance,
    ).toBeCloseTo(storedStartView.distance, 6);
    expect(
      useViewerStore.getState().animationSession.previewGeoView?.fov,
    ).toBeCloseTo(storedStartView.fov, 6);
    expect(
      useViewerStore.getState().animationSession.previewGeoView?.rotation[0] ??
        0,
    ).toBeCloseTo(storedStartView.rotation[0], 6);
    expect(
      useViewerStore.getState().animationSession.previewGeoView,
    ).not.toMatchObject(liveView);
  });

  it('shows an inline error for invalid animation hex inside the workspace', () => {
    render(<App />);

    openAnimationSection();
    fireEvent.click(screen.getByRole('button', { name: /open editor/i }));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'BAD' },
    });
    fireEvent.click(screen.getByRole('button', { name: /load hex/i }));

    expect(screen.getByText(/invalid animation hex/i)).toBeInTheDocument();
  });

  it('loads a Headway draft from imported animation hex and switches modes', () => {
    const headwayHex = serializeAnimationTimeline({
      ...createDefaultAnimationTimeline('headway'),
      totalDurationMs: 8_000,
      blocks: [
        {
          id: 'block-1',
          command: 'yaw+',
          startMs: 0,
          endMs: 2_000,
          amount: 10,
          acceleration: 0.4,
          enabled: true,
        },
      ],
    });

    render(<App />);

    openAnimationSection();
    fireEvent.click(screen.getByRole('button', { name: /open editor/i }));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: headwayHex },
    });
    fireEvent.click(screen.getByRole('button', { name: /load hex/i }));

    expect(screen.getByLabelText(/animation workspace/i)).toBeInTheDocument();
    expect(useViewerStore.getState().viewerMode).toBe('headway');
    expect(useViewerStore.getState().animationDraft.mode).toBe('headway');
  });

  it('passes the active shell mode into Headway when compact navigation is needed', () => {
    setViewport(1024, 768);
    render(<App />);

    fireEvent.click(screen.getByRole('tab', { name: /headway/i }));

    expect(screen.getByText(/headway shell single-rail/i)).toBeInTheDocument();
  });

  it('lets Headway switch between multiple layout looks from the control dock', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('tab', { name: /headway/i }));
    fireEvent.click(
      within(screen.getByRole('region', { name: 'Layout section' })).getByRole(
        'button',
        { name: /atlas/i },
      ),
    );

    expect(useViewerStore.getState().headwayLayoutLook).toBe('atlas');
    expect(screen.getByText(/headway look atlas/i)).toBeInTheDocument();
  });

  it('lets Headway toggle map layers from the control dock', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('tab', { name: /headway/i }));
    fireEvent.click(screen.getByRole('button', { name: /^roads$/i }));

    expect(useViewerStore.getState().headwayLayerVisibility.roads).toBe(false);
    expect(screen.getByText(/headway roads off/i)).toBeInTheDocument();
  });

  it('upgrades imported version 1 animation hex to a version 2 draft with a default start pose', () => {
    const legacyHex = encodeHex(
      JSON.stringify({
        v: 1,
        m: 'geo',
        t: 8_000,
        b: [
          {
            k: 'yaw+',
            s: 0,
            e: 2_000,
            q: 10,
            a: 0.4,
            x: 1,
          },
        ],
      }),
    );

    render(<App />);
    openAnimationSection();
    fireEvent.click(screen.getByRole('button', { name: /open editor/i }));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: legacyHex },
    });
    fireEvent.click(screen.getByRole('button', { name: /load hex/i }));

    expect(useViewerStore.getState().animationDraft.version).toBe(2);
    expect(
      useViewerStore.getState().animationDraft.startGeoView,
    ).not.toBeNull();
  });

  it('hides the shell during playback and returns to the workspace when playback finishes', async () => {
    vi.useFakeTimers();
    window.localStorage.setItem(
      'geo:animation-draft:geo',
      serializeAnimationTimeline({
        ...createDefaultAnimationTimeline('geo'),
        totalDurationMs: 100,
        blocks: [
          {
            id: 'block-1',
            command: 'yaw+',
            startMs: 0,
            endMs: 100,
            amount: 10,
            acceleration: 0.2,
            enabled: true,
          },
        ],
      }),
    );

    render(<App />);
    openAnimationSection();
    fireEvent.click(screen.getByRole('button', { name: /^play$/i }));

    expect(screen.queryByLabelText(/viewer controls/i)).toBeNull();
    expect(screen.queryByLabelText(/animation workspace/i)).toBeNull();
    expect(
      screen.getByLabelText(/animation playback overlay/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /stop playback/i }),
    ).toBeVisible();

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByLabelText(/animation workspace/i)).toBeInTheDocument();
    expect(useViewerStore.getState().animationSession.phase).toBe('idle');
  });

  it('returns to the workspace when playback is aborted with Escape', () => {
    window.localStorage.setItem(
      'geo:animation-draft:geo',
      serializeAnimationTimeline({
        ...createDefaultAnimationTimeline('geo'),
        totalDurationMs: 500,
        blocks: [
          {
            id: 'block-1',
            command: 'yaw+',
            startMs: 0,
            endMs: 500,
            amount: 10,
            acceleration: 0.2,
            enabled: true,
          },
        ],
      }),
    );

    render(<App />);
    openAnimationSection();
    fireEvent.click(screen.getByRole('button', { name: /^play$/i }));
    expect(
      screen.getByLabelText(/animation playback overlay/i),
    ).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.getByLabelText(/animation workspace/i)).toBeInTheDocument();
    expect(useViewerStore.getState().animationSession.phase).toBe('idle');
  });

  it('shows the playback overlay stop control and returns to the workspace when clicked', () => {
    window.localStorage.setItem(
      'geo:animation-draft:geo',
      serializeAnimationTimeline({
        ...createDefaultAnimationTimeline('geo'),
        totalDurationMs: 500,
        blocks: [
          {
            id: 'block-1',
            command: 'yaw+',
            startMs: 0,
            endMs: 500,
            amount: 10,
            acceleration: 0.2,
            enabled: true,
          },
        ],
      }),
    );

    render(<App />);
    openAnimationSection();
    fireEvent.click(screen.getByRole('button', { name: /^play$/i }));
    fireEvent.click(screen.getByRole('button', { name: /stop playback/i }));

    expect(screen.getByLabelText(/animation workspace/i)).toBeInTheDocument();
    expect(useViewerStore.getState().animationSession.phase).toBe('idle');
  });

  it('closes the workspace and restores the fallback UI when the renderer fails', async () => {
    render(<App />);

    openAnimationSection();
    fireEvent.click(screen.getByRole('button', { name: /open editor/i }));
    fireEvent.click(
      screen.getByRole('button', { name: /simulate renderer failure/i }),
    );

    await waitFor(() => {
      expect(screen.queryByLabelText(/animation workspace/i)).toBeNull();
    });

    expect(
      screen.getByRole('heading', {
        name: /3d renderer unavailable right now/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/viewer controls/i)).toBeInTheDocument();
  });
});
