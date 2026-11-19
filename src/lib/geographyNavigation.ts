import { useViewerStore } from '../state/viewerStore';
import { DEFAULT_DISTANCE } from './constants';
import { geoFromBorders } from './bordersBridge';
import { geoFromHeadway } from './modeBridge';
import type { GeographyDestination } from './geography';
import { shouldLiveSyncViewUrl, updateUrlWithView } from './viewState';

// Stable callback: frame-by-frame viewer telemetry must not rerender the catalog.
export function navigateGeography(destination: GeographyDestination) {
  const state = useViewerStore.getState();
  if (state.isFrozen || state.animationSession.phase === 'playing') return;
  state.markInteracted();
  if (state.viewerMode === 'geo') {
    state.clearGeoOverviewState();
    if (destination.geo.distance < DEFAULT_DISTANCE) {
      state.setGeoOverviewAnchor({
        lat: destination.map.center[1],
        lon: destination.map.center[0],
      });
      state.setGeoOverviewHeading(0);
    }
    state.applyImmediateView(destination.geo);
  } else if (state.viewerMode === 'headway') {
    state.setHeadwayView(destination.map);
    state.applyImmediateView(geoFromHeadway(destination.map));
  } else {
    state.setBordersFocusedCountryIso(destination.countryIso);
    state.setBordersSelectedFeature(null);
    state.setBordersView(destination.map);
    state.applyImmediateView(geoFromBorders(destination.map));
  }
  if (shouldLiveSyncViewUrl()) {
    const next = useViewerStore.getState();
    updateUrlWithView(next.view, {
      viewerMode: next.viewerMode,
      headwayView: next.headwayView,
      bordersView: next.bordersView,
      bordersProfileId: next.bordersProfileId,
      bordersFocusedCountryIso: next.bordersFocusedCountryIso,
    });
  }
}
