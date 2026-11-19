import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadBordersMetrics,
  type BordersMetricsPayload,
} from '../lib/bordersData';
import { BordersLegend } from './BordersLegend';

vi.mock('../lib/bordersData', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/bordersData')>()),
  loadBordersMetrics: vi.fn(),
}));

const loadMetrics = vi.mocked(loadBordersMetrics);
const props = {
  focusedCountryIso: null,
  focusedCountryName: null,
  noticeMessage: null,
};

function deferredMetrics() {
  let resolve!: (payload: BordersMetricsPayload) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<BordersMetricsPayload>(
    (resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    },
  );
  return { promise, resolve, reject };
}

describe('BordersLegend profile lifecycle', () => {
  beforeEach(() => {
    loadMetrics.mockReset();
  });
  afterEach(cleanup);

  it('shows mixed-year provenance and the focused observation year', async () => {
    loadMetrics.mockResolvedValue({
      schemaVersion: 1,
      indicatorId: 'gdp',
      indicator: 'GDP',
      unit: 'current US$',
      datasetVersion: 'fixture-v1',
      source: {
        name: 'World Bank Open Data',
        url: 'https://data.worldbank.org/indicator/NY.GDP.MKTP.CD',
        retrievedAt: '2026-03-22T00:00:00Z',
        timestampBasis: 'download',
      },
      records: [
        {
          iso3: 'HRV',
          name: 'Croatia',
          value: 100,
          year: 2023,
          missingReason: null,
        },
        {
          iso3: 'BIH',
          name: 'Bosnia',
          value: 50,
          year: 2024,
          missingReason: null,
        },
      ],
    });
    const { rerender } = render(
      <BordersLegend {...props} profileId="gdp" focusedCountryIso="HRV" />,
    );
    expect(
      await screen.findByText(/Mixed years; same-year comparisons unavailable/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Focused observation: 100 current US\$; year: 2023/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'World Bank Open Data' }),
    ).toHaveAttribute(
      'href',
      'https://data.worldbank.org/indicator/NY.GDP.MKTP.CD',
    );
    rerender(
      <BordersLegend {...props} profileId="gdp" focusedCountryIso="SRB" />,
    );
    expect(
      screen.getByText('Focused country: no observation available.'),
    ).toBeInTheDocument();
  });

  it('renders hierarchy immediately without fetching metrics', () => {
    render(<BordersLegend {...props} profileId="hierarchy" />);

    expect(screen.getByText('Largest districts')).toBeInTheDocument();
    expect(screen.queryByText('Loading legend data.')).not.toBeInTheDocument();
    expect(loadMetrics).not.toHaveBeenCalled();
  });

  it('ignores a previous profile failure while the new profile is loading', async () => {
    const gdp = deferredMetrics();
    const population = deferredMetrics();
    loadMetrics.mockImplementation((profile) =>
      profile === 'gdp' ? gdp.promise : population.promise,
    );
    const { rerender } = render(<BordersLegend {...props} profileId="gdp" />);
    rerender(<BordersLegend {...props} profileId="population" />);

    await act(async () => gdp.reject(new Error('Old GDP failure')));
    expect(screen.getByText('Loading legend data.')).toBeInTheDocument();
    expect(screen.queryByText('Old GDP failure')).not.toBeInTheDocument();

    await act(async () =>
      population.resolve({ indicator: 'Population', records: [] }),
    );
    expect(screen.queryByText('Loading legend data.')).not.toBeInTheDocument();
    expect(screen.getByText('Population')).toBeInTheDocument();
  });

  it('clears an error when switching profiles and reports the current failure', async () => {
    const gdp = deferredMetrics();
    const population = deferredMetrics();
    loadMetrics.mockImplementation((profile) =>
      profile === 'gdp' ? gdp.promise : population.promise,
    );
    const { rerender } = render(<BordersLegend {...props} profileId="gdp" />);
    await act(async () => gdp.reject(new Error('GDP unavailable')));
    expect(screen.getByText('GDP unavailable')).toBeInTheDocument();

    rerender(<BordersLegend {...props} profileId="population" />);
    expect(screen.queryByText('GDP unavailable')).not.toBeInTheDocument();
    expect(screen.getByText('Loading legend data.')).toBeInTheDocument();
    await act(async () =>
      population.reject(new Error('Population unavailable')),
    );
    expect(screen.getByText('Population unavailable')).toBeInTheDocument();
  });

  it('keeps hierarchy visible when an earlier metric request finishes', async () => {
    const gdp = deferredMetrics();
    loadMetrics.mockReturnValue(gdp.promise);
    const { rerender } = render(<BordersLegend {...props} profileId="gdp" />);
    rerender(<BordersLegend {...props} profileId="hierarchy" />);
    await act(async () => gdp.resolve({ indicator: 'GDP', records: [] }));

    expect(screen.getByText('Largest districts')).toBeInTheDocument();
    expect(screen.queryByText('Loading legend data.')).not.toBeInTheDocument();
  });
});
