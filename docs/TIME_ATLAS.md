# People, time, Earth

## Product direction

The existing Earth screen is the default starting point. A separate **Time atlas**
workspace explores geography through time on a real WGS84 world map. Explore,
Learn, and Create remain the larger workflows; Geo / Headway / Borders remain
rendering modes. Neither the geographic scope nor the historical perspective is
a replacement for those concepts.

Four perspectives organize the content:

- **Borders & states:** dated territories and boundaries, including overlapping or
  disputed interpretations. A historical polity is not identified by a modern
  country code alone.
- **People & rule:** people, rulers, dynasties, institutions, events and their places.
  A marker describes a location; it does not establish territorial control.
- **Culture & society:** languages, beliefs, cultural regions and social change.
  Cultural geography may overlap and need not follow political boundaries. It
  must not be presented as a fixed, exclusive classification of a population.
- **Earth imagery:** explicitly dated imagery frames. Coverage begins when a
  particular source has usable observations, varies by region, and may have gaps.
  A year without a frame must not show a nearby year as though it were that year.

## GEO-170 implemented foundation

Open **Open Time atlas** from the control deck. The original Earth view remains
the default after reload and **Back to Earth** returns to the existing viewer.
The new workspace provides perspective cards, an editable year, a timeline,
Balkans / Europe / World scope, a layer library, record/source inspection, and a
modern physical reference map. It supplies no contemporary political boundaries
or country labels; the physical backdrop is explicitly marked as modern reference.

Authors can add sourced location markers or import dated vector/raster layers.
Selecting a record reveals notes and source attribution and frames it on the map.
Visibility, scope and inclusive year intervals determine what is displayed.
Currently one perspective is shown at a time; simultaneous comparison is future work.

The [historical boundary research pilot](HISTORICAL_PILOT.md) has selected
snapshots for 1900 and 1938, but first-party publication/loading is suspended
pending component-rights review (GEO-191). Existing private layers are preserved. Ruler/culture
datasets and a dated imagery provider are not bundled yet. Empty periods remain
empty; the current Earth textures are not a historical imagery archive. Test-only
fictional fixtures are not source material.

## Portable format

An atlas file is UTF-8 JSON with `format: "geo-time-atlas"`, `schemaVersion: 1`, and
`layers`. The file is separate from camera-animation projects. Imports append
layers only after the entire file validates; duplicate IDs and invalid data are
rejected before changing the active atlas.

Each layer requires:

- `id`, `title`, `perspective` (`borders`, `rulers`, `culture`, `imagery`).
- `scope` (`balkans`, `europe`, `world`). World includes all collections; Europe
  includes Europe and Balkans; Balkans includes its declared collection only.
- `confidence` (`documented`, `approximate`, `disputed`). These are the author's
  labels, not independent verification by Geo.
- `source`: `title`, HTTPS `url` (or local root-relative path), and `license`.
- Optional `source.licenseText` (up to 50,000 characters) retains full source terms
  through import/export and can be inspected from the layer's License terms.
- `kind`: `vector` or `raster`.

Vector layers contain GeoJSON `Feature` objects with unique string `id`, WGS84
`geometry`, and `properties` containing `label`, `description`, `fromYear`, `toYear`.
Supported geometry: Point, LineString, Polygon and MultiPolygon. Coordinates use
`[longitude, latitude]`; polygon rings must close. Imported text is rendered as
text, never HTML.

Raster layers use perspective `imagery` and a `frames` array. Each frame requires
`id`, `fromYear`, `toYear`, an HTTPS/local XYZ `tiles` URL containing `{z}`, `{x}`,
`{y}`, and integer `minZoom` / `maxZoom` in 0–22. Frames in one layer must not
overlap in time. Tiles must be usable by the browser under the provider's license
and CORS policy. Only the frame covering the selected year loads; gaps stay empty.
The adapter is implemented, but no imagery provider is preconfigured or verified.
Scanned historical maps need georeferencing/tiling first; GeoTIFF import and a
georeferencing editor are not implemented.

Dates use astronomical whole years: 1 = 1 CE, 0 = 1 BCE, −1 = 2 BCE. The supported
authoring interval is −10000 through 2200, inclusive at both endpoints. The UI
formats BCE/CE explicitly. Current granularity is one year; exact acquisition
dates, reign succession dates and uncertainty ranges need a later schema extension.

Limits: 2 MB per atlas, 100 layers, 5,000 vector features total, 200 raster frames
per layer, bounded ring/polygon sizes, finite in-range coordinates. Import or
authoring failures keep the active atlas. Browser-storage failure leaves the
session usable and asks the author to export a backup.

Records save in `geo:time-atlas:v1` localStorage. Storage is specific to browser,
device and origin: a PC's `localhost` data does not automatically appear on a
phone's LAN URL. Use **Export atlas** and **Import atlas** to transfer data. There
is no account sync, hosted public story link, clip export, or camera-project export
in this format.

## Adding content safely

1. Establish a source, license, period, geographic coverage and interpretation.
2. Use **Add record** for a sourced location. For territories/cultural areas,
   prepare dated GeoJSON geometry and package it as vector layers.
3. Use **Import atlas**, inspect the author confidence and sources, then move the
   timeline before, inside and after each period to verify coverage.
4. Export a backup to transfer or edit externally. Existing files with duplicate
   layer IDs are rejected rather than silently replacing content.

`docs/examples/time-atlas.empty.json` is a valid empty container. Full schema
examples are exercised by `src/lib/timeAtlas.test.ts`; its coordinates and dates
are fictional test data, not a historical atlas.

## Next delivery slices

1. **GEO-191/200:** resolve the pilot rights hold or prepare a separately reviewed
   source. Do not expand or publish the quarantined output.
2. **GEO-172:** add stable historical entity IDs and sourced relations between
   polities, rulers and cultural records, without forcing them into modern borders.
3. **GEO-173:** connect a licensed imagery source with verified spatial/temporal
   coverage, acquisition dates and clear missing-frame behavior.
4. Extend GEO-120 projects to capture time, active layers and source versions;
   GEO-150/GEO-160 then animate and export geographic/time stories from that state.

This changes the earlier deferral of historical content: historical exploration
is now a primary direction, delivered in sourced increments rather than promising
complete global coverage for every year.
