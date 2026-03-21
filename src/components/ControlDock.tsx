import { useEffect, useState } from 'react';
import { canPlayAnimationTimeline, countEnabledAnimationBlocks } from '../lib/animation';
import { deriveGeoPoseFields } from '../lib/navigation';
import type {
  AnimationTimeline,
  AxisLockMode,
  CompareModeState,
  QualityMode,
  ViewerMode,
  ViewerPreset,
} from '../state/viewerStore';

type ControlDockProps = {
  quality: QualityMode;
  axisLockMode: AxisLockMode;
  compareModeState: CompareModeState;
  viewerMode: ViewerMode;
  presets: ViewerPreset[];
  defaultPresetsOpen: boolean;
  animationDraft: AnimationTimeline;
  onModeChange: (mode: ViewerMode) => void;
  onQualityChange: (quality: QualityMode) => void;
  onToggleAxisLock: () => void;
  onAxisReset: () => void;
  onToggleCompare: () => void;
  onPresetSelect: (preset: ViewerPreset) => void;
  onOpenAnimationWorkspace: () => void;
  onPlayAnimation: () => void;
  onShare: () => Promise<void>;
  onFullscreen: () => Promise<void>;
  onHelp: () => void;
  onToggleFrozen: () => void;
  onToggleBorders: () => void;
  shareLabel: string;
  isFrozen: boolean;
  showBorders: boolean;
  isSceneAvailable: boolean;
};

const formatDurationLabel = (totalDurationMs: number) =>
  `${(totalDurationMs / 1_000).toFixed(1)}s`;

const formatStartPoseLabel = (timeline: AnimationTimeline) => {
  if (timeline.mode === 'geo' && timeline.startGeoView) {
    const pose = deriveGeoPoseFields(timeline.startGeoView);
    return `Start: ${pose.lat.toFixed(1)}, ${pose.lon.toFixed(1)}`;
  }

  if (timeline.mode === 'headway' && timeline.startHeadwayView) {
    const [lon, lat] = timeline.startHeadwayView.center;
    return `Start: ${lat.toFixed(1)}, ${lon.toFixed(1)}`;
  }

  return 'Start pose missing';
};

export function ControlDock({
  quality,
  axisLockMode,
  compareModeState,
  viewerMode,
  presets,
  defaultPresetsOpen,
  animationDraft,
  onModeChange,
  onQualityChange,
  onToggleAxisLock,
  onAxisReset,
  onToggleCompare,
  onPresetSelect,
  onOpenAnimationWorkspace,
  onPlayAnimation,
  onShare,
  onFullscreen,
  onHelp,
  onToggleFrozen,
  onToggleBorders,
  shareLabel,
  isFrozen,
  showBorders,
  isSceneAvailable,
}: ControlDockProps) {
  const [presetsOpen, setPresetsOpen] = useState(defaultPresetsOpen);

  useEffect(() => {
    setPresetsOpen(defaultPresetsOpen);
  }, [defaultPresetsOpen]);

  const compareButtonLabel =
    viewerMode !== 'geo'
      ? 'Compare (Geo only)'
      : compareModeState === 'pinned'
        ? 'Comparing'
        : compareModeState === 'armed'
          ? 'Pick country'
          : 'Compare';
  const enabledBlocks = countEnabledAnimationBlocks(animationDraft);
  const canPlayAnimation =
    isSceneAvailable && !isFrozen && canPlayAnimationTimeline(animationDraft);

  return (
    <>
      <section
        className="hud-card hud-card--controls"
        aria-label="Viewer controls"
      >
        <div className="hud-card__header">
          <span className="panel-kicker">Control deck</span>
          <button className="text-button" onClick={onHelp} type="button">
            Help
          </button>
        </div>

        <div className="field">
          <span>View mode</span>
          <div className="mode-switch" role="tablist" aria-label="View mode">
            <button
              aria-selected={viewerMode === 'geo'}
              className={`mode-switch__button ${viewerMode === 'geo' ? 'mode-switch__button--active' : ''}`}
              onClick={() => onModeChange('geo')}
              role="tab"
              type="button"
            >
              Geo
            </button>
            <button
              aria-selected={viewerMode === 'headway'}
              className={`mode-switch__button ${viewerMode === 'headway' ? 'mode-switch__button--active' : ''}`}
              onClick={() => onModeChange('headway')}
              role="tab"
              type="button"
            >
              Headway
            </button>
          </div>
        </div>

        <label className="field">
          <span>Quality</span>
          <select
            value={quality}
            onChange={(event) =>
              onQualityChange(event.target.value as QualityMode)
            }
          >
            <option value="performance">Performance</option>
            <option value="balanced">Balanced</option>
            <option value="high">High</option>
          </select>
        </label>

        <div className="field">
          <span>Camera</span>
          <div className="button-row button-row--trim-top">
            <button
              className={`secondary-button ${axisLockMode === 'axis-lock' ? 'secondary-button--active' : ''}`}
              disabled={!isSceneAvailable}
              onClick={onToggleAxisLock}
              type="button"
            >
              Axis lock
            </button>
            <button
              className="secondary-button"
              disabled={!isSceneAvailable || isFrozen}
              onClick={onAxisReset}
              type="button"
            >
              Axis reset
            </button>
            <button
              className={`secondary-button ${viewerMode === 'geo' && compareModeState !== 'off' ? 'secondary-button--active' : ''}`}
              disabled={!isSceneAvailable || viewerMode !== 'geo'}
              onClick={onToggleCompare}
              type="button"
            >
              {compareButtonLabel}
            </button>
          </div>
        </div>

        <div className="field">
          <span>Animation</span>
          <div className="animation-summary">
            <div className="animation-summary__meta">
              <strong>{viewerMode === 'geo' ? 'Geo timeline' : 'Headway timeline'}</strong>
              <small>{formatDurationLabel(animationDraft.totalDurationMs)} total</small>
            </div>
            <div className="animation-summary__meta">
              <strong>{enabledBlocks}</strong>
              <small>
                {enabledBlocks === 1 ? 'enabled block' : 'enabled blocks'}
                {' · '}
                {formatStartPoseLabel(animationDraft)}
              </small>
            </div>
          </div>
          <div className="button-row">
            <button
              className="secondary-button"
              onClick={onOpenAnimationWorkspace}
              type="button"
            >
              Open editor
            </button>
            <button
              className="secondary-button"
              disabled={!canPlayAnimation}
              onClick={onPlayAnimation}
              type="button"
            >
              Play
            </button>
          </div>
        </div>

        <div className="field">
          <span>Motion</span>
          <div className="button-row">
            <button
              className={`secondary-button ${isFrozen ? 'secondary-button--active' : ''}`}
              disabled={!isSceneAvailable}
              onClick={onToggleFrozen}
              type="button"
            >
              {isFrozen ? 'Unfreeze' : 'Freeze'}
            </button>
            <button
              className={`secondary-button ${showBorders ? 'secondary-button--active' : ''}`}
              disabled={!isSceneAvailable}
              onClick={onToggleBorders}
              type="button"
            >
              {showBorders ? 'Hide borders' : 'Borders'}
            </button>
          </div>
        </div>

        <div className="field">
          <span>Actions</span>
          <div className="button-row">
            <button
              className="secondary-button"
              disabled={!isSceneAvailable}
              onClick={onShare}
              type="button"
            >
              {shareLabel}
            </button>
            <button
              className="secondary-button"
              onClick={onFullscreen}
              type="button"
            >
              Fullscreen
            </button>
          </div>
        </div>
      </section>

      <section className="hud-card hud-card--presets" aria-label="View presets">
        <button
          aria-expanded={presetsOpen}
          className="collapse-toggle"
          onClick={() => setPresetsOpen((open) => !open)}
          type="button"
        >
          <span className="panel-kicker">Viewpoints</span>
          <span>{presetsOpen ? 'Hide' : 'Show'}</span>
        </button>
        {presetsOpen ? (
          <div className="preset-list">
            {presets.map((preset, index) => (
              <button
                className="preset-button"
                disabled={!isSceneAvailable || isFrozen}
                key={preset.id}
                onClick={() => onPresetSelect(preset)}
                type="button"
              >
                <span className="preset-button__title">
                  <span>{preset.label}</span>
                  <kbd>{index + 1}</kbd>
                </span>
                <small>{preset.description}</small>
              </button>
            ))}
          </div>
        ) : null}
      </section>
    </>
  );
}
