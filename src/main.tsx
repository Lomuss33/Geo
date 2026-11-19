import { initializeTheme } from './lib/theme';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { createDefaultAnimationTimeline } from './lib/animation';
import {
  bordersFromGeo,
  cloneBordersView,
  geoFromBorders,
} from './lib/bordersBridge';
import { getResponsiveStartupGeoView } from './lib/camera';
import { cloneView } from './lib/math';
import { cloneHeadwayView, headwayFromGeo } from './lib/modeBridge';
import {
  deserializeViewState,
  readUrlState,
  normalizeInitialRuntimeUrl,
} from './lib/viewState';
import { useViewerStore } from './state/viewerStore';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles/global.css';

initializeTheme();
normalizeInitialRuntimeUrl();

const initialUrlState = readUrlState();
const url = new URL(window.location.href);
const initialGeoView =
  initialUrlState.mode === 'borders' && url.searchParams.has('map')
    ? geoFromBorders(initialUrlState.bordersView)
    : initialUrlState.view;
const restoresGeoView =
  initialUrlState.mode === 'geo' &&
  deserializeViewState(url.searchParams.get('view')) !== null;
const responsiveStartupView = restoresGeoView
  ? cloneView(initialGeoView)
  : getResponsiveStartupGeoView(
      initialGeoView,
      window.innerWidth,
      window.innerHeight,
    );
const responsiveStartupHeadwayView =
  initialUrlState.mode === 'headway' && url.searchParams.has('map')
    ? initialUrlState.headwayView
    : headwayFromGeo(responsiveStartupView);
const responsiveStartupBordersView =
  initialUrlState.mode === 'borders' && url.searchParams.has('map')
    ? initialUrlState.bordersView
    : bordersFromGeo(responsiveStartupView);

useViewerStore.setState({
  view: cloneView(responsiveStartupView),
  targetView: cloneView(responsiveStartupView),
  // A shared frame is already an explicit view choice. Also prevent the
  // controller's first-canvas/resize startup fit from replacing that choice.
  hasInteracted: restoresGeoView,
  viewerMode: initialUrlState.mode,
  headwayView: cloneHeadwayView(responsiveStartupHeadwayView),
  headwayRenderState: initialUrlState.mode === 'headway' ? 'loading' : 'idle',
  headwayErrorMessage: null,
  bordersView: cloneBordersView(responsiveStartupBordersView),
  bordersRenderState: initialUrlState.mode === 'borders' ? 'loading' : 'idle',
  bordersErrorMessage: null,
  bordersNoticeMessage: null,
  bordersProfileId: initialUrlState.bordersProfileId,
  bordersFocusedCountryIso: initialUrlState.bordersFocusedCountryIso,
  bordersSelectedFeature: null,
  showBordersPinpoints: true,
  animationDraft: createDefaultAnimationTimeline(
    initialUrlState.mode === 'headway' ? 'headway' : 'geo',
  ),
});

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <App />,
);
