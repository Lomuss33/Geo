import { buildAdm0 } from './build-adm0.mjs';
import { buildAdm1 } from './build-adm1.mjs';
import { buildAdm2 } from './build-adm2.mjs';
import { buildMetrics } from './build-metrics.mjs';
import { buildPins } from './build-pins.mjs';
import { buildTiles } from './build-tiles.mjs';

export const buildAll = async () => {
  await buildAdm0();
  await buildAdm1();
  await buildAdm2();
  await buildMetrics();
  await buildPins();
  await buildTiles();
};

await buildAll();
