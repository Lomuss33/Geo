import { useEffect, useEffectEvent } from 'react';
import { VIEWER_PRESETS } from '../lib/constants';
import { normalizeBordersView } from '../lib/bordersBridge';
import {
  applyHumanViewConstraint,
  deriveGeoCenteredAnchor,
  getGeoControlMode,
  stepGeoOverviewAnchor,
  stepGeoOverviewHeading,
  surfaceAnchoredGeoView,
} from '../lib/camera';
import {
  normalizeHeadwayView,
} from '../lib/modeBridge';
import {
  nudgeBordersCenter,
  nudgeGeoCenter,
  nudgeHeadwayCenter,
  stepBordersBearing,
  stepBordersPitch,
  stepBordersZoom,
  stepGeoDistance,
  stepGeoPitch,
  stepGeoTrimRoll,
  stepGeoYaw,
  stepHeadwayBearing,
  stepHeadwayPitch,
  stepHeadwayZoom,
} from '../lib/navigation';
import type {
  BordersViewState,
  GlobeViewState,
  HeadwayViewState,
  ViewerMode,
} from '../state/viewerStore';
import { useViewerStore } from '../state/viewerStore';

type ViewerShortcutsProps = {
  viewerMode: ViewerMode;
  view: GlobeViewState;
  headwayView: HeadwayViewState;
  bordersView: BordersViewState;
  isAnimationPlaying: boolean;
  isAnimationWorkspaceOpen: boolean;
  isSceneAvailable: boolean;
  isFrozen: boolean;
  showOnboarding: boolean;
  onStopAnimation: () => void;
  onCloseAnimationWorkspace: () => void;
  onToggleFrozen: () => void;
  onToggleAxisLock: () => void;
  onAxisReset: () => void;
  onResetHome: () => void;
  onOpenHelp: () => void;
  onPresetSelect: (index: number) => void;
  onApplyGeoView: (view: GlobeViewState) => void;
  onApplyHeadwayView: (view: HeadwayViewState) => void;
  onApplyBordersView: (view: BordersViewState) => void;
};

const isInteractiveTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.closest('[contenteditable="true"]')) {
    return true;
  }

  return Boolean(target.closest('input, textarea, select, button'));
};

export function ViewerShortcuts({
  viewerMode,
  view,
  headwayView,
  bordersView,
  isAnimationPlaying,
  isAnimationWorkspaceOpen,
  isSceneAvailable,
  isFrozen,
  showOnboarding,
  onStopAnimation,
  onCloseAnimationWorkspace,
  onToggleFrozen,
  onToggleAxisLock,
  onAxisReset,
  onResetHome,
  onOpenHelp,
  onPresetSelect,
  onApplyGeoView,
  onApplyHeadwayView,
  onApplyBordersView,
}: ViewerShortcutsProps) {
  const geoOverviewAnchor = useViewerStore(
    (state) => state.geoOverviewAnchor,
  );
  const geoOverviewHeadingDeg = useViewerStore(
    (state) => state.geoOverviewHeadingDeg,
  );
  const setGeoOverviewAnchor = useViewerStore(
    (state) => state.setGeoOverviewAnchor,
  );
  const setGeoOverviewHeading = useViewerStore(
    (state) => state.setGeoOverviewHeading,
  );

  const handleArrowKey = useEffectEvent(
    (event: KeyboardEvent, direction: 'left' | 'right' | 'up' | 'down') => {
      event.preventDefault();

      if (isFrozen) {
        return;
      }

      if (viewerMode === 'geo') {
        const controlMode = getGeoControlMode(view.distance);
        const overviewAnchor =
          geoOverviewAnchor ?? deriveGeoCenteredAnchor(view);
        const applyOverviewAnchor = (anchor = overviewAnchor) => {
          setGeoOverviewAnchor(anchor);
          onApplyGeoView(
            surfaceAnchoredGeoView({
              lat: anchor.lat,
              lon: anchor.lon,
              headingDeg: geoOverviewHeadingDeg,
              distance: view.distance,
              baseFov: view.fov,
            }),
          );
        };
        const applyOverviewHeading = (headingDeg: number) => {
          setGeoOverviewAnchor(overviewAnchor);
          setGeoOverviewHeading(headingDeg);
          onApplyGeoView(
            surfaceAnchoredGeoView({
              lat: overviewAnchor.lat,
              lon: overviewAnchor.lon,
              headingDeg,
              distance: view.distance,
              baseFov: view.fov,
            }),
          );
        };

        if (event.altKey && (direction === 'left' || direction === 'right')) {
          if (controlMode !== 'orbit') {
            return;
          }
          onApplyGeoView(
            stepGeoTrimRoll(view, direction === 'left' ? -3.5 : 3.5),
          );
          return;
        }

        if (event.shiftKey) {
          if (controlMode === 'heading-spin') {
            if (direction === 'left' || direction === 'right') {
              applyOverviewHeading(
                stepGeoOverviewHeading(
                  geoOverviewHeadingDeg,
                  direction === 'left' ? -3.5 : 3.5,
                ),
              );
            }
            return;
          }

          if (controlMode === 'surface-pan') {
            applyOverviewAnchor(
              stepGeoOverviewAnchor(
                overviewAnchor,
                direction === 'left'
                  ? -3.5
                  : direction === 'right'
                    ? 3.5
                    : 0,
                direction === 'up'
                  ? 3.5
                  : direction === 'down'
                    ? -3.5
                    : 0,
              ),
            );
            return;
          }

          if (direction === 'left' || direction === 'right') {
            onApplyGeoView(
              stepGeoYaw(view, direction === 'left' ? -3.5 : 3.5),
            );
            return;
          }

          onApplyGeoView(stepGeoPitch(view, direction === 'up' ? 3.5 : -3.5));
          return;
        }

        if (event.ctrlKey && (direction === 'up' || direction === 'down')) {
          const nextDistance = stepGeoDistance(
            view,
            direction === 'up' ? -0.12 : 0.12,
          ).distance;
          onApplyGeoView(
            controlMode === 'orbit'
              ? stepGeoDistance(view, direction === 'up' ? -0.12 : 0.12)
              : applyHumanViewConstraint(
                  {
                    ...view,
                    distance: nextDistance,
                  },
                  {
                    sourceDistance: view.distance,
                    anchor: geoOverviewAnchor,
                    headingDeg: geoOverviewHeadingDeg,
                  },
                ),
          );
          return;
        }

        if (controlMode === 'heading-spin') {
          if (direction === 'left' || direction === 'right') {
            applyOverviewHeading(
              stepGeoOverviewHeading(
                geoOverviewHeadingDeg,
                direction === 'left' ? -4 : 4,
              ),
            );
          }
          return;
        }

        if (controlMode === 'surface-pan') {
          applyOverviewAnchor(
            stepGeoOverviewAnchor(
              overviewAnchor,
              direction === 'left'
                ? -4
                : direction === 'right'
                  ? 4
                  : 0,
              direction === 'up'
                ? 4
                : direction === 'down'
                  ? -4
                  : 0,
            ),
          );
          return;
        }

        onApplyGeoView(nudgeGeoCenter(view, direction, 2.5));
        return;
      }

      if (viewerMode === 'borders') {
        if (event.altKey && (direction === 'left' || direction === 'right')) {
          return;
        }

        if (event.shiftKey) {
          if (direction === 'left' || direction === 'right') {
            onApplyBordersView(
              stepBordersBearing(
                bordersView,
                direction === 'left' ? -4 : 4,
              ),
            );
            return;
          }

          onApplyBordersView(
            stepBordersPitch(
              bordersView,
              direction === 'up' ? 3 : -3,
            ),
          );
          return;
        }

        if (event.ctrlKey && (direction === 'up' || direction === 'down')) {
          onApplyBordersView(
            stepBordersZoom(bordersView, direction === 'up' ? 0.18 : -0.18),
          );
          return;
        }

        const nextView = normalizeBordersView(
          nudgeBordersCenter(bordersView, direction, 2.5),
        );
        onApplyBordersView(nextView);
        return;
      }

      if (event.altKey && (direction === 'left' || direction === 'right')) {
        return;
      }

      if (event.shiftKey) {
        if (direction === 'left' || direction === 'right') {
          onApplyHeadwayView(
            stepHeadwayBearing(
              headwayView,
              direction === 'left' ? -4 : 4,
            ),
          );
          return;
        }

        onApplyHeadwayView(
          stepHeadwayPitch(
            headwayView,
            direction === 'up' ? 3 : -3,
          ),
        );
        return;
      }

      if (event.ctrlKey && (direction === 'up' || direction === 'down')) {
        onApplyHeadwayView(
          stepHeadwayZoom(headwayView, direction === 'up' ? 0.18 : -0.18),
        );
        return;
      }

      const nextView = normalizeHeadwayView(
        nudgeHeadwayCenter(headwayView, direction, 2.5),
      );
      onApplyHeadwayView(nextView);
    },
  );

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (isAnimationPlaying) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onStopAnimation();
      }
      return;
    }

    if (isAnimationWorkspaceOpen) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseAnimationWorkspace();
      }
      return;
    }

    if (showOnboarding || isInteractiveTarget(event.target) || event.metaKey) {
      return;
    }

    if (event.code === 'Space' || event.key.toLowerCase() === 'f') {
      event.preventDefault();
      if (isSceneAvailable) {
        onToggleFrozen();
      }
      return;
    }

    if (event.key.toLowerCase() === 'y' && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      if (isSceneAvailable) {
        onToggleAxisLock();
      }
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (isSceneAvailable && !isFrozen) {
        onAxisReset();
      }
      return;
    }

    if (event.key.toLowerCase() === 'r') {
      event.preventDefault();
      if (isSceneAvailable && !isFrozen) {
        onResetHome();
      }
      return;
    }

    if (event.key === '?' || (event.key === '/' && event.shiftKey)) {
      event.preventDefault();
      onOpenHelp();
      return;
    }

    if (!event.ctrlKey && !event.altKey) {
      const presetIndex = Number.parseInt(event.key, 10);

      if (
        Number.isInteger(presetIndex) &&
        presetIndex >= 1 &&
        presetIndex <= VIEWER_PRESETS.length
      ) {
        event.preventDefault();
        if (isSceneAvailable && !isFrozen) {
          onPresetSelect(presetIndex - 1);
        }
        return;
      }
    }

    if (!isSceneAvailable) {
      return;
    }

    switch (event.key) {
      case 'ArrowLeft':
        handleArrowKey(event, 'left');
        return;
      case 'ArrowRight':
        handleArrowKey(event, 'right');
        return;
      case 'ArrowUp':
        handleArrowKey(event, 'up');
        return;
      case 'ArrowDown':
        handleArrowKey(event, 'down');
        return;
      default:
        return;
    }
  });

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return null;
}
