import type { BordersProfileId } from '../state/viewerStore';
import { getBordersProfileDefinition } from './bordersProfiles';

const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat('en', {
    maximumFractionDigits: value >= 100 ? 0 : 1,
    notation: 'compact',
  }).format(value);

export const formatBordersMetricValue = (
  profileId: BordersProfileId,
  value: number | null,
) => {
  if (value == null || !Number.isFinite(value)) {
    return 'Unavailable';
  }

  if (profileId === 'hierarchy') {
    return `Range ${Math.round(value)}`;
  }

  return formatCompactNumber(value);
};

export const getBordersLegendStops = (
  profileId: BordersProfileId,
  values: number[],
) => {
  const profile = getBordersProfileDefinition(profileId);
  const safeValues = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);

  if (safeValues.length === 0) {
    return {
      title: profile.metricLabel,
      stops: [] as Array<{ label: string; value: number }>,
    };
  }

  const indices = [0, 0.33, 0.66, 1].map((ratio) =>
    safeValues[Math.round((safeValues.length - 1) * ratio)]!,
  );

  return {
    title: profile.metricLabel,
    stops: indices.map((value) => ({
      value,
      label: formatBordersMetricValue(profileId, value),
    })),
  };
};
