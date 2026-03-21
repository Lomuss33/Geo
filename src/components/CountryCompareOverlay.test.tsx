import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAllCountries } from '../lib/countryGeometry';
import { DEFAULT_VIEW } from '../lib/constants';
import { projectCountryOutlineToViewport } from '../lib/countryProjection';
import { CountryCompareOverlay } from './CountryCompareOverlay';

vi.mock('../lib/countryProjection', () => ({
  projectCountryOutlineToViewport: vi.fn(),
}));

const projectCountryOutlineToViewportMock = vi.mocked(
  projectCountryOutlineToViewport,
);

const country = getAllCountries()[0]!;
const selectedCountry = {
  id: country.id,
  name: country.name,
  centroid: [...country.centroid] as [number, number],
};

describe('CountryCompareOverlay', () => {
  beforeEach(() => {
    projectCountryOutlineToViewportMock.mockReturnValue({
      path: 'M120 90 L190 120 L160 180',
      bounds: {
        left: 120,
        top: 90,
        right: 190,
        bottom: 180,
      },
      hasVisibleGeometry: true,
    });
  });

  it('renders the armed compare HUD and exits compare on cancel', () => {
    const onExit = vi.fn();

    render(
      <CountryCompareOverlay
        compareModeState="armed"
        onExit={onExit}
        onRelease={() => {}}
        selectedCountry={null}
        view={DEFAULT_VIEW}
      />,
    );

    expect(screen.getByTestId('country-compare-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('country-compare-armed')).toBeInTheDocument();
    expect(screen.getByText(/compare armed/i)).toBeInTheDocument();
    expect(
      screen.getByText(/click a visible country to pin its live outline/i),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /cancel compare mode/i }),
    );

    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('renders a full-viewport projected svg with halo and outline for a pinned country', () => {
    const onRelease = vi.fn();
    const onExit = vi.fn();

    render(
      <CountryCompareOverlay
        compareModeState="pinned"
        onExit={onExit}
        onRelease={onRelease}
        selectedCountry={selectedCountry}
        view={DEFAULT_VIEW}
      />,
    );

    expect(screen.getByTestId('country-compare-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('country-compare-projection')).toHaveAttribute(
      'viewBox',
      `0 0 ${window.innerWidth} ${window.innerHeight}`,
    );
    expect(document.querySelector('.country-compare__halo')).not.toBeNull();
    expect(document.querySelector('.country-compare__outline')).not.toBeNull();
    expect(document.querySelector('.country-compare__fill')).toBeNull();
    expect(
      screen.getByText(/live compare outline\. drag and zoom stay active\./i),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(`release outline for ${country.name}`, 'i'),
      }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: /done with compare mode/i }),
    );

    expect(onRelease).toHaveBeenCalledTimes(1);
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('falls back to a top status chip when the pinned geometry is hidden', () => {
    projectCountryOutlineToViewportMock.mockReturnValue({
      path: '',
      bounds: null,
      hasVisibleGeometry: false,
    });

    render(
      <CountryCompareOverlay
        compareModeState="pinned"
        onExit={() => {}}
        onRelease={() => {}}
        selectedCountry={selectedCountry}
        view={DEFAULT_VIEW}
      />,
    );

    expect(screen.getByTestId('country-compare-fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('country-compare-projection')).toBeNull();
    expect(
      screen.getByText(/pinned compare outline is off-screen\. drag back or exit compare\./i),
    ).toBeInTheDocument();
  });

  it('does not expose a full-screen clickable control surface while active', () => {
    render(
      <CountryCompareOverlay
        compareModeState="pinned"
        onExit={() => {}}
        onRelease={() => {}}
        selectedCountry={selectedCountry}
        view={DEFAULT_VIEW}
      />,
    );

    const buttons = screen.getAllByRole('button');

    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveTextContent(/release outline/i);
    expect(buttons[1]).toHaveTextContent(/done/i);
  });
});
