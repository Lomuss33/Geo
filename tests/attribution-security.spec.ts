import { expect, test } from '@playwright/test';

const credit =
  '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap test credit</a>';
const attack =
  '<details open onload="void 0" ontoggle="window.__geoAttributionXss++">Attribution canary</details><a href="javascript:void(0)" onclick="window.__geoAttributionXss++">Unsafe URL canary</a>';

for (const entrance of [
  'headway-style',
  'headway-tilejson',
  'borders-custom',
] as const) {
  test(`attribution remains inert through ${entrance}`, async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.addInitScript(() => {
      (window as unknown as Record<string, number>).__geoAttributionXss = 0;
    });
    if (entrance.startsWith('headway')) {
      await page.route('**/assets/headway/headway-style.json', (route) =>
        route.fulfill({
          json: {
            version: 8,
            sources: {
              canary:
                entrance === 'headway-style'
                  ? {
                      type: 'geojson',
                      data: { type: 'FeatureCollection', features: [] },
                      attribution: `${credit} | ${attack}`,
                    }
                  : {
                      type: 'vector',
                      url: 'https://geo-security.invalid/source.json',
                    },
            },
            layers: [
              {
                id: 'background',
                type: 'background',
                paint: { 'background-color': '#111111' },
              },
              {
                id: 'canary',
                type: 'fill',
                source: 'canary',
                ...(entrance === 'headway-tilejson'
                  ? { 'source-layer': 'test' }
                  : {}),
              },
            ],
          },
        }),
      );
      await page.route('https://geo-security.invalid/source.json', (route) =>
        route.fulfill({
          json: {
            tilejson: '3.0.0',
            tiles: ['https://geo-security.invalid/{z}/{x}/{y}.pbf'],
            minzoom: 0,
            maxzoom: 0,
            attribution: `${credit} | ${attack}`,
          },
        }),
      );
      await page.route('https://geo-security.invalid/**/*.pbf', (route) =>
        route.fulfill({
          body: Buffer.alloc(0),
          contentType: 'application/x-protobuf',
        }),
      );
    } else {
      await page.route('**/assets/borders/attribution.json', (route) =>
        route.fulfill({
          json: {
            sources: [credit, attack, 'geoBoundaries gbOpen', 'Natural Earth'],
          },
        }),
      );
    }
    await page.goto(
      `./?mode=${entrance === 'borders-custom' ? 'borders' : 'headway'}`,
    );
    const credits = page.locator('.maplibregl-ctrl-attrib-inner');
    await expect(credits).toContainText('Attribution canary');
    await expect(
      credits.getByRole('link', { name: '© OpenStreetMap test credit' }),
    ).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright');
    // Explicitly dispatch local canary events too, so event-loop timing cannot
    // make an unsanitized handler appear safe. Nothing contacts an attacker.
    await credits
      .locator('details')
      .evaluate((element) => element.dispatchEvent(new Event('toggle')));
    await credits
      .getByText('Unsafe URL canary')
      .evaluate((element) => element.dispatchEvent(new MouseEvent('click')));
    expect(
      await page.evaluate(
        () => (window as unknown as Record<string, number>).__geoAttributionXss,
      ),
    ).toBe(0);
    await expect(
      credits.locator('[ontoggle], [onload], [onclick], [href^="javascript:"]'),
    ).toHaveCount(0);
  });
}
