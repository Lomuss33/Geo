# Proposed studio contracts

Prepared in GEO-090. These are implementation requirements, not available APIs.
Introduce runtime validators and fixtures in the dependent implementation tasks.

## Domain boundaries

- Scope: versioned country membership, labels, and default framing.
- Dataset: observations, provenance, availability, and comparison policy.
- Project: portable scene, selection, annotations, and timeline.
- Export: projections of a project into files or a supported view URL.

Keep these testable independently. Reuse camera and animation evaluation functions
rather than building separate playback and export engines.

## Scope and identity

Scope IDs: `balkans`, `europe`, `world`. Each has a definition version and declared
country-ID list. Prefer ISO alpha-3 canonical IDs where available, with explicit
exceptions and per-source aliases. Membership, geometry availability, and metric
availability are separate fields.

## Observation record

Persist and export these fields:

- Canonical country ID and label.
- Indicator ID and label, numeric value or `null`, and unit.
- Observation year or `null` when unavailable.
- Source name and URL, retrieval timestamp, and dataset version.
- Availability and a reason when unavailable.

GDP uses current US dollars; population uses people. Null is never zero. Preserve
raw years under latest-available policies. Comparable rankings use a common year;
otherwise show mixed-year status and disable same-year ranking claims. Derived
values require compatible years and documented formulas. Geometry provenance is
separate from metric provenance.

## Project JSON v1

Top-level discriminator: `format: "geo-studio-project"`; integer `schemaVersion: 1`.
Carry title, creation/update timestamps, versioned scope reference, rendering mode
and camera, country/indicator selection, dataset references, annotations, timeline,
and output settings.

Nest the existing version-2 animation representation initially. Project and
animation schema versions are independent. Annotations have IDs, text, geographic
or screen anchors, and timing. Output settings carry dimensions, aspect ratio,
duration, and target frame rate.

Embed the selected observation snapshot and provenance, not all world geometry or
arbitrary remote assets. Bundled dataset references include versions. Report
missing geometry as partial-project availability. Re-import preserves observation
meaning even after bundled metrics change.

Reject future versions, invalid enums, non-finite numbers, invalid coordinates,
duplicate IDs, and malformed timing before changing live state. GEO-120 defines
and tests file-size, annotation-count, and timeline-count limits. Import text as
text. Failed import leaves the active project intact.

## View sharing

Preserve existing Geo, Headway, and Borders URLs. Introduce versioned studio view
state for scope, selection, indicator/year policy, and camera. Validate on load
and preserve legacy decoders. Do not put full datasets or media in URLs. GEO-120
defines a URL-size budget and project-file fallback. No short-link backend or
full-story hosting is assumed.

## Outputs

- **JSON:** UTF-8 editable project with schema version and provenance.
- **CSV:** one observation per row, stable columns, quoting, explicit null/year
  handling, and sources. Neutralize spreadsheet formula injection in text cells
  without changing numeric values; document the convention.
- **GeoJSON:** WGS84 longitude/latitude geometry, stable feature IDs, observations,
  and provenance. Report missing geometry; export only the selected features.
- **PNG:** exact requested dimensions/framing, annotations, legend, and attribution
  composed into the image; editing controls hidden.
- **Video:** saved scene and timeline evaluation match preview, including overlays.
  Detect MIME/codec support at runtime. Start with verified WebM; enable MP4 only
  where verified. Never rename a WebM file to `.mp4`.

Wait for map tiles, fonts, and textures before capture. Cross-origin canvas
readability and map/globe overlay composition are explicit feasibility gates.
Cancel releases capture resources and retains the draft. Browser recording is
initially real-time and may drop frames; do not promise deterministic offline rendering.
