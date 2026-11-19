# Research leads retained from the owner prompt

Recorded 2026-11-16. Maintainer: source task owner. These are **unverified leads**
from the supplied research, not production permissions or newly fetched datasets.
Actual evidence belongs in [the catalog](../../data/catalog/README.md). GEO-190
inspected only the pinned Historical Basemaps notice/README and OpenFreeMap terms.

| Primary source                                                                      | Candidate use                                 | Reported terms / caveat to verify                                                         |
| ----------------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [Cliopatria/Seshat](https://github.com/Seshat-Global-History-Databank/cliopatria)   | dated polity extents                          | CC BY 4.0 reported; v0.2.1 research input, approximate reconstruction                     |
| [HistoGIS](https://github.com/acdh-oeaw/histogis-data)                              | 19th/early-20th century administration        | CC BY 4.0 reported; retain original records, date assertions and source maps              |
| [AWMC](https://github.com/AWMC/geodata)                                             | Roman extent 117/200, provinces/routes/coasts | ODbL reported; provincial geometry can be lines rather than filled polygons               |
| [OpenHistoricalMap](https://www.openhistoricalmap.org/)                             | local dated features                          | CC0 reported with exceptions; check selected extract                                      |
| [Wikidata](https://www.wikidata.org/)                                               | IDs, names, events, relations                 | CC0 reported; QID is not boundary evidence or sufficient identity                         |
| [Ottoman Gazetteer](https://github.com/whanley/Ottoman-Gazetteer)                   | 1530 names/admin relations                    | CC BY-NC reported, component-rights review; no complete nahija polygons                   |
| [Pleiades](https://pleiades.stoa.org/downloads)                                     | ancient places and names                      | CC BY 3.0 reported; representative points are not territorial extents                     |
| [Itiner-e](https://itiner-e.org/about)                                              | Roman roads/place links                       | CC BY 4.0 reported; segment validity is not constant through all epochs                   |
| [CShapes](https://icr.ethz.ch/data/cshapes/)                                        | independent modern-era comparison             | CC BY-NC-SA reported; zero-price app does not establish noncommercial use                 |
| [World Historical Gazetteer](https://whgazetteer.org/)                              | toponyms/relationships                        | mixed source rights; possible API token; not one border atlas                             |
| [Glottolog](https://glottolog.org/download)                                         | linguistic IDs/classification                 | CC BY 4.0 reported; not language-territory polygons                                       |
| [D-PLACE](https://d-place.org/)                                                     | cultural observations                         | CC BY-NC reported; no ethnic polygons inferred from points                                |
| [DARE](https://github.com/johaahlf/dare)                                            | alternative Roman provinces                   | Apache notice reported; verify cartographic inputs; created_at is not historical validity |
| [Historical Basemaps](https://github.com/aourednik/historical-basemaps)             | research comparison                           | pinned notice observed; component rights unresolved, publication blocked                  |
| [Natural Earth](https://www.naturalearthdata.com/downloads/)                        | low-zoom physical/political reference         | public domain reported; pin edition and scale                                             |
| [geoBoundaries](https://www.geoboundaries.org/api.html)                             | modern ADM                                    | inspect gbOpen edition/rights; not equivalent to authoritative products                   |
| [OSM](https://www.openstreetmap.org/) / [OpenFreeMap](https://openfreemap.org/tos/) | current cartographic reference                | ODbL/provider terms and attribution; no unlimited offline prefetch                        |
| [USGS elevation](https://www.usgs.gov/faqs/where-can-i-get-global-elevation-data)   | SRTM/GMTED                                    | edition, acquisition, vertical datum and access review; possible free build-time account  |
| [Copernicus DEM](https://dataspace.copernicus.eu/)                                  | GLO-30/GLO-90 DSM                             | product/service-specific rights/access; do not assume anonymous GLO-30 API                |
| [Mapterhorn](https://mapterhorn.com/data-access/)                                   | candidate Terrarium elevation                 | verify constituent rights, attribution, TOS and ongoing free delivery                     |

## Specific QA leads

- HistoGIS research named
  `bosna-i-hercegovina__1878-07-14_1909-02-26.geojson`, record ID `10101`, Q609233,
  `Occupied Territory`, map "Europe Stateborders 1908", `date_accuracy: D`.
  `bosnien-und-herzegowina__1909-02-27_1918-10-31.geojson` was reported with Q225,
  `Constituent Entity` and "Austro-Hungarian Crownlands 1910". Area attributes
  (~60,759 vs ~51,361) have unresolved units/meaning. Re-fetch the actual edition;
  February 1909 record validity is not automatically an annexation date.
- AWMC `roman_empire_ce_117_extent` / `roman_empire_ce_200_extent` are candidate
  extents; `roman_empire_ce_200_provinces` may be LineString data. Never relabel
  lines as polygons. DARE is a separately reviewed alternative interpretation.
- Proposed epochs 117/200, 1350, 1530, 1900 and 1938 are research targets, not five
  complete atlases. Medieval Balkan local units and historical hydrology have
  major evidence gaps. Keep relevant empires' full source extents.
- Historical water/coasts and modern reference terrain have different time bases.
  Terrarium decoding is `R * 256 + G + B / 256 - 32768`; verify real encoding and
  datum before use. Optical bump/NASA composites are not historical elevation.

Execution: GEO-195/196 modern sources/topology, GEO-199/200 historical claims and
pilots, GEO-201 physical terrain. Save actual rights evidence, source hashes,
coverage and review before introducing a runtime package.
