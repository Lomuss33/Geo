type AnimationPlaybackOverlayProps = {
  playheadMs: number;
  totalDurationMs: number;
  onStop: () => void;
};

const formatSeconds = (milliseconds: number) =>
  (milliseconds / 1_000).toFixed(2).replace(/\.?0+$/, '');

export function AnimationPlaybackOverlay({
  playheadMs,
  totalDurationMs,
  onStop,
}: AnimationPlaybackOverlayProps) {
  return (
    <section
      aria-label="Animation playback overlay"
      className="animation-playback-overlay"
    >
      <div className="animation-playback-overlay__meta">
        <p className="panel-kicker">Playback</p>
        <strong>
          {formatSeconds(playheadMs)}s / {formatSeconds(totalDurationMs)}s
        </strong>
        <small>Press Esc to stop playback.</small>
      </div>
      <button className="secondary-button" onClick={onStop} type="button">
        Stop playback
      </button>
    </section>
  );
}
