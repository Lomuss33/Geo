import { AdditiveBlending, Color, ShaderMaterial } from 'three';
import { useEffect, useMemo } from 'react';

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

  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 3.6);
    float alpha = fresnel * uIntensity;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

export function Atmosphere() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
          uColor: { value: new Color('#57d2ff') },
          uIntensity: { value: 0.95 },
        },
        vertexShader,
        fragmentShader,
      }),
    [],
  );

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh material={material} scale={1.08}>
      <sphereGeometry args={[1, 96, 96]} />
    </mesh>
  );
}
