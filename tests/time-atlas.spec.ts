import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const fixture = {
  format: 'geo-time-atlas',
  schemaVersion: 1,
  layers: [
    {
      id: 'test',
      title: 'Fictional test boundary',
      scope: 'balkans',
      perspective: 'borders',
      confidence: 'approximate',
      source: {
        title: 'Test fixture source',
        url: 'https://example.org/fixture',
        license: 'Test-only fixture',
      },
      kind: 'vector',
      features: [
        {
          type: 'Feature',
          id: 'area',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [10, 40],
                [20, 40],
                [20, 50],
                [10, 40],
              ],
            ],
          },
          properties: {
            label: 'Fictional boundary',
            description: 'Fixture only, not a historical claim.',
            fromYear: 1000,
            toYear: 1100,
          },
        },
      ],
    },
  ],
};

async function openAtlas(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem('geo:onboarding-dismissed', 'true'),
  );
  await page.goto('./');
  const rail = page.getByRole('button', {
    name: 'Open control rail',
    exact: true,
  });
  if (await rail.isVisible()) await rail.click();
  await page.getByRole('button', { name: 'Open Time atlas →' }).click();
  await expect(
    page.getByRole('main', { name: 'Time atlas workspace' }),
  ).toBeVisible();
}

test('blocks the unreviewed first-party pilot while keeping user imports available', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  const requested: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/assets/time-atlas/'))
      requested.push(request.url());
  });
  await openAtlas(page);
  await expect(
    page.getByRole('button', { name: /Pilot unavailable/ }),
  ).toBeDisabled();
  await expect(page.getByText(/Source rights review pending/)).toBeVisible();
  await page.getByLabel('Import time atlas file').setInputFiles({
    name: 'private-fixture.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(fixture)),
  });
  await expect(page.getByText('1 dated features visible')).toBeVisible();
  expect(requested).toEqual([]);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export atlas', exact: true }).click();
  const download = await downloadPromise;
  const exported = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(exported.layers[0].source).toEqual(fixture.layers[0]!.source);
  expect(exported.layers[0].features).toEqual(fixture.layers[0]!.features);
});

test('keeps Earth as the starter and opens a separate empty temporal atlas', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await openAtlas(page);
  await expect(
    page.getByText('No layers loaded for this perspective.'),
  ).toBeVisible();
  await expect(page.getByText(/Modern geographic reference/)).toBeVisible();
  await page.getByRole('button', { name: /Back to Earth/ }).click();
  await expect(
    page.getByRole('tab', { name: 'Geo', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
});

test('imports sourced geometry, filters inclusive dates and exports an editable atlas', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await openAtlas(page);
  const file = {
    name: 'test-atlas.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(fixture)),
  };
  await page.getByLabel('Import time atlas file').setInputFiles(file);
  await expect(page.getByText('1 dated features visible')).toBeVisible();
  await expect(page.getByLabel('Time atlas world map')).toHaveAttribute(
    'data-atlas-ready',
    'true',
    { timeout: 20000 },
  );
  await page.getByRole('button', { name: /Fictional boundary/ }).click();
  await expect(page.getByLabel('Selected historical record')).toContainText(
    'Fixture only, not a historical claim.',
  );
  await expect(page.getByLabel('Time atlas world map')).toHaveAttribute(
    'data-atlas-tiles-ready',
    'true',
    { timeout: 15000 },
  );
  await page.screenshot({ path: 'test-results/time-atlas-desktop.png' });
  const year = page.getByLabel('Atlas year', { exact: true });
  await year.fill('1101');
  await year.press('Tab');
  await expect(page.getByText('0 dated features visible')).toBeVisible();
  await year.fill('1100');
  await year.press('Tab');
  await expect(page.getByText('1 dated features visible')).toBeVisible();
  await page.getByLabel('Import time atlas file').setInputFiles(file);
  await expect(page.getByRole('alert')).toContainText('Duplicate layer ID');
  await expect(page.getByText('1 dated features visible')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export atlas', exact: true }).click();
  const download = await downloadPromise;
  const exported = JSON.parse(
    await readFile((await download.path())!, 'utf8'),
  ) as typeof fixture;
  expect(exported.layers[0]?.features[0]?.properties.fromYear).toBe(1000);
  expect(exported.layers[0]?.source.url).toBe('https://example.org/fixture');
  await page.reload();
  const rail = page.getByRole('button', {
    name: 'Open control rail',
    exact: true,
  });
  if (await rail.isVisible()) await rail.click();
  await page.getByRole('button', { name: 'Open Time atlas →' }).click();
  await page.getByRole('button', { name: 'First record' }).click();
  await expect(page.getByText('1 dated features visible')).toBeVisible();
});

test('adds a sourced place on mobile without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openAtlas(page);
  await page.getByRole('button', { name: '+ Add record', exact: true }).click();
  const form = page.getByRole('form', { name: 'Add sourced location' });
  await form.getByLabel('Title', { exact: true }).fill('Test-only place');
  await form.getByLabel('Perspective').selectOption('rulers');
  await form.getByLabel('From year').fill('1000');
  await form.getByLabel('To year').fill('1010');
  await form.getByLabel('Longitude').fill('16');
  await form.getByLabel('Latitude').fill('45');
  await form.getByLabel('Source title').fill('Test fixture');
  await form.getByLabel('Source URL').fill('https://example.org/fixture');
  await form.getByLabel('License / usage terms').fill('Test only');
  await form.getByRole('button', { name: 'Save location record' }).click();
  await expect(page.getByText('1 dated features visible')).toBeVisible();
  await expect(
    page.getByRole('button', { name: /People & rule/ }),
  ).toHaveAttribute('aria-pressed', 'true');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: 'test-results/time-atlas-mobile.png' });
});
