import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultAnimationTimeline } from '../lib/animation';
import type {
  AnimationTimeline,
  GlobeViewState,
  HeadwayViewState,
} from '../state/viewerStore';
import { useViewerStore } from '../state/viewerStore';
import { useAnimationSessionDriver } from './useAnimationSessionDriver';

function AnimationDriverHarness({
  draft,
  onPlaybackComplete,
}: {
  draft: AnimationTimeline;
  onPlaybackComplete: (input: {
    playheadMs: number;
    geoView: GlobeViewState | null;
    headwayView: HeadwayViewState | null;
  }) => void;
}) {
  useAnimationSessionDriver({ draft, onPlaybackComplete });
  return null;
}

describe('useAnimationSessionDriver', () => {
  beforeEach(() => {
    useViewerStore.setState({
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
    vi.unstubAllGlobals();
  });

  it('keeps playback time linear from the playhead it started from', () => {
    const draft: AnimationTimeline = {
      ...createDefaultAnimationTimeline('geo'),
      totalDurationMs: 5_000,
      blocks: [
        {
          id: 'yaw-block',
          command: 'yaw+',
          startMs: 0,
          endMs: 5_000,
          amount: 60,
          acceleration: 0,
          enabled: true,
        },
      ],
    };
    const queuedFrames = new Map<number, FrameRequestCallback>();
    let nextFrameId = 1;
    const handlePlaybackComplete = vi.fn();

    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const frameId = nextFrameId++;
      queuedFrames.set(frameId, callback);
      return frameId;
    });
    vi.stubGlobal('cancelAnimationFrame', (frameId: number) => {
      queuedFrames.delete(frameId);
    });

    const runFrame = (now: number) => {
      const callbacks = [...queuedFrames.values()];
      queuedFrames.clear();

      for (const callback of callbacks) {
        callback(now);
      }
    };

    useViewerStore.setState({
      animationSession: {
        workspaceOpen: true,
        phase: 'playing',
        startedAtMs: 1_000,
        playheadMs: 200,
        previewGeoView: null,
        previewHeadwayView: null,
      },
    });

    render(
      <AnimationDriverHarness
        draft={draft}
        onPlaybackComplete={handlePlaybackComplete}
      />,
    );

    act(() => {
      runFrame(1_016);
    });

    expect(useViewerStore.getState().animationSession.playheadMs).toBe(216);

    act(() => {
      runFrame(1_032);
    });

    expect(useViewerStore.getState().animationSession.playheadMs).toBe(232);
    expect(handlePlaybackComplete).not.toHaveBeenCalled();
  });
});
