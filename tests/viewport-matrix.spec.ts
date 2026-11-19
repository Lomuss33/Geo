import { expect, test } from '@playwright/test';
import {
  controlledHeadway,
  editorMeasurement,
  insideViewport,
  openControls,
  openEditor,
  readyRenderer,
} from './helpers/regression';

test.setTimeout(60_000);

const viewports = [
  { width: 320, height: 568, workspace: 'mobile' },
  { width: 390, height: 844, workspace: 'mobile' },
  { width: 844, height: 390, workspace: 'stacked' },
  { width: 1024, height: 768, workspace: 'stacked' },
  { width: 1440, height: 900, workspace: 'bounded' },
  { width: 1600, height: 900, workspace: 'bounded' },
] as const;

for (const viewport of viewports) {
  test.describe(`viewport ${viewport.width}x${viewport.height}`, () => {
    test.use({ hasTouch: viewport.width <= 844 });
    test(`renderer/theme/keyboard matrix ${viewport.width}x${viewport.height}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await controlledHeadway(page);
      await page.goto('./');
      await readyRenderer(page, 'geo');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await openControls(page);

      const theme = page.getByRole('button', {
        name: 'Switch to light mode',
        exact: true,
      });
      await theme.focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
      await expect(
        page.getByRole('tab', { name: 'Geo', exact: true }),
      ).toHaveCSS('border-radius', '0px');
      await insideViewport(page, page.locator('.overlay-rail--right'));

      const help = page.getByRole('button', { name: 'Help', exact: true });
      await help.focus();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await insideViewport(page, dialog);
      await page.keyboard.press('Tab');
      expect(
        await dialog.evaluate((element) =>
          element.contains(document.activeElement),
        ),
      ).toBe(true);
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(help).toBeFocused();

      const search = page.getByRole('searchbox', { name: 'Find a country' });
      await search.fill('Hrvatska');
      const country = page.getByRole('button', {
        name: 'Croatia HRV',
        exact: true,
      });
      await country.focus();
      await page.keyboard.press('Enter');
      await expect(country).toHaveAttribute('aria-pressed', 'true');
      await insideViewport(page, country);

      for (const [name, mode] of [
        ['Headway', 'headway'],
        ['Borders', 'borders'],
        ['Geo', 'geo'],
      ] as const) {
        await openControls(page);
        const tab = page.getByRole('tab', { name, exact: true });
        await tab.focus();
        await page.keyboard.press('Enter');
        await readyRenderer(page, mode);
        await expect(tab).toHaveAttribute('aria-selected', 'true');
        if (mode !== 'geo')
          await expect(
            page.locator('.maplibregl-ctrl-attrib-inner'),
          ).not.toBeEmpty();
      }

      await openControls(page);
      const darkMode = page.getByRole('button', {
        name: 'Switch to dark mode',
        exact: true,
      });
      if (viewport.width <= 844) await darkMode.tap();
      else await darkMode.click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await page.screenshot({ path: testInfo.outputPath('viewer.png') });
      await openEditor(page);
      const frame = page.locator(
        `.animation-workspace__frame--${viewport.workspace}`,
      );
      await expect(frame).toBeVisible();
      const bounds = await editorMeasurement(page, testInfo, 'editor-geometry');
      await insideViewport(page, frame);
      if (viewport.workspace === 'bounded')
        expect(bounds.width).toBeLessThanOrEqual(840);
      await insideViewport(
        page,
        page.getByRole('button', { name: 'Return to viewer', exact: true }),
      );
      await page.screenshot({ path: testInfo.outputPath('editor.png') });
      await page
        .getByRole('button', { name: 'Return to viewer', exact: true })
        .focus();
      await page.keyboard.press('Escape');
      await expect(frame).toHaveCount(0);
      await readyRenderer(page, 'geo');
      const metrics = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(metrics.scroll).toBeLessThanOrEqual(metrics.width);
    });
  });
}

test('cold ultrawide editor remains bounded on opening and viewport changes', async ({
  page,
}, testInfo) => {
  // Four separate cold navigations plus resize/measurement cycles. This is a
  // composite functional check, not a first-map performance budget.
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 2560, height: 1080 });
  for (let cycle = 0; cycle < 4; cycle++) {
    await page.goto('./');
    await openEditor(page);
    const sample = await editorMeasurement(page, testInfo, `initial-${cycle}`);
    expect(sample.width).toBeLessThanOrEqual(840);
    const buttons = page
      .getByRole('group', { name: 'Move commands' })
      .getByRole('button');
    await expect(buttons).toHaveCount(6);
    const first = await buttons.first().boundingBox();
    const last = await buttons.last().boundingBox();
    expect(Math.abs(first!.y - last!.y)).toBeLessThanOrEqual(2);
    await page.setViewportSize({ width: 1600, height: 900 });
    expect(
      (await editorMeasurement(page, testInfo, `resized-${cycle}`)).width,
    ).toBeLessThanOrEqual(840);
    await page.setViewportSize({ width: 2560, height: 1080 });
  }
  // Reproduce the observed full-width failure shape without claiming its cause.
  // An independent cap must still hold if the fluid width becomes full-screen.
  const frame = page.locator('.animation-workspace__frame--bounded');
  await frame.evaluate((element) => {
    (element as HTMLElement).style.width = '100vw';
  });
  expect(
    (await editorMeasurement(page, testInfo, 'full-width-fault')).width,
  ).toBeLessThanOrEqual(840);
  await insideViewport(page, frame);
});

test.describe('touch orientation', () => {
  test.use({ hasTouch: true });
  test('orientation and a reduced keyboard viewport preserve theme and input', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./');
    await openControls(page);
    await page
      .getByRole('button', { name: 'Switch to light mode', exact: true })
      .click();
    const search = page.getByRole('searchbox', { name: 'Find a country' });
    await search.fill('Bosnia');
    await search.focus();
    // A viewport simulation, not a real Android soft-keyboard/device test.
    for (const viewport of [
      { width: 844, height: 390 },
      { width: 390, height: 420 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      const orientation =
        viewport.width >= viewport.height ? 'landscape' : 'portrait';
      await expect(page.locator('.app-shell')).toHaveClass(
        new RegExp(`app-shell--${orientation}`),
      );
      // The responsive commit is followed by the rail-reset effect. Let that
      // commit paint before deciding whether the control drawer needs opening.
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      await openControls(page);
      await expect(search).toHaveValue('Bosnia');
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
      await insideViewport(page, search);
    }
  });
});
