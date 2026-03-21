import { useEffect, useEffectEvent, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap } from 'maplibre-gl';
import {
  cloneHeadwayView,
  headwayViewsEqual,
  normalizeHeadwayView,
} from '../lib/modeBridge';
import { resetHeadwayAxes } from '../lib/navigation';
import type {
  AxisLockMode,
  HeadwayViewState,
  QualityMode,
} from '../state/viewerStore';
import { useViewerStore } from '../state/viewerStore';

type HeadwayMapProps = {
  view: HeadwayViewState;
  quality: QualityMode;
  showBorders: boolean;
  isFrozen: boolean;
  axisLockMode: AxisLockMode;
  onLoading: () => void;
  onReady: () => void;
  onError: (message: string) => void;
  onViewChange: (view: HeadwayViewState) => void;
};

const HEADWAY_STYLE_URL = `${import.meta.env.BASE_URL}assets/headway/headway-style.json`;
const HEADWAY_BORDER_LAYERS = ['boundary_2', 'boundary_3', 'boundary_disputed'];

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

const applyHeadwayTheme = (map: MapLibreMap) => {
  safeSetPaint(map, 'background', 'background-color', '#071320');
  safeSetPaint(map, 'natural_earth', 'raster-opacity', 0.22);
  safeSetPaint(map, 'water', 'fill-color', '#12304c');
  safeSetPaint(map, 'park', 'fill-color', '#19372f');
  safeSetPaint(map, 'park_outline', 'line-color', 'rgba(128, 187, 171, 0.48)');
  safeSetPaint(map, 'landcover_wood', 'fill-color', 'rgba(54, 93, 76, 0.72)');
  safeSetPaint(map, 'landcover_grass', 'fill-color', 'rgba(38, 74, 61, 0.5)');
  safeSetPaint(map, 'boundary_2', 'line-color', '#8fc6d7');
  safeSetPaint(map, 'boundary_3', 'line-color', 'rgba(143, 198, 215, 0.45)');
  safeSetPaint(map, 'road_motorway', 'line-color', '#b7d7e7');
  safeSetPaint(map, 'road_trunk_primary', 'line-color', '#8bc5df');
  safeSetPaint(map, 'road_secondary_tertiary', 'line-color', '#6d9db5');
  safeSetPaint(map, 'building', 'fill-color', 'rgba(75, 93, 110, 0.42)');
  safeSetPaint(map, 'building-3d', 'fill-extrusion-color', '#4f667d');
  safeSetPaint(map, 'building-3d', 'fill-extrusion-opacity', 0.38);
  safeSetLayout(map, 'road_one_way_arrow', 'visibility', 'none');

  for (const layer of map.getStyle().layers ?? []) {
    if (layer.type !== 'symbol') {
      continue;
    }

    safeSetPaint(map, layer.id, 'text-color', '#eff6ff');
    safeSetPaint(
      map,
      layer.id,
      'text-halo-color',
      'rgba(6, 15, 24, 0.88)',
    );
    safeSetPaint(map, layer.id, 'text-halo-width', 1.2);
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
  showBorders,
  isFrozen,
  axisLockMode,
  onLoading,
  onReady,
  onError,
  onViewChange,
}: HeadwayMapProps) {
  const initialViewRef = useRef(view);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const isLoadedRef = useRef(false);
  const isApplyingPropRef = useRef(false);
  const animationSession = useViewerStore((state) => state.animationSession);
  const previewHeadwayView = animationSession.previewHeadwayView;
  const isAnimationPlaying = animationSession.phase === 'playing';
  const isAnimationWorkspaceOpen = animationSession.workspaceOpen;
  const isAnimationSessionActive = isAnimationWorkspaceOpen || isAnimationPlaying;
  const notifyLoading = useEffectEvent(onLoading);
  const notifyReady = useEffectEvent(onReady);
  const notifyError = useEffectEvent(onError);
  const applyCurrentDecorations = useEffectEvent((map: MapLibreMap) => {
    applyHeadwayQuality(map, quality);
    applyHeadwayBorders(map, showBorders);
    applyHeadwayInteractions(map, isFrozen || isAnimationSessionActive, axisLockMode);
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

    const map = new maplibregl.Map({
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
      applyHeadwayTheme(map);
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

    applyHeadwayBorders(map, showBorders);
  }, [showBorders]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !isLoadedRef.current) {
      return;
    }

    applyHeadwayInteractions(map, isFrozen || isAnimationSessionActive, axisLockMode);
  }, [axisLockMode, isAnimationSessionActive, isFrozen]);

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
