import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TimeAtlasWorkspace from './TimeAtlasWorkspace';
import { ATLAS_STORAGE_KEY, emptyTimeAtlas } from '../lib/timeAtlas';

vi.mock('../scene/TimeAtlasMap', () => ({
  TimeAtlasMap: () => <div>Map renderer</div>,
}));
const fixture = {
  ...emptyTimeAtlas(),
  layers: [
    {
      id: 'test',
      title: 'Fictional fixture',
      scope: 'balkans',
      perspective: 'borders',
      confidence: 'approximate',
      source: {
        title: 'Fixture source',
        url: 'https://example.org/fixture',
        license: 'Test',
      },
      kind: 'vector',
      features: [
        {
          type: 'Feature',
          id: 'point',
          geometry: { type: 'Point', coordinates: [16, 45] },
          properties: {
            label: 'Fixture location',
            description: 'Not historical data.',
            fromYear: 1000,
            toYear: 1100,
          },
        },
      ],
    },
  ],
};

describe('TimeAtlasWorkspace', () => {
  it('does not overwrite browser data after closing a pending file import', async () => {
    localStorage.setItem(ATLAS_STORAGE_KEY, JSON.stringify(fixture));
    let finish!: (text: string) => void;
    const file = new File([''], 'late.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', {
      value: () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
    });
    const view = render(<TimeAtlasWorkspace onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Import time atlas file'), {
      target: { files: [file] },
    });
    view.unmount();
    const replacement = JSON.stringify({ ...fixture, layers: [] });
    localStorage.setItem(ATLAS_STORAGE_KEY, replacement);
    await act(async () => {
      finish(
        JSON.stringify({
          ...fixture,
          layers: [{ ...fixture.layers[0]!, id: 'late' }],
        }),
      );
    });
    expect(localStorage.getItem(ATLAS_STORAGE_KEY)).toBe(replacement);
  });
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('merges a pending file import into the latest atlas instead of losing later edits', async () => {
    localStorage.setItem(ATLAS_STORAGE_KEY, JSON.stringify(fixture));
    let finish!: (text: string) => void;
    const late = new File([''], 'late.json', { type: 'application/json' });
    Object.defineProperty(late, 'text', {
      value: () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
    });
    render(<TimeAtlasWorkspace onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Import time atlas file'), {
      target: { files: [late] },
    });
    const second = new File([''], 'second.json', { type: 'application/json' });
    Object.defineProperty(second, 'text', {
      value: async () =>
        JSON.stringify({
          ...fixture,
          layers: [{ ...fixture.layers[0]!, id: 'second' }],
        }),
    });
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Import time atlas file'), {
        target: { files: [second] },
      });
    });
    await act(async () => {
      finish(
        JSON.stringify({
          ...fixture,
          layers: [{ ...fixture.layers[0]!, id: 'late' }],
        }),
      );
    });
    const stored = JSON.parse(localStorage.getItem(ATLAS_STORAGE_KEY)!) as {
      layers: { id: string }[];
    };
    expect(stored.layers.map((layer) => layer.id)).toEqual([
      'test',
      'second',
      'late',
    ]);
    expect(screen.getByText('3 dated features visible')).toBeInTheDocument();
  });

  it('explains blocked source rights without fetching or deleting existing local records', () => {
    const original = JSON.stringify(fixture);
    localStorage.setItem(ATLAS_STORAGE_KEY, original);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<TimeAtlasWorkspace onClose={vi.fn()} />);
    const button = screen.getByRole('button', { name: /pilot unavailable/i });
    expect(button).toBeDisabled();
    expect(
      screen.getByText(/Source rights review pending/),
    ).toBeInTheDocument();
    fireEvent.click(button);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorage.getItem(ATLAS_STORAGE_KEY)).toBe(original);
  });
  it('starts with an honest empty catalog and returns to the original Earth view', () => {
    const onClose = vi.fn();
    render(<TimeAtlasWorkspace onClose={onClose} />);
    expect(
      screen.getByText('No layers loaded for this perspective.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'People. Time. Earth.' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Back to Earth/ }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('filters by year, perspective, visibility and scope while retaining sources', () => {
    localStorage.setItem(ATLAS_STORAGE_KEY, JSON.stringify(fixture));
    render(<TimeAtlasWorkspace onClose={vi.fn()} />);
    const year = screen.getByLabelText('Atlas year');
    fireEvent.change(year, { target: { value: '1000' } });
    fireEvent.blur(year);
    expect(screen.getByText('1 dated features visible')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Fixture location/ }));
    expect(
      screen.getByLabelText('Selected historical record'),
    ).toHaveTextContent('Not historical data.');
    expect(
      screen.getByRole('link', { name: 'Read the source ↗' }),
    ).toHaveAttribute('href', 'https://example.org/fixture');
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Fictional fixture' }),
    );
    expect(screen.getByText('0 dated features visible')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Culture & society/ }));
    expect(
      screen.getByText('No layers loaded for this perspective.'),
    ).toBeInTheDocument();
  });

  it('preserves a corrupt saved file until the user explicitly replaces it', () => {
    localStorage.setItem(ATLAS_STORAGE_KEY, '{bad');
    render(<TimeAtlasWorkspace onClose={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'has not been overwritten',
    );
    expect(localStorage.getItem(ATLAS_STORAGE_KEY)).toBe('{bad');
  });

  it('does not let an invalid year commit into the active timeline', () => {
    render(<TimeAtlasWorkspace onClose={vi.fn()} />);
    const year = screen.getByLabelText('Atlas year');
    const current = new Date().getFullYear();
    fireEvent.change(year, { target: { value: '5000' } });
    fireEvent.blur(year);
    expect(year).toHaveValue(current);
  });
});
