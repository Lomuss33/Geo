import type { ComponentProps } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { surfaceAnchoredGeoView } from '../lib/camera';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Group, PerspectiveCamera, Ray, Vector3 } from 'three';
import { findCountryByLatLon } from '../lib/countryGeometry';
import {
  COMPARE_MAX_DISTANCE,
  COMPARE_MIN_DISTANCE,
  DEFAULT_VIEW,
} from '../lib/constants';
import { vector3ToLatLon } from '../lib/geo';
import { cloneView } from '../lib/math';
import { useViewerStore } from '../state/viewerStore';
import { GlobeController } from './GlobeController';

const useThreeMock = vi.fn();
const useFrameMock = vi.fn();

vi.mock('@react-three/fiber', () => ({
  useFrame: (callback: unknown) => useFrameMock(callback),
  useThree: () => useThreeMock(),
}));

vi.mock('../lib/countryGeometry', async () => {
  const actual = await vi.importActual<typeof import('../lib/countryGeometry')>(
    '../lib/countryGeometry',
  );

  return {
    ...actual,
    findCountryByLatLon: vi.fn(),
  };
});

const findCountryByLatLonMock = vi.mocked(findCountryByLatLon);

describe('GlobeController', () => {
  let canvasElement: HTMLCanvasElement;

  beforeEach(() => {
    const pointerCaptures = new Set<number>();

    canvasElement = document.createElement('canvas');
    Object.defineProperty(canvasElement, 'getBoundingClientRect', {
      configurable: true,
      value: () =>
        ({
          left: 0,
          top: 0,
          width: 400,
          height: 400,
          right: 400,
          bottom: 400,
        }) as DOMRect,
    });
    canvasElement.setPointerCapture = vi.fn((pointerId: number) => {
      pointerCaptures.add(pointerId);
    });
    canvasElement.releasePointerCapture = vi.fn((pointerId: number) => {
      pointerCaptures.delete(pointerId);
    });
    canvasElement.hasPointerCapture = vi.fn((pointerId: number) =>
      pointerCaptures.has(pointerId),
    );

    useThreeMock.mockReturnValue({
      camera: new PerspectiveCamera(28, 1, 0.1, 100),
      gl: { domElement: canvasElement },
    });
    useFrameMock.mockReset();
    findCountryByLatLonMock.mockReset();
    useViewerStore.setState({
      view: cloneView(DEFAULT_VIEW),
      targetView: cloneView(DEFAULT_VIEW),
      compareModeState: 'off',
      selectedCountry: null,
      geoOverviewAnchor: null,
      geoOverviewHeadingDeg: 0,
      isFrozen: false,
      axisLockMode: 'free',
      activeAxis: null,
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

  const renderController = (
    props: Partial<ComponentProps<typeof GlobeController>> = {},
  ) =>
    render(
      <GlobeController
        compareModeState="armed"
        globeGroup={{ current: new Group() }}
        onCountryPick={vi.fn()}
        selectedCountryId={null}
        {...props}
      />,
    );

  it('shows a crosshair cursor while compare is armed and clears it when compare is off', () => {
    const view = renderController();

    expect(canvasElement.style.cursor).toBe('crosshair');

    view.rerender(
      <GlobeController
        compareModeState="off"
        globeGroup={{ current: new Group() }}
        onCountryPick={vi.fn()}
        selectedCountryId={null}
      />,
    );

    expect(canvasElement.style.cursor).toBe('');
  });

  it('preserves a requested country anchor while approaching from a distant view', () => {
    useViewerStore.setState({ hasInteracted: true });
    renderController({ compareModeState: 'off' });
    const anchor = { lat: 45, lon: 16 };
    act(() => {
      useViewerStore.getState().setGeoOverviewAnchor(anchor);
      useViewerStore.getState().setGeoOverviewHeading(0);
      useViewerStore
        .getState()
        .animateToView(surfaceAnchoredGeoView(45, 16, 1.75, 28));
    });
    for (let tick = 0; tick < 240; tick += 1) {
      act(() => {
        const frame = useFrameMock.mock.lastCall![0] as (
          state: unknown,
          delta: number,
        ) => void;
        frame({}, 1 / 60);
      });
    }
    expect(useViewerStore.getState().geoOverviewAnchor).toEqual(anchor);
    expect(useViewerStore.getState().telemetry.lat).toBeCloseTo(45, 1);
    expect(useViewerStore.getState().telemetry.lon).toBeCloseTo(16, 1);
  });

  it('limits compare zoom-out to the compare-specific maximum distance', () => {
    useViewerStore.setState({
      view: {
        ...cloneView(DEFAULT_VIEW),
        distance: COMPARE_MAX_DISTANCE + 2,
      },
      targetView: {
        ...cloneView(DEFAULT_VIEW),
        distance: COMPARE_MAX_DISTANCE + 2,
      },
    });

    renderController({ compareModeState: 'armed' });

    fireEvent.wheel(canvasElement, { deltaY: 120 });

    expect(useViewerStore.getState().view.distance).toBeCloseTo(
      COMPARE_MAX_DISTANCE,
      6,
    );
  });

  it('limits compare zoom-in to the compare-specific minimum distance', () => {
    useViewerStore.setState({
      view: {
        ...cloneView(DEFAULT_VIEW),
        distance: COMPARE_MIN_DISTANCE - 0.08,
      },
      targetView: {
        ...cloneView(DEFAULT_VIEW),
        distance: COMPARE_MIN_DISTANCE - 0.08,
      },
    });

    renderController({ compareModeState: 'pinned' });

    fireEvent.wheel(canvasElement, { deltaY: -120 });

    expect(useViewerStore.getState().view.distance).toBeCloseTo(
      COMPARE_MIN_DISTANCE,
      6,
    );
  });

  it('picks a visible country on click without dragging', () => {
    const onCountryPick = vi.fn();
    const intersectSpy = vi
      .spyOn(Ray.prototype, 'intersectSphere')
      .mockImplementation((_sphere, target) =>
        target.copy(new Vector3(0, 0, 1)),
      );

    findCountryByLatLonMock.mockReturnValue({
      id: '076',
      name: 'Brazil',
      centroid: [-54, -10],
      rings: [],
      polygons: [],
    });

    renderController({ onCountryPick });

    fireEvent.pointerDown(canvasElement, {
      button: 0,
      clientX: 120,
      clientY: 120,
      pointerId: 1,
    });
    fireEvent.pointerUp(canvasElement, {
      button: 0,
      clientX: 120,
      clientY: 120,
      pointerId: 1,
    });

    expect(onCountryPick).toHaveBeenCalledWith({
      id: '076',
      name: 'Brazil',
      centroid: [-54, -10],
    });

    intersectSpy.mockRestore();
  });

  it('does not pick when the click misses the front side of the globe', () => {
    const onCountryPick = vi.fn();
    const intersectSpy = vi
      .spyOn(Ray.prototype, 'intersectSphere')
      .mockReturnValue(null);

    renderController({ onCountryPick });

    fireEvent.pointerDown(canvasElement, {
      button: 0,
      clientX: 120,
      clientY: 120,
      pointerId: 1,
    });
    fireEvent.pointerUp(canvasElement, {
      button: 0,
      clientX: 120,
      clientY: 120,
      pointerId: 1,
    });

    expect(onCountryPick).not.toHaveBeenCalled();

    intersectSpy.mockRestore();
  });

  it('does not pick when the pointer gesture becomes a drag', () => {
    const onCountryPick = vi.fn();
    const intersectSpy = vi
      .spyOn(Ray.prototype, 'intersectSphere')
      .mockImplementation((_sphere, target) =>
        target.copy(new Vector3(0, 0, 1)),
      );

    findCountryByLatLonMock.mockReturnValue({
      id: '076',
      name: 'Brazil',
      centroid: [-54, -10],
      rings: [],
      polygons: [],
    });

    renderController({ onCountryPick });

    fireEvent.pointerDown(canvasElement, {
      button: 0,
      clientX: 120,
      clientY: 120,
      pointerId: 1,
    });
    fireEvent.pointerMove(canvasElement, {
      button: 0,
      clientX: 150,
      clientY: 120,
      pointerId: 1,
    });
    fireEvent.pointerUp(canvasElement, {
      button: 0,
      clientX: 150,
      clientY: 120,
      pointerId: 1,
    });

    expect(onCountryPick).not.toHaveBeenCalled();

    intersectSpy.mockRestore();
  });

  it('does not repick the same pinned country', () => {
    const onCountryPick = vi.fn();
    const intersectSpy = vi
      .spyOn(Ray.prototype, 'intersectSphere')
      .mockImplementation((_sphere, target) =>
        target.copy(new Vector3(0, 0, 1)),
      );

    findCountryByLatLonMock.mockReturnValue({
      id: '076',
      name: 'Brazil',
      centroid: [-54, -10],
      rings: [],
      polygons: [],
    });

    renderController({
      compareModeState: 'pinned',
      onCountryPick,
      selectedCountryId: '076',
    });

    fireEvent.pointerDown(canvasElement, {
      button: 0,
      clientX: 120,
      clientY: 120,
      pointerId: 1,
    });
    fireEvent.pointerUp(canvasElement, {
      button: 0,
      clientX: 120,
      clientY: 120,
      pointerId: 1,
    });

    expect(onCountryPick).not.toHaveBeenCalled();

    intersectSpy.mockRestore();
  });

  it('projects compare picks into the globe local space before resolving the country', () => {
    const onCountryPick = vi.fn();
    const intersectSpy = vi
      .spyOn(Ray.prototype, 'intersectSphere')
      .mockImplementation((_sphere, target) =>
        target.copy(new Vector3(0, 0, 1)),
      );
    const globeGroup = new Group();

    globeGroup.rotation.y = Math.PI / 2;
    globeGroup.updateMatrixWorld(true);

    findCountryByLatLonMock.mockReturnValue({
      id: '999',
      name: 'Rotated test country',
      centroid: [10, 20],
      rings: [],
      polygons: [],
    });

    renderController({
      globeGroup: { current: globeGroup },
      onCountryPick,
    });

    fireEvent.pointerDown(canvasElement, {
      button: 0,
      clientX: 120,
      clientY: 120,
      pointerId: 1,
    });
    fireEvent.pointerUp(canvasElement, {
      button: 0,
      clientX: 120,
      clientY: 120,
      pointerId: 1,
    });

    const localHitPoint = globeGroup.worldToLocal(new Vector3(0, 0, 1));
    const { lat, lon } = vector3ToLatLon(localHitPoint.normalize());

    expect(findCountryByLatLonMock).toHaveBeenCalledWith(lon, lat);
    expect(onCountryPick).toHaveBeenCalledWith({
      id: '999',
      name: 'Rotated test country',
      centroid: [10, 20],
    });

    intersectSpy.mockRestore();
  });
});
