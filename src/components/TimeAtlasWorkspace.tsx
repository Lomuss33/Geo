import { ThemeToggle } from './ThemeToggle';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TimeAtlasMap } from '../scene/TimeAtlasMap';
import {
  ATLAS_STORAGE_KEY,
  MAX_ATLAS_BYTES,
  PERSPECTIVES,
  activeLayerItems,
  atlasExtent,
  downloadAtlas,
  emptyTimeAtlas,
  formatAtlasYear,
  layerInScope,
  parseAtlasFile,
  parseTimeAtlas,
  type AtlasScope,
  type Perspective,
  type TimeAtlas,
} from '../lib/timeAtlas';
import '../styles/timeAtlas.css';
import {
  HISTORICAL_PILOT_ID,
  HISTORICAL_PILOT_AVAILABLE,
  HISTORICAL_PILOT_UNAVAILABLE_REASON,
  HISTORICAL_PILOT_SOURCE,
  HISTORICAL_PILOT_YEARS,
  loadHistoricalPilot,
} from '../lib/historicalPilot';

function initialAtlas() {
  try {
    const saved = localStorage.getItem(ATLAS_STORAGE_KEY);
    return {
      atlas: saved ? parseAtlasFile(saved) : emptyTimeAtlas(),
      error: '',
    };
  } catch {
    return {
      atlas: emptyTimeAtlas(),
      error:
        'The saved atlas could not be read. Import a valid backup; the stored file has not been overwritten.',
    };
  }
}

export default function TimeAtlasWorkspace({
  onClose,
}: {
  onClose: () => void;
}) {
  const [initial] = useState(initialAtlas);
  const [atlas, setAtlas] = useState<TimeAtlas>(initial.atlas);
  const atlasRef = useRef(initial.atlas);
  const [year, setYear] = useState(new Date().getFullYear());
  const [scope, setScope] = useState<AtlasScope>('world');
  const [perspective, setPerspective] = useState<Perspective>('borders');
  const [visible, setVisible] = useState<string[]>(
    initial.atlas.layers.map((layer) => layer.id),
  );
  const [selected, setSelected] = useState<{
    layerId: string;
    featureId: string;
  } | null>(null);
  const [error, setError] = useState(initial.error);
  const [notice, setNotice] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [pilotLoading, setPilotLoading] = useState(false);
  const [yearInput, setYearInput] = useState(String(year));
  const fileInput = useRef<HTMLInputElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const activeWorkspace = useRef(false);
  useEffect(() => {
    activeWorkspace.current = true;
    closeButton.current?.focus();
    return () => {
      activeWorkspace.current = false;
    };
  }, []);
  const scopeLayers = useMemo(
    () => atlas.layers.filter((layer) => layerInScope(layer, scope)),
    [atlas, scope],
  );
  const shownLayers = useMemo(
    () =>
      scopeLayers.filter(
        (layer) =>
          visible.includes(layer.id) && layer.perspective === perspective,
      ),
    [scopeLayers, visible, perspective],
  );
  const catalogLayers = scopeLayers.filter(
    (layer) => layer.perspective === perspective,
  );
  const extent = atlasExtent(scopeLayers);
  const minYear = Math.min(extent.min, year);
  const maxYear = Math.max(extent.max, year, minYear + 1);
  const selectedLayer = shownLayers.find(
    (layer) => layer.id === selected?.layerId,
  );
  const selectedFeature =
    selectedLayer?.kind === 'vector'
      ? selectedLayer.features.find(
          (feature) =>
            feature.id === selected?.featureId &&
            feature.properties.fromYear <= year &&
            feature.properties.toYear >= year,
        )
      : undefined;
  const activeCount = shownLayers.reduce(
    (count, layer) => count + activeLayerItems(layer, year),
    0,
  );
  const setTime = (nextYear: number) => {
    setYear(nextYear);
    setYearInput(String(nextYear));
    setSelected(null);
  };
  const pick = useCallback((layerId: string, featureId: string) => {
    setSelected({ layerId, featureId });
  }, []);

  const save = (next: TimeAtlas, message: string) => {
    if (!activeWorkspace.current) return;
    const json = JSON.stringify(next);
    if (new TextEncoder().encode(json).length > MAX_ATLAS_BYTES)
      throw new Error('Atlas exceeds the 2 MB browser-project limit.');
    atlasRef.current = next;
    setAtlas(next);
    setVisible(next.layers.map((layer) => layer.id));
    setSelected(null);
    setError('');
    try {
      localStorage.setItem(ATLAS_STORAGE_KEY, json);
      setNotice(message);
    } catch {
      setError(
        'Changes work in this session but could not be saved. Export a backup before leaving.',
      );
    }
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > MAX_ATLAS_BYTES)
        throw new Error('Atlas files must be under 2 MB.');
      const imported = parseAtlasFile(await file.text());
      const next = parseTimeAtlas({
        ...atlasRef.current,
        layers: [...atlasRef.current.layers, ...imported.layers],
      });
      save(
        next,
        `Imported ${imported.layers.length} layers. Dates and sources are author-supplied; review them before sharing.`,
      );
      if (imported.layers[0]) {
        setPerspective(imported.layers[0].perspective);
        const range = atlasExtent(imported.layers);
        setTime(range.min);
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Import failed. The current atlas is unchanged.',
      );
    }
  };
  const addPilot = async () => {
    setPilotLoading(true);
    setError('');
    try {
      const pilot = await loadHistoricalPilot();
      save(
        parseTimeAtlas({
          ...atlasRef.current,
          layers: [...atlasRef.current.layers, ...pilot.layers],
        }),
        'Historical pilot loaded: approximate snapshots for 1900 and 1938. Other years intentionally have no coverage.',
      );
      setScope('balkans');
      setPerspective('borders');
      setTime(1900);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Historical pilot could not load.',
      );
    } finally {
      setPilotLoading(false);
    }
  };
  const addRecord = (form: HTMLFormElement) => {
    try {
      const data = new FormData(form);
      const layerId = `record-${crypto.randomUUID()}`;
      const title = String(data.get('title') ?? '');
      const layer: unknown = {
        id: layerId,
        title,
        perspective: data.get('perspective'),
        scope,
        confidence: data.get('confidence'),
        source: {
          title: data.get('sourceTitle'),
          url: data.get('sourceUrl'),
          license: data.get('license'),
        },
        kind: 'vector',
        features: [
          {
            type: 'Feature',
            id: 'location',
            geometry: {
              type: 'Point',
              coordinates: [
                Number(data.get('longitude')),
                Number(data.get('latitude')),
              ],
            },
            properties: {
              label: title,
              description: data.get('description'),
              fromYear: Number(data.get('fromYear')),
              toYear: Number(data.get('toYear')),
            },
          },
        ],
      };
      const next = parseTimeAtlas({
        ...atlasRef.current,
        layers: [...atlasRef.current.layers, layer],
      });
      save(
        next,
        'Location record saved. Its dates and interpretation are author-supplied.',
      );
      setPerspective(data.get('perspective') as Perspective);
      setTime(Number(data.get('fromYear')));
      setEditorOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Record could not be added.',
      );
    }
  };

  return (
    <main className="time-atlas" aria-label="Time atlas workspace">
      <header className="time-atlas__header">
        <button
          ref={closeButton}
          className="secondary-button"
          onClick={onClose}
          type="button"
        >
          ← Back to Earth
        </button>
        <div>
          <span className="panel-kicker">Geo / Time atlas</span>
          <h1>People. Time. Earth.</h1>
        </div>
        <div className="time-atlas__header-actions">
          <ThemeToggle />
          <button
            className="secondary-button"
            type="button"
            onClick={() => fileInput.current?.click()}
          >
            Import atlas
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => downloadAtlas(atlas)}
          >
            Export atlas
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            hidden
            aria-label="Import time atlas file"
            onChange={(event) => {
              void importFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </div>
      </header>
      <nav className="time-atlas__perspectives" aria-label="Atlas perspectives">
        {(
          Object.entries(PERSPECTIVES) as [
            Perspective,
            (typeof PERSPECTIVES)[Perspective],
          ][]
        ).map(([id, definition]) => (
          <button
            key={id}
            type="button"
            aria-pressed={perspective === id}
            style={
              { '--perspective-color': definition.color } as React.CSSProperties
            }
            onClick={() => {
              setPerspective(id);
              setSelected(null);
            }}
          >
            <span className="time-atlas__color-dot" />
            <span>
              <strong>{definition.label}</strong>
              <small>{definition.description}</small>
            </span>
            <span className="time-atlas__count">
              {scopeLayers.filter((layer) => layer.perspective === id).length}
            </span>
          </button>
        ))}
      </nav>
      <div className="time-atlas__body">
        <section className="time-atlas__stage" aria-label="Dated map">
          <TimeAtlasMap
            selectedFeature={selectedFeature}
            layers={shownLayers}
            year={year}
            scope={scope}
            onSelect={pick}
          />
          <div className="time-atlas__date-badge">
            <span>Viewing</span>
            <strong>{formatAtlasYear(year)}</strong>
            <small>
              {activeCount} dated{' '}
              {perspective === 'imagery' ? 'frames' : 'features'} visible
            </small>
          </div>
          {activeCount === 0 ? (
            <div className="time-atlas__empty-map">
              <strong>
                No dated {PERSPECTIVES[perspective].label.toLowerCase()} for
                this view
              </strong>
              <p>
                The modern reference map remains visible. Import a sourced layer
                or add a location record; moving the timeline never invents
                historical coverage.
              </p>
            </div>
          ) : null}
        </section>
        <aside
          className="time-atlas__inspector"
          aria-label="Atlas layers and sources"
        >
          <label className="field">
            <span>Geographic scope</span>
            <select
              value={scope}
              onChange={(event) => {
                setScope(event.target.value as AtlasScope);
                setSelected(null);
              }}
            >
              <option value="balkans">Balkans</option>
              <option value="europe">Europe</option>
              <option value="world">World</option>
            </select>
          </label>
          <div className="time-atlas__inspector-heading">
            <h2>Layer library</h2>
            <button
              className="text-button"
              type="button"
              onClick={() => setEditorOpen(!editorOpen)}
            >
              {editorOpen ? 'Close editor' : '+ Add record'}
            </button>
          </div>
          {error ? (
            <p className="time-atlas__error" role="alert">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="time-atlas__notice" role="status">
              {notice}
            </p>
          ) : null}
          {editorOpen ? (
            <form
              className="time-atlas__record-form"
              aria-label="Add sourced location"
              onSubmit={(event) => {
                event.preventDefault();
                addRecord(event.currentTarget);
              }}
            >
              <h3>Add a sourced location</h3>
              <p>
                A marker records a place. It does not define a territory or a
                cultural boundary.
              </p>
              <label className="field">
                Title
                <input name="title" required maxLength={240} />
              </label>
              <label className="field">
                Perspective
                <select
                  name="perspective"
                  defaultValue={
                    perspective === 'imagery' ? 'rulers' : perspective
                  }
                >
                  <option value="borders">Borders & states</option>
                  <option value="rulers">People & rule</option>
                  <option value="culture">Culture & society</option>
                </select>
              </label>
              <div className="time-atlas__form-pair">
                <label className="field">
                  From year
                  <input
                    name="fromYear"
                    type="number"
                    min={-10000}
                    max={2200}
                    step="1"
                    defaultValue={year}
                    required
                  />
                </label>
                <label className="field">
                  To year
                  <input
                    name="toYear"
                    type="number"
                    min={-10000}
                    max={2200}
                    step="1"
                    defaultValue={year}
                    required
                  />
                </label>
              </div>
              <small>
                Dates use astronomical years: 0 = 1 BCE; −1 = 2 BCE. Both
                endpoints included.
              </small>
              <div className="time-atlas__form-pair">
                <label className="field">
                  Longitude
                  <input
                    name="longitude"
                    type="number"
                    min={-180}
                    max={180}
                    step="any"
                    required
                  />
                </label>
                <label className="field">
                  Latitude
                  <input
                    name="latitude"
                    type="number"
                    min={-90}
                    max={90}
                    step="any"
                    required
                  />
                </label>
              </div>
              <label className="field">
                Notes
                <textarea name="description" maxLength={5000} rows={3} />
              </label>
              <label className="field">
                Source title
                <input name="sourceTitle" required maxLength={240} />
              </label>
              <label className="field">
                Source URL
                <input
                  name="sourceUrl"
                  type="url"
                  placeholder="https://…"
                  required
                />
              </label>
              <label className="field">
                License / usage terms
                <input name="license" required maxLength={240} />
              </label>
              <label className="field">
                Author's confidence
                <select name="confidence" defaultValue="approximate">
                  <option value="documented">Documented</option>
                  <option value="approximate">Approximate</option>
                  <option value="disputed">Disputed</option>
                </select>
              </label>
              <button className="secondary-button" type="submit">
                Save location record
              </button>
            </form>
          ) : null}
          {perspective === 'borders' ? (
            <section
              className="time-atlas__layer"
              aria-label="Historical pilot"
            >
              <span className="panel-kicker">Research source</span>
              <h3>Balkans · 1900 / 1938</h3>
              <p>
                Seven political entities per snapshot. Full source extents may
                extend beyond the Balkans. Approximate; no exact day or coverage
                between snapshots.
              </p>
              {!HISTORICAL_PILOT_AVAILABLE ? (
                <p id="pilot-availability" role="status">
                  {HISTORICAL_PILOT_UNAVAILABLE_REASON} Existing local layers
                  remain available; review their sources before sharing.
                </p>
              ) : null}
              <p>
                <a
                  href={HISTORICAL_PILOT_SOURCE}
                  target="_blank"
                  rel="noreferrer"
                >
                  Historical Basemaps
                </a>{' '}
                · GPL-3.0 data
              </p>
              <button
                className="secondary-button"
                type="button"
                disabled={
                  !HISTORICAL_PILOT_AVAILABLE ||
                  pilotLoading ||
                  atlas.layers.some((layer) => layer.id === HISTORICAL_PILOT_ID)
                }
                onClick={() => {
                  void addPilot();
                }}
                aria-describedby={
                  !HISTORICAL_PILOT_AVAILABLE ? 'pilot-availability' : undefined
                }
              >
                {!HISTORICAL_PILOT_AVAILABLE
                  ? 'Pilot unavailable — rights review'
                  : pilotLoading
                    ? 'Loading pilot…'
                    : atlas.layers.some(
                          (layer) => layer.id === HISTORICAL_PILOT_ID,
                        )
                      ? 'Historical pilot loaded'
                      : 'Load historical pilot'}
              </button>
              {atlas.layers.some(
                (layer) => layer.id === HISTORICAL_PILOT_ID,
              ) ? (
                <div
                  className="time-atlas__snapshot-buttons"
                  aria-label="Pilot snapshot years"
                >
                  {HISTORICAL_PILOT_YEARS.map((snapshotYear) => (
                    <button
                      key={snapshotYear}
                      className="secondary-button"
                      type="button"
                      aria-pressed={year === snapshotYear}
                      onClick={() => setTime(snapshotYear)}
                    >
                      {snapshotYear}
                    </button>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}
          {catalogLayers.length === 0 && !editorOpen ? (
            <div className="time-atlas__library-empty">
              <h3>Build the atlas over time</h3>
              <p>
                Bring dated GeoJSON for boundaries and cultural areas, places
                for people and rulers, or dated XYZ imagery tiles.
              </p>
              <button
                className="secondary-button"
                type="button"
                onClick={() => fileInput.current?.click()}
              >
                Import sourced layers
              </button>
              <small>No layers loaded for this perspective.</small>
            </div>
          ) : null}
          {catalogLayers.map((layer) => (
            <article className="time-atlas__layer" key={layer.id}>
              <label>
                <input
                  type="checkbox"
                  checked={visible.includes(layer.id)}
                  onChange={(event) => {
                    setVisible(
                      event.target.checked
                        ? [...visible, layer.id]
                        : visible.filter((id) => id !== layer.id),
                    );
                    setSelected(null);
                  }}
                />
                <strong>{layer.title}</strong>
              </label>
              <p>
                {activeLayerItems(layer, year)} active · {layer.confidence} ·{' '}
                {layer.kind === 'raster' ? 'dated imagery' : 'vector layer'}
              </p>
              <p>
                <a href={layer.source.url} target="_blank" rel="noreferrer">
                  {layer.source.title}
                </a>{' '}
                · {layer.source.license}
              </p>
              {layer.source.licenseText ? (
                <details className="time-atlas__license">
                  <summary>License terms</summary>
                  <pre>{layer.source.licenseText}</pre>
                </details>
              ) : null}
              {layer.kind === 'vector' ? (
                layer.features
                  .filter(
                    (feature) =>
                      feature.properties.fromYear <= year &&
                      feature.properties.toYear >= year,
                  )
                  .map((feature) => (
                    <button
                      className="time-atlas__feature"
                      key={feature.id}
                      type="button"
                      onClick={() => pick(layer.id, feature.id)}
                    >
                      {feature.properties.label}
                      <small>
                        {formatAtlasYear(feature.properties.fromYear)} →{' '}
                        {formatAtlasYear(feature.properties.toYear)}
                      </small>
                    </button>
                  ))
              ) : (
                <p>
                  {layer.frames
                    .map(
                      (frame) =>
                        `${formatAtlasYear(frame.fromYear)}–${formatAtlasYear(frame.toYear)}`,
                    )
                    .join(' · ')}
                </p>
              )}
            </article>
          ))}
          {selectedFeature && selectedLayer ? (
            <section
              className="time-atlas__detail"
              aria-label="Selected historical record"
            >
              <span className="panel-kicker">
                Record / {selectedLayer.confidence}
              </span>
              <h3>{selectedFeature.properties.label}</h3>
              <p>
                {formatAtlasYear(selectedFeature.properties.fromYear)} →{' '}
                {formatAtlasYear(selectedFeature.properties.toYear)}
              </p>
              <p>
                {selectedFeature.properties.description ||
                  'No interpretation notes provided.'}
              </p>
              <a
                href={selectedLayer.source.url}
                target="_blank"
                rel="noreferrer"
              >
                Read the source ↗
              </a>
              <small>
                Dates and confidence are supplied by the author, not
                independently verified by Geo.
              </small>
            </section>
          ) : null}
          <p className="time-atlas__local-note">
            Saved in this browser. Export your atlas to move it to another
            device. This file contains layers, not camera-animation projects.
          </p>
        </aside>
      </div>
      <footer className="time-atlas__timeline" aria-label="Historical timeline">
        <div className="time-atlas__timeline-top">
          <div>
            <span className="panel-kicker">Time lens</span>
            <strong>{formatAtlasYear(year)}</strong>
          </div>
          <label>
            Year
            <input
              aria-label="Atlas year"
              type="number"
              min={-10000}
              max={2200}
              step="1"
              value={yearInput}
              onChange={(event) => setYearInput(event.target.value)}
              onBlur={() => {
                const next = Number(yearInput);
                if (
                  yearInput.trim() &&
                  Number.isInteger(next) &&
                  next >= -10000 &&
                  next <= 2200
                )
                  setTime(next);
                else setYearInput(String(year));
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
              }}
            />
          </label>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setTime(new Date().getFullYear())}
          >
            Today
          </button>
          <button
            className="text-button"
            type="button"
            disabled={scopeLayers.length === 0}
            onClick={() => setTime(extent.min)}
          >
            First record
          </button>
        </div>
        <input
          className="time-atlas__scrubber"
          aria-label="Time atlas timeline"
          type="range"
          min={minYear}
          max={maxYear}
          step="1"
          value={year}
          aria-valuetext={formatAtlasYear(year)}
          onChange={(event) => setTime(Number(event.target.value))}
        />
        <div className="time-atlas__ticks">
          <span>{formatAtlasYear(minYear)}</span>
          <span>Only records covering the selected year are shown</span>
          <span>{formatAtlasYear(maxYear)}</span>
        </div>
      </footer>
    </main>
  );
}
