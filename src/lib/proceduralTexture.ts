import { CanvasTexture, NoColorSpace, RepeatWrapping } from 'three';

const fract = (value: number) => value - Math.floor(value);

const hash = (x: number, y: number) =>
  fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);

const smoothNoise = (x: number, y: number) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);

  const mixX1 = a + (b - a) * ux;
  const mixX2 = c + (d - c) * ux;
  return mixX1 + (mixX2 - mixX1) * uy;
};

const fbm = (x: number, y: number, octaves = 5) => {
  let amplitude = 0.55;
  let frequency = 1;
  let sum = 0;
  let totalAmplitude = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    sum += smoothNoise(x * frequency, y * frequency) * amplitude;
    totalAmplitude += amplitude;
    frequency *= 2.1;
    amplitude *= 0.48;
  }

  return sum / totalAmplitude;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export const createCloudTexture = (width = 1024, height = 512) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Unable to create cloud texture canvas.');
  }

  const image = context.createImageData(width, height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const nx = x / width;
      const ny = y / height;
      const latitude = Math.abs(ny - 0.5) * 2;
      const equatorialBelt = 1 - Math.pow(Math.min(1, latitude), 1.5);
      const tradeBands =
        0.9 + Math.sin(nx * Math.PI * 2.9 + ny * Math.PI * 6.8) * 0.05;
      const macro = fbm(nx * 3.2, ny * 2.1, 4);
      const regional = fbm(nx * 7.2 + macro * 0.7, ny * 4.8, 5);
      const wisps = fbm(nx * 18.4, ny * 10.3, 3);
      const breaks = fbm(nx * 2.4 + 18.7, ny * 1.8 + 7.9, 3);
      const cells = fbm(nx * 1.35 + 41.2, ny * 1.1 + 13.4, 3);
      const fairWeatherBias = 0.03 + equatorialBelt * 0.09;
      const structure =
        regional * 0.66 + wisps * 0.18 + macro * 0.08 - breaks * 0.24;
      const clusterMask = clamp01((cells - 0.52) * 2.6);
      const density = structure * tradeBands * clusterMask + fairWeatherBias;
      const coverage = clamp01((density - 0.69) * 2.4);
      const softness = clamp01(0.16 + wisps * 0.46 + regional * 0.16);
      const mask = Math.round(coverage * softness * 255);

      image.data[index] = mask;
      image.data[index + 1] = mask;
      image.data[index + 2] = mask;
      image.data[index + 3] = 255;
    }
  }

  context.putImageData(image, 0, 0);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = NoColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;

  return texture;
};
