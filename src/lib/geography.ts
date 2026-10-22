import { getAllCountries, type CountryPolygon } from './countryGeometry';
import type { BordersCountryIndexRecord } from './bordersData';
import { DEFAULT_FOV } from './constants';
import { surfaceAnchoredGeoView } from './camera';
import type { GlobeViewState, HeadwayViewState } from '../state/viewerStore';

export type GeographicScopeId = 'balkans' | 'europe' | 'world';
export type GeographyDestination = {
  geo: GlobeViewState;
  map: HeadwayViewState;
  countryIso: string | null;
};

// Versioned product collections; membership is independent of map framing.
export const GEOGRAPHIC_SCOPES = {
  balkans: {
    label: 'Balkans',
    version: 1,
    center: [22, 43],
    zoom: 4,
    distance: 1.85,
  },
  europe: {
    label: 'Europe',
    version: 1,
    center: [18, 52],
    zoom: 2.5,
    distance: 2.5,
  },
  world: {
    label: 'World',
    version: 1,
    center: [15, 20],
    zoom: 0.7,
    distance: 3.5,
  },
} as const;

export const BALKANS_COUNTRIES = [
  'ALB',
  'BIH',
  'BGR',
  'HRV',
  'GRC',
  'XKX',
  'MNE',
  'MKD',
  'ROU',
  'SRB',
  'SVN',
  'TUR',
] as const;

// Includes the bundled Europe collection plus Cyprus and Türkiye as whole records.
// Numeric IDs explicitly map ISO alpha-3 to the bundled world-atlas identifiers.
const EUROPE_IDENTITIES = `ALB|Albania|008
AND|Andorra|020
AUT|Austria|040
BEL|Belgium|056
BGR|Bulgaria|100
BIH|Bosnia and Herzegovina|070
BLR|Belarus|112
CHE|Switzerland|756
CYP|Cyprus|196
CZE|Czechia|203
DEU|Germany|276
DNK|Denmark|208
ESP|Spain|724
EST|Estonia|233
FIN|Finland|246
FRA|France|250
FRO|Faroe Islands|234
GBR|United Kingdom|826
GGY|Guernsey|831
GIB|Gibraltar|292
GRC|Greece|300
HRV|Croatia|191
HUN|Hungary|348
IMN|Isle of Man|833
IRL|Ireland|372
ISL|Iceland|352
ITA|Italy|380
LIE|Liechtenstein|438
LTU|Lithuania|440
LUX|Luxembourg|442
LVA|Latvia|428
MCO|Monaco|492
MDA|Moldova|498
MKD|North Macedonia|807
MLT|Malta|470
MNE|Montenegro|499
NLD|Netherlands|528
NOR|Norway|578
POL|Poland|616
PRT|Portugal|620
ROU|Romania|642
RUS|Russia|643
SMR|San Marino|674
SRB|Serbia|688
SVK|Slovakia|703
SVN|Slovenia|705
SWE|Sweden|752
TUR|Türkiye|792
UKR|Ukraine|804
VAT|Vatican City|336
XKX|Kosovo|`;

const identities = new Map(
  EUROPE_IDENTITIES.split('\n').map((row) => {
    const [iso3, name, atlasId] = row.split('|') as [string, string, string];
    return [iso3, { name, atlasId }] as const;
  }),
);
export const EUROPE_COUNTRIES = [...identities.keys()];

const ALIASES: Record<string, string[]> = {
  BGD: ['Bangladesh'],
  BIH: ['Bosnia', 'Bosna i Hercegovina'],
  HRV: ['Hrvatska'],
  CZE: ['Czech Republic'],
  DEU: ['Deutschland'],
  GBR: ['UK', 'Britain'],
  GRC: ['Hellas'],
  MKD: ['Macedonia'],
  TUR: ['Turkey', 'Turkiye'],
  XKX: ['Kosovo', 'XK', 'KOS'],
  USA: ['United States of America', 'United States', 'US'],
};

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en')
    .trim();

export type GeographyCountry = {
  iso3: string;
  name: string;
  aliases: string[];
  sourceIds: { borders: string | null; atlas: string | null };
  geometry: CountryPolygon | null;
  hasAdm1: boolean;
  hasAdm2: boolean;
};

export function buildGeographyCatalog(
  index: BordersCountryIndexRecord[],
): GeographyCountry[] {
  const polygons = getAllCountries();
  const byId = new Map(polygons.map((country) => [country.id, country]));
  const byName = new Map(
    polygons.map((country) => [normalize(country.name), country]),
  );
  const records = new Map(index.map((record) => [record.iso3, record]));
  const ids = new Set([...records.keys(), ...EUROPE_COUNTRIES]);
  return [...ids]
    .map((iso3) => {
      const record = records.get(iso3);
      const identity = identities.get(iso3);
      const name =
        identity?.name ?? (iso3 === 'BGD' ? 'Bangladesh' : record!.name);
      const aliases = [
        iso3,
        name,
        record?.name ?? name,
        ...(ALIASES[iso3] ?? []),
      ];
      const geometry =
        (identity?.atlasId ? byId.get(identity.atlasId) : undefined) ??
        aliases.map((alias) => byName.get(normalize(alias))).find(Boolean) ??
        null;
      return {
        iso3,
        name,
        aliases,
        geometry,
        sourceIds: {
          borders: record?.iso3 ?? null,
          atlas: geometry?.id ?? null,
        },
        hasAdm1: record?.hasAdm1 ?? false,
        hasAdm2: record?.hasAdm2 ?? false,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));
}

export function countryInScope(iso3: string, scope: GeographicScopeId) {
  return (
    scope === 'world' ||
    (scope === 'europe'
      ? EUROPE_COUNTRIES
      : (BALKANS_COUNTRIES as readonly string[])
    ).includes(iso3)
  );
}

export function searchCountries(
  countries: GeographyCountry[],
  scope: GeographicScopeId,
  query: string,
) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return countries.filter(
    (country) =>
      countryInScope(country.iso3, scope) &&
      terms.every((term) =>
        country.aliases.some((alias) => normalize(alias).includes(term)),
      ),
  );
}

export function scopeDestination(
  scope: GeographicScopeId,
): GeographyDestination {
  const frame = GEOGRAPHIC_SCOPES[scope];
  const [lon, lat] = frame.center;
  return {
    geo: surfaceAnchoredGeoView(lat, lon, frame.distance, DEFAULT_FOV),
    map: { center: [lon, lat], zoom: frame.zoom, bearing: 0, pitch: 0 },
    countryIso: null,
  };
}

export function countryDestination(
  country: GeographyCountry,
): GeographyDestination | null {
  if (!country.geometry) return null;
  const [lon, lat] = country.geometry.centroid;
  const points = country.geometry.rings.flat();
  const span = Math.max(
    2,
    ...points.map(([lng, latitude]) =>
      Math.max(
        Math.abs(latitude - lat) * 2,
        Math.abs(((lng - lon + 540) % 360) - 180) * 2,
      ),
    ),
  );
  return {
    geo: surfaceAnchoredGeoView(
      lat,
      lon,
      Math.min(4.5, 1.5 + span * 0.035),
      DEFAULT_FOV,
    ),
    map: {
      center: [lon, lat],
      zoom: Math.max(0.7, Math.min(6, Math.log2(360 / span) - 0.5)),
      bearing: 0,
      pitch: 0,
    },
    countryIso: country.sourceIds.borders,
  };
}
