import { useState } from 'react';
import {
  getAnimationAmountHint,
  getAnimationCommandOption,
} from './animationCommandConfig';
import { WorkspaceIconButton } from './WorkspaceIconButton';
import type {
  AnimationBlock,
  AnimationMode,
} from '../state/viewerStore';

type AnimationInspectorProps = {
  viewerMode: AnimationMode;
  totalDurationMs: number;
  selectedBlock: AnimationBlock | null;
  onUpdateBlock: (
    blockId: string,
    next: Partial<
      Pick<
        AnimationBlock,
        'startMs' | 'endMs' | 'amount' | 'acceleration' | 'enabled'
      >
    >,
  ) => void;
  onDeleteBlock: (blockId: string) => void;
};

const formatSeconds = (milliseconds: number) =>
  (milliseconds / 1_000).toFixed(3).replace(/\.?0+$/, '');

const getBlockSourceKey = (block: AnimationBlock | null) =>
  block == null
    ? 'empty'
    : [
        block.id,
        block.startMs,
        block.endMs,
        block.amount,
        block.acceleration,
        block.enabled ? 1 : 0,
      ].join(':');

export function AnimationInspector({
  viewerMode,
  totalDurationMs,
  selectedBlock,
  onUpdateBlock,
  onDeleteBlock,
}: AnimationInspectorProps) {
  const [formState, setFormState] = useState<{
    sourceKey: string;
    startSeconds: string;
    endSeconds: string;
    amount: string;
    acceleration: string;
    enabled: boolean;
  }>({
    sourceKey: 'empty',
    startSeconds: '0',
    endSeconds: '0',
    amount: '1',
    acceleration: '0.4',
    enabled: true,
  });
  const [errorState, setErrorState] = useState<{
    sourceKey: string;
    message: string | null;
  }>({
    sourceKey: 'empty',
    message: null,
  });

  if (!selectedBlock) {
    return (
      <section className="animation-inspector" aria-label="Animation inspector">
        <div className="hud-card__header">
          <div>
            <p className="panel-kicker">Inspector</p>
            <h2>Clip details</h2>
          </div>
        </div>
        <p className="animation-inspector__empty">
          Select a clip on the timeline to edit its exact timing and value.
        </p>
      </section>
    );
  }

  const selectedBlockSourceKey = getBlockSourceKey(selectedBlock);
  const resolvedFormState =
    formState.sourceKey === selectedBlockSourceKey
      ? formState
      : {
          sourceKey: selectedBlockSourceKey,
          startSeconds: formatSeconds(selectedBlock.startMs),
          endSeconds: formatSeconds(selectedBlock.endMs),
          amount: String(selectedBlock.amount),
          acceleration: String(selectedBlock.acceleration),
          enabled: selectedBlock.enabled,
        };
  const error =
    errorState.sourceKey === selectedBlockSourceKey ? errorState.message : null;

  const updateFormState = (
    next: Partial<Omit<typeof resolvedFormState, 'sourceKey'>>,
  ) => {
    setFormState({
      ...resolvedFormState,
      ...next,
      sourceKey: selectedBlockSourceKey,
    });
    setErrorState({
      sourceKey: selectedBlockSourceKey,
      message: null,
    });
  };

  const handleApply = () => {
    const nextStartSeconds = Number.parseFloat(resolvedFormState.startSeconds);
    const nextEndSeconds = Number.parseFloat(resolvedFormState.endSeconds);
    const nextAmount = Number.parseFloat(resolvedFormState.amount);
    const nextAcceleration = Number.parseFloat(resolvedFormState.acceleration);

    if (
      !Number.isFinite(nextStartSeconds) ||
      !Number.isFinite(nextEndSeconds) ||
      !Number.isFinite(nextAmount) ||
      !Number.isFinite(nextAcceleration)
    ) {
      setErrorState({
        sourceKey: selectedBlockSourceKey,
        message: 'All clip fields must be valid numbers.',
      });
      return;
    }

    const nextStartMs = Math.round(nextStartSeconds * 1_000);
    const nextEndMs = Math.round(nextEndSeconds * 1_000);

    if (nextStartMs < 0 || nextEndMs <= nextStartMs) {
      setErrorState({
        sourceKey: selectedBlockSourceKey,
        message: 'End time must be greater than start time.',
      });
      return;
    }

    if (nextEndMs > totalDurationMs) {
      setErrorState({
        sourceKey: selectedBlockSourceKey,
        message: 'Clip timing must stay inside the total duration.',
      });
      return;
    }

    if (nextAmount <= 0) {
      setErrorState({
        sourceKey: selectedBlockSourceKey,
        message: 'Value must be greater than zero.',
      });
      return;
    }

    if (nextAcceleration < 0 || nextAcceleration > 1) {
      setErrorState({
        sourceKey: selectedBlockSourceKey,
        message: 'Acceleration must stay between 0 and 1.',
      });
      return;
    }

    setErrorState({
      sourceKey: selectedBlockSourceKey,
      message: null,
    });
    onUpdateBlock(selectedBlock.id, {
      startMs: nextStartMs,
      endMs: nextEndMs,
      amount: nextAmount,
      acceleration: nextAcceleration,
      enabled: resolvedFormState.enabled,
    });
  };

  const selectedCommand = getAnimationCommandOption(
    viewerMode,
    selectedBlock.command,
  );

  return (
    <section className="animation-inspector" aria-label="Animation inspector">
      <div className="hud-card__header">
        <div>
          <p className="panel-kicker">Inspector</p>
          <h2>{selectedCommand?.label ?? selectedBlock.command}</h2>
        </div>
        <span className="status-pill status-pill--axis">{selectedBlock.command}</span>
      </div>

      <div className="animation-inspector__fields">
        <label className="field">
          <span>Start</span>
          <input
            min="0"
            onChange={(event) =>
              updateFormState({ startSeconds: event.target.value })
            }
            step="0.1"
            type="number"
            value={resolvedFormState.startSeconds}
          />
        </label>

        <label className="field">
          <span>End</span>
          <input
            min="0.1"
            onChange={(event) =>
              updateFormState({ endSeconds: event.target.value })
            }
            step="0.1"
            type="number"
            value={resolvedFormState.endSeconds}
          />
        </label>

        <label className="field">
          <span>Value</span>
          <input
            min="0.01"
            onChange={(event) =>
              updateFormState({ amount: event.target.value })
            }
            step="0.01"
            type="number"
            value={resolvedFormState.amount}
          />
          <small>
            {getAnimationAmountHint(viewerMode, selectedBlock.command)}
          </small>
        </label>

        <label className="field">
          <span>Acceleration</span>
          <input
            max="1"
            min="0"
            onChange={(event) =>
              updateFormState({ acceleration: event.target.value })
            }
            step="0.05"
            type="number"
            value={resolvedFormState.acceleration}
          />
        </label>

      </div>

      <div className="animation-inspector__controls">
        <label className="field field--checkbox animation-inspector__toggle">
          <span>Enabled</span>
          <input
            checked={resolvedFormState.enabled}
            onChange={(event) =>
              updateFormState({ enabled: event.target.checked })
            }
            type="checkbox"
          />
        </label>

        <div className="animation-inspector__actions">
          <WorkspaceIconButton
            icon="apply"
            label="Apply"
            onClick={handleApply}
          />
          <WorkspaceIconButton
            icon="delete"
            label="Delete clip"
            onClick={() => onDeleteBlock(selectedBlock.id)}
          />
        </div>
      </div>

      {error ? <p className="animation-workspace__error">{error}</p> : null}
    </section>
  );
}
