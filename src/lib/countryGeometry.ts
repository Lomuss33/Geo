import atlas from 'world-atlas/countries-110m.json';
import { feature } from 'topojson-client';
import { Vector3 } from 'three';
import { FRONT_VECTOR } from './constants';
import { latLonToVector3, quaternionFromCenteredLatLon, vector3ToLatLon } from './geo';

type Ring = Array<[lng: number, lat: number]>;

type CountryPolygonShape = Ring[];

export type CountryPolygon = {
  id: string;
  name: string;
  centroid: [lng: number, lat: number];
  rings: Ring[];
  polygons: CountryPolygonShape[];
};

type CountryFeatureGeometry =
  | {
      type: 'Polygon';
      coordinates: Array<Array<[number, number]>>;
    }
  | {
      type: 'MultiPolygon';
      coordinates: Array<Array<Array<[number, number]>>>;
    };

type CountryFeature = {
  id?: string | number;
  geometry: CountryFeatureGeometry | null;
  properties?: { name?: string } | null;
};

const normalizeLongitudeAround = (lon: number, referenceLon: number) => {
  let normalized = lon;

  while (normalized - referenceLon > 180) {
    normalized -= 360;
  }

  while (normalized - referenceLon < -180) {
    normalized += 360;
  }

  return normalized;
};

const closeRing = (ring: Ring): Ring => {
  if (ring.length === 0) {
    return ring;
  }

  const first = ring[0]!;
  const last = ring.at(-1)!;
  if (first[0] === last[0] && first[1] === last[1]) {
    return ring;
  }

  return [...ring, [first[0], first[1]]];
};

const toRings = (geometry: CountryFeatureGeometry): CountryPolygonShape[] => {
  if (geometry.type === 'Polygon') {
    return [
      geometry.coordinates.map((ring) =>
        closeRing(
          ring.map(([lng, lat]) => [lng, lat] as [number, number]),
        ),
      ),
    ];
  }

  return geometry.coordinates.map((polygon) =>
    polygon.map((ring) =>
      closeRing(
        ring.map(([lng, lat]) => [lng, lat] as [number, number]),
      ),
    ),
  );
};

const deriveCentroid = (polygons: CountryPolygonShape[]): [number, number] => {
  const accumulator = new Vector3(0, 0, 0);

  for (const polygon of polygons) {
    const outer = polygon[0];
    if (!outer) {
      continue;
    }

    for (const [lng, lat] of outer) {
      accumulator.add(latLonToVector3(lat, lng));
    }
  }

  if (accumulator.lengthSq() === 0) {
    return [0, 0];
  }

  const { lat, lon } = vector3ToLatLon(accumulator.normalize());
  return [lon, lat];
};

const countryFeatures = feature(
  atlas as never,
  (atlas.objects as { countries: unknown }).countries as never,
) as unknown as { features?: CountryFeature[] } | CountryFeature;

const features: CountryFeature[] =
  'features' in countryFeatures
    ? (countryFeatures.features ?? [])
    : [countryFeatures as CountryFeature];

const allCountries: CountryPolygon[] = features
  .map((entry) => {
    if (!entry.geometry || !entry.properties?.name || entry.id == null) {
      return null;
    }

    const polygons = toRings(entry.geometry);
    const rings = polygons.flat();

    return {
      id: String(entry.id),
      name: entry.properties.name,
      centroid: deriveCentroid(polygons),
      rings,
      polygons,
    } satisfies CountryPolygon;
  })
  .filter((entry): entry is CountryPolygon => entry !== null);

const countriesById = new Map(
  allCountries.map((country) => [country.id, country] as const),
);

const pointInRing = (lng: number, lat: number, ring: Ring) => {
  let inside = false;

  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const [currentLng, currentLat] = ring[index]!;
    const [previousLng, previousLat] = ring[previous]!;
    const normalizedCurrentLng = normalizeLongitudeAround(currentLng, lng);
    const normalizedPreviousLng = normalizeLongitudeAround(previousLng, lng);

    const intersects =
      currentLat > lat !== previousLat > lat &&
      lng <
        ((normalizedPreviousLng - normalizedCurrentLng) * (lat - currentLat)) /
          ((previousLat - currentLat) || Number.EPSILON) +
          normalizedCurrentLng;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
};

const pointInCountry = (lng: number, lat: number, country: CountryPolygon) => {
  for (const polygon of country.polygons) {
    const [outer, ...holes] = polygon;
    if (!outer || !pointInRing(lng, lat, outer)) {
      continue;
    }

    if (holes.some((hole) => pointInRing(lng, lat, hole))) {
      continue;
    }

    return true;
  }

  return false;
};

const projectRing = (
  ring: Ring,
  rotation: ReturnType<typeof quaternionFromCenteredLatLon>,
  viewScale: { widthPx: number; heightPx: number; zoomFactor: number },
) => {
  const centerX = viewScale.widthPx / 2;
  const centerY = viewScale.heightPx / 2;
  const commands: string[] = [];

  for (let index = 0; index < ring.length; index += 1) {
    const [lng, lat] = ring[index]!;
    const rotated = latLonToVector3(lat, lng).applyQuaternion(rotation);
    const x = centerX + rotated.x * viewScale.zoomFactor;
    const y = centerY - rotated.y * viewScale.zoomFactor;
    commands.push(`${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`);
  }

  if (commands.length === 0) {
    return '';
  }

  commands.push('Z');
  return commands.join(' ');
};

export const getAllCountries = () => allCountries;

export const getCountryById = (id: string) => countriesById.get(id) ?? null;

export const findCountryByLatLon = (lng: number, lat: number) => {
  for (const country of allCountries) {
    if (pointInCountry(lng, lat, country)) {
      return country;
    }
  }

  return null;
};

export const buildCountryFrontProjection = (
  country: CountryPolygon,
  viewScale: { widthPx: number; heightPx: number; zoomFactor: number },
) => {
  const [centroidLng, centroidLat] = country.centroid;
  const rotation = quaternionFromCenteredLatLon(
    centroidLat,
    centroidLng,
  );

  return country.polygons
    .flatMap((polygon) =>
      polygon.map((ring) => projectRing(ring, rotation, viewScale)),
    )
    .filter(Boolean)
    .join(' ');
};

export const getCountryFrontNormal = (country: CountryPolygon) =>
  latLonToVector3(country.centroid[1], country.centroid[0]).dot(FRONT_VECTOR);
