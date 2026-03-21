import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import {
  getAnimationCommandOption,
  getAnimationCommandOptions,
} from './animationCommandConfig';
import type {
  AnimationBlock,
  AnimationTimeline,
  ViewerMode,
} from '../state/viewerStore';

type AnimationTimelineProps = {
  draft: AnimationTimeline;
  viewerMode: ViewerMode;
  playheadMs: number;
  selectedBlockId: string | null;
  onPlayheadChange: (playheadMs: number) => void;
  onSelectBlock: (blockId: string) => void;
  onUpdateBlockTiming: (
    blockId: string,
    nextTiming: Pick<AnimationBlock, 'startMs' | 'endMs'>,
  ) => void;
};

type DragState =
  | {
      mode: 'scrub';
      rect: DOMRect;
    }
  | {
      mode: 'move' | 'resize-start' | 'resize-end';
      blockId: string;
      rect: DOMRect;
      originClientX: number;
      startMs: number;
      endMs: number;
    };

const SNAP_MS = 100;
const MIN_BLOCK_MS = 100;

const snapMs = (value: number) => Math.round(value / SNAP_MS) * SNAP_MS;

const clampMs = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const formatRulerSeconds = (milliseconds: number) =>
  `${(milliseconds / 1_000).toFixed(milliseconds % 1_000 === 0 ? 0 : 1)}s`;

const toPercent = (milliseconds: number, totalDurationMs: number) =>
  `${(milliseconds / totalDurationMs) * 100}%`;

const getRulerTicks = (totalDurationMs: number) => {
  const stepMs = totalDurationMs <= 5_000 ? 500 : totalDurationMs <= 16_000 ? 1_000 : 2_000;
  const ticks: number[] = [];

  for (let tick = 0; tick <= totalDurationMs; tick += stepMs) {
    ticks.push(tick);
  }

  if (ticks.at(-1) !== totalDurationMs) {
    ticks.push(totalDurationMs);
  }

  return ticks;
};

const positionToPlayheadMs = (
  clientX: number,
  rect: DOMRect,
  totalDurationMs: number,
) => {
  if (rect.width <= 0) {
    return 0;
  }

  const relative = clampMs(clientX - rect.left, 0, rect.width);
  return clampMs(
    snapMs((relative / rect.width) * totalDurationMs),
    0,
    totalDurationMs,
  );
};

export function AnimationTimeline({
  draft,
  viewerMode,
  playheadMs,
  selectedBlockId,
  onPlayheadChange,
  onSelectBlock,
  onUpdateBlockTiming,
}: AnimationTimelineProps) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const laneCommands = useMemo(
    () => getAnimationCommandOptions(viewerMode).map((option) => option.command),
    [viewerMode],
  );
  const rulerTicks = useMemo(
    () => getRulerTicks(draft.totalDurationMs),
    [draft.totalDurationMs],
  );

  useEffect(() => {
    if (dragState == null) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (dragState.mode === 'scrub') {
        onPlayheadChange(
          positionToPlayheadMs(
            event.clientX,
            dragState.rect,
            draft.totalDurationMs,
          ),
        );
        return;
      }

      const blockDuration = dragState.endMs - dragState.startMs;
      const deltaMs = snapMs(
        ((event.clientX - dragState.originClientX) / dragState.rect.width) *
          draft.totalDurationMs,
      );

      if (dragState.mode === 'move') {
        const nextStartMs = clampMs(
          dragState.startMs + deltaMs,
          0,
          draft.totalDurationMs - blockDuration,
        );
        onUpdateBlockTiming(dragState.blockId, {
          startMs: nextStartMs,
          endMs: nextStartMs + blockDuration,
        });
        return;
      }

      if (dragState.mode === 'resize-start') {
        const nextStartMs = clampMs(
          dragState.startMs + deltaMs,
          0,
          dragState.endMs - MIN_BLOCK_MS,
        );
        onUpdateBlockTiming(dragState.blockId, {
          startMs: nextStartMs,
          endMs: dragState.endMs,
        });
        return;
      }

      const nextEndMs = clampMs(
        dragState.endMs + deltaMs,
        dragState.startMs + MIN_BLOCK_MS,
        draft.totalDurationMs,
      );
      onUpdateBlockTiming(dragState.blockId, {
        startMs: dragState.startMs,
        endMs: nextEndMs,
      });
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, draft.totalDurationMs, onPlayheadChange, onUpdateBlockTiming]);

  const beginScrub = (
    event: ReactMouseEvent<HTMLElement>,
    rect: DOMRect = event.currentTarget.getBoundingClientRect(),
  ) => {
    onPlayheadChange(positionToPlayheadMs(event.clientX, rect, draft.totalDurationMs));
    setDragState({
      mode: 'scrub',
      rect,
    });
  };

  const beginBlockDrag = (
    event: ReactMouseEvent<HTMLElement>,
    mode: 'move' | 'resize-start' | 'resize-end',
    block: AnimationBlock,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    onSelectBlock(block.id);
    setDragState({
      mode,
      blockId: block.id,
      rect: event.currentTarget
        .closest('.animation-timeline__lane-track')!
        .getBoundingClientRect(),
      originClientX: event.clientX,
      startMs: block.startMs,
      endMs: block.endMs,
    });
  };

  return (
    <section className="animation-timeline" aria-label="Animation timeline">
      <div
        className="animation-timeline__ruler"
        data-testid="animation-timeline-ruler"
        onMouseDown={(event) => beginScrub(event)}
        role="presentation"
      >
        {rulerTicks.map((tick) => (
          <div
            className="animation-timeline__tick"
            key={tick}
            style={{ left: toPercent(tick, draft.totalDurationMs) }}
          >
            <span>{formatRulerSeconds(tick)}</span>
          </div>
        ))}
        <div
          className="animation-timeline__playhead"
          style={{ left: toPercent(playheadMs, draft.totalDurationMs) }}
        />
      </div>

      <div className="animation-timeline__lanes">
        {laneCommands.map((command) => {
          const laneBlocks = draft.blocks.filter((block) => block.command === command);
          const option = getAnimationCommandOption(viewerMode, command);

          return (
            <div className="animation-timeline__lane" key={command}>
              <div className="animation-timeline__lane-label">
                <strong>{option?.label ?? command}</strong>
                <small>{command}</small>
              </div>
              <div
                className="animation-timeline__lane-track"
                data-testid={`animation-lane-${command}`}
                onMouseDown={(event) => beginScrub(event)}
                role="presentation"
              >
                <div
                  className="animation-timeline__playhead"
                  style={{ left: toPercent(playheadMs, draft.totalDurationMs) }}
                />
                {laneBlocks.map((block) => (
                  <button
                    className={`animation-timeline__clip ${selectedBlockId === block.id ? 'animation-timeline__clip--selected' : ''} ${block.enabled ? '' : 'animation-timeline__clip--disabled'}`}
                    data-testid={`animation-block-${block.id}`}
                    key={block.id}
                    onMouseDown={(event) => beginBlockDrag(event, 'move', block)}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectBlock(block.id);
                    }}
                    style={{
                      left: toPercent(block.startMs, draft.totalDurationMs),
                      width: toPercent(
                        Math.max(block.endMs - block.startMs, MIN_BLOCK_MS),
                        draft.totalDurationMs,
                      ),
                    }}
                    type="button"
                  >
                    <span className="animation-timeline__clip-label">
                      {option?.shortLabel ?? command}
                    </span>
                    <span className="animation-timeline__clip-value">
                      {block.amount}
                    </span>
                    <span
                      className="animation-timeline__clip-handle animation-timeline__clip-handle--start"
                      data-testid={`animation-handle-start-${block.id}`}
                      onMouseDown={(event) => beginBlockDrag(event, 'resize-start', block)}
                      role="presentation"
                    />
                    <span
                      className="animation-timeline__clip-handle animation-timeline__clip-handle--end"
                      data-testid={`animation-handle-end-${block.id}`}
                      onMouseDown={(event) => beginBlockDrag(event, 'resize-end', block)}
                      role="presentation"
                    />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
