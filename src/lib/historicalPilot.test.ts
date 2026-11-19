import { afterEach, describe, expect, it, vi } from 'vitest';
import review from '../../data/catalog/historical-basemaps.json';
import {
  HISTORICAL_PILOT_AVAILABLE,
  HISTORICAL_PILOT_ID,
  loadHistoricalPilot,
} from './historicalPilot';

describe('historical source publication policy', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('keeps the stable dataset identity while component rights remain unresolved', () => {
    expect(HISTORICAL_PILOT_ID).toBe(review.id);
    expect(review.revision).toMatch(/^[0-9a-f]{40}$/);
    expect(review.reviews.rights).toBe('pending');
    expect(HISTORICAL_PILOT_AVAILABLE).toBe(false);
  });
  it('rejects blocked downloads before any fetch or state mutation', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(loadHistoricalPilot()).rejects.toThrow(
      'Source rights review pending',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
