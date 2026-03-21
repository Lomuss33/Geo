import { useEffect, useMemo, useState } from 'react';
import { buildCountryFrontProjection, getCountryById } from '../lib/countryGeometry';
import type {
  CompareModeState,
  GlobeViewState,
  SelectedCountry,
} from '../state/viewerStore';

type CountryCompareOverlayProps = {
  compareModeState: CompareModeState;
  selectedCountry: SelectedCountry | null;
  view: GlobeViewState;
  onClear: () => void;
};

const getViewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
});

const getGeoSphereRadiusPx = (
  view: GlobeViewState,
  viewportHeight: number,
) => {
  const fov = view.fov * (Math.PI / 180);
  const focalLength = (viewportHeight / 2) / Math.tan(fov / 2);
  return focalLength / view.distance;
};

export function CountryCompareOverlay({
  compareModeState,
  selectedCountry,
  view,
  onClear,
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

  const sphereRadiusPx = useMemo(
    () => getGeoSphereRadiusPx(view, viewport.height),
    [view, viewport.height],
  );

  const boxSizePx = useMemo(
    () =>
      Math.max(
        240,
        Math.min(
          Math.min(viewport.width, viewport.height) * 0.84,
          sphereRadiusPx * 1.95,
        ),
      ),
    [sphereRadiusPx, viewport.height, viewport.width],
  );

  const outlinePath = useMemo(() => {
    if (!country) {
      return '';
    }

    return buildCountryFrontProjection(country, {
      widthPx: boxSizePx,
      heightPx: boxSizePx,
      zoomFactor: sphereRadiusPx,
    });
  }, [boxSizePx, country, sphereRadiusPx]);

  if (
    compareModeState !== 'pinned' ||
    selectedCountry == null ||
    country == null ||
    outlinePath.length === 0
  ) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="country-compare-layer"
      data-testid="country-compare-overlay"
    >
      <div
        className="country-compare"
        style={{
          width: `${boxSizePx}px`,
          height: `${boxSizePx}px`,
        }}
      >
        <svg
          aria-hidden="true"
          className="country-compare__svg"
          viewBox={`0 0 ${boxSizePx} ${boxSizePx}`}
        >
          <path className="country-compare__halo" d={outlinePath} />
          <path className="country-compare__fill" d={outlinePath} />
          <path className="country-compare__outline" d={outlinePath} />
        </svg>
        <div className="country-compare__label" role="group">
          <div className="country-compare__label-copy">
            <strong>{selectedCountry.name}</strong>
            <small>Sticky compare outline</small>
          </div>
          <button
            aria-label={`Release compare for ${selectedCountry.name}`}
            className="country-compare__clear"
            onClick={onClear}
            type="button"
          >
            Release compare
          </button>
        </div>
      </div>
    </div>
  );
}
