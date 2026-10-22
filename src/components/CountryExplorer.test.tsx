import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import index from '../../public/assets/borders/country-index.json';
import { CountryExplorer } from './CountryExplorer';
import { useGeographyStore } from '../state/geographyStore';

describe('CountryExplorer', () => {
  afterEach(cleanup);
  beforeEach(() => {
    useGeographyStore.setState({
      scope: 'world',
      selectedIso: null,
      notice: '',
    });
  });

  it('filters and navigates a country while exposing actual coverage', () => {
    const onNavigate = vi.fn();
    render(<CountryExplorer countryIndex={index} onNavigate={onNavigate} />);
    fireEvent.change(screen.getByLabelText('Geographic scope'), {
      target: { value: 'balkans' },
    });
    expect(onNavigate).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText('Find a country'), {
      target: { value: 'Hrvatska' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Croatia HRV' }));
    expect(onNavigate.mock.lastCall?.[0].countryIso).toBe('HRV');
    expect(screen.getByText('Globe outline available.')).toBeInTheDocument();
    expect(
      screen.getByText('Data availability varies by indicator.'),
    ).toBeInTheDocument();
  });

  it('explains a missing outline without navigating to an unrelated country', () => {
    const onNavigate = vi.fn();
    render(<CountryExplorer countryIndex={index} onNavigate={onNavigate} />);
    fireEvent.change(screen.getByLabelText('Find a country'), {
      target: { value: 'KOS' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Kosovo XKX' }));
    expect(onNavigate).not.toHaveBeenCalled();
    expect(
      screen.getByText('No bundled globe outline; camera unchanged.'),
    ).toBeInTheDocument();
  });

  it('clears the query on scope change and disables navigation while paused', () => {
    const { rerender } = render(
      <CountryExplorer countryIndex={index} onNavigate={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText('Find a country'), {
      target: { value: 'no results' },
    });
    expect(
      screen.getByText('No matching countries in this scope.'),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Geographic scope'), {
      target: { value: 'balkans' },
    });
    expect(screen.getByLabelText('Find a country')).toHaveValue('');
    rerender(
      <CountryExplorer countryIndex={index} onNavigate={vi.fn()} disabled />,
    );
    expect(screen.getByLabelText('Geographic scope')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Croatia HRV' })).toBeDisabled();
  });
});
