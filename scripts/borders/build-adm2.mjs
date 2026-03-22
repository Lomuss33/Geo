import {
  applyHierarchyProperties,
  createSubdivisionFeature,
  featureCollection,
  fetchGeoBoundariesGeometry,
  fetchGeoBoundariesMetadata,
  isDirectRun,
  mapWithConcurrency,
  sortMetadataEntries,
  writeNormalizedJson,
  writePublicJson,
} from './_shared.mjs';

export const buildAdm2 = async () => {
  const preferredByIso = new Map();

  for (const record of sortMetadataEntries(await fetchGeoBoundariesMetadata('ADM2'))) {
    const current = preferredByIso.get(record.boundaryISO);
    if (
      !current ||
      Number(record.admUnitCount ?? 0) > Number(current.admUnitCount ?? 0)
    ) {
      preferredByIso.set(record.boundaryISO, record);
    }
  }

  const metadata = sortMetadataEntries([...preferredByIso.values()]);

  const countries = await mapWithConcurrency(metadata, 4, async (record) => {
    const collection = await fetchGeoBoundariesGeometry(record, 'ADM2');
    const features = (collection.features ?? [])
      .map((feature, index) =>
        createSubdivisionFeature(feature, record, 'ADM2', index),
      )
      .filter(Boolean);

    return {
      iso3: record.boundaryISO,
      features: applyHierarchyProperties(features),
    };
  });

  const manifest = {
    generatedAt: new Date().toISOString(),
    countries: countries
      .filter((country) => country.features.length > 0)
      .map((country) => ({
        iso3: country.iso3,
        featureCount: country.features.length,
      }))
      .sort((left, right) => left.iso3.localeCompare(right.iso3)),
  };

  const normalized = featureCollection(
    countries.flatMap((country) => country.features),
  );

  await writeNormalizedJson('adm2.geojson', normalized);
  await writePublicJson('adm2-manifest.json', manifest);

  console.log(
    `Wrote normalized ADM2 boundaries for ${normalized.features.length} features across ${manifest.countries.length} countries.`,
  );
};

if (isDirectRun(import.meta.url)) {
  await buildAdm2();
}
