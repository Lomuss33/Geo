import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { AnimationWorkspace } from './AnimationWorkspace';
import { createDefaultAnimationTimeline } from '../lib/animation';
import type { AnimationTimeline } from '../state/viewerStore';

const renderWorkspace = (
  initialDraft: AnimationTimeline = createDefaultAnimationTimeline('geo'),
) => {
  function TestHarness() {
    const [draft, setDraft] = useState(initialDraft);
    const [playheadMs, setPlayheadMs] = useState(0);
    const [importHex, setImportHex] = useState('');

    return (
      <>
        <AnimationWorkspace
          canPlay={draft.blocks.some((block) => block.enabled)}
          draft={draft}
          importError={null}
          importHex={importHex}
          onClearDraft={() => setDraft(createDefaultAnimationTimeline(draft.mode))}
          onClose={() => {}}
          onDraftChange={(next) =>
            setDraft((current) =>
              typeof next === 'function' ? next(current) : next,
            )
          }
          onImportHexChange={setImportHex}
          onImportHexLoad={() => {}}
          onPlay={() => {}}
          onPlayheadChange={setPlayheadMs}
          open
          phase="idle"
          playheadMs={playheadMs}
          workspaceMode="bounded"
          viewerMode={draft.mode}
        />
        <output data-testid="draft-start-pose">
          {JSON.stringify(draft.startGeoView)}
        </output>
      </>
    );
  }

  return render(<TestHarness />);
};

describe('AnimationWorkspace', () => {
  const getTimelineClip = () =>
    screen
      .getAllByTestId(/animation-block-/i)
      .find((element) => element.tagName === 'BUTTON') as HTMLElement;

  it('inserts a clip from the command palette and edits it through the inspector', () => {
    renderWorkspace();

    const moveGroup = screen.getByRole('group', { name: /move commands/i });
    fireEvent.click(within(moveGroup).getByRole('button', { name: 'R' }));

    expect(getTimelineClip()).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /right/i })).toBeInTheDocument();

    fireEvent.change(screen.getByRole('spinbutton', { name: /value/i }), {
      target: { value: '3.25' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^apply$/i }));

    expect(screen.getByText('3.25')).toBeInTheDocument();
  });

  it('renders the bounded workspace frame for large desktop editing', () => {
    const { container } = renderWorkspace();

    expect(screen.getByLabelText(/animation workspace/i)).toHaveClass(
      'animation-workspace--bounded',
    );
    expect(
      container.querySelector('.animation-workspace__frame--bounded'),
    ).not.toBeNull();
  });

  it('keeps helper copy collapsed and exposes dense toolbar metadata', () => {
    const { container } = renderWorkspace();

    expect(screen.getByText(/locked start pose/i)).toBeInTheDocument();
    expect(container.querySelector('.animation-workspace__helper[open]')).toBeNull();
    expect(
      container.querySelectorAll(
        '.animation-workspace__toolbar-meta .animation-summary__meta',
      ),
    ).toHaveLength(2);
    expect(container.querySelectorAll('.animation-command-strip')).toHaveLength(2);
  });

  it('renders and applies the Geo start pose editor', () => {
    renderWorkspace();

    expect(screen.getByRole('spinbutton', { name: /latitude/i })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /longitude/i })).toBeInTheDocument();

    fireEvent.change(screen.getByRole('spinbutton', { name: /latitude/i }), {
      target: { value: '10' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: /longitude/i }), {
      target: { value: '20' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: /distance/i }), {
      target: { value: '3.4' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: /roll/i }), {
      target: { value: '5' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: /^fov$/i }), {
      target: { value: '30' },
    });

    fireEvent.click(screen.getByRole('button', { name: /apply start pose/i }));

    expect(screen.getByTestId('draft-start-pose').textContent).toContain('"distance":3.4');
    expect(screen.getByRole('spinbutton', { name: /latitude/i })).toHaveValue(10);
    expect(screen.getByRole('spinbutton', { name: /longitude/i })).toHaveValue(20);
  });

  it('shows a validation error for invalid start pose input and does not mutate the draft', () => {
    renderWorkspace();

    const before = screen.getByTestId('draft-start-pose').textContent;

    fireEvent.change(screen.getByRole('spinbutton', { name: /latitude/i }), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: /apply start pose/i }));

    expect(screen.getByText(/start pose fields must all be valid numbers/i)).toBeInTheDocument();
    expect(screen.getByTestId('draft-start-pose').textContent).toBe(before);
  });

  it('resets the start pose back to the Europe / Africa default', () => {
    renderWorkspace();

    fireEvent.change(screen.getByRole('spinbutton', { name: /latitude/i }), {
      target: { value: '10' },
    });
    fireEvent.click(screen.getByRole('button', { name: /apply start pose/i }));
    fireEvent.click(
      screen.getByRole('button', { name: /reset to europe \/ africa/i }),
    );

    expect(screen.getByRole('spinbutton', { name: /latitude/i })).toHaveValue(22);
    expect(screen.getByRole('spinbutton', { name: /longitude/i })).toHaveValue(13);
  });

  it('moves a clip on the timeline with snapped timing updates', () => {
    renderWorkspace();

    const moveGroup = screen.getByRole('group', { name: /move commands/i });
    fireEvent.click(within(moveGroup).getByRole('button', { name: 'R' }));

    const lane = screen.getByTestId('animation-lane-lr+');
    Object.defineProperty(lane, 'getBoundingClientRect', {
      configurable: true,
      value: () =>
        ({
          left: 0,
          top: 0,
          width: 400,
          height: 40,
          right: 400,
          bottom: 40,
        }) as DOMRect,
    });

    const clip = getTimelineClip();
    fireEvent.mouseDown(clip, { clientX: 0 });
    fireEvent.mouseMove(document, { clientX: 25 });
    fireEvent.mouseUp(document);

    expect(screen.getByRole('spinbutton', { name: /start/i })).toHaveValue(1);
    expect(screen.getByRole('spinbutton', { name: /end/i })).toHaveValue(2);
  });

  it('resizes a clip duration from the trailing handle', () => {
    renderWorkspace();

    const moveGroup = screen.getByRole('group', { name: /move commands/i });
    fireEvent.click(within(moveGroup).getByRole('button', { name: 'R' }));

    const lane = screen.getByTestId('animation-lane-lr+');
    Object.defineProperty(lane, 'getBoundingClientRect', {
      configurable: true,
      value: () =>
        ({
          left: 0,
          top: 0,
          width: 400,
          height: 40,
          right: 400,
          bottom: 40,
        }) as DOMRect,
    });

    const clip = getTimelineClip();
    const blockId = clip.getAttribute('data-testid')!.replace('animation-block-', '');
    const endHandle = screen.getByTestId(`animation-handle-end-${blockId}`);

    fireEvent.mouseDown(endHandle, { clientX: 50 });
    fireEvent.mouseMove(document, { clientX: 75 });
    fireEvent.mouseUp(document);

    expect(screen.getByRole('spinbutton', { name: /start/i })).toHaveValue(0);
    expect(screen.getByRole('spinbutton', { name: /end/i })).toHaveValue(2);
  });
});
