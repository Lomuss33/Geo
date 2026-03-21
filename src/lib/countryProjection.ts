import { PerspectiveCamera, Vector3 } from 'three';
import { getGeoCameraPose } from './camera';
import type { CountryPolygon } from './countryGeometry';
import { latLonToVector3 } from './geo';
import { clamp, quaternionFromArray } from './math';
import type { GlobeViewState } from '../state/viewerStore';

export type CountryProjectionBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type CountryProjectionResult = {
  path: string;
  bounds: CountryProjectionBounds | null;
  hasVisibleGeometry: boolean;
};

type CountryProjectionInput = {
  view: GlobeViewState;
  viewportWidth: number;
  viewportHeight: number;
};

type ViewportPoint = {
  x: number;
  y: number;
};

const SEGMENT_ANGLE_LIMIT = (2.5 * Math.PI) / 180;
const HORIZON_CLIP_ITERATIONS = 12;

const formatPathNumber = (value: number) => value.toFixed(2);

const slerpUnitVectors = (start: Vector3, end: Vector3, t: number) => {
  const dot = clamp(start.dot(end), -1, 1);
  const angle = Math.acos(dot);

  if (angle <= 1e-6) {
    return start.clone();
  }

  const sinAngle = Math.sin(angle);

  if (Math.abs(sinAngle) <= 1e-6) {
    return start.clone().lerp(end, t).normalize();
  }

  return start
    .clone()
    .multiplyScalar(Math.sin((1 - t) * angle) / sinAngle)
    .addScaledVector(end, Math.sin(t * angle) / sinAngle)
    .normalize();
};

const densifyRing = (ring: CountryPolygon['rings'][number]) => {
  if (ring.length === 0) {
    return [];
  }

  const vertices = ring.map(([lng, lat]) => latLonToVector3(lat, lng));
  const densified = [vertices[0]!.clone()];

  for (let index = 0; index < vertices.length - 1; index += 1) {
    const start = vertices[index]!;
    const end = vertices[index + 1]!;
    const angle = Math.acos(clamp(start.dot(end), -1, 1));
    const stepCount = Math.max(1, Math.ceil(angle / SEGMENT_ANGLE_LIMIT));

    for (let step = 1; step <= stepCount; step += 1) {
      densified.push(slerpUnitVectors(start, end, step / stepCount));
    }
  }

  return densified;
};

const createCamera = (
  view: GlobeViewState,
  viewportWidth: number,
  viewportHeight: number,
) => {
  const cameraPose = getGeoCameraPose(view);
  const camera = new PerspectiveCamera(
    cameraPose.effectiveFov,
    viewportWidth / viewportHeight,
    0.01,
    1000,
  );

  camera.position.set(...cameraPose.position);
  camera.up.set(0, 1, 0);
  camera.lookAt(...cameraPose.target);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();

  return camera;
};

const isFrontVisible = (point: Vector3, cameraPosition: Vector3) =>
  point.dot(cameraPosition.clone().sub(point)) > 1e-5;

const projectWorldPoint = (
  point: Vector3,
  camera: PerspectiveCamera,
  viewportWidth: number,
  viewportHeight: number,
): ViewportPoint => {
  const projected = point.clone().project(camera);

  return {
    x: ((projected.x + 1) / 2) * viewportWidth,
    y: ((1 - projected.y) / 2) * viewportHeight,
  };
};

const findHorizonPoint = (
  start: Vector3,
  end: Vector3,
  rotation: ReturnType<typeof quaternionFromArray>,
  cameraPosition: Vector3,
  startVisible: boolean,
) => {
  let visibleT = startVisible ? 0 : 1;
  let hiddenT = startVisible ? 1 : 0;

  for (let iteration = 0; iteration < HORIZON_CLIP_ITERATIONS; iteration += 1) {
    const midT = (visibleT + hiddenT) / 2;
    const midPoint = slerpUnitVectors(start, end, midT).applyQuaternion(
      rotation,
    );

    if (isFrontVisible(midPoint, cameraPosition)) {
      visibleT = midT;
    } else {
      hiddenT = midT;
    }
  }

  return slerpUnitVectors(start, end, visibleT).applyQuaternion(rotation);
};

const isSubpathDrawable = (commands: string[]) =>
  commands.some((command) => command.startsWith('L'));

export const projectCountryOutlineToViewport = (
  country: CountryPolygon,
  { view, viewportWidth, viewportHeight }: CountryProjectionInput,
): CountryProjectionResult => {
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return {
      path: '',
      bounds: null,
      hasVisibleGeometry: false,
    };
  }

  const camera = createCamera(view, viewportWidth, viewportHeight);
  const cameraPosition = camera.position.clone();
  const rotation = quaternionFromArray(view.rotation);
  const pathCommands: string[] = [];
  const visiblePoints: ViewportPoint[] = [];

  const appendProjectedPoint = (
    commands: string[],
    command: 'M' | 'L',
    point: Vector3,
  ) => {
    const projectedPoint = projectWorldPoint(
      point,
      camera,
      viewportWidth,
      viewportHeight,
    );

    visiblePoints.push(projectedPoint);
    commands.push(
      `${command}${formatPathNumber(projectedPoint.x)} ${formatPathNumber(projectedPoint.y)}`,
    );
  };

  for (const polygon of country.polygons) {
    for (const ring of polygon) {
      const densifiedRing = densifyRing(ring);

      if (densifiedRing.length < 2) {
        continue;
      }

      let subpath: string[] = [];

      for (let index = 0; index < densifiedRing.length - 1; index += 1) {
        const start = densifiedRing[index]!;
        const end = densifiedRing[index + 1]!;
        const startWorld = start.clone().applyQuaternion(rotation);
        const endWorld = end.clone().applyQuaternion(rotation);
        const startVisible = isFrontVisible(startWorld, cameraPosition);
        const endVisible = isFrontVisible(endWorld, cameraPosition);

        if (startVisible && endVisible) {
          if (subpath.length === 0) {
            appendProjectedPoint(subpath, 'M', startWorld);
          }

          appendProjectedPoint(subpath, 'L', endWorld);
          continue;
        }

        if (startVisible && !endVisible) {
          if (subpath.length === 0) {
            appendProjectedPoint(subpath, 'M', startWorld);
          }

          appendProjectedPoint(
            subpath,
            'L',
            findHorizonPoint(start, end, rotation, cameraPosition, true),
          );

          if (isSubpathDrawable(subpath)) {
            pathCommands.push(subpath.join(' '));
          }

          subpath = [];
          continue;
        }

        if (!startVisible && endVisible) {
          subpath = [];
          appendProjectedPoint(
            subpath,
            'M',
            findHorizonPoint(start, end, rotation, cameraPosition, false),
          );
          appendProjectedPoint(subpath, 'L', endWorld);
        }
      }

      if (isSubpathDrawable(subpath)) {
        pathCommands.push(subpath.join(' '));
      }
    }
  }

  if (visiblePoints.length === 0 || pathCommands.length === 0) {
    return {
      path: '',
      bounds: null,
      hasVisibleGeometry: false,
    };
  }

  const bounds = visiblePoints.reduce<CountryProjectionBounds>(
    (accumulator, point) => ({
      left: Math.min(accumulator.left, point.x),
      top: Math.min(accumulator.top, point.y),
      right: Math.max(accumulator.right, point.x),
      bottom: Math.max(accumulator.bottom, point.y),
    }),
    {
      left: Infinity,
      top: Infinity,
      right: -Infinity,
      bottom: -Infinity,
    },
  );

  return {
    path: pathCommands.join(' '),
    bounds,
    hasVisibleGeometry: true,
  };
};
