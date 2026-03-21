import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Mesh, Texture } from 'three';
import type { QualityMode } from '../state/viewerStore';
import { useViewerStore } from '../state/viewerStore';
import {
  getBaseTextureCandidates,
  loadFirstAvailableEarthTexture,
  loadHighDetailEarthTexture,
  shouldUseHighDetailTexture,
} from '../lib/earthTextures';
import { createCloudTexture } from '../lib/proceduralTexture';

type EarthProps = {
  quality: QualityMode;
};

export function Earth({ quality }: EarthProps) {
  const gl = useThree((state) => state.gl);
  const isFrozen = useViewerStore((state) => state.isFrozen);
  const rendererTier = useViewerStore((state) => state.rendererTier);
  const setLoadState = useViewerStore((state) => state.setLoadState);
  const setErrorMessage = useViewerStore((state) => state.setErrorMessage);
  const cloudRef = useRef<Mesh>(null);
  const [baseDayMap, setBaseDayMap] = useState<Texture | null>(null);
  const [detailDayMap, setDetailDayMap] = useState<Texture | null>(null);
  const canUseHighDetail = shouldUseHighDetailTexture(quality, rendererTier);
  const baseTextureCandidates = useMemo(
    () => getBaseTextureCandidates(quality),
    [quality],
  );
  const activeDayMap = canUseHighDetail ? detailDayMap ?? baseDayMap : baseDayMap;
  const earthSphereSegments =
    quality === 'high' && rendererTier === 'standard'
      ? 96
      : quality === 'performance'
        ? 64
        : 80;
  const cloudSphereSegments =
    quality === 'high' && rendererTier === 'standard'
      ? 96
      : quality === 'performance'
        ? 56
        : 72;
  const cloudMap = useMemo(
    () =>
      createCloudTexture(
        quality === 'high' && rendererTier === 'standard'
          ? 1024
          : quality === 'performance'
            ? 512
            : 768,
      ),
    [quality, rendererTier],
  );

  useEffect(() => () => cloudMap.dispose(), [cloudMap]);

  useFrame((_, delta) => {
    if (cloudRef.current && !isFrozen) {
      cloudRef.current.rotation.y += delta * 0.015;
    }
  });

  useEffect(() => {
    let cancelled = false;
    const maxAnisotropy = Math.min(gl.capabilities.getMaxAnisotropy(), 6);

    setLoadState('booting');
    setErrorMessage(null);

    loadFirstAvailableEarthTexture(baseTextureCandidates)
      .then(({ texture }) => {
        if (cancelled) {
          return;
        }

        texture.anisotropy = maxAnisotropy;
        setBaseDayMap(texture);
        setLoadState('ready');
      })
      .catch(() => {
        if (!cancelled) {
          setBaseDayMap(null);
          setLoadState('error');
          setErrorMessage('The Earth texture could not be loaded.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [baseTextureCandidates, gl, setErrorMessage, setLoadState]);

  useEffect(() => {
    if (!canUseHighDetail) {
      return;
    }

    let cancelled = false;
    const maxAnisotropy = Math.min(gl.capabilities.getMaxAnisotropy(), 6);

    loadHighDetailEarthTexture()
      .then((texture) => {
        if (cancelled) {
          return;
        }

        texture.anisotropy = maxAnisotropy;
        setDetailDayMap(texture);
      })
      .catch(() => {
        if (!cancelled) {
          setDetailDayMap(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canUseHighDetail, gl]);

  if (!activeDayMap) {
    return null;
  }

  return (
    <group>
      <mesh>
        <sphereGeometry args={[1, earthSphereSegments, earthSphereSegments]} />
        <meshStandardMaterial
          map={activeDayMap}
          bumpMap={activeDayMap}
          bumpScale={
            quality === 'high' ? 0.008 : quality === 'balanced' ? 0.006 : 0.003
          }
          roughness={0.92}
          metalness={0}
        />
      </mesh>

      <mesh ref={cloudRef}>
        <sphereGeometry args={[1.012, cloudSphereSegments, cloudSphereSegments]} />
        <meshStandardMaterial
          map={cloudMap}
          transparent
          opacity={
            quality === 'high' ? 0.24 : quality === 'balanced' ? 0.2 : 0.14
          }
          depthWrite={false}
          alphaTest={0.08}
        />
      </mesh>
    </group>
  );
}
