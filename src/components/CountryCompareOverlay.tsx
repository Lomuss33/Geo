import { useEffect, useMemo, useState } from 'react';
import { getCountryById } from '../lib/countryGeometry';
import { projectCountryOutlineToViewport } from '../lib/countryProjection';
import { clamp } from '../lib/math';
import type {
  CompareModeState,
  GlobeViewState,
  SelectedCountry,
} from '../state/viewerStore';

type CountryCompareOverlayProps = {
  compareModeState: CompareModeState;
  selectedCountry: SelectedCountry | null;
  view: GlobeViewState;
  onRelease: () => void;
  onExit: () => void;
};

type CompareLabelPlacement = 'above' | 'below' | 'top';

const COMPARE_OVERLAY_PADDING_PX = 16;
const COMPARE_LABEL_GAP_PX = 14;

const getViewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
});

export function CountryCompareOverlay({
  compareModeState,
  selectedCountry,
  view,
  onRelease,
  onExit,
}: CountryCompareOverlayProps) {
  const [viewport, setViewport] = useState(() => getViewport());

  useEffect(() => {
    const handleResize = () => setViewport(getViewport());
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const country = useMemo(
    () => (selectedCountry ? getCountryById(selectedCountry.id) : null),
    [selectedCountry],
  );

  const projection = useMemo(() => {
    if (compareModeState !== 'pinned' || country == null) {
      return null;
    }

    return projectCountryOutlineToViewport(country, {
      view,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
    });
  }, [compareModeState, country, view, viewport.height, viewport.width]);

  const isProjectionOnscreen =
    projection?.bounds != null &&
    projection.bounds.right >= 0 &&
    projection.bounds.bottom >= 0 &&
    projection.bounds.left <= viewport.width &&
    projection.bounds.top <= viewport.height;

  const showProjectedPath =
    projection?.hasVisibleGeometry === true &&
    projection.path.length > 0 &&
    isProjectionOnscreen;

  const floatingLabel = useMemo(() => {
    if (!showProjectedPath || projection?.bounds == null) {
      return null;
    }

    const labelWidth = Math.max(
      0,
      Math.min(420, viewport.width - COMPARE_OVERLAY_PADDING_PX * 2),
    );
    const labelHeight = viewport.width < 760 ? 164 : 112;
    const centerX = (projection.bounds.left + projection.bounds.right) / 2;
    const preferredLeft = centerX - labelWidth / 2;
    const left = clamp(
      preferredLeft,
      COMPARE_OVERLAY_PADDING_PX,
      Math.max(
        COMPARE_OVERLAY_PADDING_PX,
        viewport.width - labelWidth - COMPARE_OVERLAY_PADDING_PX,
      ),
    );
    const roomBelow =
      viewport.height -
      projection.bounds.bottom -
      COMPARE_LABEL_GAP_PX -
      COMPARE_OVERLAY_PADDING_PX;
    const placement: CompareLabelPlacement =
      roomBelow >= labelHeight ? 'below' : 'above';
    const preferredTop =
      placement === 'below'
        ? projection.bounds.bottom + COMPARE_LABEL_GAP_PX
        : projection.bounds.top - labelHeight - COMPARE_LABEL_GAP_PX;
    const top = clamp(
      preferredTop,
      COMPARE_OVERLAY_PADDING_PX,
      Math.max(
        COMPARE_OVERLAY_PADDING_PX,
        viewport.height - labelHeight - COMPARE_OVERLAY_PADDING_PX,
      ),
    );

    return {
      left,
      top,
      width: labelWidth,
      placement,
    };
  }, [projection, showProjectedPath, viewport.height, viewport.width]);

  if (compareModeState === 'off') {
    return null;
  }

  if (compareModeState === 'armed') {
    return (
      <div
        aria-live="polite"
        className="country-compare-layer"
        data-testid="country-compare-overlay"
      >
        <div
          className="country-compare__armed"
          data-testid="country-compare-armed"
          role="group"
          aria-label="Compare mode"
        >
          <div className="country-compare__armed-copy">
            <strong>Compare armed</strong>
            <small>Click a visible country to pin its live outline.</small>
          </div>
          <button
            aria-label="Cancel compare mode"
            className="country-compare__action country-compare__action--ghost"
            onClick={onExit}
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (selectedCountry == null) {
    return null;
  }

  const labelPlacement: CompareLabelPlacement =
    floatingLabel?.placement ?? 'top';
  const labelBody = showProjectedPath
    ? 'Live compare outline. Drag and zoom stay active.'
    : 'Pinned compare outline is off-screen. Drag back or exit compare.';

  return (
    <div
      aria-live="polite"
      className="country-compare-layer"
      data-testid="country-compare-overlay"
    >
      {showProjectedPath ? (
        <svg
          aria-hidden="true"
          className="country-compare__projected-svg"
          data-testid="country-compare-projection"
          viewBox={`0 0 ${viewport.width} ${viewport.height}`}
        >
          <path className="country-compare__halo" d={projection!.path} />
          <path className="country-compare__outline" d={projection!.path} />
        </svg>
      ) : null}
      <div
        className={`country-compare__label country-compare__label--${labelPlacement}`}
        data-testid={showProjectedPath ? 'country-compare-pinned' : 'country-compare-fallback'}
        role="group"
        aria-label={`Pinned compare state for ${selectedCountry.name}`}
        style={
          floatingLabel
            ? {
                left: `${floatingLabel.left}px`,
                top: `${floatingLabel.top}px`,
                width: `${floatingLabel.width}px`,
              }
            : undefined
        }
      >
        <div className="country-compare__label-copy">
          <strong>{selectedCountry.name}</strong>
          <small>{labelBody}</small>
        </div>
        <div className="country-compare__actions">
          <button
            aria-label={`Release outline for ${selectedCountry.name}`}
            className="country-compare__action"
            onClick={onRelease}
            type="button"
          >
            Release outline
          </button>
          <button
            aria-label="Done with compare mode"
            className="country-compare__action country-compare__action--ghost"
            onClick={onExit}
            type="button"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
