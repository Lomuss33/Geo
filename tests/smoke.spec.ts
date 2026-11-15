import { expect, test } from '@playwright/test';
import {
  createDefaultAnimationTimeline,
  serializeAnimationTimeline,
} from '../src/lib/animation';
import { DEFAULT_VIEW } from '../src/lib/constants';
import {
  serializeBordersViewState,
  serializeViewState,
} from '../src/lib/viewState';

test('geography search supports keyboard selection and scope changes without switching mode', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await primeDismissedOnboarding(page);
  await page.goto('./?mode=borders');
  await waitForBordersBoundaries(page);
  const explorer = page.getByRole('region', { name: 'Geography explorer' });
  const scope = explorer.getByLabel('Geographic scope');
  await scope.selectOption('balkans');
  const search = explorer.getByLabel('Find a country');
  await search.fill('Hrvatska');
  await search.press('Tab');
  await page.keyboard.press('Enter');
  await expect(
    explorer.getByRole('button', { name: 'Croatia HRV' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(explorer.getByText('Globe outline available.')).toBeVisible();
  await expect(
    page.getByRole('tab', { name: 'Borders', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(page).toHaveURL(/focus=HRV/);

  await scope.selectOption('europe');
  await expect(
    explorer.getByRole('button', { name: 'Croatia HRV' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await scope.selectOption('world');
  await search.fill('United States');
  await explorer
    .getByRole('button', { name: 'United States USA', exact: true })
    .click();
  await scope.selectOption('balkans');
  await expect(explorer.getByText(/Previous selection cleared/)).toBeVisible();
  await expect(search).toHaveValue('');
  await expect(
    explorer.getByRole('button', { name: /United States/ }),
  ).toHaveCount(0);
});

test('country navigation preserves Geo and Headway modes and handles missing outlines', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await primeDismissedOnboarding(page);
  await page.goto('./');
  const explorer = page.getByRole('region', { name: 'Geography explorer' });
  await explorer.getByLabel('Geographic scope').selectOption('balkans');
  await explorer.getByLabel('Find a country').fill('Croatia');
  await explorer.getByRole('button', { name: 'Croatia HRV' }).click();
  await expect(
    page.getByRole('tab', { name: 'Geo', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(
    page.getByLabel('View telemetry').getByText(/^4[3-7]\.\d° N$/),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Headway', exact: true }).click();
  await explorer.getByLabel('Find a country').fill('Bosnia');
  await explorer
    .getByRole('button', { name: 'Bosnia and Herzegovina BIH' })
    .click();
  await expect(
    page.getByRole('tab', { name: 'Headway', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await explorer.getByLabel('Find a country').fill('Kosovo');
  await explorer.getByRole('button', { name: 'Kosovo XKX' }).click();
  await expect(
    explorer.getByText('No bundled globe outline; camera unchanged.'),
  ).toBeVisible();
});

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
  durationMs = 500,
) => {
  const hex = serializeAnimationTimeline({
    ...createDefaultAnimationTimeline('geo'),
    totalDurationMs: durationMs,
    blocks: [
      {
        id: 'block-1',
        command: 'yaw+',
        startMs: 0,
        endMs: durationMs,
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

const openAnimationSection = async (page: import('@playwright/test').Page) => {
  const toggle = page.getByRole('button', {
    name: /toggle animation section/i,
  });

  if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click();
  }
};

const openMotionSection = async (page: import('@playwright/test').Page) => {
  const toggle = page.getByRole('button', { name: /toggle motion section/i });

  if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click();
  }
};

const openViewpointsSection = async (page: import('@playwright/test').Page) => {
  const toggle = page.getByRole('button', {
    name: /toggle viewpoints section/i,
  });

  if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click();
  }
};

const waitForBordersBoundaries = async (
  page: import('@playwright/test').Page,
) => {
  const bordersMap = page.locator('.borders-map');

  await expect(bordersMap).toHaveAttribute('data-borders-state', 'ready', {
    timeout: 15_000,
  });
  await expect
    .poll(
      async () =>
        Number(
          (await bordersMap.getAttribute('data-borders-rendered-features')) ??
            '0',
        ),
      { timeout: 15_000 },
    )
    .toBeGreaterThan(0);
};

test('loads the viewer shell', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('/');
  await expect(page.locator('.overlay-rail--left')).toBeVisible();
  await expect(page.getByLabel('Viewer overview').first()).toBeVisible();
  await expect(page.getByRole('tab', { name: /headway/i })).toBeVisible();
  await expect(page.locator('.top-bar')).toHaveCount(0);
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
    await expect(
      page.getByRole('button', { name: /toggle motion section/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /toggle animation section/i }),
    ).toBeVisible();
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

  const openControlRailButton = page.getByRole('button', {
    name: /open control rail/i,
  });

  if ((await openControlRailButton.count()) > 0) {
    await openControlRailButton.click();
  }

  await page.getByRole('tab', { name: /headway/i }).click();

  const controlsPanel = page.getByLabel('Viewer controls');
  await expect(
    controlsPanel.getByRole('button', { name: /axis lock/i }),
  ).toBeVisible();
  await expect(
    controlsPanel.getByRole('button', { name: /axis reset/i }),
  ).toBeVisible();
  await openMotionSection(page);
  await expect(page.getByRole('button', { name: /freeze/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /borders/i })).toBeVisible();

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

test('Borders mode shows the legend and restores profile and focus from a shareable URL', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await primeDismissedOnboarding(page);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  const view = serializeViewState(DEFAULT_VIEW);
  const map = serializeBordersViewState({
    center: [-96, 37.8],
    zoom: 2.7,
    bearing: 16,
    pitch: 22,
  });

  await page.goto(
    `/?mode=borders&view=${view}&map=${map}&profile=population&focus=USA`,
  );
  await dismissOnboardingIfVisible(page);
  await waitForBordersBoundaries(page);

  await expect(page.getByRole('tab', { name: /borders/i })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByLabel('Borders legend')).toBeVisible();
  await expect(
    page
      .getByLabel('Observation provenance')
      .getByRole('link', { name: 'World Bank Open Data' }),
  ).toBeVisible();
  await expect(page.getByLabel('Observation provenance')).toContainText(
    'Observation year:',
  );
  await expect(page.getByLabel('Observation provenance')).toContainText(
    'Source snapshot:',
  );
  await expect(page.getByText(/profile: population/i)).toBeVisible();
  await expect(
    page
      .getByLabel('View telemetry')
      .getByText(/focus: united states \(usa\)/i),
  ).toBeVisible();

  await page.getByRole('button', { name: /hierarchy/i }).click();
  await expect(page.getByText(/profile: hierarchy/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /pinpoints/i })).toBeVisible();

  await page.getByRole('button', { name: /copy share link/i }).click();

  const shareUrl = await page.evaluate(() => navigator.clipboard.readText());

  expect(shareUrl).toContain('mode=borders');
  expect(shareUrl).toContain('profile=hierarchy');
  expect(shareUrl).toContain('focus=USA');

  await page.goto(shareUrl);
  await dismissOnboardingIfVisible(page);
  await waitForBordersBoundaries(page);

  await expect(page.getByRole('tab', { name: /borders/i })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByLabel('Borders legend')).toBeVisible();
  await expect(page.getByText(/profile: hierarchy/i)).toBeVisible();
  await expect(
    page
      .getByLabel('View telemetry')
      .getByText(/focus: united states \(usa\)/i),
  ).toBeVisible();
});

test('animation editor exposes the Geo start pose fields', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await primeDismissedOnboarding(page);
  await page.goto('/');
  await dismissOnboardingIfVisible(page);

  await openAnimationSection(page);
  await page.getByRole('button', { name: /open editor/i }).click();

  const frame = page.locator('.animation-workspace__frame--bounded');
  await expect(frame).toBeVisible();

  await expect(
    page.getByRole('spinbutton', { name: /latitude/i }),
  ).toBeVisible();
  await expect(
    page.getByRole('spinbutton', { name: /longitude/i }),
  ).toBeVisible();
  await expect(
    page.getByRole('spinbutton', { name: /distance/i }),
  ).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: /roll/i })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: /^fov$/i })).toBeVisible();
  await expect(page.locator('.animation-workspace__helper[open]')).toHaveCount(
    0,
  );

  const frameBox = await frame.boundingBox();
  expect(frameBox).not.toBeNull();
  expect(frameBox!.width).toBeLessThanOrEqual(840);
});

test('ultrawide animation workspace keeps the command strips on one row', async ({
  page,
}) => {
  await page.setViewportSize({ width: 2560, height: 1080 });
  await primeDismissedOnboarding(page);
  await page.goto('/');
  await dismissOnboardingIfVisible(page);

  await openAnimationSection(page);
  await page.getByRole('button', { name: /open editor/i }).click();

  const frame = page.locator('.animation-workspace__frame--bounded');
  await expect(frame).toBeVisible();

  const frameBox = await frame.boundingBox();
  expect(frameBox).not.toBeNull();
  expect(frameBox!.width).toBeLessThanOrEqual(840);

  const moveButtons = page
    .getByRole('group', { name: /move commands/i })
    .getByRole('button');
  await expect(moveButtons).toHaveCount(6);

  const firstButtonBox = await moveButtons.nth(0).boundingBox();
  const lastButtonBox = await moveButtons.nth(5).boundingBox();
  expect(firstButtonBox).not.toBeNull();
  expect(lastButtonBox).not.toBeNull();
  expect(Math.abs(firstButtonBox!.y - lastButtonBox!.y)).toBeLessThanOrEqual(2);
});

test('help copy lists roll controls and no longer mentions trim pads', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await primeDismissedOnboarding(page);
  await page.goto('/');
  await dismissOnboardingIfVisible(page);

  await page.getByRole('button', { name: /help/i }).click();

  await expect(page.getByText(/right drag \/ shift\+drag/i)).toBeVisible();
  await expect(
    page.getByText(/locked camera.*saved start pose/i),
  ).toBeVisible();
  await expect(page.getByText(/view trim pads/i)).toHaveCount(0);
});

test('compare mode can be armed and canceled from the overlay', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await primeDismissedOnboarding(page);
  await page.goto('/');
  await dismissOnboardingIfVisible(page);

  await page.getByRole('button', { name: /^compare$/i }).click();

  await expect(page.getByTestId('country-compare-armed')).toBeVisible();
  await expect(
    page
      .getByTestId('country-compare-armed')
      .getByText(/click a visible country to pin its live outline/i),
  ).toBeVisible();

  await page.getByRole('button', { name: /cancel compare mode/i }).click();

  await expect(page.getByTestId('country-compare-armed')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^compare$/i })).toBeVisible();
});

test('playback shows a stop control overlay and can be stopped', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await primeDismissedOnboarding(page);
  await primeGeoAnimationDraft(page, 5_000);
  await page.goto('/');
  await dismissOnboardingIfVisible(page);

  await openAnimationSection(page);
  await expect(page.getByRole('button', { name: /^play$/i })).toBeEnabled();
  await page.getByRole('button', { name: /^play$/i }).click();

  await expect(
    page.locator('[aria-label="Animation playback overlay"]'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /stop playback/i }),
  ).toBeVisible();

  await page.getByRole('button', { name: /stop playback/i }).click();
  await expect(
    page.locator('[aria-label="Animation workspace"]'),
  ).toBeVisible();
});

test('monitor viewport stays fixed without page scrolling', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await primeDismissedOnboarding(page);
  await page.goto('/');
  await dismissOnboardingIfVisible(page);

  const metrics = await readViewportScrollMetrics(page);

  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.innerHeight);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);
  const openStatusRailButton = page.getByRole('button', {
    name: /open status rail/i,
  });
  const closeStatusRailButton = page.getByRole('button', {
    name: /minimize status rail|close status rail/i,
  });

  if ((await closeStatusRailButton.count()) > 0) {
    await closeStatusRailButton.click();
    await expect(openStatusRailButton).toBeVisible();
    await openStatusRailButton.click();
    await expect(closeStatusRailButton).toBeVisible();
  } else {
    await expect(openStatusRailButton).toBeVisible();
    await openStatusRailButton.click();
    await expect(closeStatusRailButton).toBeVisible();
  }
});

test('secondary control sections expand to reveal animation and viewpoint tools', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await primeDismissedOnboarding(page);
  await page.goto('/');
  await dismissOnboardingIfVisible(page);

  await openAnimationSection(page);
  await expect(page.getByText(/geo timeline/i)).toBeVisible();
  await expect(
    page.getByRole('button', { name: /open editor/i }),
  ).toBeVisible();

  await openViewpointsSection(page);
  await expect(
    page.getByRole('button', { name: /atlantic drift/i }),
  ).toBeVisible();
});

test('single-rail viewport opens the control rail by default and never scrolls the page', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await primeDismissedOnboarding(page);
  await page.goto('/');
  await dismissOnboardingIfVisible(page);

  const metrics = await readViewportScrollMetrics(page);

  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.innerHeight);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);

  await expect(
    page.getByRole('button', { name: /open status rail/i }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: /open control rail/i }),
  ).toHaveCount(0);
  await expect(page.locator('.overlay-rail--left')).toHaveClass(
    /overlay-rail--open/,
  );
  await expect(page.locator('.overlay-rail--right')).toHaveClass(
    /overlay-rail--open/,
  );
  await expect(
    page.getByRole('button', { name: /close control rail/i }),
  ).toBeVisible();
  await page.getByRole('button', { name: /close control rail/i }).click();
  await expect(page.locator('.overlay-rail--right')).toHaveClass(
    /overlay-rail--collapsed/,
  );
  await expect(
    page.getByRole('button', { name: /open control rail/i }),
  ).toBeVisible();
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
  await expect(page.locator('.overlay-rail--right')).toHaveClass(
    /overlay-rail--open/,
  );
  await expect(page.locator('.overlay-tab--right')).toHaveCount(0);
  await expect(page.locator('.overlay-tab--left')).toBeVisible();
  await expect(page.getByLabel('Viewer controls')).toBeVisible();
});

test('tablet drawer viewport opens the control rail by default', async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 1200 });
  await primeDismissedOnboarding(page);
  await page.goto('/');
  await dismissOnboardingIfVisible(page);

  await expect(page.locator('.overlay-shell')).toHaveClass(
    /overlay-shell--tablet/,
    { timeout: 10_000 },
  );
  await expect(page.locator('.overlay-shell')).toHaveClass(
    /overlay-shell--drawer/,
    { timeout: 10_000 },
  );
  await expect(
    page.getByRole('button', { name: /open status rail/i }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: /open control rail/i }),
  ).toHaveCount(0);
  await expect(page.locator('.overlay-rail--right')).toHaveClass(
    /overlay-rail--open/,
  );
  await expect(page.locator('.overlay-rail--left')).toHaveClass(
    /overlay-rail--open/,
  );
});
