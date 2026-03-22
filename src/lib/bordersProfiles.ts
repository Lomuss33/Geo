import type { BordersProfileId } from '../state/viewerStore';

export type BordersProfileDefinition = {
  id: BordersProfileId;
  label: string;
  description: string;
  metricLabel: string;
  showPinpointsByDefault: boolean;
  mode: 'metric' | 'hierarchy';
};

export const BORDERS_PROFILES: BordersProfileDefinition[] = [
  {
    id: 'gdp',
    label: 'GDP',
    description:
      'Global GDP choropleth with curated financial-city pinpoints and local admin detail on focus.',
    metricLabel: 'GDP (current US$)',
    showPinpointsByDefault: true,
    mode: 'metric',
  },
  {
    id: 'population',
    label: 'Population',
    description:
      'Global population choropleth with major population-center pinpoints and local admin detail on focus.',
    metricLabel: 'Population, total',
    showPinpointsByDefault: true,
    mode: 'metric',
  },
  {
    id: 'hierarchy',
    label: 'Hierarchy',
    description:
      'Color-only administrative depth view. Focus a country to reveal county or district range.',
    metricLabel: 'Administrative range',
    showPinpointsByDefault: false,
    mode: 'hierarchy',
  },
];

export const getBordersProfileDefinition = (profileId: BordersProfileId) =>
  BORDERS_PROFILES.find((profile) => profile.id === profileId) ??
  BORDERS_PROFILES[0]!;
