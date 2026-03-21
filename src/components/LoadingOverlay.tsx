import { useMemo } from 'react';
import { useViewerStore } from '../state/viewerStore';

export function LoadingOverlay() {
  const viewerMode = useViewerStore((state) => state.viewerMode);
  const headwayRenderState = useViewerStore(
    (state) => state.headwayRenderState,
  );
  const loadState = useViewerStore((state) => state.loadState);
  const renderState = useViewerStore((state) => state.renderState);
  const message = useMemo(() => {
    if (viewerMode === 'headway') {
      return headwayRenderState === 'loading' ? 'Initializing Headway globe' : '';
    }

    if (renderState === 'initializing') {
      return 'Initializing 3D renderer';
    }

    if (renderState === 'recovering') {
      return 'Restoring graphics context';
    }

    switch (loadState) {
      case 'booting':
        return 'Resolving launch window';
      case 'degraded':
        return 'Running in degraded visual mode';
      case 'error':
        return 'Viewer failed to initialize';
      default:
        return '';
    }
  }, [headwayRenderState, loadState, renderState, viewerMode]);

  if (viewerMode === 'headway') {
    if (headwayRenderState !== 'loading') {
      return null;
    }
  } else if (
    renderState === 'failed' ||
    renderState === 'context-lost' ||
    (loadState === 'ready' && renderState !== 'recovering')
  ) {
    return null;
  }

  return (
    <div className="loading-overlay" aria-live="polite">
      <div className="loading-overlay__panel">
        <span className="loading-overlay__label">Mission feed</span>
        <strong>{message}</strong>
        <div className="loading-overlay__scanline" />
      </div>
    </div>
  );
}
