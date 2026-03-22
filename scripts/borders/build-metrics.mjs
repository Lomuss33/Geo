import {
  buildWorldBankRecordMap,
  fetchWorldBankIndicatorSeries,
  isDirectRun,
  readNormalizedCountries,
  writePublicJson,
} from './_shared.mjs';

const INDICATORS = [
  {
    id: 'gdp',
    label: 'GDP (current US$)',
    worldBankCode: 'NY.GDP.MKTP.CD',
  },
  {
    id: 'population',
    label: 'Population, total',
    worldBankCode: 'SP.POP.TOTL',
  },
];

export const buildMetrics = async () => {
  const countries = await readNormalizedCountries();
  const countryIsoSet = new Set(countries.map((country) => country.iso3));

  for (const indicator of INDICATORS) {
    const records = await fetchWorldBankIndicatorSeries(indicator.worldBankCode);
    const latestByIso = buildWorldBankRecordMap(records, countryIsoSet);

    await writePublicJson(`profiles/${indicator.id}.json`, {
      indicator: indicator.label,
      records: countries.map((country) => ({
        iso3: country.iso3,
        name: country.name,
        value: latestByIso.get(country.iso3)?.value ?? null,
      })),
    });
  }

  console.log(`Wrote ${INDICATORS.length} Borders metric datasets.`);
};

if (isDirectRun(import.meta.url)) {
  await buildMetrics();
}
