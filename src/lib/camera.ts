import { PerspectiveCamera, Quaternion, Vector3 } from 'three';
import {
  DEFAULT_FOV,
  DEFAULT_DISTANCE,
  FRONT_VECTOR,
  MAX_DISTANCE,
  MIN_DISTANCE,
  viewFromLatLon,
} from './constants';
import {
  getViewCenterLocal,
  latLonToVector3,
  quaternionFromCenteredLatLon,
  vector3ToLatLon,
} from './geo';
import { clamp, quaternionFromArray, quaternionToArray } from './math';
import type { GeoOverviewAnchor, GlobeViewState } from '../state/viewerStore';

export type GeoControlMode = 'orbit' | 'surface-pan' | 'heading-spin';

export type GeoCameraState = {
  position: [x: number, y: number, z: number];
  target: [x: number, y: number, z: number];
  effectiveFov: number;
};

export type GeoPinnedSurfaceDebug = {
  anchorNdcY: number;
  rayFallbackUsed: boolean;
};

type GeoApparentScaleInput = {
  distance: number;
  effectiveFov: number;
};

type GeoAnchorView = Pick<GlobeViewState, 'distance' | 'fov'>;
type SurfaceAnchoredGeoViewInput = {
  lat: number;
  lon: number;
  headingDeg: number;
  distance: number;
  baseFov: number;
  sourceDistance?: number;
  preserveSourceAnchorNdcY?: boolean;
};
type HumanViewConstraintInput = {
  sourceDistance?: number;
  anchor?: GeoOverviewAnchor | null;
  headingDeg?: number;
};

export const GEO_OVERVIEW_ENTER_THRESHOLD = 0.35;
export const GEO_OVERVIEW_EXIT_THRESHOLD = 0.2;
const HEADING_SPIN_THRESHOLD = 0.9;
const FINAL_APPARENT_SCALE = 2.85;
const MAX_NATURAL_EFFECTIVE_FOV = 42;
const OVERVIEW_ANCHOR_EPSILON = 1e-4;
const FINAL_LOOK_PITCH_DEG = 19.75;
const FINAL_SURFACE_ANGLE_DEG = 108;
const FINAL_AXIS_SCREEN_Y = 4 / 5;
const FINAL_VISIBLE_EARTH_TOP_SCREEN_Y = 0.33;
const GEO_AXIS_MARKER_CAMERA_LIFT = 0.02;
const MIN_SURFACE_ANCHOR_NDC_Y = -0.85;
const SURFACE_ANGLE_SOLVER_SAMPLES = 17;
const SURFACE_ANGLE_SOLVER_REFINEMENTS = 6;

const HUMAN_RIG_HEIGHT = 1.25;
const HUMAN_RIG_FORWARD = 0.08;
const FINAL_HUMAN_RIG_HEIGHT = 1.1;
const FINAL_HUMAN_RIG_FORWARD = 0.07;
const CLOSE_RIG_LOWER_START_T = 0.68;
const CLOSE_ANCHOR_HINT_START_T = 0.82;

const FULL_WIDTH_SURFACE_LON_DEG = 110;
const FULL_HEIGHT_SURFACE_LAT_DEG = 70;
const DEFAULT_SURFACE_LON_DEG = 26;
const DEFAULT_SURFACE_LAT_DEG = 18;

const WORLD_UP = new Vector3(0, 1, 0);
const FALLBACK_EAST = new Vector3(0, 0, -1);
const AXIS_SCREEN_CAMERA = new PerspectiveCamera(28, 1, 0.01, 1000);
const AXIS_SCREEN_PROJECTED_POINT = new Vector3();
const STARTUP_VIEWPORT_FIT_MARGIN = 0.985;
const VISUAL_GLOBE_RADIUS = 1.34;

const smoothstep = (value: number) => value * value * (3 - 2 * value);

const lerp = (start: number, end: number, amount: number) =>
  start + (end - start) * amount;

const wrapLongitude = (lon: number) => {
  let normalized = lon;

  while (normalized > 180) {
    normalized -= 360;
  }

  while (normalized < -180) {
    normalized += 360;
  }

  return normalized;
};

const normalizeHeading = (headingDeg: number) => wrapLongitude(headingDeg);

const getDegreesFromRadians = (radians: number) => (radians * 180) / Math.PI;

const getRadiansFromDegrees = (degrees: number) => (degrees * Math.PI) / 180;

export const getGeoLinearZoomT = (distance: number) => {
  const closeRange = DEFAULT_DISTANCE - MIN_DISTANCE;

  if (closeRange <= 0) {
    return 1;
  }

  return clamp((DEFAULT_DISTANCE - distance) / closeRange, 0, 1);
};

export const getGeoCameraTransitionT = (distance: number) => {
  const linearZoomT = getGeoLinearZoomT(distance);

  return 1 - (1 - linearZoomT) ** 2;
};

export const getGeoLookPitchDeg = (distance: number) =>
  lerp(0, FINAL_LOOK_PITCH_DEG, smoothstep(getGeoLinearZoomT(distance)));

export const getGeoDesiredSurfaceAngleDeg = (distance: number) =>
  lerp(180, FINAL_SURFACE_ANGLE_DEG, getGeoCameraTransitionT(distance));

export const getGeoDesiredAxisScreenY = (distance: number) =>
  lerp(0.5, FINAL_AXIS_SCREEN_Y, smoothstep(getGeoLinearZoomT(distance)));

export const getGeoDesiredVisibleEarthTopScreenY = (distance: number) =>
  lerp(
    0,
    FINAL_VISIBLE_EARTH_TOP_SCREEN_Y,
    smoothstep(getGeoLinearZoomT(distance)),
  );

const getGeoCloseRigLowerT = (distance: number) =>
  smoothstep(
    clamp(
      (getGeoLinearZoomT(distance) - CLOSE_RIG_LOWER_START_T) /
        (1 - CLOSE_RIG_LOWER_START_T),
      0,
      1,
    ),
  );

const getAnchorTangentBasis = (anchor: Vector3) => {
  const east = new Vector3().crossVectors(WORLD_UP, anchor);

  if (east.lengthSq() <= 1e-6) {
    east.copy(FALLBACK_EAST).projectOnPlane(anchor);
  }

  east.normalize();

  return {
    east,
    north: new Vector3().crossVectors(anchor, east).normalize(),
  };
};

const signedAngleAroundAxis = (
  from: Vector3,
  to: Vector3,
  axis: Vector3,
) =>
  Math.atan2(
    axis.dot(new Vector3().crossVectors(from, to)),
    clamp(from.dot(to), -1, 1),
  );

const getSphereRayHit = (origin: Vector3, direction: Vector3) => {
  const normalizedDirection = direction.clone().normalize();
  const b = 2 * origin.dot(normalizedDirection);
  const c = origin.lengthSq() - 1;
  const discriminant = b * b - 4 * c;

  if (discriminant < 0) {
    return null;
  }

  const near = (-b - Math.sqrt(discriminant)) / 2;
  const far = (-b + Math.sqrt(discriminant)) / 2;
  const distance = near >= 0 ? near : far >= 0 ? far : null;

  if (distance == null) {
    return null;
  }

  return origin
    .clone()
    .addScaledVector(normalizedDirection, distance)
    .normalize();
};

const getSphereTangentPoint = (origin: Vector3, direction: Vector3) => {
  const centerDistance = origin.length();

  if (centerDistance <= 1 + 1e-6) {
    return FRONT_VECTOR.clone();
  }

  const radial = origin.clone().normalize();
  const tangent = direction.clone().projectOnPlane(radial);

  if (tangent.lengthSq() <= 1e-6) {
    tangent.copy(FALLBACK_EAST).projectOnPlane(radial);
  }

  if (tangent.lengthSq() <= 1e-6) {
    return FRONT_VECTOR.clone();
  }

  tangent.normalize();

  return radial
    .multiplyScalar(1 / centerDistance)
    .addScaledVector(
      tangent,
      Math.sqrt(Math.max(0, 1 - 1 / (centerDistance * centerDistance))),
    )
    .normalize();
};

const getGeoRigPosition = (distance: number) => {
  const cameraT = getGeoCameraTransitionT(distance);
  const closeRigLowerT = getGeoCloseRigLowerT(distance);
  const rigHeight = lerp(
    HUMAN_RIG_HEIGHT,
    FINAL_HUMAN_RIG_HEIGHT,
    closeRigLowerT,
  );
  const rigForward = lerp(
    HUMAN_RIG_FORWARD,
    FINAL_HUMAN_RIG_FORWARD,
    closeRigLowerT,
  );

  return new Vector3(
    0,
    lerp(0, rigHeight, cameraT),
    distance + rigForward * cameraT,
  );
};

const getGeoRigTarget = (distance: number, lookPitchDeg?: number) => {
  const position = getGeoRigPosition(distance);
  const lookPitchRadians = getRadiansFromDegrees(
    lookPitchDeg ?? getGeoLookPitchDeg(distance),
  );

  return new Vector3(
    0,
    position.y - Math.tan(lookPitchRadians) * position.z,
    0,
  );
};

const getGeoRigBasis = (distance: number, lookPitchDeg?: number) => {
  const position = getGeoRigPosition(distance);
  const target = getGeoRigTarget(distance, lookPitchDeg);
  const forward = target.clone().sub(position).normalize();
  const right = new Vector3().crossVectors(forward, WORLD_UP);

  if (right.lengthSq() <= 1e-6) {
    return {
      position,
      target,
      forward,
      right: new Vector3(1, 0, 0),
      up: WORLD_UP.clone(),
    };
  }

  right.normalize();

  return {
    position,
    target,
    forward,
    right,
    up: new Vector3().crossVectors(right, forward).normalize(),
  };
};

const getOverviewScreenReference = (
  input: GeoAnchorView,
  pinnedLocal: Vector3,
) => {
  const clampedDistance = clamp(input.distance, MIN_DISTANCE, MAX_DISTANCE);
  const { forward, up } = getGeoRigBasis(clampedDistance);
  const reference = up.clone().projectOnPlane(pinnedLocal);

  if (reference.lengthSq() > 1e-6) {
    return reference.normalize();
  }

  const fallback = forward.clone().projectOnPlane(pinnedLocal);

  if (fallback.lengthSq() > 1e-6) {
    return fallback.normalize();
  }

  return WORLD_UP.clone().projectOnPlane(pinnedLocal).normalize();
};

const solveSurfaceAnchoredRotation = ({
  lat,
  lon,
  headingDeg,
  distance,
  baseFov,
  sourceDistance,
  preserveSourceAnchorNdcY = false,
}: SurfaceAnchoredGeoViewInput) => {
  const clampedDistance = clamp(distance, MIN_DISTANCE, MAX_DISTANCE);
  const linearZoomT = getGeoLinearZoomT(clampedDistance);

  if (linearZoomT <= OVERVIEW_ANCHOR_EPSILON) {
    return quaternionFromCenteredLatLon(lat, lon);
  }

  const anchor = latLonToVector3(lat, lon);
  const preferredAnchorNdcY =
    !preserveSourceAnchorNdcY || sourceDistance == null
      ? undefined
      : solveGeoAnchorNdcY({
          distance: sourceDistance,
          fov: baseFov,
        });
  const pinnedLocal = getOverviewPinnedSurfaceLocal({
    distance: clampedDistance,
    fov: baseFov,
  }, preferredAnchorNdcY == null
    ? undefined
    : solveGeoAnchorNdcYNear(
        {
          distance: clampedDistance,
          fov: baseFov,
        },
        preferredAnchorNdcY,
      ));
  const align = new Quaternion()
    .setFromUnitVectors(anchor, pinnedLocal)
    .normalize();
  const { east, north } = getAnchorTangentBasis(anchor);
  const headingRadians = getRadiansFromDegrees(headingDeg);
  const desiredHeading = north
    .clone()
    .multiplyScalar(Math.cos(headingRadians))
    .add(east.clone().multiplyScalar(Math.sin(headingRadians)))
    .normalize();
  const alignedHeading = desiredHeading
    .clone()
    .applyQuaternion(align)
    .projectOnPlane(pinnedLocal);

  if (alignedHeading.lengthSq() <= 1e-6) {
    return align;
  }

  alignedHeading.normalize();
  const screenReference = getOverviewScreenReference(
    {
      distance: clampedDistance,
      fov: baseFov,
    },
    pinnedLocal,
  );
  const twist = new Quaternion().setFromAxisAngle(
    pinnedLocal,
    signedAngleAroundAxis(alignedHeading, screenReference, pinnedLocal),
  );

  return twist.multiply(align).normalize();
};

export const getCloseZoomInfluence = (distance: number) => {
  const closeRange = DEFAULT_DISTANCE - MIN_DISTANCE;

  if (closeRange <= 0) {
    return 1;
  }

  return smoothstep(
    clamp((DEFAULT_DISTANCE - distance) / closeRange, 0, 1),
  );
};

export const getGeoControlMode = (distance: number): GeoControlMode => {
  const influence = getCloseZoomInfluence(distance);

  if (influence < GEO_OVERVIEW_ENTER_THRESHOLD) {
    return 'orbit';
  }

  if (influence < HEADING_SPIN_THRESHOLD) {
    return 'surface-pan';
  }

  return 'heading-spin';
};

export const isHumanViewActive = (distance: number) =>
  getGeoControlMode(distance) !== 'orbit';

export const getGeoCameraCenterDistance = (distance: number) =>
  getGeoRigPosition(clamp(distance, MIN_DISTANCE, MAX_DISTANCE)).length();

export const getGeoAngularRadius = (distance: number) =>
  Math.asin(1 / getGeoCameraCenterDistance(distance));

export const getGeoApparentScale = ({
  distance,
  effectiveFov,
}: GeoApparentScaleInput) =>
  Math.tan(getGeoAngularRadius(distance)) /
  Math.tan(getRadiansFromDegrees(clamp(effectiveFov, 1, 179)) / 2);

export const getGeoProjectedSphereRadiusPx = (
  view: GeoAnchorView,
  viewportHeight: number,
) =>
  getGeoApparentScale({
    distance: clamp(view.distance, MIN_DISTANCE, MAX_DISTANCE),
    effectiveFov: getGeoEffectiveFov(view),
  }) *
  (viewportHeight / 2);

const getGeoBaseApparentScale = (baseFov: number) =>
  getGeoApparentScale({
    distance: DEFAULT_DISTANCE,
    effectiveFov: baseFov,
  });

export const getGeoTargetApparentScale = (view: GeoAnchorView) => {
  const clampedDistance = clamp(view.distance, MIN_DISTANCE, MAX_DISTANCE);
  const baseFov = clamp(view.fov, 1, 179);
  const sizeT = getGeoCameraTransitionT(clampedDistance);

  return lerp(
    getGeoBaseApparentScale(baseFov),
    FINAL_APPARENT_SCALE,
    sizeT,
  );
};

export const solveGeoEffectiveFov = (view: GeoAnchorView) => {
  const clampedDistance = clamp(view.distance, MIN_DISTANCE, MAX_DISTANCE);
  const baseFov = clamp(view.fov, 1, 179);
  const cameraT = getGeoCameraTransitionT(clampedDistance);

  if (cameraT <= 1e-6) {
    return baseFov;
  }

  const effectiveFov = getDegreesFromRadians(
    2 *
      Math.atan(
        Math.tan(getGeoAngularRadius(clampedDistance)) /
          getGeoTargetApparentScale({
            distance: clampedDistance,
            fov: baseFov,
          }),
      ),
  );

  return clamp(
    effectiveFov,
    1,
    Math.max(baseFov, MAX_NATURAL_EFFECTIVE_FOV),
  );
};

export const getGeoEffectiveFov = (view: GeoAnchorView) =>
  solveGeoEffectiveFov(view);

const getSilhouetteBasis = (axis: Vector3) => {
  const tangent = new Vector3().crossVectors(WORLD_UP, axis);

  if (tangent.lengthSq() <= 1e-6) {
    tangent.copy(FALLBACK_EAST).projectOnPlane(axis);
  }

  tangent.normalize();

  return {
    tangent,
    bitangent: new Vector3().crossVectors(axis, tangent).normalize(),
  };
};

export const getGeoViewportCoverage = (
  view: GeoAnchorView,
  viewportWidth: number,
  viewportHeight: number,
) => {
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return {
      widthFraction: 0,
      heightFraction: 0,
    };
  }

  const { position, target, effectiveFov } = getGeoCameraPose({
    rotation: [0, 0, 0, 1],
    distance: view.distance,
    fov: view.fov,
  });
  const camera = new PerspectiveCamera(
    effectiveFov,
    viewportWidth / viewportHeight,
    0.01,
    1000,
  );

  camera.position.set(position[0], position[1], position[2]);
  camera.up.copy(WORLD_UP);
  camera.lookAt(target[0], target[1], target[2]);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();

  const cameraOffset = camera.position.clone();
  const centerDistance = cameraOffset.length();

  if (centerDistance <= VISUAL_GLOBE_RADIUS) {
    return {
      widthFraction: 1,
      heightFraction: 1,
    };
  }

  const centerToCamera = cameraOffset.clone().normalize();
  const circleCenter = centerToCamera
    .clone()
    .multiplyScalar(
      (VISUAL_GLOBE_RADIUS * VISUAL_GLOBE_RADIUS) / centerDistance,
    );
  const circleRadius = Math.sqrt(
    Math.max(
      0,
      VISUAL_GLOBE_RADIUS * VISUAL_GLOBE_RADIUS -
        (VISUAL_GLOBE_RADIUS ** 4) / (centerDistance * centerDistance),
    ),
  );
  const { tangent, bitangent } = getSilhouetteBasis(centerToCamera);

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let step = 0; step < 96; step += 1) {
    const theta = (step / 96) * Math.PI * 2;
    const sample = circleCenter
      .clone()
      .addScaledVector(tangent, Math.cos(theta) * circleRadius)
      .addScaledVector(bitangent, Math.sin(theta) * circleRadius)
      .project(camera);

    minX = Math.min(minX, sample.x);
    maxX = Math.max(maxX, sample.x);
    minY = Math.min(minY, sample.y);
    maxY = Math.max(maxY, sample.y);
  }

  return {
    widthFraction: (maxX - minX) / 2,
    heightFraction: (maxY - minY) / 2,
  };
};

export const getResponsiveStartupGeoView = (
  view: GlobeViewState,
  viewportWidth: number,
  viewportHeight: number,
) => {
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return view;
  }
  const clampedDistance = clamp(view.distance, MIN_DISTANCE, MAX_DISTANCE);

  const fitsViewport = (distance: number) => {
    const coverage = getGeoViewportCoverage(
      {
        distance,
        fov: view.fov,
      },
      viewportWidth,
      viewportHeight,
    );

    return (
      coverage.widthFraction <= STARTUP_VIEWPORT_FIT_MARGIN &&
      coverage.heightFraction <= STARTUP_VIEWPORT_FIT_MARGIN
    );
  };

  if (fitsViewport(clampedDistance)) {
    return {
      ...view,
      distance: clampedDistance,
    };
  }

  if (!fitsViewport(MAX_DISTANCE)) {
    return {
      ...view,
      distance: MAX_DISTANCE,
    };
  }

  let low = clampedDistance;
  let high = MAX_DISTANCE;

  for (let iteration = 0; iteration < 20; iteration += 1) {
    const mid = (low + high) / 2;

    if (fitsViewport(mid)) {
      high = mid;
    } else {
      low = mid;
    }
  }

  const nextDistance = high;

  if (Math.abs(nextDistance - clampedDistance) < 1e-3) {
    return {
      ...view,
      distance: clampedDistance,
    };
  }

  return {
    ...view,
    distance: nextDistance,
  };
};

const solveOverviewPinnedSurface = (
  view: GeoAnchorView,
  anchorNdcYOverride?: number,
): { point: Vector3; debug: GeoPinnedSurfaceDebug } => {
  const clampedView = {
    distance: clamp(view.distance, MIN_DISTANCE, MAX_DISTANCE),
    fov: clamp(view.fov, 1, 179),
  } satisfies GeoAnchorView;
  const requestedAnchorNdcY =
    anchorNdcYOverride ?? solveGeoAnchorNdcY(clampedView);

  if (getGeoLinearZoomT(clampedView.distance) <= OVERVIEW_ANCHOR_EPSILON) {
    return {
      point: FRONT_VECTOR.clone(),
      debug: {
        anchorNdcY: requestedAnchorNdcY,
        rayFallbackUsed: false,
      },
    };
  }

  const { position, forward, up } = getGeoRigBasis(clampedView.distance);
  const tanHalfFov = Math.tan(
    (getGeoEffectiveFov(clampedView) * Math.PI) / 360,
  );
  const getAnchorRay = (anchorNdcY: number) =>
    forward
      .clone()
      .addScaledVector(up, anchorNdcY * tanHalfFov)
      .normalize();

  const directHit = getSphereRayHit(position, getAnchorRay(requestedAnchorNdcY));

  if (directHit) {
    return {
      point: directHit,
      debug: {
        anchorNdcY: requestedAnchorNdcY,
        rayFallbackUsed: false,
      },
    };
  }

  const centerHit = getSphereRayHit(position, getAnchorRay(0));

  if (!centerHit) {
    return {
      point: getSphereTangentPoint(position, getAnchorRay(requestedAnchorNdcY)),
      debug: {
        anchorNdcY: requestedAnchorNdcY,
        rayFallbackUsed: true,
      },
    };
  }

  let missBound = requestedAnchorNdcY;
  let hitBound = 0;
  let candidate = centerHit;
  let candidateNdcY = 0;

  for (let iteration = 0; iteration < 8; iteration += 1) {
    const mid = (missBound + hitBound) / 2;
    const midHit = getSphereRayHit(position, getAnchorRay(mid));

    if (midHit) {
      candidate = midHit;
      candidateNdcY = mid;
      hitBound = mid;
    } else {
      missBound = mid;
    }
  }

  return {
      point: candidate,
      debug: {
        anchorNdcY: candidateNdcY,
        rayFallbackUsed: true,
      },
    };
};

const getGeoSurfaceAngleForAnchorNdcY = (
  view: GeoAnchorView,
  anchorNdcY: number,
) => {
  const clampedView = {
    distance: clamp(view.distance, MIN_DISTANCE, MAX_DISTANCE),
    fov: clamp(view.fov, 1, 179),
  } satisfies GeoAnchorView;
  const { forward } = getGeoRigBasis(clampedView.distance);
  const { point } = solveOverviewPinnedSurface(clampedView, anchorNdcY);

  return getDegreesFromRadians(
    Math.acos(clamp(forward.dot(point), -1, 1)),
  );
};

export const getGeoActualAxisScreenY = (
  view: GeoAnchorView,
  anchorNdcYOverride?: number,
) => {
  const clampedView = {
    distance: clamp(view.distance, MIN_DISTANCE, MAX_DISTANCE),
    fov: clamp(view.fov, 1, 179),
  } satisfies GeoAnchorView;
  const { point } = solveOverviewPinnedSurface(clampedView, anchorNdcYOverride);
  const position = getGeoRigPosition(clampedView.distance);
  const target = getGeoRigTarget(clampedView.distance);

  AXIS_SCREEN_CAMERA.position.copy(position);
  AXIS_SCREEN_CAMERA.up.copy(WORLD_UP);
  AXIS_SCREEN_CAMERA.fov = getGeoEffectiveFov(clampedView);
  AXIS_SCREEN_CAMERA.aspect = 1;
  AXIS_SCREEN_CAMERA.lookAt(target);
  AXIS_SCREEN_CAMERA.updateMatrixWorld(true);
  AXIS_SCREEN_CAMERA.updateProjectionMatrix();

  return (
    1 - AXIS_SCREEN_PROJECTED_POINT.copy(point).project(AXIS_SCREEN_CAMERA).y
  ) / 2;
};

export const getGeoActualVisibleEarthTopScreenY = (
  view: GeoAnchorView,
  lookPitchDegOverride?: number,
) => {
  const clampedView = {
    distance: clamp(view.distance, MIN_DISTANCE, MAX_DISTANCE),
    fov: clamp(view.fov, 1, 179),
  } satisfies GeoAnchorView;
  const position = getGeoRigPosition(clampedView.distance);
  const lookPitchDeg =
    lookPitchDegOverride ?? getGeoLookPitchDeg(clampedView.distance);
  const { forward, up } = getGeoRigBasis(clampedView.distance, lookPitchDeg);
  const tanHalfFov = Math.tan(
    (getGeoEffectiveFov(clampedView) * Math.PI) / 360,
  );
  const intersectsAtScreenY = (screenY: number) =>
    getSphereRayHit(
      position,
      forward
        .clone()
        .addScaledVector(up, (1 - screenY * 2) * tanHalfFov)
        .normalize(),
    ) != null;

  if (intersectsAtScreenY(0)) {
    return 0;
  }

  if (!intersectsAtScreenY(1)) {
    return 1;
  }

  let low = 0;
  let high = 1;

  for (let iteration = 0; iteration < 20; iteration += 1) {
    const mid = (low + high) / 2;

    if (intersectsAtScreenY(mid)) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return high;
};

const getAnchorScreenYError = (screenY: number, desiredScreenY: number) =>
  Math.abs(screenY - desiredScreenY);

let lastSolvedAnchorInput:
  | { distance: number; fov: number; anchorNdcY: number }
  | null = null;

const solveGeoAnchorNdcY = (view: GeoAnchorView) => {
  const clampedView = {
    distance: clamp(view.distance, MIN_DISTANCE, MAX_DISTANCE),
    fov: clamp(view.fov, 1, 179),
  } satisfies GeoAnchorView;

  if (
    lastSolvedAnchorInput &&
    lastSolvedAnchorInput.distance === clampedView.distance &&
    lastSolvedAnchorInput.fov === clampedView.fov
  ) {
    return lastSolvedAnchorInput.anchorNdcY;
  }

  if (getGeoLinearZoomT(clampedView.distance) <= OVERVIEW_ANCHOR_EPSILON) {
    return 0;
  }

  const desiredScreenY = getGeoDesiredAxisScreenY(clampedView.distance);
  let best = {
    anchorNdcY: 0,
    screenY: getGeoActualAxisScreenY(clampedView, 0),
  };
  let step = Math.abs(MIN_SURFACE_ANCHOR_NDC_Y) /
    Math.max(SURFACE_ANGLE_SOLVER_SAMPLES - 1, 1);

  for (let index = 1; index < SURFACE_ANGLE_SOLVER_SAMPLES; index += 1) {
    const anchorNdcY = -step * index;
    const screenY = getGeoActualAxisScreenY(clampedView, anchorNdcY);

    if (
      getAnchorScreenYError(screenY, desiredScreenY) <
        getAnchorScreenYError(best.screenY, desiredScreenY) ||
      (getAnchorScreenYError(screenY, desiredScreenY) ===
        getAnchorScreenYError(best.screenY, desiredScreenY) &&
        anchorNdcY > best.anchorNdcY)
    ) {
      best = { anchorNdcY, screenY };
    }
  }

  for (
    let iteration = 0;
    iteration < SURFACE_ANGLE_SOLVER_REFINEMENTS;
    iteration += 1
  ) {
    step /= 2;
    let refinedBest = best;

    for (const direction of [-1, 1]) {
      const anchorNdcY = clamp(
        best.anchorNdcY + direction * step,
        MIN_SURFACE_ANCHOR_NDC_Y,
        0,
      );
      const screenY = getGeoActualAxisScreenY(clampedView, anchorNdcY);

      if (
        getAnchorScreenYError(screenY, desiredScreenY) <
          getAnchorScreenYError(refinedBest.screenY, desiredScreenY) ||
        (getAnchorScreenYError(screenY, desiredScreenY) ===
          getAnchorScreenYError(refinedBest.screenY, desiredScreenY) &&
          anchorNdcY > refinedBest.anchorNdcY)
      ) {
        refinedBest = { anchorNdcY, screenY };
      }
    }

    best = refinedBest;
  }

  lastSolvedAnchorInput = {
    distance: clampedView.distance,
    fov: clampedView.fov,
    anchorNdcY: best.anchorNdcY,
  };

  return best.anchorNdcY;
};

const solveGeoAnchorNdcYNear = (
  view: GeoAnchorView,
  preferredAnchorNdcY: number,
) => {
  const clampedView = {
    distance: clamp(view.distance, MIN_DISTANCE, MAX_DISTANCE),
    fov: clamp(view.fov, 1, 179),
  } satisfies GeoAnchorView;

  if (getGeoLinearZoomT(clampedView.distance) <= OVERVIEW_ANCHOR_EPSILON) {
    return 0;
  }

  const desiredScreenY = getGeoDesiredAxisScreenY(clampedView.distance);
  let best = {
    anchorNdcY: clamp(preferredAnchorNdcY, MIN_SURFACE_ANCHOR_NDC_Y, 0),
    screenY: 0,
  };

  best.screenY = getGeoActualAxisScreenY(clampedView, best.anchorNdcY);

  let step = Math.abs(MIN_SURFACE_ANCHOR_NDC_Y) / 4;

  for (
    let iteration = 0;
    iteration < SURFACE_ANGLE_SOLVER_REFINEMENTS + 2;
    iteration += 1
  ) {
    let refinedBest = best;

    for (const direction of [-1, 1]) {
      const anchorNdcY = clamp(
        best.anchorNdcY + direction * step,
        MIN_SURFACE_ANCHOR_NDC_Y,
        0,
      );
      const screenY = getGeoActualAxisScreenY(clampedView, anchorNdcY);

      if (
        getAnchorScreenYError(screenY, desiredScreenY) <
          getAnchorScreenYError(refinedBest.screenY, desiredScreenY) ||
        (getAnchorScreenYError(screenY, desiredScreenY) ===
          getAnchorScreenYError(refinedBest.screenY, desiredScreenY) &&
          Math.abs(anchorNdcY - preferredAnchorNdcY) <
            Math.abs(refinedBest.anchorNdcY - preferredAnchorNdcY))
      ) {
        refinedBest = { anchorNdcY, screenY };
      }
    }

    best = refinedBest;
    step /= 2;
  }

  return best.anchorNdcY;
};

export const getGeoActualSurfaceAngleDeg = (
  view: GeoAnchorView,
  anchorNdcYOverride?: number,
) =>
  getGeoSurfaceAngleForAnchorNdcY(
    view,
    anchorNdcYOverride ?? solveGeoAnchorNdcY(view),
  );

export const getGeoAnchorNdcY = (distance: number) =>
  solveGeoAnchorNdcY({
    distance,
    fov: DEFAULT_FOV,
  });

export const getGeoAnchorScreenY = (distance: number) =>
  getGeoActualAxisScreenY({
    distance,
    fov: DEFAULT_FOV,
  });

export const getOverviewPinnedSurfaceDebug = (
  view: GeoAnchorView,
  anchorNdcYOverride?: number,
): GeoPinnedSurfaceDebug =>
  solveOverviewPinnedSurface(view, anchorNdcYOverride).debug;

export const getOverviewPinnedSurfaceLocal = (
  view: GeoAnchorView,
  anchorNdcYOverride?: number,
) => {
  const { point } = solveOverviewPinnedSurface(view, anchorNdcYOverride);

  return point;
};

export const getPinnedSurfaceLocal = getOverviewPinnedSurfaceLocal;

const getGeoAxisSurfaceLocalForDistance = (
  view: GlobeViewState,
  sourceDistance = view.distance,
) =>
  getOverviewPinnedSurfaceLocal({
    distance: sourceDistance,
    fov: view.fov,
  })
    .applyQuaternion(quaternionFromArray(view.rotation).clone().invert())
    .normalize();

export const getGeoAxisSurfaceLocal = (view: GlobeViewState) =>
  getGeoAxisSurfaceLocalForDistance(view);

export const getGeoAxisMarkerLocal = (view: GlobeViewState) => {
  const rotation = quaternionFromArray(view.rotation);
  const axisWorld = getGeoAxisSurfaceLocal(view)
    .clone()
    .applyQuaternion(rotation);
  const cameraWorld = new Vector3(...getGeoCameraPose(view).position);
  const liftedWorld = axisWorld
    .clone()
    .addScaledVector(
      cameraWorld.clone().sub(axisWorld).normalize(),
      GEO_AXIS_MARKER_CAMERA_LIFT,
    );

  return liftedWorld.applyQuaternion(rotation.clone().invert());
};

export const deriveGeoCenteredAnchor = (
  view: GlobeViewState,
): GeoOverviewAnchor => {
  const center = vector3ToLatLon(
    getViewCenterLocal(quaternionFromArray(view.rotation)),
  );

  return {
    lat: center.lat,
    lon: center.lon,
  };
};

export const deriveSurfaceAnchor = (
  view: GlobeViewState,
  sourceDistance = view.distance,
) => {
  const center = vector3ToLatLon(
    getGeoAxisSurfaceLocalForDistance(view, sourceDistance),
  );

  return {
    anchorLat: center.lat,
    anchorLon: center.lon,
  };
};

export const deriveGeoOverviewHeading = (
  view: GlobeViewState,
  anchor: GeoOverviewAnchor,
) => {
  const rotation = quaternionFromArray(view.rotation);
  const anchorVector = latLonToVector3(anchor.lat, anchor.lon);
  const screenReference = getOverviewScreenReference(
    view,
    getOverviewPinnedSurfaceLocal(view),
  );
  const localReference = screenReference
    .clone()
    .applyQuaternion(rotation.clone().invert())
    .projectOnPlane(anchorVector);

  if (localReference.lengthSq() <= 1e-6) {
    return 0;
  }

  localReference.normalize();
  const { east, north } = getAnchorTangentBasis(anchorVector);

  return normalizeHeading(
    getDegreesFromRadians(
      Math.atan2(localReference.dot(east), localReference.dot(north)),
    ),
  );
};

export function surfaceAnchoredGeoView(
  input: SurfaceAnchoredGeoViewInput,
): GlobeViewState;
export function surfaceAnchoredGeoView(
  lat: number,
  lon: number,
  distance: number,
  baseFov: number,
  headingDeg?: number,
): GlobeViewState;
export function surfaceAnchoredGeoView(
  inputOrLat: SurfaceAnchoredGeoViewInput | number,
  lon?: number,
  distance?: number,
  baseFov?: number,
  headingDeg = 0,
): GlobeViewState {
  const {
    lat,
    lon: resolvedLon,
    headingDeg: resolvedHeadingDeg,
    distance: resolvedDistance,
    baseFov: resolvedBaseFov,
    sourceDistance: resolvedSourceDistance,
    preserveSourceAnchorNdcY: resolvedPreserveSourceAnchorNdcY = false,
  } =
    typeof inputOrLat === 'number'
      ? {
          lat: inputOrLat,
          lon: lon ?? 0,
          headingDeg,
          distance: distance ?? DEFAULT_DISTANCE,
          baseFov: baseFov ?? DEFAULT_FOV,
          sourceDistance: undefined,
          preserveSourceAnchorNdcY: false,
        }
      : inputOrLat;
  const clampedDistance = clamp(resolvedDistance, MIN_DISTANCE, MAX_DISTANCE);
  const normalizedLat = clamp(lat, -89.5, 89.5);
  const normalizedLon = wrapLongitude(resolvedLon);
  const normalizedHeading = normalizeHeading(resolvedHeadingDeg);
  const normalizedFov = clamp(resolvedBaseFov, 1, 179);

  if (getGeoLinearZoomT(clampedDistance) <= OVERVIEW_ANCHOR_EPSILON) {
    return {
      ...viewFromLatLon(normalizedLat, normalizedLon, clampedDistance, 0),
      fov: normalizedFov,
    };
  }

  const rotation = solveSurfaceAnchoredRotation({
    lat: normalizedLat,
    lon: normalizedLon,
    headingDeg: normalizedHeading,
    distance: clampedDistance,
    baseFov: normalizedFov,
    sourceDistance: resolvedSourceDistance,
    preserveSourceAnchorNdcY: resolvedPreserveSourceAnchorNdcY,
  });

  return {
    rotation: quaternionToArray(rotation),
    distance: clampedDistance,
    fov: normalizedFov,
  };
}

export const applyHumanViewConstraint = (
  view: GlobeViewState,
  input: HumanViewConstraintInput | number = {},
): GlobeViewState => {
  const resolvedInput =
    typeof input === 'number' ? { sourceDistance: input } : input;
  const distance = clamp(view.distance, MIN_DISTANCE, MAX_DISTANCE);
  const baseFov = clamp(view.fov, 1, 179);
  const linearZoomT = getGeoLinearZoomT(distance);
  const sourceDistance = resolvedInput.sourceDistance ?? distance;
  const sourceLinearZoomT = getGeoLinearZoomT(sourceDistance);

  if (linearZoomT <= OVERVIEW_ANCHOR_EPSILON) {
    return {
      ...view,
      distance,
      fov: baseFov,
    };
  }

  let anchor = resolvedInput.anchor ?? null;
  let headingDeg = resolvedInput.headingDeg ?? 0;
  let preserveSourceAnchorNdcY = false;

  if (!anchor && linearZoomT > OVERVIEW_ANCHOR_EPSILON) {
    const fallbackView = {
      ...view,
      distance,
      fov: baseFov,
    };
    const preservedAnchor = deriveSurfaceAnchor(fallbackView, sourceDistance);
    anchor = {
      lat: preservedAnchor.anchorLat,
      lon: preservedAnchor.anchorLon,
    };
    headingDeg = deriveGeoOverviewHeading(fallbackView, anchor);
    preserveSourceAnchorNdcY = true;
  } else if (
    anchor &&
    linearZoomT >= CLOSE_ANCHOR_HINT_START_T &&
    sourceLinearZoomT >= CLOSE_ANCHOR_HINT_START_T
  ) {
    preserveSourceAnchorNdcY = true;
  }

  if (!anchor) {
    return {
      ...view,
      distance,
      fov: baseFov,
    };
  }

  return surfaceAnchoredGeoView({
    lat: anchor.lat,
    lon: anchor.lon,
    headingDeg,
    distance,
    baseFov,
    sourceDistance,
    preserveSourceAnchorNdcY,
  });
};

export const constrainGeoViewForCloseZoom = applyHumanViewConstraint;

export const stepHumanViewYaw = (
  view: GlobeViewState,
  deltaDeg: number,
) => {
  const anchor = deriveSurfaceAnchor(view);

  return surfaceAnchoredGeoView({
    lat: anchor.anchorLat,
    lon: wrapLongitude(anchor.anchorLon + deltaDeg),
    headingDeg: deriveGeoOverviewHeading(view, {
      lat: anchor.anchorLat,
      lon: anchor.anchorLon,
    }),
    distance: view.distance,
    baseFov: view.fov,
  });
};

export const stepHumanViewPitch = (
  view: GlobeViewState,
  deltaDeg: number,
) => {
  const anchor = deriveSurfaceAnchor(view);

  return surfaceAnchoredGeoView({
    lat: clamp(anchor.anchorLat + deltaDeg, -89.5, 89.5),
    lon: anchor.anchorLon,
    headingDeg: deriveGeoOverviewHeading(view, {
      lat: anchor.anchorLat,
      lon: anchor.anchorLon,
    }),
    distance: view.distance,
    baseFov: view.fov,
  });
};

export const stepGeoOverviewHeading = (
  headingDeg: number,
  deltaDeg: number,
) => normalizeHeading(headingDeg + deltaDeg);

export const stepGeoOverviewAnchor = (
  anchor: GeoOverviewAnchor,
  deltaLonDeg: number,
  deltaLatDeg: number,
): GeoOverviewAnchor => ({
  lat: clamp(anchor.lat + deltaLatDeg, -89.5, 89.5),
  lon: wrapLongitude(anchor.lon + deltaLonDeg),
});

export const moveGeoOverviewAnchor = (
  anchor: GeoOverviewAnchor,
  distance: number,
  deltaX: number,
  deltaY: number,
  rect: DOMRect,
): GeoOverviewAnchor => {
  const influence = getGeoCameraTransitionT(distance);
  const lonScale =
    DEFAULT_SURFACE_LON_DEG +
    (FULL_WIDTH_SURFACE_LON_DEG - DEFAULT_SURFACE_LON_DEG) * influence;
  const latScale =
    DEFAULT_SURFACE_LAT_DEG +
    (FULL_HEIGHT_SURFACE_LAT_DEG - DEFAULT_SURFACE_LAT_DEG) * influence;

  return stepGeoOverviewAnchor(
    anchor,
    -(deltaX / Math.max(rect.width, 1)) * lonScale,
    -(deltaY / Math.max(rect.height, 1)) * latScale,
  );
};

export const getGeoCameraPose = (view: GlobeViewState): GeoCameraState => {
  const distance = clamp(view.distance, MIN_DISTANCE, MAX_DISTANCE);
  const cameraT = getGeoCameraTransitionT(distance);
  const effectiveFov = getGeoEffectiveFov(view);

  if (cameraT <= OVERVIEW_ANCHOR_EPSILON) {
    return {
      position: [0, 0, distance],
      target: [0, 0, 0],
      effectiveFov,
    };
  }

  const position = getGeoRigPosition(distance);
  const target = getGeoRigTarget(distance);

  return {
    position: [position.x, position.y, position.z],
    target: [target.x, target.y, target.z],
    effectiveFov,
  };
};
