import type {
  AxisLockMode,
  CompareModeState,
  HeadwayRenderState,
  HeadwayViewState,
  RenderState,
  RendererTier,
  RotationAxis,
  SelectedCountry,
  ViewerMode,
} from '../state/viewerStore';
import type { HudTelemetry } from '../state/viewerStore';
import { formatAltitude, formatRoll, formatSigned } from '../lib/format';
import { formatRendererTier } from '../lib/renderer';

type HudPanelProps = {
  telemetry: HudTelemetry;
  headwayView: HeadwayViewState;
  viewerMode: ViewerMode;
  axisLockMode: AxisLockMode;
  activeAxis: RotationAxis;
  compareModeState: CompareModeState;
  selectedCountry: SelectedCountry | null;
  isFrozen: boolean;
  renderState: RenderState;
  headwayRenderState: HeadwayRenderState;
  rendererTier: RendererTier | null;
};

export function HudPanel({
  telemetry,
  headwayView,
  viewerMode,
  axisLockMode,
  activeAxis,
  compareModeState,
  selectedCountry,
  isFrozen,
  renderState,
  headwayRenderState,
  rendererTier,
}: HudPanelProps) {
  const isHeadway = viewerMode === 'headway';
  const [headwayLon, headwayLat] = headwayView.center;

  return (
    <section
      className="hud-card hud-card--telemetry"
      aria-label="View telemetry"
    >
      <div className="hud-card__header">
        <span className="panel-kicker">Telemetry</span>
        <div className="status-pill-list">
          <span className="status-pill status-pill--axis">
            {isHeadway ? 'Headway' : 'Geo'}
          </span>
          {!isHeadway ? (
            <span className="status-pill status-pill--axis">
              {axisLockMode === 'axis-lock' ? 'Axis lock' : 'Free orbit'}
            </span>
          ) : axisLockMode === 'axis-lock' ? (
            <span className="status-pill status-pill--axis">Axis lock</span>
          ) : null}
          {!isHeadway && axisLockMode === 'axis-lock' && activeAxis ? (
            <span className="status-pill status-pill--axis">
              Axis {activeAxis.toUpperCase()}
            </span>
          ) : null}
          {compareModeState === 'armed' ? (
            <span className="status-pill status-pill--axis">Compare armed</span>
          ) : null}
          {compareModeState === 'pinned' && selectedCountry ? (
            <span className="status-pill status-pill--axis">
              Pinned: {selectedCountry.name}
            </span>
          ) : null}
          {isFrozen ? (
            <span className="status-pill status-pill--frozen">Motion paused</span>
          ) : null}
          {isHeadway ? (
            headwayRenderState === 'error' ? (
              <span className="status-pill status-pill--failed">
                Headway offline
              </span>
            ) : (
              <span className="status-pill status-pill--sun">Vector globe</span>
            )
          ) : renderState === 'failed' ? (
            <span className="status-pill status-pill--failed">
              Renderer offline
            </span>
          ) : (
            <span
              className={`status-pill ${telemetry.sunlit ? 'status-pill--sun' : 'status-pill--night'}`}
            >
              {telemetry.sunlit ? 'Sunlit' : 'Night side'}
            </span>
          )}
        </div>
      </div>
      {!isHeadway && renderState === 'failed' ? (
        <p className="telemetry-note">
          Last renderer tier: {formatRendererTier(rendererTier)}
        </p>
      ) : null}
      <dl className="telemetry-grid">
        <div>
          <dt>Latitude</dt>
          <dd>
            {formatSigned(isHeadway ? headwayLat : telemetry.lat, 'N', 'S')}
          </dd>
        </div>
        <div>
          <dt>Longitude</dt>
          <dd>
            {formatSigned(isHeadway ? headwayLon : telemetry.lon, 'E', 'W')}
          </dd>
        </div>
        <div>
          <dt>{isHeadway ? 'Zoom' : 'Altitude'}</dt>
          <dd>
            {isHeadway
              ? headwayView.zoom.toFixed(2)
              : formatAltitude(telemetry.altitudeKm)}
          </dd>
        </div>
        <div>
          <dt>{isHeadway ? 'Bearing' : 'Roll'}</dt>
          <dd>
            {isHeadway
              ? `${Math.round(headwayView.bearing)}deg`
              : formatRoll(telemetry.rollDeg)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
