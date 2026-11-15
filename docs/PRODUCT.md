# Geo product direction

Status: agreed direction, prepared for incremental implementation in GEO-090.
Features below are targets unless explicitly marked as existing.

## Purpose

Explore, explain, and animate geography, from the Balkans to the world, entirely
in the browser. Serve geography learners, educators, and short-clip creators through
one workflow:

**Choose a scope → explore a place and indicator → compare and explain → create a
sequence → export or share.**

## Three connected workflows

- **Explore:** find countries, inspect sourced observations, and compare places.
- **Learn:** explanatory country cards, size comparisons, and guided lessons.
- **Create:** annotated sequences with camera keyframes, preview, and exports.

These share scene and selection state. Geo, Headway, and Borders remain rendering
modes underneath them, not replacements for these workflows.

## Geographic scopes

- **Balkans:** first complete experience with curated country comparisons and
  explicit data coverage. Administrative detail appears only where available.
- **Europe:** extend the same workflow to a documented European collection.
- **World:** all supported country records, with explicit missing-data behavior.

Proposed Balkans launch collection: Albania, Bosnia and Herzegovina, Bulgaria,
Croatia, Greece, Kosovo, Montenegro, North Macedonia, Romania, Serbia, Slovenia,
and Türkiye. This is a product collection, not a claim of a single geographic or
political definition. Türkiye is a whole-country record; do not label its national
statistics as European-only or Balkan-only. Verify Kosovo identifier aliases for
each source rather than assuming a universal code. Unsupported records remain
visible as unavailable.

GEO-100 documents exact membership, source policy, and coverage behavior in
[GEOGRAPHIC_SCOPES.md](GEOGRAPHIC_SCOPES.md). Membership comes from versioned
configuration, never viewport bounds.

## First complete journey

1. Open Balkans and find Croatia, Serbia, and Bosnia and Herzegovina.
2. Select population and inspect comparable observations with visible source years.
3. Add an explanation and create a three-location, 15-second sequence.
4. Preview it, save the editable project, and export selected data.
5. Export a captioned clip and share an interactive view link.

The gate is completing this without an account, API key, or backend. A view link
restores supported scene state; a project file carries the full editable story.
Do not promise that a short URL stores a complete project.

## Export priorities

1. Shareable views and versioned editable project JSON.
2. CSV observations and GeoJSON geography with provenance.
3. PNG stills with captions, legends, and attribution.
4. Browser-supported WebM recording, then MP4 where verified.

Clip presets target 16:9, 1:1, and 9:16. Explain unavailable formats and provide an
actionable fallback.

## Existing foundation and gaps

Existing: three rendering modes, URL-backed viewpoints, local animation drafts,
saved start poses, command timelines, country outline comparison, administrative
boundaries, GDP/population layers, unit/component tests, and Playwright coverage.

Timeline hex export is not video export. Country search and observation provenance
are implemented; the metric build preserves source years. Headway needs remote
tiles. Studio project files, guided lessons, and media exports remain planned.

## First-release boundaries

Defer accounts, cloud storage, collaboration, live feeds, full historical series,
terrain, and server video rendering. GDP per capita and density follow trustworthy
population/GDP observations with explicit source and calculation rules. Success is
the complete journey, not the number of controls.
