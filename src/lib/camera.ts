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
};
type HumanViewConstraintInput = {
  sourceDistance?: number;
  anchor?: GeoOverviewAnchor | null;
  headingDeg?: number;
};

const ANCHOR_SHIFT_POWER = 1.6;
export const GEO_OVERVIEW_ENTER_THRESHOLD = 0.35;
export const GEO_OVERVIEW_EXIT_THRESHOLD = 0.2;
const HEADING_SPIN_THRESHOLD = 0.9;
const MAX_ANCHOR_SCREEN_Y = 0.88;
const FINAL_APPARENT_SCALE = 2.85;
const APPARENT_SCALE_POWER = 1.35;
const MAX_NATURAL_EFFECTIVE_FOV = 42;
const OVERVIEW_ANCHOR_EPSILON = 1e-4;

const HUMAN_RIG_HEIGHT = 1.58;
const HUMAN_RIG_FORWARD = 0.1;
const HUMAN_TARGET_HEIGHT = 1.04;
const HUMAN_TARGET_FORWARD = 0;

const FULL_WIDTH_SURFACE_LON_DEG = 110;
const FULL_HEIGHT_SURFACE_LAT_DEG = 70;
const DEFAULT_SURFACE_LON_DEG = 26;
const DEFAULT_SURFACE_LAT_DEG = 18;

const WORLD_UP = new Vector3(0, 1, 0);
const FALLBACK_EAST = new Vector3(0, 0, -1);
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

const getGeoRigPosition = (distance: number) => {
  const influence = getCloseZoomInfluence(distance);

  return new Vector3(
    0,
    HUMAN_RIG_HEIGHT * influence,
    distance + HUMAN_RIG_FORWARD * influence,
  );
};

const getGeoRigTarget = (distance: number) => {
  const influence = getCloseZoomInfluence(distance);

  return new Vector3(
    0,
    HUMAN_TARGET_HEIGHT * influence,
    HUMAN_TARGET_FORWARD * influence,
  );
};

const getGeoRigBasis = (distance: number) => {
  const position = getGeoRigPosition(distance);
  const target = getGeoRigTarget(distance);
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

const getGeoAnchorShiftT = (distance: number) =>
  getCloseZoomInfluence(distance) ** ANCHOR_SHIFT_POWER;

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
}: SurfaceAnchoredGeoViewInput) => {
  const clampedDistance = clamp(distance, MIN_DISTANCE, MAX_DISTANCE);

  if (getCloseZoomInfluence(clampedDistance) <= 1e-6) {
    return quaternionFromCenteredLatLon(lat, lon);
  }

  const anchor = latLonToVector3(lat, lon);
  const pinnedLocal = getOverviewPinnedSurfaceLocal({
    distance: clampedDistance,
    fov: baseFov,
  });
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

export const getGeoAnchorScreenY = (distance: number) =>
  lerp(0.5, MAX_ANCHOR_SCREEN_Y, getGeoAnchorShiftT(distance));

export const getGeoAnchorNdcY = (distance: number) =>
  1 - getGeoAnchorScreenY(distance) * 2;

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
  const sizeT = getCloseZoomInfluence(clampedDistance) ** APPARENT_SCALE_POWER;

  return lerp(
    getGeoBaseApparentScale(baseFov),
    FINAL_APPARENT_SCALE,
    sizeT,
  );
};

export const solveGeoEffectiveFov = (view: GeoAnchorView) => {
  const clampedDistance = clamp(view.distance, MIN_DISTANCE, MAX_DISTANCE);
  const baseFov = clamp(view.fov, 1, 179);
  const influence = getCloseZoomInfluence(clampedDistance);

  if (influence <= 1e-6) {
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
  const clampedDistance = clamp(view.distance, MIN_DISTANCE, MAX_DISTANCE);
  const influence = getCloseZoomInfluence(clampedDistance);
  const requestedAnchorNdcY =
    anchorNdcYOverride ?? getGeoAnchorNdcY(clampedDistance);

  if (influence <= 1e-6) {
    return {
      point: FRONT_VECTOR.clone(),
      debug: {
        anchorNdcY: requestedAnchorNdcY,
        rayFallbackUsed: false,
      },
    };
  }

  const { position, forward, up } = getGeoRigBasis(clampedDistance);
  const tanHalfFov = Math.tan(
    (getGeoEffectiveFov({
      distance: clampedDistance,
      fov: view.fov,
    }) *
      Math.PI) /
      360,
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
      point: FRONT_VECTOR.clone(),
      debug: {
        anchorNdcY: 0,
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
  const rotation = quaternionFromArray(view.rotation);
  const center = vector3ToLatLon(
    getOverviewPinnedSurfaceLocal({
      distance: sourceDistance,
      fov: view.fov,
    })
      .applyQuaternion(rotation.clone().invert())
      .normalize(),
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
  } =
    typeof inputOrLat === 'number'
      ? {
          lat: inputOrLat,
          lon: lon ?? 0,
          headingDeg,
          distance: distance ?? DEFAULT_DISTANCE,
          baseFov: baseFov ?? DEFAULT_FOV,
        }
      : inputOrLat;
  const clampedDistance = clamp(resolvedDistance, MIN_DISTANCE, MAX_DISTANCE);
  const normalizedLat = clamp(lat, -89.5, 89.5);
  const normalizedLon = wrapLongitude(resolvedLon);
  const normalizedHeading = normalizeHeading(resolvedHeadingDeg);
  const normalizedFov = clamp(resolvedBaseFov, 1, 179);

  if (getCloseZoomInfluence(clampedDistance) <= 1e-6) {
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
  const influence = getCloseZoomInfluence(distance);
  const sourceDistance = resolvedInput.sourceDistance ?? distance;

  if (influence <= 1e-6) {
    return {
      ...view,
      distance,
      fov: baseFov,
    };
  }

  let anchor = resolvedInput.anchor ?? null;
  let headingDeg = resolvedInput.headingDeg ?? 0;

  if (!anchor && influence > OVERVIEW_ANCHOR_EPSILON) {
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
  const influence = getCloseZoomInfluence(distance);
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
  const influence = getCloseZoomInfluence(distance);
  const effectiveFov = getGeoEffectiveFov(view);

  if (influence <= 1e-6) {
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
