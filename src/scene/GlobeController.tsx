import { useCallback, useEffect, useEffectEvent, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  Sphere,
  Vector2,
  Vector3,
} from 'three';
import type { Group } from 'three';
import { findCountryByLatLon } from '../lib/countryGeometry';
import {
  COMPARE_MAX_DISTANCE,
  COMPARE_MIN_DISTANCE,
  COMPARE_ZOOM_STEP,
  DEFAULT_VIEW,
  FRONT_VECTOR,
  LOCAL_SUN_DIRECTION,
  MAX_DISTANCE,
  MIN_DISTANCE,
} from '../lib/constants';
import { resolveRotationAxis, rotationAngleFromDrag } from '../lib/controls';
import { getRollDegrees, latLonToVector3, vector3ToLatLon } from '../lib/geo';
import {
  angleFromViewportCenter,
  clamp,
  cloneView,
  damp,
  mapPointerToArcball,
  quaternionFromArray,
  quaternionToArray,
  shortestAngleDelta,
  viewsEqual,
} from '../lib/math';
import {
  applyHumanViewConstraint,
  deriveGeoCenteredAnchor,
  deriveGeoOverviewHeading,
  deriveSurfaceAnchor,
  GEO_OVERVIEW_ENTER_THRESHOLD,
  getCloseZoomInfluence,
  getGeoCameraPose,
  getGeoControlMode,
  getGeoLinearZoomT,
  getResponsiveStartupGeoView,
  moveGeoOverviewAnchor,
  stepGeoOverviewHeading,
  surfaceAnchoredGeoView,
} from '../lib/camera';
import {
  serializeViewState,
  shouldLiveSyncViewUrl,
  updateUrlWithView,
} from '../lib/viewState';
import type {
  CompareModeState,
  GeoOverviewAnchor,
  GlobeViewState,
  SelectedCountry,
} from '../state/viewerStore';
import { useViewerStore } from '../state/viewerStore';

type GlobeControllerProps = {
  globeGroup: React.RefObject<Group | null>;
  compareModeState: CompareModeState;
  selectedCountryId: string | null;
  onCountryPick: (country: SelectedCountry) => void;
};

type GestureState =
  | { mode: 'idle' }
  | {
      mode: 'free-rotate';
      startPoint: Vector3;
      startRotation: Quaternion;
      startView: GlobeViewState;
    }
  | {
      mode: 'pending-axis';
      startX: number;
      startY: number;
      startRotation: Quaternion;
      startView: GlobeViewState;
    }
  | {
      mode: 'rotate-x' | 'rotate-y';
      startX: number;
      startY: number;
      startRotation: Quaternion;
      startView: GlobeViewState;
    }
  | {
      mode: 'overview-surface-pan';
      startX: number;
      startY: number;
      startAnchor: GeoOverviewAnchor;
      startHeadingDeg: number;
    }
  | {
      mode: 'overview-heading-spin';
      startX: number;
      startAnchor: GeoOverviewAnchor;
      startHeadingDeg: number;
    }
  | {
      mode: 'roll';
      startAngle: number;
      startRotation: Quaternion;
    };

const raycaster = new Raycaster();
const pointer = new Vector2();
const globeSphere = new Sphere(new Vector3(0, 0, 0), 1);
const SCREEN_X_AXIS = new Vector3(1, 0, 0);
const SCREEN_Y_AXIS = new Vector3(0, 1, 0);

export function GlobeController({
  globeGroup,
  compareModeState,
  selectedCountryId,
  onCountryPick,
}: GlobeControllerProps) {
  const { camera, gl } = useThree();
  const applyImmediateView = useViewerStore(
    (state) => state.applyImmediateView,
  );
  const animateToView = useViewerStore((state) => state.animateToView);
  const commitFrame = useViewerStore((state) => state.commitFrame);
  const isFrozen = useViewerStore((state) => state.isFrozen);
  const markInteracted = useViewerStore((state) => state.markInteracted);
  const setActiveAxis = useViewerStore((state) => state.setActiveAxis);
  const targetView = useViewerStore((state) => state.targetView);
  const quality = useViewerStore((state) => state.quality);
  const axisLockMode = useViewerStore((state) => state.axisLockMode);
  const hasInteracted = useViewerStore((state) => state.hasInteracted);
  const setGeoOverviewAnchor = useViewerStore(
    (state) => state.setGeoOverviewAnchor,
  );
  const setGeoOverviewHeading = useViewerStore(
    (state) => state.setGeoOverviewHeading,
  );
  const clearGeoOverviewState = useViewerStore(
    (state) => state.clearGeoOverviewState,
  );
  const animationSession = useViewerStore((state) => state.animationSession);
  const previewGeoView = animationSession.previewGeoView;
  const isAnimationPlaying = animationSession.phase === 'playing';
  const isAnimationWorkspaceOpen = animationSession.workspaceOpen;
  const isAnimationSessionActive =
    isAnimationWorkspaceOpen || isAnimationPlaying;

  const currentViewRef = useRef<GlobeViewState>(cloneView(DEFAULT_VIEW));
  const targetViewRef = useRef<GlobeViewState>(cloneView(DEFAULT_VIEW));
  const gestureRef = useRef<GestureState>({ mode: 'idle' });
  const lastSerializedRef = useRef<string>('');
  const pointerDownRef = useRef<{
    x: number;
    y: number;
    button: number;
    shiftKey: boolean;
  } | null>(null);
  const dragDistanceRef = useRef(0);
  const frontVector = useMemo(() => FRONT_VECTOR.clone(), []);
  const liveSyncViewUrl = useMemo(() => shouldLiveSyncViewUrl(), []);

  const resolveGeoOverviewState = useCallback(
    (view: GlobeViewState) => {
      const linearZoomT = getGeoLinearZoomT(view.distance);
      let anchor = useViewerStore.getState().geoOverviewAnchor;
      let headingDeg = useViewerStore.getState().geoOverviewHeadingDeg;

      if (!anchor && linearZoomT > 1e-4) {
        anchor = deriveGeoCenteredAnchor(view);
        headingDeg = deriveGeoOverviewHeading(view, anchor);
        setGeoOverviewAnchor(anchor);
        setGeoOverviewHeading(headingDeg);
      } else if (
        anchor &&
        linearZoomT <= 1e-4 &&
        getGeoLinearZoomT(useViewerStore.getState().targetView.distance) <= 1e-4
      ) {
        clearGeoOverviewState();
        anchor = null;
        headingDeg = 0;
      }

      return { anchor, headingDeg };
    },
    [clearGeoOverviewState, setGeoOverviewAnchor, setGeoOverviewHeading],
  );

  const constrainGeoView = useCallback(
    (view: GlobeViewState, sourceDistance = view.distance) => {
      const { anchor, headingDeg } = resolveGeoOverviewState(view);

      return applyHumanViewConstraint(view, {
        sourceDistance,
        anchor,
        headingDeg,
      });
    },
    [resolveGeoOverviewState],
  );

  const applyStoredOverviewConstraint = useEffectEvent(
    (view: GlobeViewState, sourceDistance = view.distance) =>
      applyHumanViewConstraint(view, {
        sourceDistance,
        anchor: useViewerStore.getState().geoOverviewAnchor,
        headingDeg: useViewerStore.getState().geoOverviewHeadingDeg,
      }),
  );

  useEffect(() => {
    // Hydration restores a complete frame, rather than a new navigation target.
    // Re-solving it from the globe's centered anchor moves the pose on every
    // reload. Seed subsequent controls from the actual saved surface instead.
    const hydrated = cloneView(useViewerStore.getState().view);
    if (getGeoLinearZoomT(hydrated.distance) > 1e-4) {
      const surface = deriveSurfaceAnchor(hydrated);
      const anchor = { lat: surface.anchorLat, lon: surface.anchorLon };
      setGeoOverviewAnchor(anchor);
      setGeoOverviewHeading(deriveGeoOverviewHeading(hydrated, anchor));
    } else {
      clearGeoOverviewState();
    }
    currentViewRef.current = cloneView(hydrated);
    targetViewRef.current = cloneView(hydrated);
    lastSerializedRef.current = serializeViewState(hydrated);
    applyImmediateView(hydrated);
  }, [
    applyImmediateView,
    clearGeoOverviewState,
    setGeoOverviewAnchor,
    setGeoOverviewHeading,
  ]);

  useEffect(() => {
    targetViewRef.current = viewsEqual(targetView, currentViewRef.current)
      ? cloneView(targetView)
      : applyStoredOverviewConstraint(cloneView(targetView));
  }, [targetView]);

  useEffect(() => {
    if (hasInteracted || isAnimationSessionActive) {
      return;
    }

    const fitCurrentViewToCanvas = () => {
      const rect = gl.domElement.getBoundingClientRect();

      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }

      const fittedView = getResponsiveStartupGeoView(
        currentViewRef.current,
        rect.width,
        rect.height,
      );

      if (
        Math.abs(fittedView.distance - currentViewRef.current.distance) < 1e-3
      ) {
        return;
      }

      currentViewRef.current = cloneView(fittedView);
      targetViewRef.current = cloneView(fittedView);
      applyImmediateView(fittedView);

      const encoded = serializeViewState(fittedView);
      if (encoded !== lastSerializedRef.current) {
        if (liveSyncViewUrl) {
          updateUrlWithView(fittedView);
        }
        lastSerializedRef.current = encoded;
      }
    };

    const frame = window.requestAnimationFrame(fitCurrentViewToCanvas);
    window.addEventListener('resize', fitCurrentViewToCanvas);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', fitCurrentViewToCanvas);
    };
  }, [
    applyImmediateView,
    gl.domElement,
    hasInteracted,
    isAnimationSessionActive,
    liveSyncViewUrl,
  ]);

  const getViewportRect = useEffectEvent(() =>
    gl.domElement.getBoundingClientRect(),
  );

  const projectClickToGlobe = useEffectEvent(
    (clientX: number, clientY: number) => {
      const rect = getViewportRect();
      pointer.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -(((clientY - rect.top) / rect.height) * 2 - 1),
      );
      raycaster.setFromCamera(pointer, camera);

      const hitPoint = new Vector3();
      const intersected = raycaster.ray.intersectSphere(globeSphere, hitPoint);

      if (!intersected) {
        return null;
      }

      const localHitPoint = intersected.clone();

      if (globeGroup.current) {
        globeGroup.current.worldToLocal(localHitPoint);
      }

      return localHitPoint.normalize();
    },
  );

  const setImmediateQuaternion = useEffectEvent(
    (quaternion: Quaternion, distance: number) => {
      const nextView = constrainGeoView(
        {
          rotation: quaternionToArray(quaternion),
          distance,
          fov: currentViewRef.current.fov,
        } satisfies GlobeViewState,
        currentViewRef.current.distance,
      );

      currentViewRef.current = cloneView(nextView);
      targetViewRef.current = cloneView(nextView);
      applyImmediateView(nextView);

      const encoded = serializeViewState(nextView);
      if (encoded !== lastSerializedRef.current) {
        if (liveSyncViewUrl) {
          updateUrlWithView(nextView);
        }
        lastSerializedRef.current = encoded;
      }
    },
  );

  const setImmediateViewState = useEffectEvent((view: GlobeViewState) => {
    const nextView = constrainGeoView(view, currentViewRef.current.distance);

    currentViewRef.current = cloneView(nextView);
    targetViewRef.current = cloneView(nextView);
    applyImmediateView(nextView);

    const encoded = serializeViewState(nextView);
    if (encoded !== lastSerializedRef.current) {
      if (liveSyncViewUrl) {
        updateUrlWithView(nextView);
      }
      lastSerializedRef.current = encoded;
    }
  });

  const releaseGesture = useEffectEvent(() => {
    gestureRef.current = { mode: 'idle' };
    setActiveAxis(null);
    pointerDownRef.current = null;
    dragDistanceRef.current = 0;
  });

  const applyAxisLockedRotation = useEffectEvent(
    (
      axis: 'x' | 'y',
      startX: number,
      startY: number,
      startRotation: Quaternion,
      clientX: number,
      clientY: number,
      rect: DOMRect,
    ) => {
      const deltaX = clientX - startX;
      const deltaY = clientY - startY;
      const nextRotation =
        axis === 'x'
          ? new Quaternion()
              .setFromAxisAngle(
                SCREEN_X_AXIS,
                rotationAngleFromDrag(deltaY, rect.height),
              )
              .multiply(startRotation.clone())
              .normalize()
          : new Quaternion()
              .setFromAxisAngle(
                SCREEN_Y_AXIS,
                rotationAngleFromDrag(deltaX, rect.width),
              )
              .multiply(startRotation.clone())
              .normalize();

      setImmediateQuaternion(nextRotation, currentViewRef.current.distance);
    },
  );

  const applyFreeRotation = useEffectEvent(
    (
      startPoint: Vector3,
      startRotation: Quaternion,
      clientX: number,
      clientY: number,
      rect: DOMRect,
    ) => {
      const nextRotation = new Quaternion()
        .setFromUnitVectors(
          startPoint,
          mapPointerToArcball(clientX, clientY, rect),
        )
        .normalize()
        .multiply(startRotation.clone())
        .normalize();
      setImmediateQuaternion(nextRotation, currentViewRef.current.distance);
    },
  );

  useEffect(() => {
    if (isFrozen || isAnimationSessionActive) {
      releaseGesture();
    }
  }, [isAnimationSessionActive, isFrozen]);

  useEffect(() => {
    const element = gl.domElement;
    element.style.cursor =
      !isAnimationSessionActive && compareModeState !== 'off'
        ? 'crosshair'
        : '';

    return () => {
      element.style.cursor = '';
    };
  }, [compareModeState, gl.domElement, isAnimationSessionActive]);

  useEffect(() => {
    releaseGesture();
  }, [axisLockMode]);

  useEffect(() => {
    const element = gl.domElement;

    const handleContextMenu = (event: MouseEvent) => event.preventDefault();

    const handlePointerDown = (event: PointerEvent) => {
      if (isFrozen || isAnimationSessionActive) {
        return;
      }

      if (!(event.target instanceof HTMLElement)) {
        return;
      }

      if (event.button !== 0 && event.button !== 2) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      markInteracted();
      pointerDownRef.current = {
        x: event.clientX,
        y: event.clientY,
        button: event.button,
        shiftKey: event.shiftKey,
      };
      dragDistanceRef.current = 0;
      const currentRotation = quaternionFromArray(
        currentViewRef.current.rotation,
      );
      const currentView = cloneView(currentViewRef.current);
      const overviewState = resolveGeoOverviewState(currentView);
      const controlMode = getGeoControlMode(currentView.distance);

      if (controlMode === 'heading-spin' && overviewState.anchor) {
        gestureRef.current = {
          mode: 'overview-heading-spin',
          startX: event.clientX,
          startAnchor: overviewState.anchor,
          startHeadingDeg: overviewState.headingDeg,
        };
      } else if (controlMode === 'surface-pan' && overviewState.anchor) {
        gestureRef.current = {
          mode: 'overview-surface-pan',
          startX: event.clientX,
          startY: event.clientY,
          startAnchor: overviewState.anchor,
          startHeadingDeg: overviewState.headingDeg,
        };
      } else if (event.button === 2 || event.shiftKey) {
        gestureRef.current = {
          mode: 'roll',
          startAngle: angleFromViewportCenter(
            event.clientX,
            event.clientY,
            getViewportRect(),
          ),
          startRotation: currentRotation,
        };
      } else if (axisLockMode === 'axis-lock') {
        gestureRef.current = {
          mode: 'pending-axis',
          startX: event.clientX,
          startY: event.clientY,
          startRotation: currentRotation,
          startView: currentView,
        };
      } else {
        gestureRef.current = {
          mode: 'free-rotate',
          startPoint: mapPointerToArcball(
            event.clientX,
            event.clientY,
            getViewportRect(),
          ),
          startRotation: currentRotation,
          startView: currentView,
        };
      }

      element.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const gesture = gestureRef.current;
      if (pointerDownRef.current) {
        dragDistanceRef.current = Math.max(
          dragDistanceRef.current,
          Math.hypot(
            event.clientX - pointerDownRef.current.x,
            event.clientY - pointerDownRef.current.y,
          ),
        );
      }

      if (gesture.mode === 'idle') {
        return;
      }

      const rect = getViewportRect();

      if (gesture.mode === 'overview-surface-pan') {
        const nextAnchor = moveGeoOverviewAnchor(
          gesture.startAnchor,
          currentViewRef.current.distance,
          event.clientX - gesture.startX,
          event.clientY - gesture.startY,
          rect,
        );
        setGeoOverviewAnchor(nextAnchor);
        const nextView = surfaceAnchoredGeoView({
          lat: nextAnchor.lat,
          lon: nextAnchor.lon,
          headingDeg: gesture.startHeadingDeg,
          distance: currentViewRef.current.distance,
          baseFov: currentViewRef.current.fov,
        });
        setImmediateViewState(nextView);
        return;
      }

      if (gesture.mode === 'overview-heading-spin') {
        const nextHeading = stepGeoOverviewHeading(
          gesture.startHeadingDeg,
          ((event.clientX - gesture.startX) / Math.max(rect.width, 1)) * 140,
        );
        setGeoOverviewHeading(nextHeading);
        setImmediateViewState(
          surfaceAnchoredGeoView({
            lat: gesture.startAnchor.lat,
            lon: gesture.startAnchor.lon,
            headingDeg: nextHeading,
            distance: currentViewRef.current.distance,
            baseFov: currentViewRef.current.fov,
          }),
        );
        return;
      }

      if (gesture.mode === 'free-rotate') {
        applyFreeRotation(
          gesture.startPoint,
          gesture.startRotation,
          event.clientX,
          event.clientY,
          rect,
        );
        return;
      }

      if (gesture.mode === 'pending-axis') {
        const axis = resolveRotationAxis(
          event.clientX - gesture.startX,
          event.clientY - gesture.startY,
        );

        if (!axis) {
          return;
        }

        setActiveAxis(axis);
        gestureRef.current = {
          mode: axis === 'x' ? 'rotate-x' : 'rotate-y',
          startX: gesture.startX,
          startY: gesture.startY,
          startRotation: gesture.startRotation,
          startView: gesture.startView,
        };
        applyAxisLockedRotation(
          axis,
          gesture.startX,
          gesture.startY,
          gesture.startRotation,
          event.clientX,
          event.clientY,
          rect,
        );
        return;
      }

      if (gesture.mode === 'rotate-x' || gesture.mode === 'rotate-y') {
        const axis = gesture.mode === 'rotate-x' ? 'x' : 'y';
        applyAxisLockedRotation(
          axis,
          gesture.startX,
          gesture.startY,
          gesture.startRotation,
          event.clientX,
          event.clientY,
          rect,
        );
        return;
      }

      if (gesture.mode === 'roll') {
        const currentAngle = angleFromViewportCenter(
          event.clientX,
          event.clientY,
          rect,
        );
        const deltaAngle = shortestAngleDelta(gesture.startAngle, currentAngle);
        const delta = new Quaternion().setFromAxisAngle(
          frontVector,
          deltaAngle,
        );
        const nextRotation = delta
          .multiply(gesture.startRotation.clone())
          .normalize();
        setImmediateQuaternion(nextRotation, currentViewRef.current.distance);
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      const shouldPickCountry =
        event.type !== 'pointercancel' &&
        compareModeState !== 'off' &&
        pointerDownRef.current?.button === 0 &&
        !pointerDownRef.current.shiftKey &&
        dragDistanceRef.current < 6;

      if (element.hasPointerCapture(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }

      if (shouldPickCountry) {
        const worldPoint = projectClickToGlobe(event.clientX, event.clientY);

        if (worldPoint) {
          const { lat, lon } = vector3ToLatLon(worldPoint);
          const country = findCountryByLatLon(lon, lat);

          if (
            country &&
            !(compareModeState === 'pinned' && country.id === selectedCountryId)
          ) {
            onCountryPick({
              id: country.id,
              name: country.name,
              centroid: [...country.centroid] as SelectedCountry['centroid'],
            });
          }
        }
      }

      releaseGesture();
    };

    const handleWheel = (event: WheelEvent) => {
      if (isFrozen || isAnimationSessionActive) {
        return;
      }

      event.preventDefault();
      markInteracted();
      const compareZoomActive = compareModeState !== 'off';
      const distance = clamp(
        currentViewRef.current.distance +
          event.deltaY * (compareZoomActive ? COMPARE_ZOOM_STEP : 0.00125),
        compareZoomActive ? COMPARE_MIN_DISTANCE : MIN_DISTANCE,
        compareZoomActive ? COMPARE_MAX_DISTANCE : MAX_DISTANCE,
      );
      setImmediateQuaternion(
        quaternionFromArray(currentViewRef.current.rotation),
        distance,
      );
    };

    const handleDoubleClick = (event: MouseEvent) => {
      if (isFrozen || isAnimationSessionActive || compareModeState !== 'off') {
        return;
      }

      event.preventDefault();
      markInteracted();

      const worldPoint = projectClickToGlobe(event.clientX, event.clientY);

      if (!worldPoint) {
        return;
      }

      if (
        useViewerStore.getState().geoOverviewAnchor ||
        getCloseZoomInfluence(currentViewRef.current.distance) >=
          GEO_OVERVIEW_ENTER_THRESHOLD
      ) {
        const { lat, lon } = vector3ToLatLon(worldPoint);
        const nextHeading = useViewerStore.getState().geoOverviewHeadingDeg;
        setGeoOverviewAnchor({ lat, lon });
        setImmediateViewState(
          surfaceAnchoredGeoView({
            lat,
            lon,
            headingDeg: nextHeading,
            distance: currentViewRef.current.distance,
            baseFov: currentViewRef.current.fov,
          }),
        );
        return;
      }

      const currentRotation = quaternionFromArray(
        currentViewRef.current.rotation,
      );
      const delta = new Quaternion().setFromUnitVectors(
        worldPoint,
        frontVector,
      );
      const nextRotation = delta.multiply(currentRotation).normalize();

      animateToView(
        constrainGeoView({
          rotation: quaternionToArray(nextRotation),
          distance: currentViewRef.current.distance,
          fov: currentViewRef.current.fov,
        }),
      );
    };

    element.addEventListener('contextmenu', handleContextMenu);
    element.addEventListener('pointerdown', handlePointerDown);
    element.addEventListener('pointermove', handlePointerMove);
    element.addEventListener('pointerup', handlePointerUp);
    element.addEventListener('pointercancel', handlePointerUp);
    element.addEventListener('wheel', handleWheel, { passive: false });
    element.addEventListener('dblclick', handleDoubleClick);

    return () => {
      element.removeEventListener('contextmenu', handleContextMenu);
      element.removeEventListener('pointerdown', handlePointerDown);
      element.removeEventListener('pointermove', handlePointerMove);
      element.removeEventListener('pointerup', handlePointerUp);
      element.removeEventListener('pointercancel', handlePointerUp);
      element.removeEventListener('wheel', handleWheel);
      element.removeEventListener('dblclick', handleDoubleClick);
    };
  }, [
    animateToView,
    applyImmediateView,
    axisLockMode,
    compareModeState,
    constrainGeoView,
    frontVector,
    gl.domElement,
    isAnimationSessionActive,
    isFrozen,
    markInteracted,
    onCountryPick,
    resolveGeoOverviewState,
    selectedCountryId,
    setActiveAxis,
    setGeoOverviewAnchor,
    setGeoOverviewHeading,
  ]);

  useFrame((_, delta) => {
    if (previewGeoView) {
      currentViewRef.current = cloneView(previewGeoView);
      targetViewRef.current = cloneView(previewGeoView);
    }

    const current = currentViewRef.current;
    const target = targetViewRef.current;
    const previousDistance = current.distance;
    let currentQuaternion = quaternionFromArray(current.rotation);
    const targetQuaternion = quaternionFromArray(target.rotation);
    const isDragging =
      !isFrozen &&
      !isAnimationSessionActive &&
      gestureRef.current.mode !== 'idle';
    const smoothing = quality === 'high' ? 8.5 : 7;

    if (
      !isFrozen &&
      !isAnimationSessionActive &&
      !isDragging &&
      !viewsEqual(current, target)
    ) {
      currentQuaternion.slerp(
        targetQuaternion,
        1 - Math.exp(-smoothing * delta),
      );
      current.distance = damp(
        current.distance,
        target.distance,
        smoothing,
        delta,
      );
      current.fov = damp(current.fov, target.fov, smoothing, delta);
      current.rotation = quaternionToArray(currentQuaternion);
      const constrainedCurrent = constrainGeoView(current, previousDistance);
      current.rotation = [...constrainedCurrent.rotation];
      current.distance = constrainedCurrent.distance;
      current.fov = constrainedCurrent.fov;
      currentQuaternion = quaternionFromArray(current.rotation);

      if (viewsEqual(current, target, 1e-3)) {
        current.rotation = [...target.rotation];
        current.distance = target.distance;
        current.fov = target.fov;
        currentQuaternion = quaternionFromArray(current.rotation);
      }
    }

    if (globeGroup.current) {
      globeGroup.current.quaternion.copy(currentQuaternion);
    }

    const cameraPose = getGeoCameraPose(current);
    const perspectiveCamera = camera as PerspectiveCamera;
    if (Math.abs(perspectiveCamera.fov - cameraPose.effectiveFov) > 0.01) {
      perspectiveCamera.fov = cameraPose.effectiveFov;
      perspectiveCamera.updateProjectionMatrix();
    }
    camera.position.set(...cameraPose.position);
    camera.lookAt(...cameraPose.target);

    const anchor = deriveSurfaceAnchor(current);
    const telemetry = {
      lat: anchor.anchorLat,
      lon: anchor.anchorLon,
      altitudeKm: Math.max(0, (current.distance - 1) * 6_371),
      rollDeg: getRollDegrees(currentQuaternion),
      sunlit:
        latLonToVector3(anchor.anchorLat, anchor.anchorLon).dot(
          LOCAL_SUN_DIRECTION,
        ) >= 0,
    };

    const animating =
      isAnimationPlaying ||
      (!isFrozen && !isDragging && !viewsEqual(current, target, 1e-3));
    commitFrame(cloneView(current), telemetry, animating);

    const encoded = serializeViewState(current);
    if (encoded !== lastSerializedRef.current) {
      if (liveSyncViewUrl && !isAnimationSessionActive) {
        updateUrlWithView(current);
      }
      lastSerializedRef.current = encoded;
    }
  });

  return null;
}
