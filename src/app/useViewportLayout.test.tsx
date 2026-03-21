import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useViewportLayout } from './useViewportLayout';

function ViewportProbe() {
  const layoutMode = useViewportLayout();
  return <span>{layoutMode}</span>;
}

describe('useViewportLayout', () => {
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

  beforeEach(() => {
    setViewport(1600, 900);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns monitor for large desktop viewports', () => {
    render(<ViewportProbe />);

    expect(screen.getByText('monitor')).toBeInTheDocument();
  });

  it('returns tablet for intermediate viewports', () => {
    setViewport(1024, 768);
    render(<ViewportProbe />);

    expect(screen.getByText('tablet')).toBeInTheDocument();
  });

  it('returns mobile for small viewports', () => {
    setViewport(390, 844);
    render(<ViewportProbe />);

    expect(screen.getByText('mobile')).toBeInTheDocument();
  });

  it('updates when the viewport dimensions change', async () => {
    render(<ViewportProbe />);
    expect(screen.getByText('monitor')).toBeInTheDocument();

    await act(async () => {
      setViewport(1024, 768);
      window.dispatchEvent(new Event('resize'));
    });

    expect(screen.getByText('tablet')).toBeInTheDocument();

    await act(async () => {
      setViewport(390, 844);
      window.dispatchEvent(new Event('resize'));
    });

    expect(screen.getByText('mobile')).toBeInTheDocument();
  });
});
