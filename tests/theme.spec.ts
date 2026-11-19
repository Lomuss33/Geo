import { expect, test, type Page } from '@playwright/test';
import { storageKey } from '../src/lib/theme';

async function openViewer(
  page: Page,
  viewport: { width: number; height: number },
) {
  await page.setViewportSize(viewport);
  await page.addInitScript(() =>
    localStorage.setItem('geo:onboarding-dismissed', 'true'),
  );
  await page.goto('./');
  const openRail = page.getByRole('button', {
    name: 'Open control rail',
    exact: true,
  });
  if (await openRail.isVisible()) await openRail.click();
}

for (const viewport of [
  { width: 1600, height: 900 },
  { width: 390, height: 844 },
  { width: 320, height: 568 },
]) {
  test(`light theme contrast persists after reload at ${viewport.width}px`, async ({
    page,
  }, testInfo) => {
    await openViewer(page, viewport);
    await page
      .getByRole('button', { name: 'Switch to light mode', exact: true })
      .click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    const selected = page.getByRole('tab', { name: 'Geo', exact: true });
    await expect(selected).toHaveCSS('background-color', 'rgb(17, 17, 17)');
    await expect(selected).toHaveCSS('color', 'rgb(245, 245, 245)');
    await expect(selected).toHaveCSS('border-radius', '0px');
    await page
      .getByRole('searchbox', { name: 'Find a country' })
      .fill('Croatia');
    const country = page.getByRole('button', {
      name: 'Croatia HRV',
      exact: true,
    });
    await country.click();
    await expect(country).toHaveAttribute('aria-pressed', 'true');
    if (viewport.width < 760) {
      const bounds = await country.boundingBox();
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
    }
    await expect(country).toHaveCSS('background-color', 'rgb(17, 17, 17)');
    await expect(country).toHaveCSS('color', 'rgb(245, 245, 245)');
    await page.screenshot({
      path: testInfo.outputPath('theme-light.png'),
    });
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  // Keep persistence/reload and cross-workspace theme behavior independent.
  // Each retains the normal 30s functional budget on software-rendered CI.
  test(`dark theme contrast reaches Time atlas at ${viewport.width}px`, async ({
    page,
  }, testInfo) => {
    await page.addInitScript(
      (key) => localStorage.setItem(key, 'light'),
      storageKey,
    );
    await openViewer(page, viewport);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page
      .getByRole('button', { name: 'Switch to dark mode', exact: true })
      .click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const selected = page.getByRole('tab', { name: 'Geo', exact: true });
    await expect(selected).toHaveCSS('background-color', 'rgb(245, 245, 245)');
    await expect(selected).toHaveCSS('color', 'rgb(9, 9, 9)');
    await page
      .getByRole('searchbox', { name: 'Find a country' })
      .fill('Croatia');
    const country = page.getByRole('button', {
      name: 'Croatia HRV',
      exact: true,
    });
    await country.click();
    await expect(country).toHaveCSS('background-color', 'rgb(245, 245, 245)');
    await expect(country).toHaveCSS('color', 'rgb(9, 9, 9)');
    await page.screenshot({
      path: testInfo.outputPath('theme-dark.png'),
    });
    await page.getByRole('button', { name: /open time atlas/i }).click();
    await expect(
      page.getByRole('main', { name: 'Time atlas workspace' }),
    ).toBeVisible();
    await expect(page.locator('.time-atlas')).toHaveCSS(
      'background-color',
      'rgb(17, 17, 17)',
    );
    await page
      .getByRole('button', { name: 'Switch to light mode', exact: true })
      .click();
    await expect(page.locator('.time-atlas')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    );
    await page.screenshot({
      path: testInfo.outputPath('theme-atlas.png'),
    });
  });
}
