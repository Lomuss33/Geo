import { useState, type ReactNode } from 'react';
import {
  canPlayAnimationTimeline,
  countEnabledAnimationBlocks,
} from '../lib/animation';
import { BORDERS_PROFILES } from '../lib/bordersProfiles';
import { deriveGeoPoseFields } from '../lib/navigation';
import type {
  AnimationTimeline,
  AxisLockMode,
  BordersProfileId,
  CompareModeState,
  HeadwayLayerKey,
  HeadwayLayerVisibility,
  HeadwayLayoutLook,
  QualityMode,
  ViewerMode,
  ViewerPreset,
} from '../state/viewerStore';
import type { ViewportLayoutMode } from '../app/useViewportLayout';

type ControlDockProps = {
  geographyControls?: ReactNode;
  quality: QualityMode;
  headwayLayoutLook: HeadwayLayoutLook;
  headwayLayerVisibility: HeadwayLayerVisibility;
  axisLockMode: AxisLockMode;
  compareModeState: CompareModeState;
  viewerMode: ViewerMode;
  bordersProfileId: BordersProfileId;
  presets: ViewerPreset[];
  animationDraft: AnimationTimeline;
  onModeChange: (mode: ViewerMode) => void;
  onBordersProfileChange: (profileId: BordersProfileId) => void;
  onQualityChange: (quality: QualityMode) => void;
  onHeadwayLayoutLookChange: (look: HeadwayLayoutLook) => void;
  onHeadwayLayerToggle: (layer: HeadwayLayerKey) => void;
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
  onToggleBordersPinpoints: () => void;
  shareLabel: string;
  isFrozen: boolean;
  showBorders: boolean;
  showBordersPinpoints: boolean;
  isSceneAvailable: boolean;
  layoutMode: ViewportLayoutMode;
};

type ControlDockSection =
  | 'motion'
  | 'profiles'
  | 'layout'
  | 'layers'
  | 'animation'
  | 'viewpoints';

const HEADWAY_LAYOUT_LOOKS: Array<{
  id: HeadwayLayoutLook;
  label: string;
  description: string;
}> = [
  {
    id: 'mission',
    label: 'Mission',
    description:
      'Richer dark globe with realistic water, land, and warm road accents.',
  },
  {
    id: 'daylight',
    label: 'Daylight',
    description:
      'Realistic bright map with saturated ocean blues and greener land.',
  },
  {
    id: 'atlas',
    label: 'Atlas',
    description:
      'Printed-map palette with stronger terrain color and earthier roads.',
  },
  {
    id: 'blueprint',
    label: 'Blueprint',
    description: 'Cool technical charting with stronger geometry lines.',
  },
  {
    id: 'mono',
    label: 'Mono',
    description: 'Neutral grayscale with cleaner contrast and less haze.',
  },
  {
    id: 'transit',
    label: 'Transit',
    description:
      'Vivid transport colors with dense labels and brighter routes.',
  },
];

const HEADWAY_LAYER_CONTROLS: Array<{
  id: HeadwayLayerKey;
  label: string;
}> = [
  { id: 'roads', label: 'Roads' },
  { id: 'parks', label: 'Parks' },
  { id: 'buildings', label: 'Buildings' },
  { id: 'placeLabels', label: 'Place labels' },
  { id: 'pois', label: 'POIs' },
];

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

function CollapseChevronIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path
        d={open ? 'M7 14l5-5 5 5' : 'M7 10l5 5 5-5'}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ControlDockSectionCard({
  children,
  description,
  id,
  isOpen,
  onToggle,
  title,
}: {
  children: ReactNode;
  description: string;
  id: string;
  isOpen: boolean;
  onToggle: () => void;
  title: string;
}) {
  return (
    <section
      className="hud-card hud-card--dock-section"
      aria-label={`${title} section`}
    >
      <button
        aria-controls={id}
        aria-expanded={isOpen}
        aria-label={`Toggle ${title.toLowerCase()} section`}
        className="collapse-toggle collapse-toggle--section"
        onClick={onToggle}
        type="button"
      >
        <span className="collapse-toggle__content">
          <span className="panel-kicker">{title}</span>
          <small>{description}</small>
        </span>
        <span className="collapse-toggle__icon">
          <CollapseChevronIcon open={isOpen} />
        </span>
      </button>
      {isOpen ? (
        <div className="control-section__body" id={id}>
          {children}
        </div>
      ) : null}
    </section>
  );
}

export function ControlDock({
  geographyControls,
  quality,
  headwayLayoutLook,
  headwayLayerVisibility,
  axisLockMode,
  compareModeState,
  viewerMode,
  bordersProfileId,
  presets,
  animationDraft,
  onModeChange,
  onBordersProfileChange,
  onQualityChange,
  onHeadwayLayoutLookChange,
  onHeadwayLayerToggle,
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
  onToggleBordersPinpoints,
  shareLabel,
  isFrozen,
  showBorders,
  showBordersPinpoints,
  isSceneAvailable,
  layoutMode,
}: ControlDockProps) {
  const [openSections, setOpenSections] = useState<
    Record<ControlDockSection, boolean>
  >(() => {
    const defaultOpen = layoutMode !== 'mobile';

    return {
      motion: defaultOpen,
      profiles: defaultOpen,
      layout: defaultOpen,
      layers: defaultOpen,
      animation: defaultOpen,
      viewpoints: defaultOpen,
    };
  });

  const toggleSection = (section: ControlDockSection) => {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  const compareButtonLabel =
    viewerMode !== 'geo'
      ? 'Compare (Geo only)'
      : compareModeState === 'pinned'
        ? 'Compare active'
        : compareModeState === 'armed'
          ? 'Pick country'
          : 'Compare';
  const enabledBlocks = countEnabledAnimationBlocks(animationDraft);
  const isBordersMode = viewerMode === 'borders';
  const isHeadwayMode = viewerMode === 'headway';
  const isAnimationSupported = !isBordersMode;
  const canPlayAnimation =
    isAnimationSupported &&
    isSceneAvailable &&
    !isFrozen &&
    canPlayAnimationTimeline(animationDraft);

  return (
    <>
      <section
        className="hud-card hud-card--controls hud-card--controls-primary"
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
            <button
              aria-selected={viewerMode === 'borders'}
              className={`mode-switch__button ${viewerMode === 'borders' ? 'mode-switch__button--active' : ''}`}
              onClick={() => onModeChange('borders')}
              role="tab"
              type="button"
            >
              Borders
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

      {geographyControls}
      <ControlDockSectionCard
        description={
          isBordersMode ? 'Freeze and pinpoints' : 'Freeze and borders'
        }
        id="control-dock-motion"
        isOpen={openSections.motion}
        onToggle={() => toggleSection('motion')}
        title="Motion"
      >
        <div className="field field--section">
          <div className="button-row">
            <button
              className={`secondary-button ${isFrozen ? 'secondary-button--active' : ''}`}
              disabled={!isSceneAvailable}
              onClick={onToggleFrozen}
              type="button"
            >
              {isFrozen ? 'Unfreeze' : 'Freeze'}
            </button>
            {isBordersMode ? (
              <button
                className={`secondary-button ${showBordersPinpoints ? 'secondary-button--active' : ''}`}
                disabled={!isSceneAvailable}
                onClick={onToggleBordersPinpoints}
                type="button"
              >
                {showBordersPinpoints ? 'Hide pinpoints' : 'Pinpoints'}
              </button>
            ) : (
              <button
                className={`secondary-button ${showBorders ? 'secondary-button--active' : ''}`}
                disabled={!isSceneAvailable}
                onClick={onToggleBorders}
                type="button"
              >
                {showBorders ? 'Hide borders' : 'Borders'}
              </button>
            )}
          </div>
        </div>
      </ControlDockSectionCard>

      <ControlDockSectionCard
        description="Switch Borders thematic profiles"
        id="control-dock-profiles"
        isOpen={openSections.profiles}
        onToggle={() => toggleSection('profiles')}
        title="Profiles"
      >
        {isBordersMode ? (
          <div className="preset-list">
            {BORDERS_PROFILES.map((profile) => (
              <button
                aria-pressed={bordersProfileId === profile.id}
                className={`preset-button ${bordersProfileId === profile.id ? 'preset-button--active' : ''}`}
                disabled={!isSceneAvailable}
                key={profile.id}
                onClick={() => onBordersProfileChange(profile.id)}
                type="button"
              >
                <span className="preset-button__title">
                  <span>{profile.label}</span>
                </span>
                <small>{profile.description}</small>
              </button>
            ))}
          </div>
        ) : (
          <div className="field field--section">
            <small>Profiles are available in Borders mode.</small>
          </div>
        )}
      </ControlDockSectionCard>

      <ControlDockSectionCard
        description="Switch Headway map styling"
        id="control-dock-layout"
        isOpen={openSections.layout}
        onToggle={() => toggleSection('layout')}
        title="Layout"
      >
        {isHeadwayMode ? (
          <div className="preset-list">
            {HEADWAY_LAYOUT_LOOKS.map((look) => (
              <button
                aria-pressed={headwayLayoutLook === look.id}
                className={`preset-button ${headwayLayoutLook === look.id ? 'preset-button--active' : ''}`}
                disabled={!isSceneAvailable}
                key={look.id}
                onClick={() => onHeadwayLayoutLookChange(look.id)}
                type="button"
              >
                <span className="preset-button__title">
                  <span>{look.label}</span>
                </span>
                <small>{look.description}</small>
              </button>
            ))}
          </div>
        ) : (
          <div className="field field--section">
            <small>Layout looks are available in Headway mode.</small>
          </div>
        )}
      </ControlDockSectionCard>

      <ControlDockSectionCard
        description="Show or hide Headway map layers"
        id="control-dock-layers"
        isOpen={openSections.layers}
        onToggle={() => toggleSection('layers')}
        title="Layers"
      >
        {isHeadwayMode ? (
          <div className="field field--section">
            <div className="button-row">
              {HEADWAY_LAYER_CONTROLS.map((layer) => (
                <button
                  className={`secondary-button ${headwayLayerVisibility[layer.id] ? 'secondary-button--active' : ''}`}
                  disabled={!isSceneAvailable}
                  key={layer.id}
                  onClick={() => onHeadwayLayerToggle(layer.id)}
                  type="button"
                >
                  {layer.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="field field--section">
            <small>Layer toggles are available in Headway mode.</small>
          </div>
        )}
      </ControlDockSectionCard>

      <ControlDockSectionCard
        description="Playback and editor"
        id="control-dock-animation"
        isOpen={openSections.animation}
        onToggle={() => toggleSection('animation')}
        title="Animation"
      >
        <div className="field field--section">
          {isBordersMode ? (
            <small>Borders animation is not part of v1.</small>
          ) : (
            <div className="animation-summary">
              <div className="animation-summary__meta">
                <strong>
                  {viewerMode === 'geo' ? 'Geo timeline' : 'Headway timeline'}
                </strong>
                <small>
                  {formatDurationLabel(animationDraft.totalDurationMs)} total
                </small>
              </div>
              <div className="animation-summary__meta">
                <strong>{enabledBlocks}</strong>
                <small>
                  {enabledBlocks === 1 ? 'enabled block' : 'enabled blocks'}
                  {' / '}
                  {formatStartPoseLabel(animationDraft)}
                </small>
              </div>
            </div>
          )}
          <div className="button-row">
            <button
              className="secondary-button"
              disabled={!isAnimationSupported}
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
      </ControlDockSectionCard>

      <ControlDockSectionCard
        description="Saved camera presets"
        id="control-dock-viewpoints"
        isOpen={openSections.viewpoints}
        onToggle={() => toggleSection('viewpoints')}
        title="Viewpoints"
      >
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
      </ControlDockSectionCard>
    </>
  );
}
