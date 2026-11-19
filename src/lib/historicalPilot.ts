import { parseAtlasFile } from './timeAtlas';
import review from '../../data/catalog/historical-basemaps.json';

export const HISTORICAL_PILOT_ID = 'historical-basemaps-balkans-1900-1938-v1';
export const HISTORICAL_PILOT_YEARS = [1900, 1938] as const;
export const HISTORICAL_PILOT_SOURCE =
  'https://github.com/aourednik/historical-basemaps/tree/4b5039e50d8d2464b065bd76ad6086cd4597108d';
export const HISTORICAL_PILOT_AVAILABLE =
  review.publication.status === 'published';
export const HISTORICAL_PILOT_UNAVAILABLE_REASON = review.publication.reason;

export async function loadHistoricalPilot() {
  if (!HISTORICAL_PILOT_AVAILABLE) {
    throw new Error(HISTORICAL_PILOT_UNAVAILABLE_REASON);
  }
  const response = await fetch(
    `${import.meta.env.BASE_URL}assets/time-atlas/balkans-pilot.json`,
  );
  if (!response.ok)
    throw new Error(
      'Historical pilot could not load. Your atlas is unchanged; retry when connected.',
    );
  const atlas = parseAtlasFile(await response.text());
  if (atlas.layers.length !== 1 || atlas.layers[0]?.id !== HISTORICAL_PILOT_ID)
    throw new Error('Unexpected historical pilot dataset.');
  return atlas;
}
