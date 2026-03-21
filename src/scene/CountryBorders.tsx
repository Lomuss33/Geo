import { useEffect, useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { GeometryCollection, Topology } from 'topojson-specification';
import { mesh } from 'topojson-client';
import countries110 from 'world-atlas/countries-110m.json';
import { latLonToVector3 } from '../lib/geo';
import type { QualityMode } from '../state/viewerStore';

type CountryBordersProps = {
  quality: QualityMode;
};

const BORDER_RADIUS = 1.0035;
const worldTopology = countries110 as unknown as Topology<{
  countries: GeometryCollection;
}>;

export function CountryBorders({ quality }: CountryBordersProps) {
  const geometry = useMemo(() => {
    const borderMesh = mesh(worldTopology, worldTopology.objects.countries);
    const positions: number[] = [];

    borderMesh.coordinates.forEach((line) => {
      for (let index = 1; index < line.length; index += 1) {
        const previous = line[index - 1];
        const current = line[index];

        if (!previous || !current) {
          continue;
        }

        const [previousLon, previousLat] = previous;
        const [currentLon, currentLat] = current;

        if (
          previousLon === undefined ||
          previousLat === undefined ||
          currentLon === undefined ||
          currentLat === undefined
        ) {
          continue;
        }

        const start = latLonToVector3(previousLat, previousLon).multiplyScalar(
          BORDER_RADIUS,
        );
        const end = latLonToVector3(currentLat, currentLon).multiplyScalar(
          BORDER_RADIUS,
        );

        positions.push(start.x, start.y, start.z, end.x, end.y, end.z);
      }
    });

    const borderGeometry = new BufferGeometry();
    borderGeometry.setAttribute(
      'position',
      new Float32BufferAttribute(positions, 3),
    );
    borderGeometry.computeBoundingSphere();

    return borderGeometry;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial
        color={quality === 'performance' ? '#96dbff' : '#c2f4ff'}
        transparent
        opacity={quality === 'performance' ? 0.24 : 0.34}
        depthWrite={false}
      />
    </lineSegments>
  );
}
