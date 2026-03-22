import { constrainGeoViewForCloseZoom } from './camera';
import {
  DEFAULT_VIEW,
  MAX_DISTANCE,
  MIN_DISTANCE,
  STORAGE_KEYS,
  VIEWER_PRESETS,
} from './constants';
import { clamp, cloneView } from './math';
import {
  cloneHeadwayView,
  headwayFromGeo,
  normalizeHeadwayView,
} from './modeBridge';
import {
  nudgeGeoCenter,
  nudgeHeadwayCenter,
  stepGeoDistance,
  stepGeoPitch,
  stepGeoTrimRoll,
  stepGeoYaw,
  stepHeadwayBearing,
  stepHeadwayPitch,
  stepHeadwayZoom,
} from './navigation';
import type {
  AnimationMode,
  AnimationBlock,
  AnimationCommandKey,
  AnimationTimeline,
  GlobeViewState,
  HeadwayViewState,
} from '../state/viewerStore';

export type AnimationVector = {
  upDown: number;
  leftRight: number;
  forwardBack: number;
  yaw: number;
  pitch: number;
  roll: number;
};

const DEFAULT_ANIMATION_DURATION_MS = 16_000;
const DEFAULT_VIEW_FOV_RANGE = {
  min: 20,
  max: 45,
} as const;
const HEX_PATTERN = /^(?:[0-9A-F]{2})+$/i;
const COMMAND_KEYS: AnimationCommandKey[] = [
  'ud+',
  'ud-',
  'lr+',
  'lr-',
  'fb+',
  'fb-',
  'yaw+',
  'yaw-',
  'pitch+',
  'pitch-',
  'roll+',
  'roll-',
];
const COMMAND_SET = new Set<AnimationCommandKey>(COMMAND_KEYS);
const GEO_COMMAND_SET = COMMAND_SET;
const HEADWAY_COMMAND_SET = new Set<AnimationCommandKey>(
  COMMAND_KEYS.filter((command) => !command.startsWith('roll')),
);
const EMPTY_VECTOR: AnimationVector = {
  upDown: 0,
  leftRight: 0,
  forwardBack: 0,
  yaw: 0,
  pitch: 0,
  roll: 0,
};

let nextAnimationBlockId = 0;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const EUROPE_AFRICA_PRESET =
  VIEWER_PRESETS.find((preset) => preset.id === 'europe-africa') ??
  VIEWER_PRESETS[0] ?? {
    state: DEFAULT_VIEW,
  };
const DEFAULT_ANIMATION_START_GEO_VIEW = cloneView(EUROPE_AFRICA_PRESET.state);
const DEFAULT_ANIMATION_START_HEADWAY_VIEW = headwayFromGeo(
  DEFAULT_ANIMATION_START_GEO_VIEW,
);

const isFiniteRotationTuple = (
  value: unknown,
): value is GlobeViewState['rotation'] =>
  Array.isArray(value) &&
  value.length === 4 &&
  value.every((entry) => Number.isFinite(entry));

const isFiniteHeadwayCenter = (
  value: unknown,
): value is HeadwayViewState['center'] =>
  Array.isArray(value) &&
  value.length === 2 &&
  value.every((entry) => Number.isFinite(entry));

const isAnimationMode = (value: unknown): value is AnimationMode =>
  value === 'geo' || value === 'headway';

const isCommandKey = (value: unknown): value is AnimationCommandKey =>
  typeof value === 'string' && COMMAND_SET.has(value as AnimationCommandKey);

const getCommandSet = (mode: AnimationMode) =>
  mode === 'geo' ? GEO_COMMAND_SET : HEADWAY_COMMAND_SET;

const commandSign = (command: AnimationCommandKey) =>
  command.endsWith('+') ? 1 : -1;

const commandBucket = (
  command: AnimationCommandKey,
): keyof AnimationVector => {
  if (command.startsWith('ud')) {
    return 'upDown';
  }

  if (command.startsWith('lr')) {
    return 'leftRight';
  }

  if (command.startsWith('fb')) {
    return 'forwardBack';
  }

  if (command.startsWith('yaw')) {
    return 'yaw';
  }

  if (command.startsWith('pitch')) {
    return 'pitch';
  }

  return 'roll';
};

const normalizeDurationMs = (value: unknown) => {
  if (!Number.isFinite(value)) {
    return DEFAULT_ANIMATION_DURATION_MS;
  }

  return Math.max(1, Math.round(value as number));
};

const clampFov = (value: number) =>
  clamp(value, DEFAULT_VIEW_FOV_RANGE.min, DEFAULT_VIEW_FOV_RANGE.max);

export const getDefaultAnimationStartGeoView = () =>
  cloneView(DEFAULT_ANIMATION_START_GEO_VIEW);

export const getDefaultAnimationStartHeadwayView = () =>
  cloneHeadwayView(DEFAULT_ANIMATION_START_HEADWAY_VIEW);

const normalizeAnimationStartGeoView = (
  candidate: Partial<GlobeViewState> | null | undefined,
) => {
  if (
    !candidate ||
    !isFiniteRotationTuple(candidate.rotation) ||
    !Number.isFinite(candidate.distance) ||
    !Number.isFinite(candidate.fov)
  ) {
    return getDefaultAnimationStartGeoView();
  }

  const distance = candidate.distance as number;
  const fov = candidate.fov as number;

  return {
    rotation: [...candidate.rotation] as GlobeViewState['rotation'],
    distance: clamp(distance, MIN_DISTANCE, MAX_DISTANCE),
    fov: clampFov(fov),
  } satisfies GlobeViewState;
};

const normalizeAnimationStartHeadwayView = (
  candidate: Partial<HeadwayViewState> | null | undefined,
) => {
  if (
    !candidate ||
    !isFiniteHeadwayCenter(candidate.center) ||
    !Number.isFinite(candidate.zoom) ||
    !Number.isFinite(candidate.bearing) ||
    !Number.isFinite(candidate.pitch)
  ) {
    return getDefaultAnimationStartHeadwayView();
  }

  return normalizeHeadwayView(candidate);
};

const clampBlockWindow = (
  startMs: number,
  endMs: number,
  totalDurationMs: number,
) => {
  const safeStart = clamp(Math.round(startMs), 0, Math.max(totalDurationMs - 1, 0));
  const safeEnd = clamp(Math.round(endMs), safeStart + 1, totalDurationMs);

  return {
    startMs: safeStart,
    endMs: safeEnd,
  };
};

const sortBlocks = (blocks: AnimationBlock[]) =>
  [...blocks].sort((left, right) => {
    if (left.startMs !== right.startMs) {
      return left.startMs - right.startMs;
    }

    if (left.endMs !== right.endMs) {
      return left.endMs - right.endMs;
    }

    return left.command.localeCompare(right.command);
  });

const smoothstep = (value: number) => value * value * (3 - 2 * value);

const lerp = (from: number, to: number, alpha: number) =>
  from + (to - from) * alpha;

const encodeHex = (value: string) =>
  Array.from(encoder.encode(value), (byte) =>
    byte.toString(16).padStart(2, '0').toUpperCase(),
  ).join('');

const decodeHex = (value: string) => {
  if (!HEX_PATTERN.test(value)) {
    return null;
  }

  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2) {
    const nextByte = Number.parseInt(value.slice(index, index + 2), 16);

    if (!Number.isFinite(nextByte)) {
      return null;
    }

    bytes[index / 2] = nextByte;
  }

  return decoder.decode(bytes);
};

export const createAnimationBlockId = () =>
  `animation-block-${nextAnimationBlockId++}`;

export const createDefaultAnimationTimeline = (
  mode: AnimationMode,
): AnimationTimeline => ({
  version: 2,
  mode,
  totalDurationMs: DEFAULT_ANIMATION_DURATION_MS,
  startGeoView: mode === 'geo' ? getDefaultAnimationStartGeoView() : null,
  startHeadwayView:
    mode === 'headway' ? getDefaultAnimationStartHeadwayView() : null,
  blocks: [],
});

export const getAnimationStorageKey = (mode: AnimationMode) =>
  mode === 'geo'
    ? STORAGE_KEYS.animationDraftGeo
    : STORAGE_KEYS.animationDraftHeadway;

export const normalizeAnimationTimeline = (
  candidate: Partial<AnimationTimeline> | null | undefined,
  fallbackMode: AnimationMode = 'geo',
): AnimationTimeline => {
  const mode = isAnimationMode(candidate?.mode) ? candidate.mode : fallbackMode;
  const totalDurationMs = normalizeDurationMs(candidate?.totalDurationMs);
  const commandSet = getCommandSet(mode);
  const startGeoView =
    mode === 'geo' ? normalizeAnimationStartGeoView(candidate?.startGeoView) : null;
  const startHeadwayView =
    mode === 'headway'
      ? normalizeAnimationStartHeadwayView(candidate?.startHeadwayView)
      : null;
  const blocks = Array.isArray(candidate?.blocks)
    ? candidate.blocks.flatMap((block) => {
        if (!isCommandKey(block?.command) || !commandSet.has(block.command)) {
          return [];
        }

        const amount = Number.isFinite(block.amount)
          ? Math.max(0, block.amount)
          : 0;
        const acceleration = Number.isFinite(block.acceleration)
          ? clamp(block.acceleration, 0, 1)
          : 0;
        const { startMs, endMs } = clampBlockWindow(
          Number.isFinite(block.startMs) ? block.startMs : 0,
          Number.isFinite(block.endMs) ? block.endMs : totalDurationMs,
          totalDurationMs,
        );

        return [
          {
            id:
              typeof block.id === 'string' && block.id.length > 0
                ? block.id
                : createAnimationBlockId(),
            command: block.command,
            startMs,
            endMs,
            amount,
            acceleration,
            enabled: Boolean(block.enabled),
          } satisfies AnimationBlock,
        ];
      })
    : [];

  return {
    version: 2,
    mode,
    totalDurationMs,
    startGeoView,
    startHeadwayView,
    blocks: sortBlocks(blocks),
  };
};

export const countEnabledAnimationBlocks = (timeline: AnimationTimeline) =>
  timeline.blocks.filter(
    (block) =>
      block.enabled &&
      block.amount > 0 &&
      block.endMs > block.startMs &&
      getCommandSet(timeline.mode).has(block.command),
  ).length;

export const canPlayAnimationTimeline = (timeline: AnimationTimeline) =>
  countEnabledAnimationBlocks(timeline) > 0;

export const serializeAnimationTimeline = (timeline: AnimationTimeline) => {
  const normalized = normalizeAnimationTimeline(timeline, timeline.mode);

  return encodeHex(
    JSON.stringify({
      v: normalized.version,
      m: normalized.mode,
      t: normalized.totalDurationMs,
      g:
        normalized.mode === 'geo' && normalized.startGeoView
          ? {
              r: normalized.startGeoView.rotation.map((value) =>
                Number(value.toFixed(6)),
              ),
              d: Number(normalized.startGeoView.distance.toFixed(4)),
              f: Number(normalized.startGeoView.fov.toFixed(2)),
            }
          : null,
      h:
        normalized.mode === 'headway' && normalized.startHeadwayView
          ? {
              c: normalized.startHeadwayView.center.map((value) =>
                Number(value.toFixed(6)),
              ),
              z: Number(normalized.startHeadwayView.zoom.toFixed(3)),
              b: Number(normalized.startHeadwayView.bearing.toFixed(2)),
              p: Number(normalized.startHeadwayView.pitch.toFixed(2)),
            }
          : null,
      b: normalized.blocks.map((block) => ({
        k: block.command,
        s: block.startMs,
        e: block.endMs,
        q: Number(block.amount.toFixed(6)),
        a: Number(block.acceleration.toFixed(6)),
        x: block.enabled ? 1 : 0,
      })),
    }),
  );
};

export const deserializeAnimationTimeline = (hex: string) => {
  const decoded = decodeHex(hex.trim().toUpperCase());

  if (!decoded) {
    return null;
  }

  try {
    const parsed = JSON.parse(decoded) as {
      v?: number;
      m?: AnimationMode;
      t?: number;
      g?: {
        d?: number;
        f?: number;
        r?: [number, number, number, number];
      } | null;
      h?: {
        b?: number;
        c?: [number, number];
        p?: number;
        z?: number;
      } | null;
      b?: Array<{
        k?: AnimationCommandKey;
        s?: number;
        e?: number;
        q?: number;
        a?: number;
        x?: number | boolean;
      }>;
    };

    if (
      (parsed.v !== 1 && parsed.v !== 2) ||
      !isAnimationMode(parsed.m) ||
      !Number.isFinite(parsed.t) ||
      !Array.isArray(parsed.b)
    ) {
      return null;
    }

    const blocks = parsed.b.map((block) => {
      if (
        !isCommandKey(block.k) ||
        !Number.isFinite(block.s) ||
        !Number.isFinite(block.e) ||
        !Number.isFinite(block.q) ||
        !Number.isFinite(block.a) ||
        !(
          block.x === 0 ||
          block.x === 1 ||
          block.x === false ||
          block.x === true
        )
      ) {
        throw new Error('Invalid animation block.');
      }

      const command = block.k;
      const startMs = block.s!;
      const endMs = block.e!;
      const amount = block.q!;
      const acceleration = block.a!;

      return {
        id: createAnimationBlockId(),
        command,
        startMs,
        endMs,
        amount,
        acceleration,
        enabled: Boolean(block.x),
      } satisfies AnimationBlock;
    });

    return normalizeAnimationTimeline(
      {
        version: 2,
        mode: parsed.m,
        totalDurationMs: parsed.t,
        startGeoView:
          parsed.v === 2
            ? normalizeAnimationStartGeoView(
                parsed.g
                  ? {
                      rotation: parsed.g.r,
                      distance: parsed.g.d,
                      fov: parsed.g.f,
                    }
                  : null,
              )
            : null,
        startHeadwayView:
          parsed.v === 2
            ? normalizeAnimationStartHeadwayView(
                parsed.h
                  ? {
                      center: parsed.h.c,
                      zoom: parsed.h.z,
                      bearing: parsed.h.b,
                      pitch: parsed.h.p,
                    }
                  : null,
              )
            : null,
        blocks,
      },
      parsed.m,
    );
  } catch {
    return null;
  }
};

export const getBlockProgress = (
  block: AnimationBlock,
  elapsedMs: number,
) => {
  if (!block.enabled || block.amount <= 0 || block.endMs <= block.startMs) {
    return 0;
  }

  const progress = clamp(
    (elapsedMs - block.startMs) / (block.endMs - block.startMs),
    0,
    1,
  );

  return lerp(progress, smoothstep(progress), clamp(block.acceleration, 0, 1));
};

export const getTimelineVectorAtTime = (
  timeline: AnimationTimeline,
  elapsedMs: number,
): AnimationVector => {
  const normalized = normalizeAnimationTimeline(timeline, timeline.mode);
  const totalElapsed = clamp(
    Math.round(elapsedMs),
    0,
    normalized.totalDurationMs,
  );

  return normalized.blocks.reduce<AnimationVector>((vector, block) => {
    if (!block.enabled || block.amount <= 0) {
      return vector;
    }

    const progress = getBlockProgress(block, totalElapsed);
    const bucket = commandBucket(block.command);

    return {
      ...vector,
      [bucket]:
        vector[bucket] + block.amount * commandSign(block.command) * progress,
    };
  }, EMPTY_VECTOR);
};

export const getAnimationPreviewAtTime = (
  timeline: AnimationTimeline,
  elapsedMs: number,
) => {
  const normalized = normalizeAnimationTimeline(timeline, timeline.mode);
  const playheadMs = clamp(
    Math.round(elapsedMs),
    0,
    normalized.totalDurationMs,
  );
  const vector = getTimelineVectorAtTime(normalized, playheadMs);

  if (normalized.mode === 'geo') {
    return {
      playheadMs,
      geoView: applyGeoAnimationVector(normalized.startGeoView!, vector),
      headwayView: null,
    };
  }

  return {
    playheadMs,
    geoView: null,
    headwayView: applyHeadwayAnimationVector(
      normalized.startHeadwayView!,
      vector,
    ),
  };
};

export const applyGeoAnimationVector = (
  source: GlobeViewState,
  vector: AnimationVector,
) => {
  let nextView = source;

  if (vector.leftRight !== 0) {
    nextView = nudgeGeoCenter(
      nextView,
      vector.leftRight > 0 ? 'right' : 'left',
      Math.abs(vector.leftRight),
    );
  }

  if (vector.upDown !== 0) {
    nextView = nudgeGeoCenter(
      nextView,
      vector.upDown > 0 ? 'up' : 'down',
      Math.abs(vector.upDown),
    );
  }

  if (vector.yaw !== 0) {
    nextView = stepGeoYaw(nextView, vector.yaw);
  }

  if (vector.pitch !== 0) {
    nextView = stepGeoPitch(nextView, vector.pitch);
  }

  if (vector.roll !== 0) {
    nextView = stepGeoTrimRoll(nextView, vector.roll);
  }

  if (vector.forwardBack !== 0) {
    nextView = stepGeoDistance(nextView, -vector.forwardBack);
  }

  return constrainGeoViewForCloseZoom(nextView);
};

export const applyHeadwayAnimationVector = (
  source: HeadwayViewState,
  vector: AnimationVector,
) => {
  let nextView = source;

  if (vector.leftRight !== 0) {
    nextView = nudgeHeadwayCenter(
      nextView,
      vector.leftRight > 0 ? 'right' : 'left',
      Math.abs(vector.leftRight),
    );
  }

  if (vector.upDown !== 0) {
    nextView = nudgeHeadwayCenter(
      nextView,
      vector.upDown > 0 ? 'up' : 'down',
      Math.abs(vector.upDown),
    );
  }

  if (vector.yaw !== 0) {
    nextView = stepHeadwayBearing(nextView, vector.yaw);
  }

  if (vector.pitch !== 0) {
    nextView = stepHeadwayPitch(nextView, vector.pitch);
  }

  if (vector.forwardBack !== 0) {
    nextView = stepHeadwayZoom(nextView, vector.forwardBack);
  }

  return normalizeHeadwayView(nextView);
};
