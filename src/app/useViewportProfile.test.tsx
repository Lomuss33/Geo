import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useViewportProfile } from './useViewportProfile';

function ViewportProfileProbe() {
  const profile = useViewportProfile();

  return (
    <output data-testid="viewport-profile">
      {JSON.stringify(profile)}
    </output>
  );
}

describe('useViewportProfile', () => {
  const setViewport = (width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: width,
      writable: true,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: height,
      writable: true,
    });
  };

  const readProfile = () =>
    JSON.parse(
      screen.getByTestId('viewport-profile').textContent ?? '{}',
    ) as ReturnType<typeof useViewportProfile>;

  beforeEach(() => {
    setViewport(1600, 900);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns a dual-rail bounded desktop profile for large balanced viewports', () => {
    render(<ViewportProfileProbe />);

    expect(readProfile()).toMatchObject({
      legacyLayoutMode: 'monitor',
      orientation: 'landscape',
      shellMode: 'dual-rail',
      workspaceMode: 'bounded',
    });
  });

  it('returns a single-rail stacked profile when desktop width is available but the scene cannot support dual rails', () => {
    setViewport(1366, 768);
    render(<ViewportProfileProbe />);

    expect(readProfile()).toMatchObject({
      legacyLayoutMode: 'monitor',
      orientation: 'landscape',
      shellMode: 'single-rail',
      workspaceMode: 'stacked',
    });
  });

  it('returns a drawer mobile profile for narrow portrait viewports', () => {
    setViewport(390, 844);
    render(<ViewportProfileProbe />);

    expect(readProfile()).toMatchObject({
      legacyLayoutMode: 'mobile',
      orientation: 'portrait',
      shellMode: 'drawer',
      workspaceMode: 'mobile',
    });
  });

  it('returns a drawer stacked profile for short landscape viewports', () => {
    setViewport(844, 390);
    render(<ViewportProfileProbe />);

    expect(readProfile()).toMatchObject({
      legacyLayoutMode: 'tablet',
      orientation: 'landscape',
      shellMode: 'drawer',
      workspaceMode: 'stacked',
    });
  });

  it('updates when the viewport dimensions change', async () => {
    render(<ViewportProfileProbe />);
    expect(readProfile().shellMode).toBe('dual-rail');

    await act(async () => {
      setViewport(1024, 768);
      window.dispatchEvent(new Event('resize'));
    });

    expect(readProfile()).toMatchObject({
      legacyLayoutMode: 'tablet',
      shellMode: 'single-rail',
      workspaceMode: 'stacked',
    });

    await act(async () => {
      setViewport(390, 844);
      window.dispatchEvent(new Event('resize'));
    });

    expect(readProfile()).toMatchObject({
      legacyLayoutMode: 'mobile',
      shellMode: 'drawer',
      workspaceMode: 'mobile',
    });
  });
});
