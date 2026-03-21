import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import {
  createDefaultAnimationTimeline,
  serializeAnimationTimeline,
} from '../lib/animation';
import { getAllCountries } from '../lib/countryGeometry';
import { DEFAULT_VIEW, viewFromLatLon } from '../lib/constants';
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

vi.mock('../scene/GlobeCanvas', () => ({
  GlobeCanvas: ({
    onContextLost,
    onContextRestored,
    onRendererFailed,
    quality,
    showBorders,
    isFrozen,
  }: {
    onContextLost: () => void;
    onContextRestored: () => void;
    onRendererFailed: (failure: {
      tier: 'standard' | 'compatibility' | 'minimal' | null;
      attemptedTiers: ('standard' | 'compatibility' | 'minimal')[];
      reason: 'canvas-fallback' | 'renderer-init-failed' | 'context-lost' | null;
      message: string | null;
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
      <span>{showBorders ? 'Borders enabled' : 'Borders disabled'}</span>
      <span>{isFrozen ? 'Frozen' : 'Live'}</span>
    </div>
  ),
}));

vi.mock('../scene/HeadwayMap', () => ({
  HeadwayMap: ({
    view,
    quality,
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
      <span>{showBorders ? 'Headway borders enabled' : 'Headway borders disabled'}</span>
      <span>{isFrozen ? 'Headway frozen' : 'Headway live'}</span>
      <span>{axisLockMode === 'axis-lock' ? 'Headway axis lock' : 'Headway free'}</span>
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
      rendererTier: null,
      rendererAttempts: [],
      rendererFailureReason: null,
      rendererFailureMessage: null,
      quality: 'balanced',
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

  it('renders the monitor shell with open overlay rails and the animation launcher', () => {
    render(<App />);

    expect(document.querySelector('.overlay-shell--monitor')).not.toBeNull();
    expect(document.querySelector('.overlay-rail--left')).not.toBeNull();
    expect(document.querySelector('.overlay-rail--right')).not.toBeNull();
    expect(screen.getByLabelText(/viewer overview/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/viewer controls/i)).toBeInTheDocument();
    expect(screen.getByTestId('globe-canvas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open editor/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^play$/i })).toBeDisabled();
    expect(screen.getByText(/geo timeline/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /minimize status rail/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /minimize control rail/i })).toBeInTheDocument();
  });

  it('renders the tablet shell with collapsed overlay tabs', () => {
    setViewport(1024, 768);
    render(<App />);

    expect(document.querySelector('.overlay-shell--tablet')).not.toBeNull();
    expect(document.querySelector('.overlay-tab--left')).not.toBeNull();
    expect(document.querySelector('.overlay-tab--right')).not.toBeNull();
    expect(document.querySelector('.overlay-rail--open')).toBeNull();
  });

  it('renders the mobile shell with edge tabs and opens one panel at a time', () => {
    setViewport(390, 844);
    render(<App />);

    expect(document.querySelector('.overlay-shell--mobile')).not.toBeNull();
    fireEvent.click(document.querySelector('.overlay-tab--right') as HTMLElement);
    expect(screen.getByLabelText(/viewer controls/i)).toBeInTheDocument();
    expect(document.querySelector('.overlay-rail--right')).toHaveClass('overlay-rail--open');
    fireEvent.click(document.querySelector('.overlay-tab--left') as HTMLElement);
    expect(screen.getByText(/3d earth navigation/i)).toBeInTheDocument();
    expect(document.querySelector('.overlay-rail--left')).toHaveClass('overlay-rail--open');
    expect(document.querySelector('.overlay-rail--right')).toHaveClass('overlay-rail--collapsed');
  });

  it('updates the Geo compare button label across off, armed, and pinned states', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /^compare$/i }));
    expect(screen.getByRole('button', { name: /pick country/i })).toBeInTheDocument();

    act(() => {
      useViewerStore.getState().pinCountry(createSelectedCountry());
    });

    expect(screen.getByRole('button', { name: /comparing/i })).toBeInTheDocument();
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

  it('renders the pinned compare overlay and returns to armed when released', () => {
    useViewerStore.setState({
      compareModeState: 'pinned',
      selectedCountry: createSelectedCountry(),
    });

    render(<App />);

    expect(screen.getByTestId('country-compare-overlay')).toBeInTheDocument();
    expect(screen.queryByText(/click reticle to release/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /release compare/i }));

    expect(useViewerStore.getState().compareModeState).toBe('armed');
    expect(useViewerStore.getState().selectedCountry).toBeNull();
    expect(screen.queryByTestId('country-compare-overlay')).toBeNull();
  });

  it('opens the animation workspace from the control dock', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /open editor/i }));

    expect(screen.getByLabelText(/animation workspace/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/viewer controls/i)).toBeNull();
    expect(screen.getByRole('button', { name: /play from playhead/i })).toBeDisabled();
    expect(screen.getByRole('spinbutton', { name: /latitude/i })).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: /open editor/i }));

    expect(useViewerStore.getState().animationSession.previewGeoView).toMatchObject(
      storedStartView,
    );
    expect(useViewerStore.getState().animationSession.previewGeoView).not.toMatchObject(
      liveView,
    );
  });

  it('shows an inline error for invalid animation hex inside the workspace', () => {
    render(<App />);

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

    fireEvent.click(screen.getByRole('button', { name: /open editor/i }));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: headwayHex },
    });
    fireEvent.click(screen.getByRole('button', { name: /load hex/i }));

    expect(screen.getByLabelText(/animation workspace/i)).toBeInTheDocument();
    expect(useViewerStore.getState().viewerMode).toBe('headway');
    expect(useViewerStore.getState().animationDraft.mode).toBe('headway');
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
    fireEvent.click(screen.getByRole('button', { name: /open editor/i }));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: legacyHex },
    });
    fireEvent.click(screen.getByRole('button', { name: /load hex/i }));

    expect(useViewerStore.getState().animationDraft.version).toBe(2);
    expect(useViewerStore.getState().animationDraft.startGeoView).not.toBeNull();
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
    fireEvent.click(screen.getByRole('button', { name: /^play$/i }));

    expect(screen.queryByLabelText(/viewer controls/i)).toBeNull();
    expect(screen.queryByLabelText(/animation workspace/i)).toBeNull();
    expect(screen.getByLabelText(/animation playback overlay/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stop playback/i })).toBeVisible();

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
    fireEvent.click(screen.getByRole('button', { name: /^play$/i }));
    expect(screen.getByLabelText(/animation playback overlay/i)).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: /^play$/i }));
    fireEvent.click(screen.getByRole('button', { name: /stop playback/i }));

    expect(screen.getByLabelText(/animation workspace/i)).toBeInTheDocument();
    expect(useViewerStore.getState().animationSession.phase).toBe('idle');
  });

  it('closes the workspace and restores the fallback UI when the renderer fails', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /open editor/i }));
    fireEvent.click(
      screen.getByRole('button', { name: /simulate renderer failure/i }),
    );

    await waitFor(() => {
      expect(screen.queryByLabelText(/animation workspace/i)).toBeNull();
    });

    expect(
      screen.getByRole('heading', { name: /3d renderer unavailable right now/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/viewer controls/i)).toBeInTheDocument();
  });
});
