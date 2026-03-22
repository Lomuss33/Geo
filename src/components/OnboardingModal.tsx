type OnboardingModalProps = {
  open: boolean;
  onDismiss: () => void;
};

export function OnboardingModal({ open, onDismiss }: OnboardingModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="onboarding-backdrop">
      <section className="onboarding-panel" aria-labelledby="onboarding-title">
        <p className="panel-kicker">Flight brief</p>
        <h2 id="onboarding-title">3D Earth navigation with shared controls.</h2>
        <p className="onboarding-panel__summary">
          Drag freely to orbit the globe like a trackball. Turn on
          <kbd>Axis lock</kbd> in the control deck if you want one-axis drags,
          use right drag or <kbd>Shift</kbd> plus drag for roll, turn on
          <kbd>Compare</kbd> in Geo to click a visible country and pin its live
          outline on the globe. While compare stays active the outline follows
          the real globe view, drag and zoom stay active, you can click another
          country to replace it, and the overlay keeps release and done actions
          available. Double-click any visible point to snap it to center when
          compare mode is off.
        </p>
        <p className="onboarding-panel__summary">
          Switch to <kbd>Borders</kbd> for a local atlas globe with GDP,
          population, and hierarchy profiles. Click a country to focus it, zoom
          deeper to reveal subdivision geometry where demo data exists, and use
          the pinpoints toggle to swap thematic city markers on and off.
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
        <button className="primary-button" onClick={onDismiss} type="button">
          Enter viewport
        </button>
      </section>
    </div>
  );
}
