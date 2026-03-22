import { useEffect, useEffectEvent, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, MapGeoJSONFeature } from 'maplibre-gl';
import type { ShellMode } from '../app/useViewportProfile';
import {
  bordersViewsEqual,
  cloneBordersView,
  normalizeBordersView,
} from '../lib/bordersBridge';
import {
  buildBordersAdm0FillExpression,
  buildBordersAdm0LineExpression,
  buildBordersAdm2FillExpression,
  buildBordersAdm2Filter,
  buildBordersAdm2LineExpression,
  buildBordersPinsData,
  getBordersAssetUrl,
  getBordersAttribution,
  loadBordersAttribution,
  loadBordersCountryIndex,
  loadBordersCoverage,
  loadBordersMetrics,
  loadBordersPins,
  type BordersAdm2Manifest,
  type BordersAttributionPayload,
  type BordersCountryIndexRecord,
  type BordersMetricsPayload,
  type BordersPinRecord,
} from '../lib/bordersData';
import { resetBordersAxes } from '../lib/navigation';
import type {
  AxisLockMode,
  BordersProfileId,
  BordersSelectedFeature,
  BordersViewState,
  QualityMode,
} from '../state/viewerStore';

type BordersMapProps = {
  view: BordersViewState;
  quality: QualityMode;
  profileId: BordersProfileId;
  focusedCountryIso: string | null;
  selectedFeature: BordersSelectedFeature | null;
  showPinpoints: boolean;
  isFrozen: boolean;
  axisLockMode: AxisLockMode;
  shellMode: ShellMode;
  onLoading: () => void;
  onReady: () => void;
  onError: (message: string) => void;
  onNotice: (message: string | null) => void;
  onViewChange: (view: BordersViewState) => void;
  onFocusCountry: (iso3: string | null) => void;
  onSelectFeature: (feature: BordersSelectedFeature | null) => void;
};

const BORDERS_STYLE_URL = getBordersAssetUrl('style.json', { absolute: true });
const BORDERS_TILE_URL = getBordersAssetUrl('tiles/boundaries/{z}/{x}/{y}.pbf', {
  absolute: true,
});
const EMPTY_MANIFEST: BordersAdm2Manifest = {
  generatedAt: '',
  countries: [],
};
const BOUNDARY_RENDER_TIMEOUT_MS = 10_000;

const getMapView = (map: MapLibreMap): BordersViewState =>
  normalizeBordersView({
    center: [map.getCenter().lng, map.getCenter().lat],
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  });

const safeSetPaint = (
  map: MapLibreMap,
  layerId: string,
  property: string,
  value: unknown,
) => {
  if (!map.getLayer(layerId)) {
    return;
  }

  map.setPaintProperty(layerId, property, value as never);
};

const safeSetFilter = (map: MapLibreMap, layerId: string, value: unknown) => {
  if (!map.getLayer(layerId)) {
    return;
  }

  map.setFilter(layerId, value as never);
};

const applyBordersQuality = (map: MapLibreMap, quality: QualityMode) => {
  const lineWidth =
    quality === 'high' ? 1.45 : quality === 'balanced' ? 1.25 : 1.05;
  const adm1Opacity = quality === 'performance' ? 0.34 : 0.46;
  const pinRadius =
    quality === 'high' ? 5.6 : quality === 'balanced' ? 4.8 : 4.2;

  safeSetPaint(map, 'borders-adm0-line', 'line-width', [
    'interpolate',
    ['linear'],
    ['zoom'],
    0,
    lineWidth,
    6,
    lineWidth * 1.8,
  ]);
  safeSetPaint(map, 'borders-adm1-line', 'line-opacity', adm1Opacity);
  safeSetPaint(map, 'borders-pin-halo', 'circle-radius', pinRadius + 3);
  safeSetPaint(map, 'borders-pin-core', 'circle-radius', pinRadius);
};

const applyBordersInteractions = (
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
    const resetView = resetBordersAxes(getMapView(map));
    if (!bordersViewsEqual(getMapView(map), resetView)) {
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

const getFeatureString = (feature: MapGeoJSONFeature, key: string) => {
  const value = feature.properties?.[key];
  return typeof value === 'string' ? value : null;
};

const getFeatureNumber = (feature: MapGeoJSONFeature, key: string) => {
  const value = feature.properties?.[key];

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const getMetricValueForIso = (
  metrics: BordersMetricsPayload | null,
  iso3: string | null,
) => {
  if (metrics == null || iso3 == null) {
    return null;
  }

  const normalizedIso = iso3.toUpperCase();
  return (
    metrics.records.find((record) => record.iso3.toUpperCase() === normalizedIso)
      ?.value ?? null
  );
};

const getAdm2MetricValue = (feature: MapGeoJSONFeature) =>
  getFeatureNumber(feature, 'hierarchyMetricValue') ??
  getFeatureNumber(feature, 'metricValue');

const getRenderedAdm0FeatureCount = (map: MapLibreMap) => {
  if (!map.getLayer('borders-adm0-fill')) {
    return 0;
  }

  return map.queryRenderedFeatures(undefined, {
    layers: ['borders-adm0-fill'],
  }).length;
};

export function BordersMap({
  view,
  quality,
  profileId,
  focusedCountryIso,
  selectedFeature,
  showPinpoints,
  isFrozen,
  axisLockMode,
  shellMode,
  onLoading,
  onReady,
  onError,
  onNotice,
  onViewChange,
  onFocusCountry,
  onSelectFeature,
}: BordersMapProps) {
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
  const didReportReadyRef = useRef(false);
  const didReportErrorRef = useRef(false);
  const renderDeadlineRef = useRef<number | null>(null);
  const countryIndexRef = useRef<BordersCountryIndexRecord[] | null>(null);
  const adm2ManifestRef = useRef<BordersAdm2Manifest>(EMPTY_MANIFEST);
  const attributionPayloadRef = useRef<BordersAttributionPayload | null>(null);
  const metricPayloadRef = useRef<BordersMetricsPayload | null>(null);
  const pinRecordsRef = useRef<BordersPinRecord[] | null>(null);
  const notifyLoading = useEffectEvent(onLoading);
  const notifyReady = useEffectEvent(onReady);
  const notifyError = useEffectEvent(onError);
  const notifyNotice = useEffectEvent(onNotice);
  const emitViewChange = useEffectEvent(() => {
    if (!mapRef.current || isApplyingPropRef.current) {
      return;
    }

    onViewChange(cloneBordersView(getMapView(mapRef.current)));
  });
  const setDebugState = useEffectEvent(
    (state: 'loading' | 'ready' | 'error', featureCount = 0) => {
      const container = containerRef.current;

      if (!container) {
        return;
      }

      container.dataset.bordersState = state;
      container.dataset.bordersRenderedFeatures = `${featureCount}`;
    },
  );
  const clearRenderDeadline = useEffectEvent(() => {
    if (renderDeadlineRef.current != null) {
      window.clearTimeout(renderDeadlineRef.current);
      renderDeadlineRef.current = null;
    }
  });
  const failBoundaryBoot = useEffectEvent((message: string) => {
    if (didReportReadyRef.current || didReportErrorRef.current) {
      return;
    }

    didReportErrorRef.current = true;
    clearRenderDeadline();
    setDebugState('error');
    notifyError(message);
  });
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
      customAttribution: getBordersAttribution(attributionPayloadRef.current),
    });
    map.addControl(
      attributionControlRef.current,
      shellMode === 'dual-rail' ? 'bottom-right' : 'bottom-left',
    );

    if (shellMode === 'dual-rail') {
      return;
    }

    navigationControlRef.current = new maplibregl.NavigationControl({
      showCompass: true,
      showZoom: true,
    });
      map.addControl(navigationControlRef.current, 'top-left');
  });
  const confirmBoundariesRendered = useEffectEvent(() => {
    const map = mapRef.current;

    if (
      !map ||
      !isLoadedRef.current ||
      didReportReadyRef.current ||
      didReportErrorRef.current
    ) {
      return;
    }

    const featureCount = getRenderedAdm0FeatureCount(map);
    setDebugState('loading', featureCount);

    if (featureCount <= 0) {
      return;
    }

    didReportReadyRef.current = true;
    clearRenderDeadline();
    setDebugState('ready', featureCount);
    notifyReady();
    emitViewChange();
  });

  const applyAdm0Styling = useEffectEvent(() => {
    const map = mapRef.current;

    if (!map || !isLoadedRef.current) {
      return;
    }

    safeSetPaint(
      map,
      'borders-adm0-fill',
      'fill-color',
      buildBordersAdm0FillExpression(profileId, metricPayloadRef.current),
    );
    safeSetPaint(
      map,
      'borders-adm0-line',
      'line-color',
      buildBordersAdm0LineExpression(focusedCountryIso),
    );
  });

  const applyAdm2Styling = useEffectEvent(() => {
    const map = mapRef.current;

    if (!map || !isLoadedRef.current) {
      return;
    }

    const focusFilter = buildBordersAdm2Filter(focusedCountryIso);

    safeSetPaint(
      map,
      'borders-adm2-fill',
      'fill-color',
      buildBordersAdm2FillExpression(profileId),
    );
    safeSetPaint(
      map,
      'borders-adm2-line',
      'line-color',
      buildBordersAdm2LineExpression(selectedFeature),
    );
    safeSetFilter(map, 'borders-adm2-fill', focusFilter);
    safeSetFilter(map, 'borders-adm2-line', focusFilter);
  });

  const updatePinSource = useEffectEvent(() => {
    const map = mapRef.current;

    if (!map || !isLoadedRef.current) {
      return;
    }

    const source = map.getSource('borders-pins') as
      | maplibregl.GeoJSONSource
      | undefined;

    if (!source) {
      return;
    }

    source.setData(
      buildBordersPinsData({
        profileId,
        showPinpoints,
        records: pinRecordsRef.current,
      }) as never,
    );
  });

  const syncFocusNotice = useEffectEvent(() => {
    if (!focusedCountryIso) {
      notifyNotice(null);
      return;
    }

    const normalizedIso = focusedCountryIso.toUpperCase();
    const hasAdm2 = adm2ManifestRef.current.countries.some(
      (country) => country.iso3 === normalizedIso,
    );

    notifyNotice(hasAdm2 ? null : `${normalizedIso} has no local district pack.`);
  });

  const refreshProfileAssets = useEffectEvent(async () => {
    if (profileId === 'hierarchy') {
      metricPayloadRef.current = null;
      pinRecordsRef.current = null;
      applyAdm0Styling();
      applyAdm2Styling();
      updatePinSource();
      return;
    }

    const [metrics, pins] = await Promise.all([
      loadBordersMetrics(profileId),
      loadBordersPins(profileId),
    ]);

    metricPayloadRef.current = metrics;
    pinRecordsRef.current = pins;
    applyAdm0Styling();
    applyAdm2Styling();
    updatePinSource();
  });

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    notifyLoading();
    isLoadedRef.current = false;
    didReportReadyRef.current = false;
    didReportErrorRef.current = false;
    setDebugState('loading');

    const map = new maplibregl.Map({
      attributionControl: false,
      bearing: initialViewRef.current.bearing,
      center: initialViewRef.current.center,
      container: containerRef.current,
      keyboard: false,
      pitch: initialViewRef.current.pitch,
      renderWorldCopies: false,
      style: BORDERS_STYLE_URL,
      zoom: initialViewRef.current.zoom,
    });
    mapRef.current = map;

    const bootTimeout = window.setTimeout(() => {
      if (!isLoadedRef.current) {
        failBoundaryBoot('Borders view did not finish loading its local assets.');
      }
    }, 15_000);

    const handleLoad = async () => {
      try {
        const [
          countryIndex,
          adm2Manifest,
          attributionPayload,
          metrics,
          pinRecords,
        ] = await Promise.all([
          loadBordersCountryIndex(),
          loadBordersCoverage(),
          loadBordersAttribution(),
          profileId === 'hierarchy'
            ? Promise.resolve(null)
            : loadBordersMetrics(profileId),
          profileId === 'hierarchy'
            ? Promise.resolve(null)
            : loadBordersPins(profileId),
        ]);

        countryIndexRef.current = countryIndex;
        adm2ManifestRef.current = adm2Manifest;
        attributionPayloadRef.current = attributionPayload;
        metricPayloadRef.current = metrics;
        pinRecordsRef.current = pinRecords;
        window.clearTimeout(bootTimeout);

        map.setProjection({ type: 'globe' });
        map.keyboard.disable();
        syncShellControls(map);

        map.addSource('borders-boundaries', {
          type: 'vector',
          tiles: [BORDERS_TILE_URL],
          minzoom: 0,
          maxzoom: 6,
        });
        map.addSource('borders-pins', {
          type: 'geojson',
          data: buildBordersPinsData({
            profileId,
            showPinpoints,
            records: pinRecordsRef.current,
          }) as never,
        });

        map.addLayer({
          id: 'borders-adm0-fill',
          type: 'fill',
          source: 'borders-boundaries',
          'source-layer': 'adm0',
          paint: {
            'fill-color': buildBordersAdm0FillExpression(
              profileId,
              metricPayloadRef.current,
            ) as never,
            'fill-opacity': 0.94,
          },
        });
        map.addLayer({
          id: 'borders-adm1-line',
          type: 'line',
          source: 'borders-boundaries',
          'source-layer': 'adm1',
          minzoom: 2.6,
          paint: {
            'line-color': 'rgba(146, 208, 244, 0.42)',
            'line-opacity': 0.46,
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              2.6,
              0.5,
              6,
              1.2,
            ],
          },
        });
        map.addLayer({
          id: 'borders-adm0-line',
          type: 'line',
          source: 'borders-boundaries',
          'source-layer': 'adm0',
          paint: {
            'line-color': buildBordersAdm0LineExpression(
              focusedCountryIso,
            ) as never,
            'line-opacity': 0.92,
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0,
              1.1,
              6,
              2,
            ],
          },
        });
        map.addLayer({
          id: 'borders-adm2-fill',
          type: 'fill',
          source: 'borders-boundaries',
          'source-layer': 'adm2',
          minzoom: 4.8,
          filter: buildBordersAdm2Filter(focusedCountryIso) as never,
          paint: {
            'fill-color': buildBordersAdm2FillExpression(profileId) as never,
            'fill-opacity': 0.58,
          },
        });
        map.addLayer({
          id: 'borders-adm2-line',
          type: 'line',
          source: 'borders-boundaries',
          'source-layer': 'adm2',
          minzoom: 4.8,
          filter: buildBordersAdm2Filter(focusedCountryIso) as never,
          paint: {
            'line-color': buildBordersAdm2LineExpression(
              selectedFeature,
            ) as never,
            'line-opacity': 0.74,
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              4.8,
              0.4,
              7,
              1.4,
            ],
          },
        });
        map.addLayer({
          id: 'borders-pin-halo',
          type: 'circle',
          source: 'borders-pins',
          paint: {
            'circle-color': 'rgba(255, 208, 138, 0.28)',
            'circle-radius': 8,
            'circle-stroke-width': 0,
          },
        });
        map.addLayer({
          id: 'borders-pin-core',
          type: 'circle',
          source: 'borders-pins',
          paint: {
            'circle-color': '#ffd08a',
            'circle-radius': 5,
            'circle-stroke-color': '#07111d',
            'circle-stroke-width': 1.5,
          },
        });

        isLoadedRef.current = true;
        applyBordersQuality(map, quality);
        applyBordersInteractions(map, isFrozen, axisLockMode);
        syncFocusNotice();
        clearRenderDeadline();
        renderDeadlineRef.current = window.setTimeout(() => {
          failBoundaryBoot('Borders boundaries could not load their vector tiles.');
        }, BOUNDARY_RENDER_TIMEOUT_MS);
        confirmBoundariesRendered();
      } catch (error) {
        window.clearTimeout(bootTimeout);
        failBoundaryBoot(
          error instanceof Error
            ? error.message
            : 'Borders view could not load its local asset bundle.',
        );
      }
    };

    const handleError = (event: { error?: unknown }) => {
      if (didReportReadyRef.current || didReportErrorRef.current) {
        return;
      }

      window.clearTimeout(bootTimeout);
      if (event.error instanceof Error) {
        failBoundaryBoot(event.error.message);
        return;
      }

      failBoundaryBoot('Borders boundaries could not load their vector tiles.');
    };

    const handleMapClick = (event: maplibregl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(event.point, {
        layers: ['borders-adm2-fill', 'borders-adm0-fill'],
      });
      const adm2Feature = features.find(
        (feature) => feature.layer.id === 'borders-adm2-fill',
      );

      if (adm2Feature) {
        const iso3 = getFeatureString(adm2Feature, 'iso3');
        const featureId = getFeatureString(adm2Feature, 'featureId');
        const name = getFeatureString(adm2Feature, 'name');

        if (iso3 && featureId && name) {
          onSelectFeature({
            iso3,
            admLevel: 2,
            featureId,
            name,
            metricValue: getAdm2MetricValue(adm2Feature),
          });
          onFocusCountry(iso3);
          return;
        }
      }

      const adm0Feature = features.find(
        (feature) => feature.layer.id === 'borders-adm0-fill',
      );
      if (adm0Feature) {
        const iso3 = getFeatureString(adm0Feature, 'iso3');
        const name = getFeatureString(adm0Feature, 'name');

        if (iso3 && name) {
          onFocusCountry(iso3);
          onSelectFeature({
            iso3,
            admLevel: 0,
            featureId: iso3,
            name,
            metricValue: getMetricValueForIso(metricPayloadRef.current, iso3),
          });
          return;
        }
      }

      onSelectFeature(null);
    };

    map.on('load', handleLoad);
    map.on('error', handleError);
    map.on('moveend', emitViewChange);
    map.on('rotateend', emitViewChange);
    map.on('pitchend', emitViewChange);
    map.on('render', confirmBoundariesRendered);
    map.on('idle', confirmBoundariesRendered);
    map.on('zoomend', emitViewChange);
    map.on('click', handleMapClick);

    return () => {
      window.clearTimeout(bootTimeout);
      clearRenderDeadline();
      map.off('load', handleLoad);
      map.off('error', handleError);
      map.off('moveend', emitViewChange);
      map.off('rotateend', emitViewChange);
      map.off('pitchend', emitViewChange);
      map.off('render', confirmBoundariesRendered);
      map.off('idle', confirmBoundariesRendered);
      map.off('zoomend', emitViewChange);
      map.off('click', handleMapClick);
      map.remove();
      mapRef.current = null;
      navigationControlRef.current = null;
      attributionControlRef.current = null;
      isLoadedRef.current = false;
      didReportReadyRef.current = false;
      didReportErrorRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !isLoadedRef.current) {
      return;
    }

    applyBordersQuality(map, quality);
  }, [quality]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !isLoadedRef.current) {
      return;
    }

    applyBordersInteractions(map, isFrozen, axisLockMode);
  }, [axisLockMode, isFrozen]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    syncShellControls(map);
  }, [shellMode]);

  useEffect(() => {
    if (!isLoadedRef.current) {
      return;
    }

    refreshProfileAssets().catch((error) => {
      notifyError(
        error instanceof Error
          ? error.message
          : 'Borders profile assets could not be refreshed.',
      );
    });
  }, [profileId]);

  useEffect(() => {
    if (!isLoadedRef.current) {
      return;
    }

    updatePinSource();
  }, [showPinpoints]);

  useEffect(() => {
    if (!isLoadedRef.current) {
      return;
    }

    applyAdm0Styling();
    applyAdm2Styling();
    syncFocusNotice();
  }, [focusedCountryIso]);

  useEffect(() => {
    if (!isLoadedRef.current) {
      return;
    }

    applyAdm2Styling();
  }, [selectedFeature]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !isLoadedRef.current) {
      return;
    }

    const current = getMapView(map);
    const next = normalizeBordersView(view);

    if (bordersViewsEqual(current, next)) {
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
  }, [view]);

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

  return <div className="borders-map" ref={containerRef} />;
}
