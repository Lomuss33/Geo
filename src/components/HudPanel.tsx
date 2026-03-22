import type {
  AxisLockMode,
  BordersProfileId,
  BordersRenderState,
  BordersSelectedFeature,
  BordersViewState,
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
import { getBordersProfileDefinition } from '../lib/bordersProfiles';
import { formatBordersSelectionValue } from '../lib/bordersData';
import { formatAltitude, formatRoll, formatSigned } from '../lib/format';
import { formatRendererTier } from '../lib/renderer';

type HudPanelProps = {
  telemetry: HudTelemetry;
  headwayView: HeadwayViewState;
  bordersView: BordersViewState;
  viewerMode: ViewerMode;
  axisLockMode: AxisLockMode;
  activeAxis: RotationAxis;
  compareModeState: CompareModeState;
  selectedCountry: SelectedCountry | null;
  bordersProfileId: BordersProfileId;
  bordersFocusedCountryIso: string | null;
  bordersFocusedCountryName: string | null;
  bordersSelectedFeature: BordersSelectedFeature | null;
  bordersErrorMessage: string | null;
  bordersNoticeMessage: string | null;
  isFrozen: boolean;
  renderState: RenderState;
  headwayRenderState: HeadwayRenderState;
  bordersRenderState: BordersRenderState;
  rendererTier: RendererTier | null;
};

export function HudPanel({
  telemetry,
  headwayView,
  bordersView,
  viewerMode,
  axisLockMode,
  activeAxis,
  compareModeState,
  selectedCountry,
  bordersProfileId,
  bordersFocusedCountryIso,
  bordersFocusedCountryName,
  bordersSelectedFeature,
  bordersErrorMessage,
  bordersNoticeMessage,
  isFrozen,
  renderState,
  headwayRenderState,
  bordersRenderState,
  rendererTier,
}: HudPanelProps) {
  const isHeadway = viewerMode === 'headway';
  const isBorders = viewerMode === 'borders';
  const [headwayLon, headwayLat] = headwayView.center;
  const [bordersLon, bordersLat] = bordersView.center;
  const bordersProfile = getBordersProfileDefinition(bordersProfileId);

  return (
    <section
      className="hud-card hud-card--telemetry"
      aria-label="View telemetry"
    >
      <div className="hud-card__header">
        <span className="panel-kicker">Telemetry</span>
        <div className="status-pill-list">
          <span className="status-pill status-pill--axis">
            {isHeadway ? 'Headway' : isBorders ? 'Borders' : 'Geo'}
          </span>
          {!isHeadway && !isBorders ? (
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
          {isBorders ? (
            <span className="status-pill status-pill--axis">
              Profile: {bordersProfile.label}
            </span>
          ) : null}
          {isBorders && bordersFocusedCountryIso ? (
            <span className="status-pill status-pill--axis">
              Focus:{' '}
              {bordersFocusedCountryName
                ? `${bordersFocusedCountryName} (${bordersFocusedCountryIso})`
                : bordersFocusedCountryIso}
            </span>
          ) : null}
          {isBorders && bordersSelectedFeature ? (
            <span className="status-pill status-pill--axis">
              Selected:{' '}
              {bordersSelectedFeature.metricValue == null
                ? bordersSelectedFeature.name
                : `${bordersSelectedFeature.name} (${formatBordersSelectionValue(
                    bordersProfileId,
                    bordersSelectedFeature.metricValue,
                  )})`}
            </span>
          ) : null}
          {isFrozen ? (
            <span className="status-pill status-pill--frozen">Motion paused</span>
          ) : null}
          {isBorders ? (
            bordersRenderState === 'error' ? (
              <span className="status-pill status-pill--failed">
                Borders offline
              </span>
            ) : (
              <span className="status-pill status-pill--sun">Thematic globe</span>
            )
          ) : isHeadway ? (
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
      ) : isBorders && bordersRenderState === 'error' && bordersErrorMessage ? (
        <p className="telemetry-note">{bordersErrorMessage}</p>
      ) : isBorders && bordersRenderState !== 'error' && bordersNoticeMessage ? (
        <p className="telemetry-note">{bordersNoticeMessage}</p>
      ) : null}
      <dl className="telemetry-grid">
        <div>
          <dt>Latitude</dt>
          <dd>
            {formatSigned(
              isHeadway ? headwayLat : isBorders ? bordersLat : telemetry.lat,
              'N',
              'S',
            )}
          </dd>
        </div>
        <div>
          <dt>Longitude</dt>
          <dd>
            {formatSigned(
              isHeadway ? headwayLon : isBorders ? bordersLon : telemetry.lon,
              'E',
              'W',
            )}
          </dd>
        </div>
        <div>
          <dt>{isHeadway || isBorders ? 'Zoom' : 'Altitude'}</dt>
          <dd>
            {isHeadway
              ? headwayView.zoom.toFixed(2)
              : isBorders
                ? bordersView.zoom.toFixed(2)
              : formatAltitude(telemetry.altitudeKm)}
          </dd>
        </div>
        <div>
          <dt>{isHeadway || isBorders ? 'Bearing' : 'Roll'}</dt>
          <dd>
            {isHeadway
              ? `${Math.round(headwayView.bearing)}deg`
              : isBorders
                ? `${Math.round(bordersView.bearing)}deg`
              : formatRoll(telemetry.rollDeg)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
