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
        <p>
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
        <ul className="control-list">
          <li>
            <span>Left drag</span>
            <strong>Free orbit</strong>
          </li>
          <li>
            <span>Right drag / Shift+drag</span>
            <strong>Roll camera</strong>
          </li>
          <li>
            <span>Mouse wheel</span>
            <strong>Zoom in and out</strong>
          </li>
          <li>
            <span>Axis lock button</span>
            <strong>One-axis drag mode</strong>
          </li>
          <li>
            <span>Compare + click</span>
            <strong>Pin a live outline for a visible country</strong>
          </li>
          <li>
            <span>Double-click</span>
            <strong>Center clicked location when compare is off</strong>
          </li>
          <li>
            <span>Animation editor</span>
            <strong>Locked camera with saved start pose</strong>
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
            <strong>Freeze, axis lock, axis reset</strong>
          </li>
          <li>
            <span>1-6</span>
            <strong>View presets</strong>
          </li>
          <li>
            <span>Arrows / Shift / Ctrl / Alt</span>
            <strong>Move, yaw, pitch, zoom, and roll</strong>
          </li>
        </ul>
        <button className="primary-button" onClick={onDismiss} type="button">
          Enter viewport
        </button>
      </section>
    </div>
  );
}
