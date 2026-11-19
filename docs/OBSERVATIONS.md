# Observation datasets v1

GDP and population profiles now retain observation year, unit, source URL, snapshot
timestamp, dataset version, and a missing-value reason. `observations.ts` validates
assets before map consumers use them and provides provenance-preserving record
lookup for future project/export work.

## Snapshot provenance

GEO-110 rebuilt only the two metric JSON assets from existing cached World Bank
responses. Numeric values and country membership were checked against the previous
commit and are unchanged. This was a metadata migration, not a fresh data download.
Boundary tiles and geometry were not regenerated.

The timestamp is explicitly marked `cache-file-modification`: it is the timestamp
of the locally saved response, not a newly verified download date. Copying or
modifying cache files can change it; it must not be presented as a verified original
retrieval time. The indicator code plus snapshot timestamp identifies the dataset
snapshot; `schemaVersion` identifies its structure.

## Availability and comparisons

- A zero remains a numeric zero. Missing observations use null value/year and
  `no-observation`. Missing years are never inferred from neighboring countries.
- Legacy profiles migrate with `unknown-year` and unknown retrieval date. Their
  values remain visible, while same-year comparisons remain unavailable.
- A comparison is eligible only when every selected observation is present and
  has the same known year. Mixed-year choropleths remain exploratory maps, with
  an explicit warning rather than a same-year ranking claim.
- The dataset contains latest available observations, not complete historical
  series. A historical year picker and rankings are outside this change.

The Borders legend shows source, units, snapshot basis, observation year/range,
and the focused country's value/year or a missing-data message. Geometry coverage
and statistical coverage remain separate.

## Regeneration and verification

`node scripts/borders/build-metrics.mjs` preserves selected World Bank record dates
and rejects incomplete multi-page responses. Existing cache behavior is retained;
it does not force a network refresh. `npm run test:data` exercises selection rules
offline and is included in `npm run check`. Runtime tests validate both shipped
assets, malformed inputs, duplicate IDs, legacy migration, zero/null values, and
comparison eligibility. No new account, key, or backend is required.
