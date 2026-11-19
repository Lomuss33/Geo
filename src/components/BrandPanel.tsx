type BrandPanelProps = {
  compact?: boolean;
};

export function BrandPanel({ compact = false }: BrandPanelProps) {
  if (compact) {
    return (
      <div
        className="brand-panel brand-panel--compact"
        aria-label="Viewer overview"
      >
        <p className="panel-kicker">Geo / Earth studio</p>
        <p className="brand-panel__title">Explore. Learn. Create.</p>
      </div>
    );
  }

  return (
    <section className="hud-card brand-panel" aria-label="Viewer overview">
      <p className="panel-kicker">Geo / Earth studio</p>
      <h1>Your view of Earth.</h1>
      <p>
        Switch between Geo and Headway, keep the same place centered, and share
        the current view by URL.
      </p>
    </section>
  );
}
