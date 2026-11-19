# Data, evidence and publication policy

Owner constraints adopted 2026-11-16. Maintainer: source/task owner. Applies to
boundaries, imagery, terrain, observations and history. See
[the catalog](../data/catalog/README.md) for source-specific decisions.

## Separate gates

Record discovery, rights review, pinned fetch, parsing, geometry validation,
historical review, packaging and publication separately. Passing a parser or
seeing an attractive map does not approve rights or historical accuracy.
`rights_pending`, `blocked_legal`, `blocked_data` and `needs_review` are honest
states. Unknown component rights block first-party runtime redistribution.

For each release retain source/author, original URL, immutable revision, retrieval
date, SHA-256, format/CRS, geometry type, spatial/time coverage, original IDs and
claims, license/evidence URL, attribution, transformations, sizes and review state.
An upstream GPL/MIT/CC label does not prove the rights of every source component.
Do not relabel data with the code's MIT license. Keep incompatible licenses and
alternative interpretations in separate packages. NC, share-alike and ODbL require
specific review; a zero-price app is not automatically noncommercial.

Local research output belongs in ignored `.cache/`, outside `public/` and runtime
imports. Never commit or publish quarantined content while its rights are pending.
Keep provenance and review decisions portable in the catalog. User-imported
private files are author-supplied claims, not newly approved Geo datasets; do not
erase old local projects when a first-party source is suspended.

## Temporal and historical truth

- Preserve the original record, names, administrative class, source IDs, calendar,
  precision and interval semantics. Entity identity and a source record are
  different; a modern ISO code or Wikidata QID alone is insufficient.
- Distinguish historical validity/claimed time, observation/documentation time
  and animation time. Interval inclusion comes from the specific source.
- The current atlas uses astronomical whole years (0 = 1 BCE, -1 = 2 BCE)
  and inclusive endpoints; the public BCE/CE label has no historical year zero; richer source claims need an explicit adapter and tests, not silent
  reinterpretation of existing v1 files.
- Separate documented, reconstructed, approximate, disputed and unknown status;
  no invented numeric confidence. Coverage may be partial or unknown.
- Snapshot gaps stay gaps. Camera interpolation and labeled fades are allowed;
  morphing borders is not evidence of historical change. Do not turn points,
  language families, rulers or administrative names into fabricated polygons.
- Preserve de facto/de jure control, occupation, autonomy, jurisdiction and
  alternative scholarly reconstructions separately. Do not average disputed lines.
- Modern basemap, imagery composites, DEM and hydrology remain modern references
  under historical overlays. Do not backdate lakes or rivers from today's imagery.

## Geometry and physical geography

Canonical WGS84 geometry, scale-specific generalized geometry and display symbols
are distinct. Geodesic measurements use canonical geometry and an explicit method,
not screen features or longitude/latitude degrees. Validate finite coordinates,
closed rings, holes, Polygon/MultiPolygon, islands, antimeridian, poles and seams.
Topology repair and generalization must report changes; preserve politically
important small features and full historical extents. Never create topology by
merging opposing interpretations.

The current vertex-sampling border builder is a known unresolved risk. Do not
regenerate large assets or raise maxZoom as a substitute for better data. Pin
source releases and hashes before replacing this pipeline; retain fallback data.

DEM needs source rights, acquisition/vertical datum, NoData, known-height checks,
encoding and continuity tests. Terrarium and Mapbox RGB are different encodings.
Default exaggeration is 1; intentional exaggeration is labeled. Optical bump is
not terrain. Water geometry has its own source and time.

## Distribution and imports

Use lazy regional/time packages and the existing static XYZ path until benchmarks
justify alternatives. PMTiles needs actual HTTP Range/Pages and device testing.
Do not bulk-download tile services or assume an indefinite free CDN. Preserve
attribution in UI, portable files and rendered output where required.

Validate discriminator/version, enums, identifiers, finite coordinates/numbers,
resource limits and date semantics before changing state. Text stays text.
Missing observations stay null, with years/units/provenance; mixed years are
explicit. Retain [OBSERVATIONS](OBSERVATIONS.md) as the implemented metric contract
and [TIME_ATLAS](TIME_ATLAS.md) as the existing atlas-format contract.
