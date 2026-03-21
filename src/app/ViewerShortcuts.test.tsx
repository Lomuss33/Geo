import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ViewerShortcuts } from './ViewerShortcuts';
import { DEFAULT_VIEW } from '../lib/constants';

const baseProps = () => ({
  viewerMode: 'geo' as const,
  view: DEFAULT_VIEW,
  headwayView: {
    center: [-28, 19.5] as [number, number],
    zoom: 1.8,
    bearing: 0,
    pitch: 0,
  },
  isAnimationPlaying: false,
  isAnimationWorkspaceOpen: false,
  isSceneAvailable: true,
  isFrozen: false,
  showOnboarding: false,
  onStopAnimation: vi.fn(),
  onCloseAnimationWorkspace: vi.fn(),
  onToggleFrozen: vi.fn(),
  onToggleAxisLock: vi.fn(),
  onAxisReset: vi.fn(),
  onResetHome: vi.fn(),
  onOpenHelp: vi.fn(),
  onPresetSelect: vi.fn(),
  onApplyGeoView: vi.fn(),
  onApplyHeadwayView: vi.fn(),
});

describe('ViewerShortcuts', () => {
  it('maps primary shortcuts to shared actions', () => {
    const props = baseProps();
    render(<ViewerShortcuts {...props} />);

    fireEvent.keyDown(window, { code: 'Space', key: ' ' });
    fireEvent.keyDown(window, { key: 'y' });
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: 'r' });
    fireEvent.keyDown(window, { key: '?' });

    expect(props.onToggleFrozen).toHaveBeenCalledTimes(1);
    expect(props.onToggleAxisLock).toHaveBeenCalledTimes(1);
    expect(props.onAxisReset).toHaveBeenCalledTimes(1);
    expect(props.onResetHome).toHaveBeenCalledTimes(1);
    expect(props.onOpenHelp).toHaveBeenCalledTimes(1);
  });

  it('routes number keys to the six preset slots', () => {
    const props = baseProps();
    render(<ViewerShortcuts {...props} />);

    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: '6' });

    expect(props.onPresetSelect).toHaveBeenNthCalledWith(1, 0);
    expect(props.onPresetSelect).toHaveBeenNthCalledWith(2, 5);
  });

  it('ignores shortcuts while an interactive element has focus', () => {
    const props = baseProps();
    const { getByRole } = render(
      <>
        <input aria-label="Name" />
        <ViewerShortcuts {...props} />
      </>,
    );
    const input = getByRole('textbox', { name: /name/i });
    input.focus();

    fireEvent.keyDown(input, { key: 'y' });
    fireEvent.keyDown(input, { code: 'Space', key: ' ' });

    expect(props.onToggleAxisLock).not.toHaveBeenCalled();
    expect(props.onToggleFrozen).not.toHaveBeenCalled();
  });

  it('reserves Escape for closing the workspace when it is open', () => {
    const props = {
      ...baseProps(),
      isAnimationWorkspaceOpen: true,
    };
    render(<ViewerShortcuts {...props} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.keyDown(window, { key: 'y' });

    expect(props.onCloseAnimationWorkspace).toHaveBeenCalledTimes(1);
    expect(props.onToggleAxisLock).not.toHaveBeenCalled();
  });
});
