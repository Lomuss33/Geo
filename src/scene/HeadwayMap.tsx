import { useEffect, useEffectEvent, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { ShellMode } from '../app/useViewportProfile';
import {
  cloneHeadwayView,
  headwayViewsEqual,
  normalizeHeadwayView,
} from '../lib/modeBridge';
import { resetHeadwayAxes } from '../lib/navigation';
import type {
  AxisLockMode,
  HeadwayLayerVisibility,
  HeadwayLayoutLook,
  HeadwayViewState,
  QualityMode,
} from '../state/viewerStore';
import { useViewerStore } from '../state/viewerStore';

type HeadwayMapProps = {
  view: HeadwayViewState;
  quality: QualityMode;
  headwayLayoutLook: HeadwayLayoutLook;
  headwayLayerVisibility: HeadwayLayerVisibility;
  showBorders: boolean;
  isFrozen: boolean;
  axisLockMode: AxisLockMode;
  shellMode: ShellMode;
  onLoading: () => void;
  onReady: () => void;
  onError: (message: string) => void;
  onViewChange: (view: HeadwayViewState) => void;
};

const HEADWAY_STYLE_URL = `${import.meta.env.BASE_URL}assets/headway/headway-style.json`;
const HEADWAY_BORDER_LAYERS = ['boundary_2', 'boundary_3', 'boundary_disputed'];
const HEADWAY_CUSTOM_ATTRIBUTION = [
  'OpenFreeMap',
  '© OpenMapTiles',
  'Data from OpenStreetMap',
];

const safeSetPaint = (
  map: MapLibreMap,
  layerId: string,
  property: string,
  value: unknown,
) => {
  if (!map.getLayer(layerId)) {
    return;
  }

  map.setPaintProperty(layerId, property, value);
};

const safeSetLayout = (
  map: MapLibreMap,
  layerId: string,
  property: string,
  value: unknown,
) => {
  if (!map.getLayer(layerId)) {
    return;
  }

  map.setLayoutProperty(layerId, property, value);
};

const safeSetVisibility = (
  map: MapLibreMap,
  layerId: string,
  visible: boolean,
) => {
  safeSetLayout(map, layerId, 'visibility', visible ? 'visible' : 'none');
};

const setVisibilityByMatcher = (
  map: MapLibreMap,
  matcher: (layerId: string) => boolean,
  visible: boolean,
) => {
  for (const layer of map.getStyle().layers ?? []) {
    if (!matcher(layer.id)) {
      continue;
    }

    safeSetVisibility(map, layer.id, visible);
  }
};

const HEADWAY_LOOKS: Record<
  HeadwayLayoutLook,
  {
    background: string;
    naturalEarthOpacity: number;
    water: string;
    park: string;
    parkOutline: string;
    wood: string;
    grass: string;
    boundaryStrong: string;
    boundarySoft: string;
    motorway: string;
    primary: string;
    secondary: string;
    building: string;
    buildingExtrusion: string;
    buildingOpacity: number;
    text: string;
    textHalo: string;
    textHaloWidth: number;
    showMinorRoadLabels: boolean;
    showPoiWide: boolean;
    showPoiDense: boolean;
  }
> = {
  mission: {
    background: '#06111b',
    naturalEarthOpacity: 0.26,
    water: '#1f5d8d',
    park: '#2d6b43',
    parkOutline: 'rgba(148, 214, 169, 0.52)',
    wood: 'rgba(60, 122, 78, 0.78)',
    grass: 'rgba(74, 144, 94, 0.58)',
    boundaryStrong: '#b8dff3',
    boundarySoft: 'rgba(184, 223, 243, 0.48)',
    motorway: '#ffe19f',
    primary: '#ffbf7a',
    secondary: '#9fd2f1',
    building: 'rgba(86, 111, 128, 0.46)',
    buildingExtrusion: '#5c7c93',
    buildingOpacity: 0.42,
    text: '#f6fbff',
    textHalo: 'rgba(6, 15, 24, 0.88)',
    textHaloWidth: 1.2,
    showMinorRoadLabels: true,
    showPoiWide: true,
    showPoiDense: false,
  },
  daylight: {
    background: '#9dc7e3',
    naturalEarthOpacity: 0.18,
    water: '#4f98cf',
    park: '#7bbb68',
    parkOutline: 'rgba(63, 119, 59, 0.42)',
    wood: 'rgba(92, 152, 74, 0.78)',
    grass: 'rgba(127, 187, 104, 0.62)',
    boundaryStrong: '#4c6277',
    boundarySoft: 'rgba(76, 98, 119, 0.34)',
    motorway: '#fff2c2',
    primary: '#ffd293',
    secondary: '#d6e2ea',
    building: 'rgba(137, 145, 151, 0.38)',
    buildingExtrusion: '#919ca6',
    buildingOpacity: 0.32,
    text: '#143247',
    textHalo: 'rgba(245, 250, 255, 0.92)',
    textHaloWidth: 1.4,
    showMinorRoadLabels: true,
    showPoiWide: true,
    showPoiDense: true,
  },
  atlas: {
    background: '#eadbb8',
    naturalEarthOpacity: 0.14,
    water: '#5fa6bf',
    park: '#b7cb78',
    parkOutline: 'rgba(103, 123, 56, 0.4)',
    wood: 'rgba(146, 175, 74, 0.74)',
    grass: 'rgba(186, 207, 112, 0.62)',
    boundaryStrong: '#6d5c4f',
    boundarySoft: 'rgba(109, 92, 79, 0.38)',
    motorway: '#ce6d4c',
    primary: '#d89b52',
    secondary: '#9b8a76',
    building: 'rgba(144, 117, 92, 0.28)',
    buildingExtrusion: '#b08963',
    buildingOpacity: 0.22,
    text: '#362a1f',
    textHalo: 'rgba(244, 236, 220, 0.96)',
    textHaloWidth: 1.1,
    showMinorRoadLabels: false,
    showPoiWide: true,
    showPoiDense: false,
  },
  blueprint: {
    background: '#08111f',
    naturalEarthOpacity: 0.18,
    water: '#102947',
    park: '#122338',
    parkOutline: 'rgba(92, 150, 204, 0.34)',
    wood: 'rgba(22, 53, 86, 0.68)',
    grass: 'rgba(16, 41, 71, 0.52)',
    boundaryStrong: '#77b3e5',
    boundarySoft: 'rgba(119, 179, 229, 0.4)',
    motorway: '#b6dcff',
    primary: '#7ebeff',
    secondary: '#4e82b6',
    building: 'rgba(64, 102, 145, 0.32)',
    buildingExtrusion: '#4173a9',
    buildingOpacity: 0.34,
    text: '#e3f2ff',
    textHalo: 'rgba(3, 10, 19, 0.94)',
    textHaloWidth: 1.3,
    showMinorRoadLabels: true,
    showPoiWide: false,
    showPoiDense: false,
  },
  mono: {
    background: '#cfd6dc',
    naturalEarthOpacity: 0.12,
    water: '#8f9da9',
    park: '#b8c0c6',
    parkOutline: 'rgba(88, 95, 102, 0.34)',
    wood: 'rgba(139, 149, 158, 0.66)',
    grass: 'rgba(184, 192, 198, 0.56)',
    boundaryStrong: '#4a545d',
    boundarySoft: 'rgba(74, 84, 93, 0.32)',
    motorway: '#fbfcfd',
    primary: '#e5eaee',
    secondary: '#b0bac2',
    building: 'rgba(109, 118, 126, 0.3)',
    buildingExtrusion: '#838d95',
    buildingOpacity: 0.24,
    text: '#20262b',
    textHalo: 'rgba(248, 250, 252, 0.96)',
    textHaloWidth: 1.25,
    showMinorRoadLabels: false,
    showPoiWide: false,
    showPoiDense: false,
  },
  transit: {
    background: '#0f1720',
    naturalEarthOpacity: 0.24,
    water: '#215b86',
    park: '#216444',
    parkOutline: 'rgba(129, 203, 166, 0.46)',
    wood: 'rgba(49, 114, 81, 0.74)',
    grass: 'rgba(42, 96, 68, 0.58)',
    boundaryStrong: '#d9edf7',
    boundarySoft: 'rgba(217, 237, 247, 0.42)',
    motorway: '#ffd24d',
    primary: '#ff9352',
    secondary: '#71d0ea',
    building: 'rgba(86, 106, 121, 0.38)',
    buildingExtrusion: '#60798e',
    buildingOpacity: 0.34,
    text: '#f4fbff',
    textHalo: 'rgba(8, 14, 22, 0.92)',
    textHaloWidth: 1.2,
    showMinorRoadLabels: true,
    showPoiWide: true,
    showPoiDense: true,
  },
};

const applyHeadwayTheme = (
  map: MapLibreMap,
  headwayLayoutLook: HeadwayLayoutLook,
) => {
  const look = HEADWAY_LOOKS[headwayLayoutLook];

  safeSetPaint(map, 'background', 'background-color', look.background);
  safeSetPaint(
    map,
    'natural_earth',
    'raster-opacity',
    look.naturalEarthOpacity,
  );
  safeSetPaint(map, 'water', 'fill-color', look.water);
  safeSetPaint(map, 'park', 'fill-color', look.park);
  safeSetPaint(map, 'park_outline', 'line-color', look.parkOutline);
  safeSetPaint(map, 'landcover_wood', 'fill-color', look.wood);
  safeSetPaint(map, 'landcover_grass', 'fill-color', look.grass);
  safeSetPaint(map, 'boundary_2', 'line-color', look.boundaryStrong);
  safeSetPaint(map, 'boundary_3', 'line-color', look.boundarySoft);
  safeSetPaint(map, 'road_motorway', 'line-color', look.motorway);
  safeSetPaint(map, 'road_trunk_primary', 'line-color', look.primary);
  safeSetPaint(map, 'road_secondary_tertiary', 'line-color', look.secondary);
  safeSetPaint(map, 'building', 'fill-color', look.building);
  safeSetPaint(
    map,
    'building-3d',
    'fill-extrusion-color',
    look.buildingExtrusion,
  );
  safeSetPaint(
    map,
    'building-3d',
    'fill-extrusion-opacity',
    look.buildingOpacity,
  );
  safeSetLayout(map, 'road_one_way_arrow', 'visibility', 'none');
  safeSetVisibility(map, 'highway-name-minor', look.showMinorRoadLabels);
  safeSetVisibility(map, 'poi_r7', look.showPoiWide);
  safeSetVisibility(map, 'poi_r1', look.showPoiDense);

  for (const layer of map.getStyle().layers ?? []) {
    if (layer.type !== 'symbol') {
      continue;
    }

    safeSetPaint(map, layer.id, 'text-color', look.text);
    safeSetPaint(map, layer.id, 'text-halo-color', look.textHalo);
    safeSetPaint(map, layer.id, 'text-halo-width', look.textHaloWidth);
  }
};

const applyHeadwayQuality = (map: MapLibreMap, quality: QualityMode) => {
  safeSetVisibility(map, 'building-3d', quality !== 'performance');
  safeSetPaint(
    map,
    'building-3d',
    'fill-extrusion-opacity',
    quality === 'high' ? 0.46 : 0.38,
  );
  safeSetVisibility(map, 'highway-name-minor', quality !== 'performance');
  safeSetVisibility(map, 'poi_r20', quality === 'high');
  safeSetVisibility(map, 'poi_r7', quality !== 'performance');
  safeSetVisibility(map, 'poi_r1', quality !== 'performance');
};

const applyHeadwayBorders = (map: MapLibreMap, showBorders: boolean) => {
  for (const layerId of HEADWAY_BORDER_LAYERS) {
    safeSetVisibility(map, layerId, showBorders);
  }
};

const applyHeadwayLayerVisibility = (
  map: MapLibreMap,
  visibility: HeadwayLayerVisibility,
) => {
  setVisibilityByMatcher(
    map,
    (layerId) =>
      layerId.startsWith('road_') ||
      layerId.startsWith('tunnel_') ||
      layerId.startsWith('bridge_') ||
      layerId.startsWith('highway-'),
    visibility.roads,
  );
  setVisibilityByMatcher(
    map,
    (layerId) =>
      layerId === 'park' ||
      layerId === 'park_outline' ||
      layerId.startsWith('landcover_') ||
      layerId.startsWith('landuse_'),
    visibility.parks,
  );
  setVisibilityByMatcher(
    map,
    (layerId) => layerId === 'building' || layerId === 'building-3d',
    visibility.buildings,
  );
  setVisibilityByMatcher(
    map,
    (layerId) =>
      layerId.startsWith('label_') ||
      layerId.startsWith('water_name_') ||
      layerId === 'waterway_line_label',
    visibility.placeLabels,
  );
  setVisibilityByMatcher(
    map,
    (layerId) => layerId.startsWith('poi_') || layerId === 'airport',
    visibility.pois,
  );
};

const applyHeadwayInteractions = (
  map: MapLibreMap,
  isFrozen: boolean,
  axisLockMode: AxisLockMode,
) => {
  if (isFrozen) {
    map.dragPan.disable();
    map.scrollZoom.disable();
    map.doubleClickZoom.disable();
    map.boxZoom.disable();
    map.dragRotate.disable();
    map.touchZoomRotate.disable();
    return;
  }

  map.dragPan.enable();
  map.scrollZoom.enable();
  map.doubleClickZoom.enable();
  map.boxZoom.enable();
  map.touchZoomRotate.enable();

  if (axisLockMode === 'axis-lock') {
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation?.();
    const resetView = resetHeadwayAxes(readMapView(map));
    if (!headwayViewsEqual(readMapView(map), resetView)) {
      map.easeTo({
        bearing: resetView.bearing,
        pitch: resetView.pitch,
        duration: 700,
        essential: true,
      });
    }
    return;
  }

  map.dragRotate.enable();
  map.touchZoomRotate.enableRotation?.();
};

const readMapView = (map: MapLibreMap): HeadwayViewState =>
  normalizeHeadwayView({
    center: [map.getCenter().lng, map.getCenter().lat],
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  });

export function HeadwayMap({
  view,
  quality,
  headwayLayoutLook,
  headwayLayerVisibility,
  showBorders,
  isFrozen,
  axisLockMode,
  shellMode,
  onLoading,
  onReady,
  onError,
  onViewChange,
}: HeadwayMapProps) {
  const initialViewRef = useRef(view);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const navigationControlRef = useRef<maplibregl.NavigationControl | null>(
    null,
  );
  const attributionControlRef = useRef<maplibregl.AttributionControl | null>(
    null,
  );
  const isLoadedRef = useRef(false);
  const isApplyingPropRef = useRef(false);
  const animationSession = useViewerStore((state) => state.animationSession);
  const previewHeadwayView = animationSession.previewHeadwayView;
  const isAnimationPlaying = animationSession.phase === 'playing';
  const isAnimationWorkspaceOpen = animationSession.workspaceOpen;
  const isAnimationSessionActive =
    isAnimationWorkspaceOpen || isAnimationPlaying;
  const notifyLoading = useEffectEvent(onLoading);
  const notifyReady = useEffectEvent(onReady);
  const notifyError = useEffectEvent(onError);
  const syncShellControls = useEffectEvent((map: MapLibreMap) => {
    if (navigationControlRef.current) {
      map.removeControl(navigationControlRef.current);
      navigationControlRef.current = null;
    }

    if (attributionControlRef.current) {
      map.removeControl(attributionControlRef.current);
      attributionControlRef.current = null;
    }

    attributionControlRef.current = new maplibregl.AttributionControl({
      compact: shellMode !== 'dual-rail',
      customAttribution: HEADWAY_CUSTOM_ATTRIBUTION,
    });
    map.addControl(
      attributionControlRef.current,
      shellMode === 'dual-rail' ? 'bottom-right' : 'bottom-left',
    );

    if (shellMode === 'dual-rail' || isAnimationWorkspaceOpen) {
      return;
    }

    navigationControlRef.current = new maplibregl.NavigationControl({
      showCompass: true,
      showZoom: true,
    });
    map.addControl(navigationControlRef.current, 'top-left');
  });
  const applyCurrentTheme = useEffectEvent((map: MapLibreMap) => {
    applyHeadwayTheme(map, headwayLayoutLook);
  });
  const applyCurrentDecorations = useEffectEvent((map: MapLibreMap) => {
    applyHeadwayQuality(map, quality);
    applyHeadwayBorders(map, showBorders);
    applyHeadwayLayerVisibility(map, headwayLayerVisibility);
    applyHeadwayInteractions(
      map,
      isFrozen || isAnimationSessionActive,
      axisLockMode,
    );
  });

  const emitViewChange = useEffectEvent(() => {
    if (!mapRef.current || isApplyingPropRef.current || previewHeadwayView) {
      return;
    }

    onViewChange(cloneHeadwayView(readMapView(mapRef.current)));
  });

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    notifyLoading();
    isLoadedRef.current = false;

    let map: MapLibreMap;
    try {
      map = new maplibregl.Map({
        attributionControl: false,
        center: initialViewRef.current.center,
        container: containerRef.current,
        keyboard: false,
        pitch: initialViewRef.current.pitch,
        renderWorldCopies: false,
        style: HEADWAY_STYLE_URL,
        zoom: initialViewRef.current.zoom,
        bearing: initialViewRef.current.bearing,
      });
    } catch (error) {
      notifyError(
        error instanceof Error
          ? error.message
          : 'Headway could not initialize WebGL.',
      );
      return;
    }
    mapRef.current = map;

    const bootTimeout = window.setTimeout(() => {
      if (!isLoadedRef.current) {
        notifyError('Headway view did not finish loading its basemap.');
      }
    }, 12_000);

    const handleLoad = () => {
      isLoadedRef.current = true;
      window.clearTimeout(bootTimeout);
      map.setProjection({ type: 'globe' });
      map.keyboard.disable();
      syncShellControls(map);
      applyCurrentTheme(map);
      applyCurrentDecorations(map);
      notifyReady();
      emitViewChange();
    };

    const handleError = (event: { error?: unknown }) => {
      if (isLoadedRef.current) {
        return;
      }

      window.clearTimeout(bootTimeout);
      if (event.error instanceof Error) {
        notifyError(event.error.message);
        return;
      }

      notifyError('Headway view could not load its style or vector tiles.');
    };

    map.on('load', handleLoad);
    map.on('error', handleError);
    map.on('moveend', emitViewChange);
    map.on('rotateend', emitViewChange);
    map.on('pitchend', emitViewChange);
    map.on('zoomend', emitViewChange);

    return () => {
      window.clearTimeout(bootTimeout);
      map.off('load', handleLoad);
      map.off('error', handleError);
      map.off('moveend', emitViewChange);
      map.off('rotateend', emitViewChange);
      map.off('pitchend', emitViewChange);
      map.off('zoomend', emitViewChange);
      map.remove();
      mapRef.current = null;
      navigationControlRef.current = null;
      attributionControlRef.current = null;
      isLoadedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !isLoadedRef.current) {
      return;
    }

    applyHeadwayQuality(map, quality);
  }, [quality]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !isLoadedRef.current) {
      return;
    }

    applyHeadwayTheme(map, headwayLayoutLook);
    applyHeadwayQuality(map, quality);
  }, [headwayLayoutLook, quality]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !isLoadedRef.current) {
      return;
    }

    applyHeadwayLayerVisibility(map, headwayLayerVisibility);
    applyHeadwayQuality(map, quality);
  }, [headwayLayerVisibility, quality]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !isLoadedRef.current) {
      return;
    }

    applyHeadwayBorders(map, showBorders);
  }, [showBorders]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !isLoadedRef.current) {
      return;
    }

    applyHeadwayInteractions(
      map,
      isFrozen || isAnimationSessionActive,
      axisLockMode,
    );
  }, [axisLockMode, isAnimationSessionActive, isFrozen]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    syncShellControls(map);
  }, [isAnimationWorkspaceOpen, shellMode]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !isLoadedRef.current || !previewHeadwayView) {
      if (!isAnimationSessionActive) {
        isApplyingPropRef.current = false;
      }
      return;
    }

    isApplyingPropRef.current = true;
    map.jumpTo({
      center: previewHeadwayView.center,
      zoom: previewHeadwayView.zoom,
      bearing: previewHeadwayView.bearing,
      pitch: previewHeadwayView.pitch,
    });
  }, [isAnimationSessionActive, previewHeadwayView]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !isLoadedRef.current || previewHeadwayView) {
      return;
    }

    const current = readMapView(map);
    const next = normalizeHeadwayView(view);

    if (headwayViewsEqual(current, next)) {
      return;
    }

    isApplyingPropRef.current = true;
    map.easeTo({
      center: next.center,
      zoom: next.zoom,
      bearing: next.bearing,
      pitch: next.pitch,
      duration: 900,
      essential: true,
    });

    const release = () => {
      isApplyingPropRef.current = false;
    };

    map.once('moveend', release);
    window.setTimeout(release, 950);
  }, [axisLockMode, previewHeadwayView, view]);

  useEffect(() => {
    const map = mapRef.current;
    const container = containerRef.current;

    if (!map || !container) {
      return;
    }

    const resizeMap = () => {
      map.resize();
    };

    resizeMap();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', resizeMap);

      return () => {
        window.removeEventListener('resize', resizeMap);
      };
    }

    const observer = new ResizeObserver(() => {
      resizeMap();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  return <div className="headway-map" ref={containerRef} />;
}
