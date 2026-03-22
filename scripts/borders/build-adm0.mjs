import {
  createAdm0Feature,
  createNaturalEarthAdm0Feature,
  featureCollection,
  fetchGeoBoundariesGeometry,
  fetchGeoBoundariesMetadata,
  fetchNaturalEarthAdm0Collection,
  isDirectRun,
  mapWithConcurrency,
  sortMetadataEntries,
  writeNormalizedJson,
} from './_shared.mjs';

export const buildAdm0 = async () => {
  const adm0Metadata = sortMetadataEntries(await fetchGeoBoundariesMetadata('ADM0'));
  const adm0IsoSet = new Set(adm0Metadata.map((record) => record.boundaryISO));
  const missingIso = [...new Set(
    [
      ...(await fetchGeoBoundariesMetadata('ADM1')),
      ...(await fetchGeoBoundariesMetadata('ADM2')),
    ]
      .map((record) => record.boundaryISO)
      .filter((iso3) => !adm0IsoSet.has(iso3)),
  )].sort();
  const metadata = [...adm0Metadata];

  const featureGroups = await mapWithConcurrency(metadata, 8, async (record) => {
    const collection = await fetchGeoBoundariesGeometry(record, 'ADM0');

    return (collection.features ?? [])
      .map((feature, index) => createAdm0Feature(feature, record, index))
      .filter(Boolean);
  });
  const naturalEarth = missingIso.length
    ? await fetchNaturalEarthAdm0Collection()
    : null;
  const fallbackFeatures = missingIso
    .map((iso3) => {
      const feature = naturalEarth?.features?.find(
        (entry) =>
          entry?.properties?.ADM0_A3 === iso3 ||
          entry?.properties?.SOV_A3 === iso3 ||
          entry?.properties?.ISO_A3 === iso3,
      );

      if (!feature) {
        throw new Error(`Natural Earth ADM0 fallback missing for ${iso3}.`);
      }

      return createNaturalEarthAdm0Feature(feature, iso3);
    })
    .filter(Boolean);

  const normalized = featureCollection([...featureGroups.flat(), ...fallbackFeatures]);
  await writeNormalizedJson('adm0.geojson', normalized);

  console.log(
    `Wrote normalized ADM0 boundaries for ${normalized.features.length} features (${fallbackFeatures.length} Natural Earth fallbacks).`,
  );
};

if (isDirectRun(import.meta.url)) {
  await buildAdm0();
}
