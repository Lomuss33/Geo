type BrandPanelProps = {
  compact?: boolean;
};

export function BrandPanel({ compact = false }: BrandPanelProps) {
  if (compact) {
    return (
      <div className="brand-panel brand-panel--compact" aria-label="Viewer footer">
        <p className="panel-kicker">Geo // GitHub Pages</p>
        <p className="brand-panel__title">3D Earth navigation</p>
      </div>
    );
  }

  return (
    <section className="hud-card brand-panel" aria-label="Viewer overview">
      <p className="panel-kicker">Geo // GitHub Pages</p>
      <h1>Mission-grade 3D Earth navigation.</h1>
      <p>
        Switch between Geo and Headway, keep the same place centered, and share
        the current view by URL.
      </p>
    </section>
  );
}
