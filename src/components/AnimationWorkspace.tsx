import { useState } from 'react';
import type { ViewportLayoutMode } from '../app/useViewportLayout';
import {
  MOVE_COMMAND_OPTIONS,
  ROTATE_COMMAND_OPTIONS,
} from './animationCommandConfig';
import { AnimationInspector } from './AnimationInspector';
import { AnimationTimeline } from './AnimationTimeline';
import {
  createAnimationBlockId,
  getDefaultAnimationStartGeoView,
  serializeAnimationTimeline,
} from '../lib/animation';
import {
  buildGeoViewFromPoseFields,
  deriveGeoPoseFields,
} from '../lib/navigation';
import type {
  AnimationCommandKey,
  AnimationTimeline as AnimationTimelineState,
  ViewerMode,
} from '../state/viewerStore';

type AnimationWorkspaceProps = {
  open: boolean;
  phase: 'idle' | 'playing';
  layoutMode: ViewportLayoutMode;
  viewerMode: ViewerMode;
  draft: AnimationTimelineState;
  playheadMs: number;
  importHex: string;
  importError: string | null;
  canPlay: boolean;
  onClose: () => void;
  onPlay: () => void;
  onDraftChange: (
    next:
      | AnimationTimelineState
      | ((draft: AnimationTimelineState) => AnimationTimelineState),
  ) => void;
  onPlayheadChange: (playheadMs: number) => void;
  onImportHexChange: (hex: string) => void;
  onImportHexLoad: () => void;
  onClearDraft: () => void;
};

const INSERT_DURATION_MS = 1_000;
const DEFAULT_ACCELERATION = 0.4;

const formatSeconds = (milliseconds: number) =>
  (milliseconds / 1_000).toFixed(2).replace(/\.?0+$/, '');

const formatPoseInput = (value: number, decimals: number) =>
  value.toFixed(decimals).replace(/\.?0+$/, (match) =>
    match.startsWith('.') ? '' : match,
  );

const getGeoPoseSourceKey = (
  view: AnimationTimelineState['startGeoView'],
) =>
  view == null
    ? 'geo-start-empty'
    : [
        ...view.rotation.map((value) => value.toFixed(6)),
        view.distance.toFixed(4),
        view.fov.toFixed(2),
      ].join(':');

const buildGeoPoseFormState = (view: NonNullable<AnimationTimelineState['startGeoView']>) => {
  const pose = deriveGeoPoseFields(view);

  return {
    sourceKey: getGeoPoseSourceKey(view),
    latitude: formatPoseInput(pose.lat, 2),
    longitude: formatPoseInput(pose.lon, 2),
    distance: formatPoseInput(pose.distance, 2),
    roll: formatPoseInput(pose.rollDeg, 1),
    fov: formatPoseInput(pose.fov, 1),
  };
};

export function AnimationWorkspace({
  open,
  phase,
  layoutMode,
  viewerMode,
  draft,
  playheadMs,
  importHex,
  importError,
  canPlay,
  onClose,
  onPlay,
  onDraftChange,
  onPlayheadChange,
  onImportHexChange,
  onImportHexLoad,
  onClearDraft,
}: AnimationWorkspaceProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [durationInputState, setDurationInputState] = useState<{
    sourceMs: number;
    value: string;
  }>({
    sourceMs: draft.totalDurationMs,
    value: (draft.totalDurationMs / 1_000).toFixed(1),
  });
  const [durationError, setDurationError] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState('Copy hex');
  const [lastAmountByCommand, setLastAmountByCommand] = useState<
    Partial<Record<AnimationCommandKey, number>>
  >({});
  const [geoPoseFormState, setGeoPoseFormState] = useState(() =>
    buildGeoPoseFormState(
      draft.startGeoView ?? getDefaultAnimationStartGeoView(),
    ),
  );
  const [geoPoseError, setGeoPoseError] = useState<string | null>(null);
  const resolvedSelectedBlockId = draft.blocks.some(
    (block) => block.id === selectedBlockId,
  )
    ? selectedBlockId
    : draft.blocks[0]?.id ?? null;
  const selectedBlock =
    draft.blocks.find((block) => block.id === resolvedSelectedBlockId) ?? null;
  const durationInput =
    durationInputState.sourceMs === draft.totalDurationMs
      ? durationInputState.value
      : (draft.totalDurationMs / 1_000).toFixed(1);
  const currentGeoStartView =
    draft.startGeoView ?? getDefaultAnimationStartGeoView();
  const resolvedGeoPoseFormState =
    geoPoseFormState.sourceKey === getGeoPoseSourceKey(currentGeoStartView)
      ? geoPoseFormState
      : buildGeoPoseFormState(currentGeoStartView);

  if (!open) {
    return null;
  }

  if (phase === 'playing') {
    return null;
  }

  const recordCommandAmount = (command: AnimationCommandKey, amount: number) => {
    setLastAmountByCommand((current) => ({
      ...current,
      [command]: amount,
    }));
  };

  const updateBlock = (
    blockId: string,
    next: Partial<AnimationTimelineState['blocks'][number]>,
  ) => {
    onDraftChange((current) => ({
      ...current,
      blocks: current.blocks.map((block) => {
        if (block.id !== blockId) {
          return block;
        }

        const updated = { ...block, ...next };
        if (typeof updated.amount === 'number') {
          recordCommandAmount(updated.command, updated.amount);
        }
        return updated;
      }),
    }));
  };

  const handleInsertCommand = (command: AnimationCommandKey) => {
    const clipDurationMs = Math.min(INSERT_DURATION_MS, draft.totalDurationMs);
    const rawStartMs = Math.round(playheadMs / 100) * 100;
    const startMs = Math.max(
      0,
      Math.min(rawStartMs, draft.totalDurationMs - clipDurationMs),
    );
    const nextBlock = {
      id: createAnimationBlockId(),
      command,
      startMs,
      endMs: startMs + clipDurationMs,
      amount: lastAmountByCommand[command] ?? 1,
      acceleration: DEFAULT_ACCELERATION,
      enabled: true,
    } satisfies AnimationTimelineState['blocks'][number];

    recordCommandAmount(command, nextBlock.amount);
    onDraftChange((current) => ({
      ...current,
      blocks: [...current.blocks, nextBlock],
    }));
    setSelectedBlockId(nextBlock.id);
  };

  const handleDeleteBlock = (blockId: string) => {
    onDraftChange((current) => ({
      ...current,
      blocks: current.blocks.filter((block) => block.id !== blockId),
    }));
    setSelectedBlockId((current) => (current === blockId ? null : current));
  };

  const commitDuration = () => {
    const nextDurationSeconds = Number.parseFloat(durationInput);
    const maxEndMs = Math.max(0, ...draft.blocks.map((block) => block.endMs));

    if (!Number.isFinite(nextDurationSeconds) || nextDurationSeconds <= 0) {
      setDurationError('Total duration must be a positive number.');
      return;
    }

    const nextDurationMs = Math.round(nextDurationSeconds * 1_000);
    if (nextDurationMs < maxEndMs) {
      setDurationError('Total duration cannot be shorter than the latest clip end.');
      return;
    }

    setDurationError(null);
    setDurationInputState({
      sourceMs: nextDurationMs,
      value: (nextDurationMs / 1_000).toFixed(1),
    });
    onDraftChange((current) => ({
      ...current,
      totalDurationMs: nextDurationMs,
    }));
    if (playheadMs > nextDurationMs) {
      onPlayheadChange(nextDurationMs);
    }
  };

  const handleCopyHex = async () => {
    try {
      await navigator.clipboard.writeText(serializeAnimationTimeline(draft));
      setCopyLabel('Copied');
      window.setTimeout(() => setCopyLabel('Copy hex'), 1_500);
    } catch {
      setCopyLabel('Copy failed');
      window.setTimeout(() => setCopyLabel('Copy hex'), 1_500);
    }
  };

  const updateGeoPoseFormState = (
    next: Partial<Omit<typeof resolvedGeoPoseFormState, 'sourceKey'>>,
  ) => {
    setGeoPoseFormState({
      ...resolvedGeoPoseFormState,
      ...next,
      sourceKey: getGeoPoseSourceKey(currentGeoStartView),
    });
    setGeoPoseError(null);
  };

  const applyGeoStartPose = (nextView: AnimationTimelineState['startGeoView']) => {
    onDraftChange((current) => ({
      ...current,
      startGeoView: nextView,
      startHeadwayView: null,
    }));
  };

  const handleApplyGeoStartPose = () => {
    const latitude = Number.parseFloat(resolvedGeoPoseFormState.latitude);
    const longitude = Number.parseFloat(resolvedGeoPoseFormState.longitude);
    const distance = Number.parseFloat(resolvedGeoPoseFormState.distance);
    const roll = Number.parseFloat(resolvedGeoPoseFormState.roll);
    const fov = Number.parseFloat(resolvedGeoPoseFormState.fov);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(distance) ||
      !Number.isFinite(roll) ||
      !Number.isFinite(fov)
    ) {
      setGeoPoseError('Start pose fields must all be valid numbers.');
      return;
    }

    const nextView = buildGeoViewFromPoseFields({
      lat: latitude,
      lon: longitude,
      distance,
      rollDeg: roll,
      fov,
    });

    setGeoPoseError(null);
    setGeoPoseFormState(buildGeoPoseFormState(nextView));
    applyGeoStartPose(nextView);
  };

  const handleResetGeoStartPose = () => {
    const nextView = getDefaultAnimationStartGeoView();
    setGeoPoseError(null);
    setGeoPoseFormState(buildGeoPoseFormState(nextView));
    applyGeoStartPose(nextView);
  };

  return (
    <section
      aria-label="Animation workspace"
      className={`animation-workspace animation-workspace--${layoutMode}`}
    >
      <div className="animation-workspace__chrome">
        <div className="animation-workspace__hero">
          <div>
            <p className="panel-kicker">Animation workspace</p>
            <h1>{viewerMode === 'geo' ? 'Geo timeline' : 'Headway timeline'}</h1>
            <p className="animation-workspace__note">
              Build timed motion clips against the saved start pose. The scene
              stays locked while you author the draft.
            </p>
          </div>

          <div className="animation-workspace__transport">
            <label className="field">
              <span>Total duration</span>
              <input
                min="0.1"
                onBlur={commitDuration}
                onChange={(event) => {
                  setDurationInputState({
                    sourceMs: draft.totalDurationMs,
                    value: event.target.value,
                  });
                  setDurationError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    commitDuration();
                  }
                }}
                step="0.1"
                type="number"
                value={durationInput}
              />
            </label>
            <div className="animation-workspace__transport-status">
              <strong>{formatSeconds(playheadMs)}s</strong>
              <small>playhead</small>
            </div>
            <button
              className="primary-button"
              disabled={!canPlay}
              onClick={onPlay}
              type="button"
            >
              Play from playhead
            </button>
            <button className="secondary-button" onClick={onClose} type="button">
              Return to viewer
            </button>
          </div>
        </div>

        <div className="animation-workspace__locked-banner" role="note">
          <p className="panel-kicker">Locked viewport</p>
          <p>
            Camera controls are disabled while the editor is open. The start
            pose fields define the base camera, and every clip is applied on top
            of that pose at the current playhead.
          </p>
        </div>

        {viewerMode === 'geo' ? (
          <div className="animation-workspace__start-pose">
            <div className="hud-card__header">
              <div>
                <p className="panel-kicker">Start pose</p>
                <h2>Base camera</h2>
              </div>
              <small>Default: Europe / Africa</small>
            </div>

            <div className="animation-workspace__start-pose-grid">
              <label className="field">
                <span>Latitude</span>
                <input
                  onChange={(event) =>
                    updateGeoPoseFormState({ latitude: event.target.value })
                  }
                  step="0.1"
                  type="number"
                  value={resolvedGeoPoseFormState.latitude}
                />
              </label>
              <label className="field">
                <span>Longitude</span>
                <input
                  onChange={(event) =>
                    updateGeoPoseFormState({ longitude: event.target.value })
                  }
                  step="0.1"
                  type="number"
                  value={resolvedGeoPoseFormState.longitude}
                />
              </label>
              <label className="field">
                <span>Distance</span>
                <input
                  onChange={(event) =>
                    updateGeoPoseFormState({ distance: event.target.value })
                  }
                  step="0.01"
                  type="number"
                  value={resolvedGeoPoseFormState.distance}
                />
              </label>
              <label className="field">
                <span>Roll</span>
                <input
                  onChange={(event) =>
                    updateGeoPoseFormState({ roll: event.target.value })
                  }
                  step="0.1"
                  type="number"
                  value={resolvedGeoPoseFormState.roll}
                />
              </label>
              <label className="field">
                <span>FOV</span>
                <input
                  onChange={(event) =>
                    updateGeoPoseFormState({ fov: event.target.value })
                  }
                  step="0.1"
                  type="number"
                  value={resolvedGeoPoseFormState.fov}
                />
              </label>
            </div>

            {geoPoseError ? (
              <p className="animation-workspace__error">{geoPoseError}</p>
            ) : (
              <p className="animation-workspace__pose-note">
                Use the saved base camera instead of the live viewer state. Clip
                motion is evaluated from this pose every time playback starts.
              </p>
            )}

            <div className="button-row">
              <button
                className="secondary-button"
                onClick={handleApplyGeoStartPose}
                type="button"
              >
                Apply start pose
              </button>
              <button
                className="secondary-button"
                onClick={handleResetGeoStartPose}
                type="button"
              >
                Reset to Europe / Africa
              </button>
            </div>
          </div>
        ) : null}

        {durationError ? (
          <p className="animation-workspace__error">{durationError}</p>
        ) : null}

        <div className="animation-workspace__command-groups">
          <div className="animation-workspace__command-group">
            <div className="hud-card__header">
              <strong>Move</strong>
              <small>Insert at playhead</small>
            </div>
            <div className="animation-command-grid" role="group" aria-label="Move commands">
              {MOVE_COMMAND_OPTIONS.map((option) => (
                <button
                  className="trim-pad__button"
                  key={option.command}
                  onClick={() => handleInsertCommand(option.command)}
                  type="button"
                >
                  <span>{option.shortLabel}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="animation-workspace__command-group">
            <div className="hud-card__header">
              <strong>Rotate</strong>
              <small>Insert at playhead</small>
            </div>
            <div className="animation-command-grid" role="group" aria-label="Rotate commands">
              {ROTATE_COMMAND_OPTIONS(viewerMode).map((option) => (
                <button
                  className="trim-pad__button"
                  key={option.command}
                  onClick={() => handleInsertCommand(option.command)}
                  type="button"
                >
                  <span>{option.shortLabel}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="animation-workspace__summary">
            <div className="animation-summary__meta">
              <strong>{draft.blocks.length}</strong>
              <small>{draft.blocks.length === 1 ? 'clip' : 'clips'}</small>
            </div>
            <div className="animation-summary__meta">
              <strong>
                {
                  draft.blocks.filter((block) => block.enabled).length
                }
              </strong>
              <small>enabled</small>
            </div>
          </div>
        </div>
      </div>

      <div className="animation-workspace__body">
        <AnimationTimeline
          draft={draft}
          onPlayheadChange={onPlayheadChange}
          onSelectBlock={setSelectedBlockId}
          onUpdateBlockTiming={(blockId, nextTiming) =>
            updateBlock(blockId, nextTiming)
          }
          playheadMs={playheadMs}
          selectedBlockId={resolvedSelectedBlockId}
          viewerMode={viewerMode}
        />

        <AnimationInspector
          onDeleteBlock={handleDeleteBlock}
          onUpdateBlock={(blockId, next) => updateBlock(blockId, next)}
          selectedBlock={selectedBlock}
          totalDurationMs={draft.totalDurationMs}
          viewerMode={viewerMode}
        />
      </div>

      <details className="animation-workspace__advanced">
        <summary>Import / Export</summary>
        <div className="animation-workspace__advanced-body">
          <label className="field">
            <span>Hex timeline</span>
            <textarea
              className="animation-workspace__hex"
              onChange={(event) => onImportHexChange(event.target.value)}
              value={importHex}
            />
            {importError ? (
              <small className="animation-workspace__error">{importError}</small>
            ) : (
              <small>
                Copy the current draft as hex or paste a saved timeline to load
                it.
              </small>
            )}
          </label>

          <div className="button-row">
            <button className="secondary-button" onClick={handleCopyHex} type="button">
              {copyLabel}
            </button>
            <button
              className="secondary-button"
              onClick={onImportHexLoad}
              type="button"
            >
              Load hex
            </button>
            <button
              className="secondary-button"
              onClick={() => {
                onClearDraft();
                setSelectedBlockId(null);
                setLastAmountByCommand({});
                setDurationInputState({
                  sourceMs: draft.totalDurationMs,
                  value: (draft.totalDurationMs / 1_000).toFixed(1),
                });
                setDurationError(null);
                setGeoPoseError(null);
              }}
              type="button"
            >
              Clear draft
            </button>
          </div>
        </div>
      </details>
    </section>
  );
}
