import {
  buildWorldBankRecordMap,
  fetchWorldBankIndicatorDataset,
  isDirectRun,
  readNormalizedCountries,
  writePublicJson,
} from './_shared.mjs';

const INDICATORS = [
  {
    id: 'gdp',
    label: 'GDP (current US$)',
    worldBankCode: 'NY.GDP.MKTP.CD',
    unit: 'current US$',
  },
  {
    id: 'population',
    label: 'Population, total',
    worldBankCode: 'SP.POP.TOTL',
    unit: 'people',
  },
];

export const buildMetrics = async () => {
  const countries = await readNormalizedCountries();
  const countryIsoSet = new Set(countries.map((country) => country.iso3));

  for (const indicator of INDICATORS) {
    const snapshot = await fetchWorldBankIndicatorDataset(
      indicator.worldBankCode,
    );
    const records = snapshot.records;
    const latestByIso = buildWorldBankRecordMap(records, countryIsoSet);

    await writePublicJson(`profiles/${indicator.id}.json`, {
      schemaVersion: 1,
      indicatorId: indicator.id,
      indicator: indicator.label,
      unit: indicator.unit,
      datasetVersion: `${indicator.worldBankCode}@${snapshot.retrievedAt}`,
      source: {
        name: 'World Bank Open Data',
        url: snapshot.sourceUrl,
        retrievedAt: snapshot.retrievedAt,
        timestampBasis: snapshot.timestampBasis,
      },
      records: countries.map((country) => ({
        iso3: country.iso3,
        name: country.name,
        value: latestByIso.get(country.iso3)?.value ?? null,
        year: latestByIso.get(country.iso3)?.date ?? null,
        missingReason: latestByIso.has(country.iso3) ? null : 'no-observation',
      })),
    });
  }

  console.log(`Wrote ${INDICATORS.length} Borders metric datasets.`);
};

if (isDirectRun(import.meta.url)) {
  await buildMetrics();
}
