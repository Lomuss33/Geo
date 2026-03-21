import {
  AdditiveBlending,
  BackSide,
  Color,
  ShaderMaterial,
  type ShaderMaterialParameters,
  Vector3,
} from 'three';
import { useEffect, useMemo } from 'react';
import { LOCAL_SUN_DIRECTION } from '../lib/constants';

type AtmosphereLayerProps = {
  color: string;
  intensity: number;
  power: number;
  scale: number;
  sunBoost: number;
};

const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(cameraPosition - worldPosition.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const fragmentShader = `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uPower;
  uniform float uSunBoost;
  uniform vec3 uSunDirection;

  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    float horizon = 1.0 - max(dot(vNormal, vViewDir), 0.0);
    float opticalDepth = pow(horizon, uPower);
    float densityBand = smoothstep(0.12, 0.98, opticalDepth);
    float sunFacing = clamp(dot(vNormal, normalize(uSunDirection)) * 0.5 + 0.5, 0.0, 1.0);
    float daylightBias = mix(0.14, 1.0, pow(sunFacing, uSunBoost));
    float alpha = opticalDepth * densityBand * daylightBias * uIntensity;
    vec3 tint = mix(uColor * 0.55, uColor, daylightBias);
    gl_FragColor = vec4(tint, alpha);
  }
`;

const ATMOSPHERE_LAYERS: AtmosphereLayerProps[] = [
  { scale: 1.004, color: '#f6c79d', intensity: 0.028, power: 13.0, sunBoost: 1.85 },
  { scale: 1.009, color: '#b9d4ff', intensity: 0.06, power: 9.8, sunBoost: 1.55 },
  { scale: 1.017, color: '#86b8ff', intensity: 0.045, power: 7.2, sunBoost: 1.35 },
  { scale: 1.032, color: '#6fa8ff', intensity: 0.022, power: 5.6, sunBoost: 1.2 },
  { scale: 1.056, color: '#9bbcff', intensity: 0.008, power: 4.4, sunBoost: 1.08 },
];

function AtmosphereLayer({
  color,
  intensity,
  power,
  scale,
  sunBoost,
}: AtmosphereLayerProps) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: BackSide,
        uniforms: {
          uColor: { value: new Color(color) },
          uIntensity: { value: intensity },
          uPower: { value: power },
          uSunBoost: { value: sunBoost },
          uSunDirection: { value: new Vector3(0, 0, 1) },
        },
        vertexShader,
        fragmentShader,
      } satisfies ShaderMaterialParameters),
    [color, intensity, power, sunBoost],
  );

  useEffect(() => {
    const sunUniform = material.uniforms.uSunDirection;

    if (!sunUniform) {
      return;
    }

    (sunUniform.value as Vector3).copy(LOCAL_SUN_DIRECTION).normalize();
  }, [material]);

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh material={material} scale={scale}>
      <sphereGeometry args={[1, 96, 96]} />
    </mesh>
  );
}

export function Atmosphere() {
  return (
    <>
      {ATMOSPHERE_LAYERS.map((layer) => (
        <AtmosphereLayer
          color={layer.color}
          intensity={layer.intensity}
          key={layer.scale}
          power={layer.power}
          scale={layer.scale}
          sunBoost={layer.sunBoost}
        />
      ))}
    </>
  );
}
