import ReactDOM from 'react-dom/client';
import App from './app/App';
import { createDefaultAnimationTimeline } from './lib/animation';
import { getResponsiveStartupGeoView } from './lib/camera';
import { cloneView } from './lib/math';
import { cloneHeadwayView, headwayFromGeo } from './lib/modeBridge';
import { readUrlState, normalizeInitialRuntimeUrl } from './lib/viewState';
import { useViewerStore } from './state/viewerStore';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles/global.css';

normalizeInitialRuntimeUrl();

const initialUrlState = readUrlState();
const url = new URL(window.location.href);
const responsiveStartupView = getResponsiveStartupGeoView(
  initialUrlState.view,
  window.innerWidth,
  window.innerHeight,
);
const responsiveStartupHeadwayView =
  initialUrlState.mode === 'headway' && url.searchParams.has('map')
    ? initialUrlState.headwayView
    : headwayFromGeo(responsiveStartupView);

useViewerStore.setState({
  view: cloneView(responsiveStartupView),
  targetView: cloneView(responsiveStartupView),
  viewerMode: initialUrlState.mode,
  headwayView: cloneHeadwayView(responsiveStartupHeadwayView),
  headwayRenderState: initialUrlState.mode === 'headway' ? 'loading' : 'idle',
  headwayErrorMessage: null,
  animationDraft: createDefaultAnimationTimeline(initialUrlState.mode),
});

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <App />,
);
