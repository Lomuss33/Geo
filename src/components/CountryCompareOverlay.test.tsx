import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getAllCountries } from '../lib/countryGeometry';
import { DEFAULT_VIEW } from '../lib/constants';
import { CountryCompareOverlay } from './CountryCompareOverlay';

const country = getAllCountries()[0]!;

describe('CountryCompareOverlay', () => {
  it('renders halo, fill, and outline layers for a pinned country', () => {
    render(
      <CountryCompareOverlay
        compareModeState="pinned"
        onClear={() => {}}
        selectedCountry={{
          id: country.id,
          name: country.name,
          centroid: [...country.centroid],
        }}
        view={DEFAULT_VIEW}
      />,
    );

    expect(screen.getByTestId('country-compare-overlay')).toBeInTheDocument();
    expect(document.querySelector('.country-compare__halo')).not.toBeNull();
    expect(document.querySelector('.country-compare__fill')).not.toBeNull();
    expect(document.querySelector('.country-compare__outline')).not.toBeNull();
    expect(
      screen.getByRole('button', { name: new RegExp(`release compare for ${country.name}`, 'i') }),
    ).toBeInTheDocument();
  });

  it('scales the overlay size when the Geo view distance changes', () => {
    const selectedCountry = {
      id: country.id,
      name: country.name,
      centroid: [...country.centroid] as [number, number],
    };

    const { rerender } = render(
      <CountryCompareOverlay
        compareModeState="pinned"
        onClear={() => {}}
        selectedCountry={selectedCountry}
        view={{
          ...DEFAULT_VIEW,
          distance: 8,
        }}
      />,
    );

    const initialWidth = screen
      .getByTestId('country-compare-overlay')
      .querySelector('.country-compare')!
      .getAttribute('style');

    rerender(
      <CountryCompareOverlay
        compareModeState="pinned"
        onClear={() => {}}
        selectedCountry={selectedCountry}
        view={DEFAULT_VIEW}
      />,
    );

    const nextWidth = screen
      .getByTestId('country-compare-overlay')
      .querySelector('.country-compare')!
      .getAttribute('style');

    expect(initialWidth).not.toBe(nextWidth);
  });

  it('does not expose a full-screen clickable reticle', () => {
    render(
      <CountryCompareOverlay
        compareModeState="pinned"
        onClear={() => {}}
        selectedCountry={{
          id: country.id,
          name: country.name,
          centroid: [...country.centroid],
        }}
        view={DEFAULT_VIEW}
      />,
    );

    const buttons = screen.getAllByRole('button');

    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveTextContent(/release compare/i);
  });
});
