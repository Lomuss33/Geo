import {
  createSubdivisionFeature,
  featureCollection,
  fetchGeoBoundariesGeometry,
  fetchGeoBoundariesMetadata,
  isDirectRun,
  mapWithConcurrency,
  sortMetadataEntries,
  writeNormalizedJson,
} from './_shared.mjs';

export const buildAdm1 = async () => {
  const preferredByIso = new Map();

  for (const record of sortMetadataEntries(await fetchGeoBoundariesMetadata('ADM1'))) {
    const current = preferredByIso.get(record.boundaryISO);
    if (
      !current ||
      Number(record.admUnitCount ?? 0) > Number(current.admUnitCount ?? 0)
    ) {
      preferredByIso.set(record.boundaryISO, record);
    }
  }

  const metadata = sortMetadataEntries([...preferredByIso.values()]);

  const featureGroups = await mapWithConcurrency(metadata, 6, async (record) => {
    const collection = await fetchGeoBoundariesGeometry(record, 'ADM1');

    return (collection.features ?? [])
      .map((feature, index) =>
        createSubdivisionFeature(feature, record, 'ADM1', index),
      )
      .filter(Boolean);
  });

  const normalized = featureCollection(featureGroups.flat());
  await writeNormalizedJson('adm1.geojson', normalized);

  console.log(
    `Wrote normalized ADM1 boundaries for ${normalized.features.length} features.`,
  );
};

if (isDirectRun(import.meta.url)) {
  await buildAdm1();
}
