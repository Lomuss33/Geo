# Geo owner vision

Owner decisions adopted on 2026-11-16 from `GEO_MAIN_AGENT_MASTER_PROMPT.md` v1.0.
Maintainer: the active task owner. This is the enduring direction; implementation
status lives in [STATUS](STATUS.md) and [FEATURE_REGISTRY](FEATURE_REGISTRY.md).

## Product

Geo is a free public geography/history atlas and creative browser studio. Open
directly into realistic 3D Earth, without a portal, required account or mandatory
onboarding. Explore, Learn and Create share geographical context. Preserve the
existing Geo, Headway, Borders, comparison, camera and animation capabilities.
Modernization is incremental; a rewrite is not the starting strategy.

Provide a global foundation, with extra depth across Slovenia, Croatia, Bosnia and
Herzegovina, Serbia, Montenegro, Kosovo, North Macedonia, Albania, Bulgaria,
Romania, Greece and European Türkiye. Existing whole-country statistical records
for Türkiye remain whole-country; do not silently relabel or clip them. Preserve
the full documented extent of historical polities that intersect the Balkans.

Territory, boundaries, administration, rivers, coasts, lakes and landscape change
come first. Rulers and people provide geographical context. Cultural, religious
and linguistic distributions are distinct from political control and jurisdiction.
No claim of complete global coverage for every historical year is permitted.

## Non-negotiable constraints

- Target operating cost is **EUR 0**: no paid APIs, credit card, automatic overage,
  required backend, end-user registration or secret for ordinary use. GitHub
  Pages remains the primary distribution. Free external services need attribution,
  documented terms and honest failure behavior; they are not guaranteed forever.
- Never invent historical boundaries, date precision or continuity between
  snapshots. Preserve source assertions, uncertainty, interpretations, coverage
  gaps, provenance and licenses. Unresolved redistribution rights block publication.
- Preserve user projects, animation v1/v2 imports and existing share URLs. Portable
  formats are versioned and imports validate before mutating live state.
- UI is black/white/gray, light/dark, square, without pills, glass or decorative
  gradients. Maps and data legends may use meaningful color. Fixed panel zones
  keep Earth primary; avoid free-floating tools and arbitrary panel docking.
- Full mobile capability is a goal, especially real Android Firefox. Desktop
  functionality must survive. Chromium emulation is not evidence of Android use.
- No silent analytics, private-location upload or opaque persistence. Local saves
  are transparent; portable backups and recovery are necessary.

## Independent dimensions

| Dimension                | Examples                                                |
| ------------------------ | ------------------------------------------------------- |
| Geographical focus/scope | world, Europe, Balkans, place                           |
| Workspace                | Explore, Learn, Create                                  |
| Renderer                 | Geo/R3F, Headway/MapLibre, Borders/MapLibre             |
| Cartographic style       | Earth, Atlas, Relief                                    |
| Data layers              | boundaries, history, hydrology, observations, labels    |
| Historical time          | documented snapshot, claimed interval, unknown coverage |

Historical time, source observation time and animation playback time are separate.
Switching renderer/workspace should preserve focus and meaningful scale; limitations
must be explained. GeographicViewIntent and typed source/layer/style capabilities
are incremental architectural targets, not existing registries.

## Delivery direction

Explore provides search, selection, sources, layers and geographical comparison.
Learn explains territory, timeline, relationships, evidence and alternatives where
real data exist. Create turns that same context into editable scenes and camera
animations: simple Story Editor first, Advanced Timeline later. Linked data labels
and manually overridden labels remain distinct. Preview and export share a model.

True Relief requires verified elevation, vertical datum, NoData checks and a
height legend. The optical bump on the current globe is not DEM. A modern terrain
or water layer under a historical boundary must be labeled as a modern reference.

Stage exports through portable JSON/data, then verified PNG, then supported browser
video. Do not advertise a codec or complete historical sequence that was not
verified. BCS Latin, English and German UI localization is a target, separate from
the language, validity and provenance of historical names.

## Working agreement

Agents audit, choose a bounded useful task, implement, test and update project
memory in each active session. No continuous scheduler or automatic merge is
implied. Keep self-check and independent review distinct; retain the existing
[task workflow](tasks/README.md). Follow [authorization](AGENT_AUTONOMY_POLICY.md).
