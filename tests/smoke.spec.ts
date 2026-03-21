import { expect, test } from '@playwright/test';
import {
  createDefaultAnimationTimeline,
  serializeAnimationTimeline,
} from '../src/lib/animation';

const dismissOnboardingIfVisible = async (
  page: import('@playwright/test').Page,
) => {
  const onboardingButton = page.getByRole('button', {
    name: /enter viewport/i,
  });

  if ((await onboardingButton.isVisible().catch(() => false)) === true) {
    await onboardingButton.click({ force: true });
  }
};

const primeDismissedOnboarding = async (
  page: import('@playwright/test').Page,
) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('geo:onboarding-dismissed', 'true');
  });
};

const primeGeoAnimationDraft = async (
  page: import('@playwright/test').Page,
) => {
  const hex = serializeAnimationTimeline({
    ...createDefaultAnimationTimeline('geo'),
    totalDurationMs: 500,
    blocks: [
      {
        id: 'block-1',
        command: 'yaw+',
        startMs: 0,
        endMs: 500,
        amount: 10,
        acceleration: 0.25,
        enabled: true,
      },
    ],
  });

  await page.addInitScript((draftHex: string) => {
    window.localStorage.setItem('geo:animation-draft:geo', draftHex);
  }, hex);
};

const readViewportScrollMetrics = async (
  page: import('@playwright/test').Page,
) =>
  page.evaluate(() => ({
    innerHeight: window.innerHeight,
    innerWidth: window.innerWidth,
    scrollHeight: document.documentElement.scrollHeight,
    scrollWidth: document.documentElement.scrollWidth,
  }));

test('loads the viewer shell', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await primeDismissedOnboarding(page);
  await page.goto('/');
  await expect(
    page.locator('.overlay-rail--left').getByText(/geo \/\/ github pages/i),
  ).toBeVisible();
  await expect(page.getByRole('tab', { name: /headway/i })).toBeVisible();
  await expect(page.locator('.top-bar')).toHaveCount(0);
  await expect(page.locator('.overlay-rail--left')).toBeVisible();
  await expect(page.locator('.overlay-rail--right')).toBeVisible();

  const onboardingButton = page.getByRole('button', {
    name: /enter viewport/i,
  });
  const failedRendererHeading = page.getByRole('heading', {
    name: /3d renderer unavailable right now/i,
  });

  await expect
    .poll(
      async () => {
        if (await onboardingButton.isVisible().catch(() => false)) {
          return 'scene';
        }

        if (await failedRendererHeading.isVisible().catch(() => false)) {
          return 'failed';
        }

        return 'pending';
      },
      { timeout: 5_000 },
    )
    .not.toBe('pending');

  if ((await onboardingButton.isVisible().catch(() => false)) === true) {
    await expect(onboardingButton).toBeVisible();
    const controlsPanel = page.getByLabel('Viewer controls');
    await expect(controlsPanel.getByRole('button', { name: /freeze/i })).toBeVisible();
    await expect(controlsPanel.getByRole('button', { name: /^borders$/i })).toBeVisible();
    return;
  }

  await expect(failedRendererHeading).toBeVisible();
  await expect(
    page.getByRole('button', { name: /retry renderer/i }),
  ).toBeVisible();
});

test('can switch into Headway mode without breaking the shell', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await primeDismissedOnboarding(page);
  await page.goto('/');
  await dismissOnboardingIfVisible(page);

  await expect(page.locator('.overlay-tab--left')).toBeVisible();
  await expect(page.locator('.overlay-tab--right')).toBeVisible();

  await page.locator('.overlay-tab--right').click();
  await page.getByRole('tab', { name: /headway/i }).click();

  const controlsPanel = page.getByLabel('Viewer controls');
  await expect(controlsPanel.getByRole('button', { name: /axis lock/i })).toBeVisible();
  await expect(controlsPanel.getByRole('button', { name: /axis reset/i })).toBeVisible();
  await expect(controlsPanel.getByRole('button', { name: /freeze/i })).toBeVisible();
  await expect(controlsPanel.getByRole('button', { name: /borders/i })).toBeVisible();

  const headwayCanvas = page.locator('.headway-map .maplibregl-canvas');
  const headwayFallback = page.getByRole('heading', {
    name: /headway view unavailable right now/i,
  });

  await expect
    .poll(
      async () => {
        if ((await headwayCanvas.count()) > 0) {
          return 'ready';
        }

        if (await headwayFallback.isVisible().catch(() => false)) {
          return 'error';
        }

        return 'pending';
      },
      { timeout: 10_000 },
    )
    .not.toBe('pending');
});

test('animation editor exposes the Geo start pose fields', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await primeDismissedOnboarding(page);
  await page.goto('/');
  await dismissOnboardingIfVisible(page);

  await page.getByRole('button', { name: /open editor/i }).click();

  await expect(page.getByRole('spinbutton', { name: /latitude/i })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: /longitude/i })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: /distance/i })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: /roll/i })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: /^fov$/i })).toBeVisible();
});

test('help copy lists roll controls and no longer mentions trim pads', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await primeDismissedOnboarding(page);
  await page.goto('/');
  await dismissOnboardingIfVisible(page);

  await page.getByRole('button', { name: /help/i }).click();

  await expect(
    page.getByText(/right drag \/ shift\+drag/i),
  ).toBeVisible();
  await expect(
    page.getByText(/locked camera with saved start pose/i),
  ).toBeVisible();
  await expect(page.getByText(/view trim pads/i)).toHaveCount(0);
});

test('playback shows a stop control overlay and can be stopped', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await primeDismissedOnboarding(page);
  await primeGeoAnimationDraft(page);
  await page.goto('/');
  await dismissOnboardingIfVisible(page);

  await expect(page.getByRole('button', { name: /^play$/i })).toBeEnabled();
  await page.getByRole('button', { name: /^play$/i }).click();

  await expect(
    page.locator('[aria-label="Animation playback overlay"]'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /stop playback/i }),
  ).toBeVisible();

  await page.getByRole('button', { name: /stop playback/i }).click();
  await expect(page.locator('[aria-label="Animation workspace"]')).toBeVisible();
});

test('monitor viewport stays fixed without page scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await primeDismissedOnboarding(page);
  await page.goto('/');
  await dismissOnboardingIfVisible(page);

  const metrics = await readViewportScrollMetrics(page);

  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.innerHeight);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);
  await expect(page.locator('.overlay-rail--left')).toBeVisible();
  await expect(page.locator('.overlay-rail--right')).toBeVisible();
  await page.getByRole('button', { name: /minimize status rail/i }).click();
  await expect(page.locator('.overlay-rail--left')).toHaveClass(/overlay-rail--collapsed/);
  await page.locator('.overlay-tab--left').click();
  await expect(page.locator('.overlay-rail--left')).toHaveClass(/overlay-rail--open/);
});

test('tablet viewport uses collapsed tabs and never scrolls the page', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await primeDismissedOnboarding(page);
  await page.goto('/');
  await dismissOnboardingIfVisible(page);

  const metrics = await readViewportScrollMetrics(page);

  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.innerHeight);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);

  await expect(page.locator('.overlay-tab--left')).toBeVisible();
  await expect(page.locator('.overlay-tab--right')).toBeVisible();
  await page.locator('.overlay-tab--left').click();
  await expect(page.locator('.overlay-rail--left')).toHaveClass(/overlay-rail--open/);
  await page.locator('.overlay-tab--right').click();
  await expect(page.locator('.overlay-rail--right')).toHaveClass(/overlay-rail--open/);
  await expect(page.locator('.overlay-rail--left')).toHaveClass(/overlay-rail--collapsed/);
});

test('mobile viewport uses edge tabs and never scrolls the page', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await primeDismissedOnboarding(page);
  await page.goto('/');
  await dismissOnboardingIfVisible(page);

  const metrics = await readViewportScrollMetrics(page);

  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.innerHeight);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);

  await expect(page.locator('.overlay-tab--left')).toBeVisible();
  await expect(page.locator('.overlay-tab--right')).toBeVisible();
  await page.locator('.overlay-tab--right').click();
  await expect(page.locator('.overlay-rail--right')).toHaveClass(/overlay-rail--open/);
  await expect(page.getByLabel('Viewer controls')).toBeVisible();
});
