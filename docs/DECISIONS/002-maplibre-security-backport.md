# ADR 002 — Backport the attribution fix without changing renderer major

Date: 2026-11-18. Status: implementer decision; independent review pending.
Task: GEO-204. Owner: active security maintainer.

## Evidence and options

The installed MapLibre 5.21.0 has the vulnerable live-attribute loop described by
GHSA-jrc7-96c5-q579. Eight unit cases fail before the fix, and Chromium canaries
execute through all three tested attribution entrances. The upstream one-line
snapshot fix is available in a later major release.

Options: upgrade the major renderer and revalidate all APIs/rendering, sanitize
only application strings (insufficient for remote TileJSON), or narrowly backport
the known upstream fix with integrity guards. Disabling attribution would lose
required credits and is not acceptable.

## Decision and consequences

Pin 5.21.0 and apply the reviewed snapshot loop to source plus all four non-worker
bundles on installation. Refuse unknown bytes/versions and guard normal dev/build/
test entrypoints. Clear generated optimized dependencies after repair. Preserve
all renderer APIs, required credits and package license notices.

Disable patched dependency bundle source-map comments rather than using inaccurate
upstream mappings. This is a documented debugging tradeoff. Audit still reports
the vulnerable upstream version; evidence must accompany the local mitigation.
No blanket release approval, independent review, new dependency major or auto-merge
is implied. Prefer a supported upstream fixed version after a separate fully
verified compatibility task; remove the backport as a whole at that time.
