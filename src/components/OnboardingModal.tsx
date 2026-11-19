import { ThemeToggle } from './ThemeToggle';
import { useEffect, useRef } from 'react';

type OnboardingModalProps = {
  open: boolean;
  onDismiss: () => void;
};

export function OnboardingModal({ open, onDismiss }: OnboardingModalProps) {
  const dismissButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    dismissButton.current?.focus({ preventScroll: true });
    return () => {
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="onboarding-backdrop">
      <section
        className="onboarding-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            onDismiss();
          }
          if (event.key === 'Tab') {
            const controls = event.currentTarget.querySelectorAll<HTMLElement>(
              'button:not(:disabled), [tabindex="0"]',
            );
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <div className="onboarding-panel__header">
          <p className="panel-kicker">Flight brief</p>
          <ThemeToggle />
        </div>
        <div
          className="onboarding-panel__content"
          tabIndex={0}
          role="region"
          aria-label="Navigation guide"
        >
          <h2 id="onboarding-title">
            3D Earth navigation with shared controls.
          </h2>
          <p className="onboarding-panel__summary">
            Drag to orbit, scroll to zoom, and double-click a point to center
            it. Use right drag or <kbd>Shift</kbd> + drag to roll.
          </p>
          <p className="onboarding-panel__summary">
            Explore countries in Geo, switch to Headway for map tiles, or open
            Borders for population, GDP, and administrative boundaries. Open
            Help anytime to see these controls again.
          </p>
          <ul className="control-list control-list--onboarding">
            <li>
              <span>Left drag</span>
              <strong>Orbit</strong>
            </li>
            <li>
              <span>Right drag / Shift+drag</span>
              <strong>Roll</strong>
            </li>
            <li>
              <span>Mouse wheel</span>
              <strong>Zoom</strong>
            </li>
            <li>
              <span>Axis lock button</span>
              <strong>Single-axis drag</strong>
            </li>
            <li>
              <span>Compare + click</span>
              <strong>Pin a live country outline</strong>
            </li>
            <li>
              <span>Double-click</span>
              <strong>Center point when compare is off</strong>
            </li>
            <li>
              <span>Animation editor</span>
              <strong>Locked camera, saved start pose</strong>
            </li>
            <li>
              <span>Borders profile buttons</span>
              <strong>GDP, population, or hierarchy globe</strong>
            </li>
            <li>
              <span>R</span>
              <strong>Reset view</strong>
            </li>
            <li>
              <span>F</span>
              <strong>Freeze / unfreeze motion</strong>
            </li>
            <li>
              <span>Space / Y / Enter</span>
              <strong>Freeze, lock axis, reset axis</strong>
            </li>
            <li>
              <span>1-6</span>
              <strong>View presets</strong>
            </li>
            <li>
              <span>Arrows / Shift / Ctrl / Alt</span>
              <strong>Move, yaw, pitch, zoom, roll</strong>
            </li>
          </ul>
        </div>
        <button
          ref={dismissButton}
          className="primary-button"
          onClick={onDismiss}
          type="button"
        >
          Enter viewport
        </button>
      </section>
    </div>
  );
}
