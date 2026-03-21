import { useEffect, useEffectEvent, useRef } from 'react';
import {
  getAnimationPreviewAtTime,
} from '../lib/animation';
import type {
  GlobeViewState,
  HeadwayViewState,
  AnimationTimeline,
} from '../state/viewerStore';
import { useViewerStore } from '../state/viewerStore';

type UseAnimationSessionDriverProps = {
  draft: AnimationTimeline;
  onPlaybackComplete: (input: {
    playheadMs: number;
    geoView: GlobeViewState | null;
    headwayView: HeadwayViewState | null;
  }) => void;
};

export function useAnimationSessionDriver({
  draft,
  onPlaybackComplete,
}: UseAnimationSessionDriverProps) {
  const animationSession = useViewerStore((state) => state.animationSession);
  const setAnimationPreviewViews = useViewerStore(
    (state) => state.setAnimationPreviewViews,
  );
  const animationFrameRef = useRef<number | null>(null);
  const playbackStartPlayheadRef = useRef(0);
  const playbackStartedAtRef = useRef<number | null>(null);
  const handlePlaybackComplete = useEffectEvent(onPlaybackComplete);

  useEffect(() => {
    if (animationSession.phase !== 'playing' || animationSession.startedAtMs == null) {
      playbackStartedAtRef.current = null;
      return;
    }

    if (playbackStartedAtRef.current === animationSession.startedAtMs) {
      return;
    }

    playbackStartedAtRef.current = animationSession.startedAtMs;
    playbackStartPlayheadRef.current = animationSession.playheadMs;
  }, [
    animationSession.phase,
    animationSession.playheadMs,
    animationSession.startedAtMs,
  ]);

  useEffect(() => {
    if (!animationSession.workspaceOpen || animationSession.phase !== 'idle') {
      return;
    }

    const preview = getAnimationPreviewAtTime(draft, animationSession.playheadMs);

    setAnimationPreviewViews({
      playheadMs: preview.playheadMs,
      previewGeoView: preview.geoView,
      previewHeadwayView: preview.headwayView,
    });
  }, [
    animationSession.phase,
    animationSession.playheadMs,
    animationSession.workspaceOpen,
    draft,
    setAnimationPreviewViews,
  ]);

  useEffect(() => {
    if (
      animationSession.phase !== 'playing' ||
      animationSession.startedAtMs == null ||
      !animationSession.workspaceOpen
    ) {
      if (animationFrameRef.current != null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const step = (now: number) => {
      const preview = getAnimationPreviewAtTime(
        draft,
        playbackStartPlayheadRef.current +
          Math.max(0, now - animationSession.startedAtMs!),
      );

      setAnimationPreviewViews({
        playheadMs: preview.playheadMs,
        previewGeoView: preview.geoView,
        previewHeadwayView: preview.headwayView,
      });

      if (preview.playheadMs >= draft.totalDurationMs) {
        handlePlaybackComplete({
          playheadMs: preview.playheadMs,
          geoView: preview.geoView,
          headwayView: preview.headwayView,
        });
        return;
      }

      animationFrameRef.current = window.requestAnimationFrame(step);
    };

    animationFrameRef.current = window.requestAnimationFrame(step);

    return () => {
      if (animationFrameRef.current != null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [
    animationSession.phase,
    animationSession.startedAtMs,
    animationSession.workspaceOpen,
    draft,
    setAnimationPreviewViews,
  ]);
}
