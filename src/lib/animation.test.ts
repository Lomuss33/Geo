import { describe, expect, it } from 'vitest';
import {
  applyGeoAnimationVector,
  applyHeadwayAnimationVector,
  createDefaultAnimationTimeline,
  deserializeAnimationTimeline,
  getBlockProgress,
  getDefaultAnimationStartGeoView,
  getTimelineVectorAtTime,
  serializeAnimationTimeline,
} from './animation';
import { DEFAULT_VIEW, VIEWER_PRESETS } from './constants';
import type { AnimationTimeline } from '../state/viewerStore';

const encodeHex = (value: string) =>
  Array.from(new TextEncoder().encode(value), (byte) =>
    byte.toString(16).padStart(2, '0').toUpperCase(),
  ).join('');

describe('animation helpers', () => {
  it('round-trips a version 2 timeline through hex serialization with start views', () => {
    const encoded = serializeAnimationTimeline({
      version: 2,
      mode: 'geo',
      totalDurationMs: 16_000,
      startGeoView: VIEWER_PRESETS[1]!.state,
      startHeadwayView: null,
      blocks: [
        {
          id: 'block-1',
          command: 'lr-',
          startMs: 0,
          endMs: 2_000,
          amount: 124,
          acceleration: 0.4,
          enabled: true,
        },
      ],
    });

    const decoded = deserializeAnimationTimeline(encoded);

    expect(decoded?.mode).toBe('geo');
    expect(decoded?.totalDurationMs).toBe(16_000);
    expect(decoded?.startGeoView?.distance).toBeCloseTo(
      VIEWER_PRESETS[1]!.state.distance,
      4,
    );
    expect(decoded?.startGeoView?.fov).toBeCloseTo(VIEWER_PRESETS[1]!.state.fov, 2);
    expect(decoded?.startGeoView?.rotation[0]).toBeCloseTo(
      VIEWER_PRESETS[1]!.state.rotation[0]!,
      5,
    );
    expect(decoded?.startHeadwayView).toBeNull();
    expect(decoded?.blocks[0]).toMatchObject({
      command: 'lr-',
      startMs: 0,
      endMs: 2_000,
      amount: 124,
      acceleration: 0.4,
      enabled: true,
    });
  });

  it('rejects malformed animation hex', () => {
    expect(deserializeAnimationTimeline('BAD')).toBeNull();
  });

  it('upgrades version 1 animation hex imports to version 2 defaults', () => {
    const legacyHex = encodeHex(
      JSON.stringify({
        v: 1,
        m: 'geo',
        t: 16_000,
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

    const decoded = deserializeAnimationTimeline(legacyHex);

    expect(decoded?.version).toBe(2);
    expect(decoded?.startGeoView).toEqual(getDefaultAnimationStartGeoView());
    expect(decoded?.blocks[0]).toMatchObject({
      command: 'yaw+',
      startMs: 0,
      endMs: 2_000,
    });
  });

  it('sums overlapping block vectors by command bucket', () => {
    const timeline: AnimationTimeline = {
      version: 2,
      mode: 'geo',
      totalDurationMs: 16_000,
      startGeoView: DEFAULT_VIEW,
      startHeadwayView: null,
      blocks: [
        {
          id: 'block-1',
          command: 'lr-',
          startMs: 0,
          endMs: 2_000,
          amount: 124,
          acceleration: 0,
          enabled: true,
        },
        {
          id: 'block-2',
          command: 'lr+',
          startMs: 0,
          endMs: 1_000,
          amount: 24,
          acceleration: 0,
          enabled: true,
        },
        {
          id: 'block-3',
          command: 'yaw+',
          startMs: 0,
          endMs: 1_000,
          amount: 10,
          acceleration: 0,
          enabled: true,
        },
      ],
    };

    const vector = getTimelineVectorAtTime(timeline, 1_000);

    expect(vector.leftRight).toBeCloseTo(-38, 3);
    expect(vector.yaw).toBeCloseTo(10, 3);
  });

  it('applies playback vectors to Geo and Headway views', () => {
    const geoView = applyGeoAnimationVector(DEFAULT_VIEW, {
      upDown: 2,
      leftRight: -1,
      forwardBack: 0.12,
      yaw: 4,
      pitch: 3,
      roll: 0,
    });
    const headwayView = applyHeadwayAnimationVector(
      {
        center: [-28, 19.5],
        zoom: 1.8,
        bearing: 0,
        pitch: 0,
      },
      {
        upDown: 2,
        leftRight: -1,
        forwardBack: 0.12,
        yaw: 4,
        pitch: 3,
        roll: 0,
      },
    );

    expect(geoView.distance).toBeLessThan(DEFAULT_VIEW.distance);
    expect(headwayView.zoom).toBeGreaterThan(1.8);
    expect(headwayView.bearing).toBeCloseTo(4, 3);
  });

  it('blends acceleration into block progress', () => {
    const linear = getBlockProgress(
      {
        id: 'linear',
        command: 'lr-',
        startMs: 0,
        endMs: 2_000,
        amount: 10,
        acceleration: 0,
        enabled: true,
      },
      500,
    );
    const eased = getBlockProgress(
      {
        id: 'eased',
        command: 'lr-',
        startMs: 0,
        endMs: 2_000,
        amount: 10,
        acceleration: 1,
        enabled: true,
      },
      500,
    );

    expect(linear).toBeCloseTo(0.25, 3);
    expect(eased).toBeLessThan(linear);
  });

  it('creates empty per-mode default drafts', () => {
    expect(createDefaultAnimationTimeline('geo')).toMatchObject({
      version: 2,
      mode: 'geo',
      totalDurationMs: 16_000,
      startGeoView: VIEWER_PRESETS[1]!.state,
      startHeadwayView: null,
      blocks: [],
    });
    expect(createDefaultAnimationTimeline('headway')).toMatchObject({
      version: 2,
      mode: 'headway',
      totalDurationMs: 16_000,
      startGeoView: null,
      startHeadwayView: {
        zoom: expect.any(Number),
        bearing: 0,
        pitch: 0,
      },
      blocks: [],
    });
    expect(
      createDefaultAnimationTimeline('headway').startHeadwayView?.center[0],
    ).toBeCloseTo(13, 6);
    expect(
      createDefaultAnimationTimeline('headway').startHeadwayView?.center[1],
    ).toBeCloseTo(22, 6);
  });
});
