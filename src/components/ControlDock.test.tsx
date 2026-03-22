import { type ComponentProps } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultAnimationTimeline } from '../lib/animation';
import { VIEWER_PRESETS } from '../lib/constants';
import { ControlDock } from './ControlDock';

type ControlDockProps = ComponentProps<typeof ControlDock>;

const createProps = (
  overrides: Partial<ControlDockProps> = {},
): ControlDockProps => {
  const base: ControlDockProps = {
    quality: 'balanced',
    headwayLayerVisibility: {
      roads: true,
      parks: true,
      buildings: true,
      placeLabels: true,
      pois: true,
    },
    headwayLayoutLook: 'mission',
    axisLockMode: 'free',
    compareModeState: 'off',
    viewerMode: 'geo',
    bordersProfileId: 'gdp',
    presets: VIEWER_PRESETS,
    animationDraft: createDefaultAnimationTimeline('geo'),
    onModeChange: vi.fn(),
    onBordersProfileChange: vi.fn(),
    onQualityChange: vi.fn(),
    onHeadwayLayoutLookChange: vi.fn(),
    onHeadwayLayerToggle: vi.fn(),
    onToggleAxisLock: vi.fn(),
    onAxisReset: vi.fn(),
    onToggleCompare: vi.fn(),
    onPresetSelect: vi.fn(),
    onOpenAnimationWorkspace: vi.fn(),
    onPlayAnimation: vi.fn(),
    onShare: vi.fn(async () => {}),
    onFullscreen: vi.fn(async () => {}),
    onHelp: vi.fn(),
    onToggleFrozen: vi.fn(),
    onToggleBorders: vi.fn(),
    onToggleBordersPinpoints: vi.fn(),
    shareLabel: 'Copy share link',
    isFrozen: false,
    showBorders: false,
    showBordersPinpoints: true,
    isSceneAvailable: true,
    layoutMode: 'monitor',
  };

  return { ...base, ...overrides };
};

describe('ControlDock', () => {
  it('starts with motion, animation, and viewpoints expanded on monitor', () => {
    render(<ControlDock {...createProps()} />);

    expect(
      screen.getByRole('button', { name: /toggle motion section/i }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('button', { name: /toggle layers section/i }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('button', { name: /toggle profiles section/i }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('button', { name: /toggle layout section/i }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('button', { name: /toggle animation section/i }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('button', { name: /toggle viewpoints section/i }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /freeze/i })).toBeInTheDocument();
    expect(screen.getByText(/layout looks are available in headway mode/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /open editor/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/geo timeline/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: new RegExp(VIEWER_PRESETS[0]!.label, 'i'),
      }),
    ).toBeInTheDocument();
  });

  it('starts with motion, animation, and viewpoints collapsed on mobile', () => {
    render(<ControlDock {...createProps({ layoutMode: 'mobile' })} />);

    expect(
      screen.getByRole('button', { name: /toggle motion section/i }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.getByRole('button', { name: /toggle layers section/i }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.getByRole('button', { name: /toggle profiles section/i }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.getByRole('button', { name: /toggle layout section/i }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.getByRole('button', { name: /toggle animation section/i }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.getByRole('button', { name: /toggle viewpoints section/i }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /freeze/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /open editor/i })).toBeNull();
    expect(screen.queryByText(/geo timeline/i)).toBeNull();
  });

  it('reveals the animation tools only after expanding the animation section', () => {
    render(<ControlDock {...createProps({ layoutMode: 'mobile' })} />);

    fireEvent.click(
      screen.getByRole('button', { name: /toggle layers section/i }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: /toggle profiles section/i }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: /toggle layout section/i }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: /toggle animation section/i }),
    );

    expect(screen.getByText(/geo timeline/i)).toBeInTheDocument();
    expect(screen.getByText(/layer toggles are available in headway mode/i)).toBeInTheDocument();
    expect(screen.getByText(/profiles are available in borders mode/i)).toBeInTheDocument();
    expect(screen.getByText(/layout looks are available in headway mode/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /open editor/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^play$/i })).toBeDisabled();
  });

  it('keeps secondary controls disabled when the scene is unavailable', () => {
    render(
      <ControlDock
        {...createProps({
          isFrozen: true,
          isSceneAvailable: false,
          showBorders: true,
          layoutMode: 'mobile',
        })}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: /toggle motion section/i }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: /toggle layers section/i }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: /toggle profiles section/i }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: /toggle layout section/i }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: /toggle animation section/i }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: /toggle viewpoints section/i }),
    );

    expect(screen.getByRole('button', { name: /unfreeze/i })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /hide borders/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /open editor/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^play$/i })).toBeDisabled();
    expect(
      screen.getByRole('button', {
        name: new RegExp(VIEWER_PRESETS[0]!.label, 'i'),
      }),
    ).toBeDisabled();
  });

  it('shows multiple Headway layout look switches and notifies on selection', () => {
    const onHeadwayLayoutLookChange = vi.fn();

    render(
      <ControlDock
        {...createProps({
          viewerMode: 'headway',
          headwayLayoutLook: 'mission',
          onHeadwayLayoutLookChange,
        })}
      />,
    );

    const layoutSection = screen.getByRole('region', { name: /layout section/i });

    fireEvent.click(within(layoutSection).getByRole('button', { name: /daylight/i }));

    expect(
      within(layoutSection).getByRole('button', { name: /^mission/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(layoutSection).getByRole('button', { name: /transit/i }),
    ).toBeInTheDocument();
    expect(onHeadwayLayoutLookChange).toHaveBeenCalledWith('daylight');
  });

  it('shows Headway layer toggles and notifies on selection', () => {
    const onHeadwayLayerToggle = vi.fn();

    render(
      <ControlDock
        {...createProps({
          viewerMode: 'headway',
          onHeadwayLayerToggle,
        })}
      />,
    );

    const layersSection = screen.getByRole('region', { name: /layers section/i });

    fireEvent.click(within(layersSection).getByRole('button', { name: /^roads$/i }));
    fireEvent.click(within(layersSection).getByRole('button', { name: /^parks$/i }));

    expect(onHeadwayLayerToggle).toHaveBeenCalledWith('roads');
    expect(onHeadwayLayerToggle).toHaveBeenCalledWith('parks');
  });

  it('shows Borders profile controls and pinpoints toggle in Borders mode', () => {
    const onBordersProfileChange = vi.fn();
    const onToggleBordersPinpoints = vi.fn();

    render(
      <ControlDock
        {...createProps({
          viewerMode: 'borders',
          bordersProfileId: 'population',
          onBordersProfileChange,
          onToggleBordersPinpoints,
          showBordersPinpoints: false,
        })}
      />,
    );

    const motionSection = screen.getByRole('region', { name: /motion section/i });
    const profilesSection = screen.getByRole('region', {
      name: /profiles section/i,
    });
    const animationSection = screen.getByRole('region', {
      name: /animation section/i,
    });

    expect(
      within(motionSection).getByRole('button', { name: /^pinpoints$/i }),
    ).toBeInTheDocument();
    expect(
      within(animationSection).getByText(/borders animation is not part of v1/i),
    ).toBeInTheDocument();
    expect(
      within(animationSection).getByRole('button', { name: /open editor/i }),
    ).toBeDisabled();

    fireEvent.click(
      within(profilesSection).getByRole('button', { name: /gdp/i }),
    );
    fireEvent.click(
      within(motionSection).getByRole('button', { name: /^pinpoints$/i }),
    );

    expect(onBordersProfileChange).toHaveBeenCalledWith('gdp');
    expect(onToggleBordersPinpoints).toHaveBeenCalledTimes(1);
  });
});
