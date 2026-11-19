import {
  expect,
  type Locator,
  type Page,
  type TestInfo,
} from '@playwright/test';

// A renderer fixture, not a geographic dataset or a provider availability test.
// No remote fonts, sprites or tiles are required for controlled Headway checks.
export async function controlledHeadway(page: Page) {
  await page.route('**/assets/headway/headway-style.json', (route) =>
    route.fulfill({
      json: {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#203040' },
          },
        ],
      },
    }),
  );
}

export async function openControls(page: Page) {
  const button = page.getByRole('button', {
    name: 'Open control rail',
    exact: true,
  });
  if (await button.isVisible()) await button.click();
}

export async function openSection(page: Page, section: string) {
  const toggle = page.getByRole('button', {
    name: `Toggle ${section.toLowerCase()} section`,
    exact: true,
  });
  if ((await toggle.getAttribute('aria-expanded')) !== 'true')
    await toggle.click();
}

export async function openEditor(page: Page) {
  await openControls(page);
  await openSection(page, 'Animation');
  await page.getByRole('button', { name: 'Open editor', exact: true }).click();
  await expect(
    page.getByRole('region', { name: 'Animation workspace' }),
  ).toBeVisible();
}

export async function readyRenderer(page: Page, mode: string) {
  const host = page.locator('.scene-host');
  await expect(host).toHaveAttribute('data-viewer-mode', mode);
  await expect(host).toHaveAttribute('data-renderer-state', 'ready', {
    timeout: 20_000,
  });
  await expect(host.locator('canvas').first()).toBeVisible();
  if (mode === 'geo') {
    await expect(page.locator('.loading-overlay')).toHaveCount(0, {
      timeout: 20_000,
    });
  }
  if (mode === 'borders') {
    await expect(page.locator('.borders-map')).toHaveAttribute(
      'data-borders-state',
      'ready',
    );
    await expect
      .poll(async () =>
        Number(
          await page
            .locator('.borders-map')
            .getAttribute('data-borders-rendered-features'),
        ),
      )
      .toBeGreaterThan(0);
  }
}

export async function insideViewport(page: Page, locator: Locator) {
  // Responsive rails intentionally slide. Measure their final geometry, not an
  // intermediate transform after a viewport/orientation change.
  await locator.evaluate(async (element) => {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    const pending: Promise<unknown>[] = [];
    for (
      let ancestor: Element | null = element;
      ancestor;
      ancestor = ancestor.parentElement
    ) {
      for (const animation of ancestor.getAnimations()) {
        if (Number.isFinite(animation.effect?.getComputedTiming().endTime))
          pending.push(animation.finished.catch(() => {}));
      }
    }
    await Promise.all(pending);
  });
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  const viewport = page.viewportSize()!;
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.width).toBeGreaterThan(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
}

export async function editorMeasurement(
  page: Page,
  testInfo: TestInfo,
  label: string,
) {
  const frame = page.locator('.animation-workspace__frame');
  const measurement = await frame.evaluate((element) => {
    const style = getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    return {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      className: element.className,
      cssWidth: style.width,
      maxWidth: style.maxWidth,
      gutter: style.getPropertyValue('--workspace-gutter'),
      viewport: [innerWidth, innerHeight],
    };
  });
  await testInfo.attach(label, {
    body: JSON.stringify(measurement),
    contentType: 'application/json',
  });
  return measurement;
}
