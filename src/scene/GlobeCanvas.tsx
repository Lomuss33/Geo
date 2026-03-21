import { Suspense, useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import type { WebGLRenderer } from 'three';
import { Vector3 } from 'three';
import type { DirectionalLight, Group } from 'three';
import { LOCAL_SUN_DIRECTION } from '../lib/constants';
import {
  getCloseZoomInfluence,
  getGeoActualSurfaceAngleDeg,
  getGeoCameraTransitionT,
  getGeoControlMode,
  getGeoApparentScale,
  getGeoDesiredSurfaceAngleDeg,
  getGeoEffectiveFov,
  getGeoLinearZoomT,
  getGeoLookPitchDeg,
  getGeoTargetApparentScale,
  getOverviewPinnedSurfaceDebug,
} from '../lib/camera';
import {
  createRendererWithTiers,
  toRendererInitFailure,
} from '../lib/renderer';
import type { RendererInitFailure } from '../lib/renderer';
import type { RendererFactoryDefaults } from '../lib/renderer';
import type {
  CompareModeState,
  QualityMode,
  RendererTier,
  SelectedCountry,
} from '../state/viewerStore';
import { useViewerStore } from '../state/viewerStore';
import { Atmosphere } from './Atmosphere';
import { CountryBorders } from './CountryBorders';
import { Earth } from './Earth';
import { GlobeController } from './GlobeController';

type GlobeCanvasProps = {
  quality: QualityMode;
  showBorders: boolean;
  isFrozen: boolean;
  compareModeState: CompareModeState;
  selectedCountryId: string | null;
  canvasInstanceKey: number;
  onContextLost: () => void;
  onContextRestored: () => void;
  onRendererReady: (input: {
    tier: RendererTier;
    attemptedTiers: RendererTier[];
  }) => void;
  onRendererFailed: (failure: RendererInitFailure) => void;
  onCountryPick: (country: SelectedCountry) => void;
};

type SceneProps = Pick<
  GlobeCanvasProps,
  | 'quality'
  | 'showBorders'
  | 'isFrozen'
  | 'compareModeState'
  | 'selectedCountryId'
  | 'onContextLost'
  | 'onContextRestored'
  | 'onCountryPick'
>;

function WebGLLifecycleBridge({
  onContextLost,
  onContextRestored,
}: Pick<SceneProps, 'onContextLost' | 'onContextRestored'>) {
  const canvas = useThree((state) => state.gl.domElement);

  useEffect(() => {
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      onContextLost();
    };
    const handleContextRestored = () => {
      onContextRestored();
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, [canvas, onContextLost, onContextRestored]);

  return null;
}

function CanvasFailureSignal({
  failureRef,
  onRendererFailed,
}: {
  failureRef: RefObject<RendererInitFailure | null>;
  onRendererFailed: GlobeCanvasProps['onRendererFailed'];
}) {
  const hasNotifiedRef = useRef(false);

  useEffect(() => {
    if (hasNotifiedRef.current) {
      return;
    }

    hasNotifiedRef.current = true;
    onRendererFailed(
      failureRef.current ?? {
        tier: null,
        attemptedTiers: [],
        reason: 'canvas-fallback',
        message: 'Geo could not initialize a WebGL renderer in this session.',
      },
    );
  }, [failureRef, onRendererFailed]);

  return null;
}

function Scene({
  quality,
  showBorders,
  isFrozen,
  compareModeState,
  selectedCountryId,
  onContextLost,
  onContextRestored,
  onCountryPick,
}: SceneProps) {
  const globeGroup = useRef<Group>(null);
  const lightRef = useRef<DirectionalLight>(null);
  const sunVector = useRef(new Vector3());

  useFrame(() => {
    if (!lightRef.current || !globeGroup.current) {
      return;
    }

    sunVector.current
      .copy(LOCAL_SUN_DIRECTION)
      .applyQuaternion(globeGroup.current.quaternion)
      .multiplyScalar(5);
    lightRef.current.position.copy(sunVector.current);
  });

  return (
    <>
      <color attach="background" args={['#040915']} />
      <fog attach="fog" args={['#040915', 7.5, 16]} />
      <ambientLight
        color="#eef4fb"
        intensity={quality === 'performance' ? 0.76 : 0.84}
      />
      <hemisphereLight
        args={['#f8fbff', '#d4deea', quality === 'performance' ? 0.36 : 0.42]}
      />
      <directionalLight color="#fffdf7" intensity={0.96} ref={lightRef} />
      <pointLight color="#f3f8ff" intensity={0.18} position={[-5, 0.5, -8]} />
      <Stars
        radius={120}
        depth={60}
        count={
          quality === 'high' ? 4_500 : quality === 'balanced' ? 2_800 : 1_200
        }
        factor={4}
        saturation={0}
        fade
        speed={isFrozen ? 0 : 0.18}
      />
      <Suspense fallback={null}>
        <group ref={globeGroup}>
          <Earth quality={quality} />
          {showBorders ? <CountryBorders quality={quality} /> : null}
          <Atmosphere />
        </group>
      </Suspense>
      <WebGLLifecycleBridge
        onContextLost={onContextLost}
        onContextRestored={onContextRestored}
      />
      <GlobeController
        compareModeState={compareModeState}
        globeGroup={globeGroup}
        onCountryPick={onCountryPick}
        selectedCountryId={selectedCountryId}
      />
    </>
  );
}

function GeoOverviewDebugOverlay() {
  const view = useViewerStore((state) => state.view);
  const geoOverviewAnchor = useViewerStore(
    (state) => state.geoOverviewAnchor,
  );
  const geoOverviewHeadingDeg = useViewerStore(
    (state) => state.geoOverviewHeadingDeg,
  );
  const enabled = useMemo(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return (
      new URLSearchParams(window.location.search).get('geoDebug') ===
      'overview'
    );
  }, []);

  if (!enabled) {
    return null;
  }

  const linearZoomT = getGeoLinearZoomT(view.distance);
  const cameraTransitionT = getGeoCameraTransitionT(view.distance);
  const lookPitchDeg = getGeoLookPitchDeg(view.distance);
  const desiredSurfaceAngleDeg = getGeoDesiredSurfaceAngleDeg(view.distance);
  const closeInfluence = getCloseZoomInfluence(view.distance);
  const effectiveFov = getGeoEffectiveFov(view);
  const apparentScale = getGeoApparentScale({
    distance: view.distance,
    effectiveFov,
  });
  const targetApparentScale = getGeoTargetApparentScale(view);
  const controlMode = getGeoControlMode(view.distance);
  const pinnedSurfaceDebug = getOverviewPinnedSurfaceDebug(view);
  const anchorScreenY = (1 - pinnedSurfaceDebug.anchorNdcY) / 2;
  const actualSurfaceAngleDeg = getGeoActualSurfaceAngleDeg(
    view,
    pinnedSurfaceDebug.anchorNdcY,
  );

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 3,
        color: '#d8f1ff',
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: '11px',
        letterSpacing: '0.04em',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          minWidth: '15rem',
          padding: '0.75rem 0.9rem',
          border: '1px solid rgba(160, 220, 255, 0.35)',
          borderRadius: '0.75rem',
          background: 'rgba(4, 9, 21, 0.82)',
          backdropFilter: 'blur(12px)',
          lineHeight: 1.5,
        }}
      >
        <div>closeInfluence: {closeInfluence.toFixed(3)}</div>
        <div>linearZoomT: {linearZoomT.toFixed(3)}</div>
        <div>cameraTransitionT: {cameraTransitionT.toFixed(3)}</div>
        <div>controlMode: {controlMode}</div>
        <div>lookPitchDeg: {lookPitchDeg.toFixed(2)}</div>
        <div>desiredSurfaceAngle: {desiredSurfaceAngleDeg.toFixed(2)}</div>
        <div>actualSurfaceAngle: {actualSurfaceAngleDeg.toFixed(2)}</div>
        <div>anchorY: {(anchorScreenY * 100).toFixed(1)}%</div>
        <div>anchorNdcY: {pinnedSurfaceDebug.anchorNdcY.toFixed(3)}</div>
        <div>
          pinnedNdcY: {pinnedSurfaceDebug.anchorNdcY.toFixed(3)}
        </div>
        <div>effectiveFov: {effectiveFov.toFixed(2)}</div>
        <div>apparentScale: {apparentScale.toFixed(3)}</div>
        <div>targetApparentScale: {targetApparentScale.toFixed(3)}</div>
        <div>
          rayFallbackUsed: {pinnedSurfaceDebug.rayFallbackUsed ? 'true' : 'false'}
        </div>
        <div>
          anchorLat:{' '}
          {geoOverviewAnchor ? geoOverviewAnchor.lat.toFixed(2) : 'null'}
        </div>
        <div>
          anchorLon:{' '}
          {geoOverviewAnchor ? geoOverviewAnchor.lon.toFixed(2) : 'null'}
        </div>
        <div>headingDeg: {geoOverviewHeadingDeg.toFixed(2)}</div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: '1.5rem',
          height: 1,
          marginLeft: '-0.75rem',
          background: 'rgba(255,255,255,0.8)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 1,
          height: '1.5rem',
          marginTop: '-0.75rem',
          background: 'rgba(255,255,255,0.8)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          insetInline: 0,
          top: `${anchorScreenY * 100}%`,
          borderTop: '1px dashed rgba(94, 213, 255, 0.5)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: `${anchorScreenY * 100}%`,
          width: '2rem',
          height: 1,
          marginLeft: '-1rem',
          background: 'rgba(94, 213, 255, 0.95)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: `${anchorScreenY * 100}%`,
          width: 1,
          height: '2rem',
          marginTop: '-1rem',
          background: 'rgba(94, 213, 255, 0.95)',
        }}
      />
    </div>
  );
}

export function GlobeCanvas({
  quality,
  showBorders,
  isFrozen,
  compareModeState,
  selectedCountryId,
  canvasInstanceKey,
  onContextLost,
  onContextRestored,
  onRendererReady,
  onRendererFailed,
  onCountryPick,
}: GlobeCanvasProps) {
  const dpr: [number, number] =
    quality === 'performance'
      ? [1, 1]
      : quality === 'high'
        ? [1, 1.25]
        : [1, 1.1];
  const attemptedTiersRef = useRef<RendererTier[]>([]);
  const activeTierRef = useRef<RendererTier | null>(null);
  const failureRef = useRef<RendererInitFailure | null>(null);

  const glFactory = useMemo(
    () =>
      (defaultProps: RendererFactoryDefaults) => {
        attemptedTiersRef.current = [];
        activeTierRef.current = null;
        failureRef.current = null;

        try {
          const result = createRendererWithTiers<WebGLRenderer>(
            defaultProps,
            quality,
          );
          attemptedTiersRef.current = [...result.attemptedTiers];
          activeTierRef.current = result.tier;
          return result.renderer;
        } catch (error) {
          failureRef.current = toRendererInitFailure(error);
          attemptedTiersRef.current = [...failureRef.current.attemptedTiers];
          activeTierRef.current = failureRef.current.tier;
          throw error;
        }
      },
    [quality],
  );

  return (
    <div className="globe-canvas">
      <Canvas
        key={canvasInstanceKey}
        camera={{ position: [0, 0, 3.15], fov: 28 }}
        dpr={dpr}
        fallback={
          <CanvasFailureSignal
            failureRef={failureRef}
            onRendererFailed={onRendererFailed}
          />
        }
        gl={glFactory}
        onCreated={() =>
          onRendererReady({
            tier: activeTierRef.current ?? 'standard',
            attemptedTiers:
              attemptedTiersRef.current.length > 0
                ? [...attemptedTiersRef.current]
                : ['standard'],
          })
        }
      >
        <Scene
          quality={quality}
          showBorders={showBorders}
          isFrozen={isFrozen}
          compareModeState={compareModeState}
          selectedCountryId={selectedCountryId}
          onContextLost={onContextLost}
          onContextRestored={onContextRestored}
          onCountryPick={onCountryPick}
        />
      </Canvas>
      <GeoOverviewDebugOverlay />
    </div>
  );
}
