import { useEffect, useEffectEvent, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import {
  PERSPECTIVES,
  type AtlasLayer,
  type AtlasFeature,
  type AtlasScope,
} from '../lib/timeAtlas';
import { GEOGRAPHIC_SCOPES } from '../lib/geography';

export function TimeAtlasMap({
  layers,
  year,
  scope,
  onSelect,
  selectedFeature,
}: {
  layers: AtlasLayer[];
  year: number;
  scope: AtlasScope;
  onSelect: (layerId: string, featureId: string) => void;
  selectedFeature?: AtlasFeature;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const rasterIds = useRef<string[]>([]);
  const [ready, setReady] = useState(false);
  const [warning, setWarning] = useState('');
  const pick = useEffectEvent(onSelect);
  const applyLayers = useEffectEvent(() => {
    const map = mapRef.current;
    if (!map || !map.getSource('atlas-records')) return;
    const data: FeatureCollection = {
      type: 'FeatureCollection',
      features: layers.flatMap((layer) =>
        layer.kind !== 'vector'
          ? []
          : layer.features
              .filter(
                (feature) =>
                  feature.properties.fromYear <= year &&
                  feature.properties.toYear >= year,
              )
              .map((feature) => ({
                ...feature,
                properties: {
                  ...feature.properties,
                  layerId: layer.id,
                  featureId: feature.id,
                  color: PERSPECTIVES[layer.perspective].color,
                },
              })),
      ),
    };
    (map.getSource('atlas-records') as maplibregl.GeoJSONSource).setData(data);
    for (const id of rasterIds.current) {
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(id)) map.removeSource(id);
    }
    rasterIds.current = [];
    for (const layer of layers) {
      if (layer.kind !== 'raster') continue;
      const frame = layer.frames.find(
        (frame) => frame.fromYear <= year && frame.toYear >= year,
      );
      if (!frame) continue;
      const id = `atlas-raster-${layer.id}::${frame.id}`;
      map.addSource(id, {
        type: 'raster',
        tiles: [frame.tiles],
        tileSize: 256,
        minzoom: frame.minZoom,
        maxzoom: frame.maxZoom,
      });
      map.addLayer(
        {
          id,
          source: id,
          type: 'raster',
          paint: { 'raster-opacity': 0.85, 'raster-fade-duration': 0 },
        },
        'atlas-polygons',
      );
      rasterIds.current.push(id);
    }
  });

  useEffect(() => {
    if (!container.current) return;
    let disposed = false;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: container.current,
        style: {
          version: 8,
          sources: {
            reference: {
              type: 'raster',
              tiles: [
                'https://tiles.openfreemap.org/natural_earth/ne2sr/{z}/{x}/{y}.png',
              ],
              tileSize: 256,
              maxzoom: 6,
              attribution: '© OpenFreeMap · Natural Earth',
            },
          },
          layers: [
            {
              id: 'reference',
              type: 'raster',
              source: 'reference',
              paint: {
                'raster-saturation': -0.65,
                'raster-brightness-max': 0.7,
              },
            },
          ],
        },
        center: [18, 40],
        zoom: 2,
        renderWorldCopies: false,
      });
    } catch {
      // Async notification keeps React effects free of synchronous state resets.
      queueMicrotask(() => {
        if (!disposed)
          setWarning(
            'Map rendering is unavailable. The timeline and records still work.',
          );
      });
      return () => {
        disposed = true;
      };
    }
    mapRef.current = map;
    container.current.dataset.atlasTilesReady = 'false';
    map.on('dataloading', () => {
      if (container.current)
        container.current.dataset.atlasTilesReady = 'false';
    });
    map.on('idle', () => {
      if (container.current) container.current.dataset.atlasTilesReady = 'true';
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.on('load', () => {
      if (disposed) return;
      // Contemporary political boundaries must not masquerade as dated layers.
      for (const layer of map.getStyle().layers ?? []) {
        if ('source-layer' in layer && layer['source-layer'] === 'boundary')
          map.setLayoutProperty(layer.id, 'visibility', 'none');
      }
      map.addSource('atlas-records', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'atlas-polygons',
        type: 'fill',
        source: 'atlas-records',
        filter: ['==', '$type', 'Polygon'],
        paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.28 },
      });
      map.addLayer({
        id: 'atlas-lines',
        type: 'line',
        source: 'atlas-records',
        filter: ['!=', '$type', 'Point'],
        paint: { 'line-color': ['get', 'color'], 'line-width': 2 },
      });
      map.addLayer({
        id: 'atlas-points',
        type: 'circle',
        source: 'atlas-records',
        filter: ['==', '$type', 'Point'],
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': 7,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#0b1321',
        },
      });
      applyLayers();
      setReady(true);
    });
    map.on('click', (event) => {
      if (!map.getLayer('atlas-points')) return;
      const feature = map.queryRenderedFeatures(event.point, {
        layers: ['atlas-points', 'atlas-polygons', 'atlas-lines'],
      })[0];
      if (
        typeof feature?.properties?.layerId === 'string' &&
        typeof feature.properties.featureId === 'string'
      )
        pick(feature.properties.layerId, feature.properties.featureId);
    });
    map.on('error', () => {
      if (!disposed)
        setWarning(
          'Some map assets could not load. Check the connection and imagery provider; dated records remain available.',
        );
    });
    const resize = new ResizeObserver(() => map.resize());
    resize.observe(container.current);
    return () => {
      disposed = true;
      resize.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (ready) applyLayers();
  }, [layers, year, ready]);
  useEffect(() => {
    if (!ready) return;
    const frame = GEOGRAPHIC_SCOPES[scope];
    mapRef.current?.jumpTo({ center: [...frame.center], zoom: frame.zoom });
  }, [scope, ready]);

  useEffect(() => {
    if (
      !ready ||
      !selectedFeature ||
      !('coordinates' in selectedFeature.geometry)
    )
      return;
    let west = 180,
      east = -180,
      south = 90,
      north = -90;
    const visit = (coordinates: unknown): void => {
      if (!Array.isArray(coordinates)) return;
      if (
        typeof coordinates[0] === 'number' &&
        typeof coordinates[1] === 'number'
      ) {
        west = Math.min(west, coordinates[0]);
        east = Math.max(east, coordinates[0]);
        south = Math.min(south, coordinates[1]);
        north = Math.max(north, coordinates[1]);
      } else coordinates.forEach(visit);
    };
    visit(selectedFeature.geometry.coordinates);
    if (west <= east && south <= north) {
      if (container.current)
        container.current.dataset.atlasTilesReady = 'false';
      mapRef.current?.fitBounds(
        [
          [west, Math.max(-85, Math.min(85, south))],
          [east, Math.max(-85, Math.min(85, north))],
        ],
        { padding: 40, maxZoom: 7, duration: 0 },
      );
    }
  }, [selectedFeature, ready]);

  return (
    <div className="time-atlas__map">
      <div
        ref={container}
        className="time-atlas__map-canvas"
        aria-label="Time atlas world map"
        data-atlas-ready={ready}
      />
      <span className="time-atlas__tiles-loading" role="status">
        Loading reference tiles…
      </span>
      {warning ? (
        <p className="time-atlas__map-warning" role="status">
          {warning}
        </p>
      ) : null}
      <div className="time-atlas__reference">
        Modern geographic reference · not a historical image · dated overlays
        shown separately
      </div>
    </div>
  );
}
