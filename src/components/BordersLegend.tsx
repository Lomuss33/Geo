import { useEffect, useMemo, useState } from 'react';
import { BORDERS_COLORS, loadBordersMetrics } from '../lib/bordersData';
import { getBordersLegendStops } from '../lib/bordersLegend';
import { getBordersProfileDefinition } from '../lib/bordersProfiles';
import type { BordersProfileId } from '../state/viewerStore';

type BordersLegendProps = {
  profileId: BordersProfileId;
  focusedCountryIso: string | null;
  focusedCountryName: string | null;
  noticeMessage: string | null;
};

const HIERARCHY_STOPS = [
  { color: BORDERS_COLORS.hierarchyStops[0], label: 'Largest districts' },
  { color: BORDERS_COLORS.hierarchyStops[1], label: 'Upper mid' },
  { color: BORDERS_COLORS.hierarchyStops[2], label: 'Lower mid' },
  { color: BORDERS_COLORS.hierarchyStops[3], label: 'Smallest districts' },
];

export function BordersLegend({
  profileId,
  focusedCountryIso,
  focusedCountryName,
  noticeMessage,
}: BordersLegendProps) {
  const [metricValues, setMetricValues] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const profile = getBordersProfileDefinition(profileId);

  useEffect(() => {
    let cancelled = false;

    if (profileId === 'hierarchy') {
      setMetricValues([]);
      setLoadError(null);
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setIsLoading(true);
    setLoadError(null);

    loadBordersMetrics(profileId)
      .then((payload) => {
        if (cancelled) {
          return;
        }

        setMetricValues(
          payload.records
            .map((record) => record.value)
            .filter((value): value is number => value != null && Number.isFinite(value)),
        );
        setIsLoading(false);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setLoadError(error instanceof Error ? error.message : 'Legend unavailable.');
        setMetricValues([]);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const metricLegend = useMemo(
    () => getBordersLegendStops(profileId, metricValues),
    [metricValues, profileId],
  );

  return (
    <section className="hud-card hud-card--legend" aria-label="Borders legend">
      <div className="hud-card__header">
        <span className="panel-kicker">Borders legend</span>
        <span className="status-pill status-pill--axis">{profile.label}</span>
      </div>
      {focusedCountryIso ? (
        <p className="telemetry-note">
          Focused country:{' '}
          {focusedCountryName ? `${focusedCountryName} (${focusedCountryIso})` : focusedCountryIso}
        </p>
      ) : null}
      {noticeMessage ? <p className="telemetry-note">{noticeMessage}</p> : null}
      {isLoading ? (
        <p className="telemetry-note">Loading legend data.</p>
      ) : loadError ? (
        <p className="telemetry-note">{loadError}</p>
      ) : profileId === 'hierarchy' ? (
        <ul className="legend-list">
          {HIERARCHY_STOPS.map((stop) => (
            <li key={stop.label}>
              <span
                aria-hidden="true"
                className="legend-swatch"
                style={{ background: stop.color }}
              />
              <span>{stop.label}</span>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <p className="telemetry-note">{metricLegend.title}</p>
          <ul className="legend-list">
            {metricLegend.stops.map((stop, index) => (
              <li key={`${stop.label}-${stop.value}-${index}`}>
                <span
                  aria-hidden="true"
                  className="legend-swatch"
                  style={{
                    background:
                      BORDERS_COLORS.metricStops[
                        Math.min(index, BORDERS_COLORS.metricStops.length - 1)
                      ],
                  }}
                />
                <span>{stop.label}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
