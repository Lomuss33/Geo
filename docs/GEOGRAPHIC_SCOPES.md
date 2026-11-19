# Geographic scopes v1

GEO-100 introduces catalog filters independent of Geo / Headway / Borders.
World is the default so existing initial views remain unchanged. Scope and search
selection are session state; existing share URLs still reproduce camera/mode/focus.
Portable scope/selection URLs are a GEO-120 deliverable.

## Membership policy

Balkans uses the 12-country product collection in [PRODUCT.md](PRODUCT.md).
Europe uses a frozen explicit copy of the bundled boundary index Europe collection,
plus Cyprus and Türkiye. This is a product collection including territories, not a
recognition policy or an exhaustive definition of geographic Europe. Russia and
Türkiye use whole-country records. World includes every bundled country-index
record plus any explicitly configured European members missing from that index.
Membership is never inferred from camera bounds or which tiles happen to load.

Source artifacts: `public/assets/borders/country-index.json` (geoBoundaries / Natural
Earth build output) and installed `world-atlas/countries-110m.json` (Natural Earth).
Definition version 1 is recorded in `src/lib/geography.ts`; changes to membership
must increment the affected scope version and update the tests and this document.

Exact Europe membership (ISO alpha-3 / configured local ID):

- `ALB` — Albania
- `AND` — Andorra
- `AUT` — Austria
- `BEL` — Belgium
- `BGR` — Bulgaria
- `BIH` — Bosnia and Herzegovina
- `BLR` — Belarus
- `CHE` — Switzerland
- `CYP` — Cyprus
- `CZE` — Czechia
- `DEU` — Germany
- `DNK` — Denmark
- `ESP` — Spain
- `EST` — Estonia
- `FIN` — Finland
- `FRA` — France
- `FRO` — Faroe Islands
- `GBR` — United Kingdom
- `GGY` — Guernsey
- `GIB` — Gibraltar
- `GRC` — Greece
- `HRV` — Croatia
- `HUN` — Hungary
- `IMN` — Isle of Man
- `IRL` — Ireland
- `ISL` — Iceland
- `ITA` — Italy
- `LIE` — Liechtenstein
- `LTU` — Lithuania
- `LUX` — Luxembourg
- `LVA` — Latvia
- `MCO` — Monaco
- `MDA` — Moldova
- `MKD` — North Macedonia
- `MLT` — Malta
- `MNE` — Montenegro
- `NLD` — Netherlands
- `NOR` — Norway
- `POL` — Poland
- `PRT` — Portugal
- `ROU` — Romania
- `RUS` — Russia
- `SMR` — San Marino
- `SRB` — Serbia
- `SVK` — Slovakia
- `SVN` — Slovenia
- `SWE` — Sweden
- `TUR` — Türkiye
- `UKR` — Ukraine
- `VAT` — Vatican City
- `XKX` — Kosovo

## Identity and coverage

The catalog joins numeric world-atlas IDs to European country IDs explicitly,
not by approximate names. Source labels remain aliases: Italy is displayed as
Italy rather than the bundled label Nord-Ovest; Bangladesh also has a corrected
search display name. This does not rewrite the upstream boundary assets or labels
in other existing panels. Other world entries use exact normalized names/aliases;
small or unmatched features report missing low-resolution outlines explicitly.

Kosovo uses the boundary index ID XKX. XK and KOS are search aliases, not assertions
about World Bank IDs. The installed world-atlas has no usable ID for its outline;
selecting it shows unavailable outline coverage without moving the camera. Future
metric source aliases must be verified in GEO-110.

Country selection shows outline and regional/district coverage separately from
metric availability. Failed catalog loading retains the configured European names
and marks administrative coverage unverified. No unavailable value becomes zero.

## Interaction

Scope changes keep the active rendering mode, clear the search query, preserve
in-scope explorer selections, and explain when an out-of-scope selection is cleared.
The map remains freely navigable outside the scope. Native selects and result
buttons provide keyboard access. Frozen/playback states disable navigation.

Country framing uses the existing surface-anchored globe camera and map coordinates;
it is an approximate overview, not an exact viewport fit or terrain view. Existing
country outline comparison remains a separate control. Coverage selections without
an outline do not change the camera.
