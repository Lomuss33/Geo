import { CanvasTexture, Color, RepeatWrapping, SRGBColorSpace } from 'three';

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

export const createCloudTexture = (width = 1024, height = 512) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Unable to create cloud texture canvas.');
  }

  const image = context.createImageData(width, height);
  const mist = new Color('#eff8ff');

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const nx = x / width;
      const ny = y / height;
      const stormBands =
        Math.sin(nx * Math.PI * 10 + ny * Math.PI * 8) * 0.08 + 0.92;
      const density = fbm(nx * 7.6, ny * 5.8) * stormBands;
      const alpha = Math.max(0, Math.min(1, (density - 0.53) * 3.1));
      const brightness = Math.min(1, 0.88 + density * 0.24);

      image.data[index] = mist.r * 255 * brightness;
      image.data[index + 1] = mist.g * 255 * brightness;
      image.data[index + 2] = mist.b * 255 * brightness;
      image.data[index + 3] = alpha * 255;
    }
  }

  context.putImageData(image, 0, 0);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;

  return texture;
};
