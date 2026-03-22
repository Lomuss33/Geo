import {
  isDirectRun,
  readNormalizedCountries,
  writePublicJson,
} from './_shared.mjs';

const PIN_SETS = {
  gdp: [
    ['new-york', 'New York', 'USA', [-74.006, 40.7128]],
    ['london', 'London', 'GBR', [-0.1276, 51.5072]],
    ['tokyo', 'Tokyo', 'JPN', [139.6917, 35.6895]],
    ['shanghai', 'Shanghai', 'CHN', [121.4737, 31.2304]],
    ['singapore', 'Singapore', 'SGP', [103.8198, 1.3521]],
    ['dubai', 'Dubai', 'ARE', [55.2708, 25.2048]],
    ['frankfurt', 'Frankfurt', 'DEU', [8.6821, 50.1109]],
    ['mumbai', 'Mumbai', 'IND', [72.8777, 19.076]],
    ['sao-paulo', 'Sao Paulo', 'BRA', [-46.6333, -23.5505]],
    ['sydney', 'Sydney', 'AUS', [151.2093, -33.8688]],
  ],
  population: [
    ['tokyo', 'Tokyo', 'JPN', [139.6917, 35.6895]],
    ['delhi', 'Delhi', 'IND', [77.1025, 28.7041]],
    ['shanghai', 'Shanghai', 'CHN', [121.4737, 31.2304]],
    ['dhaka', 'Dhaka', 'BGD', [90.4125, 23.8103]],
    ['sao-paulo', 'Sao Paulo', 'BRA', [-46.6333, -23.5505]],
    ['mexico-city', 'Mexico City', 'MEX', [-99.1332, 19.4326]],
    ['cairo', 'Cairo', 'EGY', [31.2357, 30.0444]],
    ['lagos', 'Lagos', 'NGA', [3.3792, 6.5244]],
    ['jakarta', 'Jakarta', 'IDN', [106.8456, -6.2088]],
    ['new-york', 'New York', 'USA', [-74.006, 40.7128]],
  ],
};

export const buildPins = async () => {
  const countries = await readNormalizedCountries();
  const countryIsoSet = new Set(countries.map((country) => country.iso3));

  for (const [profileId, pinSet] of Object.entries(PIN_SETS)) {
    const records = pinSet.map(([id, name, countryIso3, coordinates]) => {
      if (!countryIsoSet.has(countryIso3)) {
        throw new Error(
          `Pins dataset ${profileId} references unavailable country ${countryIso3}.`,
        );
      }

      return {
        id,
        name,
        countryIso3,
        coordinates,
      };
    });

    await writePublicJson(`pins/${profileId}.json`, records);
  }

  console.log(`Wrote ${Object.keys(PIN_SETS).length} Borders pin datasets.`);
};

if (isDirectRun(import.meta.url)) {
  await buildPins();
}
