# Assets

## Runtime assets

| File                                            |            Size | Source                                                                                                                         |
| ----------------------------------------------- | --------------: | ------------------------------------------------------------------------------------------------------------------------------ |
| `public/assets/earth/earth-day-5400.jpg`        | 1,735,263 bytes | `https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/may/world.200405.3x5400x2700.jpg`            |
| `public/assets/earth/earth-day-1024.jpg`        |    80,348 bytes | Local downscale derived from `earth-day-5400.jpg`                                                                              |
| `public/assets/earth/earth-night-3600-gray.jpg` |   365,655 bytes | `https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/144000/144897/BlackMarble_2016_01deg_gray.jpg` |

## Runtime-generated assets

- Cloud layer: generated in `src/lib/proceduralTexture.ts`
- Atmosphere glow: shader in `src/scene/Atmosphere.tsx`

## Rules

- Keep optimized runtime imagery only.
- Do not commit source GeoTIFF tiles or large raw processing files.
- Update this document whenever a shipped asset changes.
- Maintain NASA attribution in `THIRD_PARTY.md` and the project README.

## Licensing note

NASA imagery is reusable under NASA media guidance but is not relicensed as MIT project code.
