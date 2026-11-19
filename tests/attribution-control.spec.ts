import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

test('installed attribution control sanitizes later metadata in a real browser DOM', async ({
  page,
}) => {
  // Deliberately does not require WebGL: this verifies the vulnerable DOM/control
  // path in Firefox too, without claiming a full Firefox renderer/device run.
  await page.goto('about:blank');
  await page.addScriptTag({
    path: resolve('node_modules/maplibre-gl/dist/maplibre-gl.js'),
  });
  const result = await page.evaluate(async () => {
    const runtime = window as unknown as {
      maplibregl: {
        AttributionControl: new (options: {
          compact: boolean;
          customAttribution: string;
        }) => {
          onAdd(map: unknown): HTMLElement;
          onRemove(): void;
        };
      };
      __geoAttributionXss: number;
    };
    runtime.__geoAttributionXss = 0;
    const credit =
      '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap</a>';
    let attribution = credit;
    const listeners = new Map<string, ((event: unknown) => void)[]>();
    const map = {
      style: {
        stylesheet: {},
        tileManagers: {
          test: { used: true, getSource: () => ({ attribution }) },
        },
      },
      _getUIString: (name: string) => name,
      getCanvasContainer: () => document.body,
      on(name: string, listener: (event: unknown) => void) {
        listeners.set(name, [...(listeners.get(name) ?? []), listener]);
      },
      off() {},
    };
    const control = new runtime.maplibregl.AttributionControl({
      compact: false,
      customAttribution: credit,
    });
    const element = control.onAdd(map);
    document.body.append(element);
    attribution = `${credit} | <details open onload="void 0" ontoggle="window.__geoAttributionXss++">Updated metadata</details><a href="javascript:void(0)" onclick="window.__geoAttributionXss++">Unsafe link</a>`;
    for (const listener of listeners.get('sourcedata') ?? [])
      listener({ sourceDataType: 'metadata' });
    element
      .querySelector('.maplibregl-ctrl-attrib-inner details')
      ?.dispatchEvent(new Event('toggle'));
    element
      .querySelector('.maplibregl-ctrl-attrib-inner a:last-child')
      ?.dispatchEvent(new MouseEvent('click'));
    // Let the native details toggle event run as well as the explicit canaries.
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    const result = {
      executed: runtime.__geoAttributionXss,
      unsafe: element.querySelectorAll(
        '[ontoggle], [onload], [onclick], [href^="javascript:"]',
      ).length,
      text: element.textContent,
      creditLink: element.querySelector('a')?.getAttribute('href'),
    };
    control.onRemove();
    return result;
  });
  expect(result.executed).toBe(0);
  expect(result.unsafe).toBe(0);
  expect(result.text).toContain('Updated metadata');
  expect(result.creditLink).toBe('https://www.openstreetmap.org/copyright');
});
