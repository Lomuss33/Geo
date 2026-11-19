# Balkans historical research pilot

**Publication suspended in GEO-191 (2026-11-16).** The technical work below is
preserved as local research. Component-rights and historical review are incomplete;
carrying the upstream GPL notice alone is not production approval. See the
[source catalog](../data/catalog/README.md). The built-in load control is disabled
with a reason. Existing private atlas records remain available.

GEO-171 adds an optional, source-backed boundary layer to the Time atlas. Earth
remains the starter screen and no existing browser records are replaced.

## Use

Use `npm run build:history -- --research` for an explicit local research build,
then `npm run test:history:research`. These commands do not approve publication.
No default build/test requires the research data. Do not publish or stage it.
The normal `npm run build:history` command fails before any fetch/output.

The original integration loaded 1900/1938 snapshots on request; the production
hold now prevents that fetch. Keep its stable dataset ID so prior private files
still load without migration or data loss.

The selection is partial, not a complete political map of the region. Whole
polity geometries are retained and may extend beyond the Balkans. Blank regions
do not imply absence of government, population or culture.

## Source and coverage

- Source: André Ourednik, [Historical Basemaps](https://github.com/aourednik/historical-basemaps).
- Pinned revision: `4b5039e50d8d2464b065bd76ad6086cd4597108d`.
- Original inputs: `geojson/world_1900.geojson` and `geojson/world_1938.geojson`.
- 1900 source labels: Romania, Serbia, Montenegro, Austria Hungary, Bulgaria,
  Ottoman Empire, Greece.
- 1938 source labels: Albania, Turkey, Bulgaria, Romania, Hungary, Yugoslavia,
  Greece.
- Each feature covers only its snapshot year, with no implied month/day or
  uninterrupted boundary validity. The source provides yearly files, not exact
  dates for changes occurring within those years.

The upstream project describes itself as work in progress and advises checking
other sources for academic use. Geo consequently labels this pilot approximate.
This integration checks data provenance, geometry fidelity and time filtering;
it is not independent scholarly verification of those boundaries. Source names
and authority labels are retained as source descriptions, not present-day claims.

## Processing and identity

`npm run build:history -- --research` downloads the pinned inputs into an ignored cache and
selects the explicitly named entities. It performs no clipping, coordinate
rounding, simplification or polygon repair. No modern ISO IDs are assigned.
Feature IDs use explicit historical keys plus snapshot year, for example
`polity-ottoman-empire-y1900`. This identifies a source record; continuity and
relations between historical entities belong to GEO-172.

The resulting atlas is approximately 148 KB including its license text. It loads
only on request. The two source subsets preserve original selected GeoJSON
features and properties. The provenance manifest records full upstream-file
SHA-256 hashes, source URLs, selection and modification notes.

Local-only files under `.cache/research/historical-pilot/`:

- `balkans-pilot.json`: importable, editable atlas data.
- `source/world_1900.subset.geojson`, `source/world_1938.subset.geojson`: preferred
  editable original selections for comparison and regeneration.
- `provenance.json`: pinned input hashes and transformation notes.
- `LICENSE.txt`: upstream GPL version 3 text.

Historical data retain their GPL-3.0 notice; they are not relabeled as MIT. Source
attribution, the full license text and modification notice survive atlas export.
The transformation script and the application's existing code are documented
separately from these data assets in `THIRD_PARTY.md`.

## Verification

Optional local research tests validate the retained atlas through the runtime parser, compare
coordinates to the preferred source subsets, check seven features at each snapshot
and zero before/between/after them, and verify license preservation. Browser tests now check the blocked built-in control, absence of first-party
requests and unchanged private import/export. Earlier loading/snapshot evidence
is technical evidence, not a current publication claim. Async imports
merge into the latest atlas state; closing a pending download cannot overwrite
data from a subsequently opened workspace.
