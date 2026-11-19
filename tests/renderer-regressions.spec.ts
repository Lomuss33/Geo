import { expect, test } from '@playwright/test';
import {
  createDefaultAnimationTimeline,
  serializeAnimationTimeline,
} from '../src/lib/animation';
import { DEFAULT_DISTANCE, viewFromLatLon } from '../src/lib/constants';
import {
  deserializeBordersViewState,
  deserializeHeadwayViewState,
  deserializeViewState,
  serializeBordersViewState,
  serializeHeadwayViewState,
  serializeViewState,
} from '../src/lib/viewState';
import {
  controlledHeadway,
  openControls,
  openEditor,
  openSection,
  readyRenderer,
} from './helpers/regression';

test.setTimeout(60_000);

for (const mode of ['geo', 'headway', 'borders'] as const) {
  test(`legacy ${mode} URL restores its renderer and encoded view`, async ({
    page,
    baseURL,
  }) => {
    await controlledHeadway(page);
    const expectedGeo = viewFromLatLon(-10, -54, 2.4);
    const expectedMap = {
      center: [18, 44] as [number, number],
      zoom: 3,
      bearing: 17,
      pitch: 12,
    };
    const encoded = serializeViewState(expectedGeo);
    const map = (
      mode === 'borders' ? serializeBordersViewState : serializeHeadwayViewState
    )(expectedMap);
    // Capture the app's outgoing value; this does not test OS clipboard access.
    await page.addInitScript(() => {
      const runtime = window as unknown as { __geoCopiedShare: string };
      runtime.__geoCopiedShare = '';
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (value: string) => {
            runtime.__geoCopiedShare = value;
          },
        },
      });
    });
    // Include the earlier /Geo/ dev URL: local-dev normalizes it; Pages keeps it.
    const url = new URL(
      `/Geo/?mode=${mode}&view=${encoded}&map=${map}&profile=hierarchy&focus=BIH`,
      baseURL!,
    );
    await page.goto(url.toString());
    await readyRenderer(page, mode);
    await expect(
      page.getByRole('tab', {
        name: { geo: 'Geo', headway: 'Headway', borders: 'Borders' }[mode],
        exact: true,
      }),
    ).toHaveAttribute('aria-selected', 'true');
    const actual = new URL(page.url());
    expect(actual.pathname).toBe(new URL(baseURL!).pathname);
    if (mode === 'geo' || new URL(baseURL!).pathname === '/') {
      expect(actual.searchParams.get('view')).toBe(encoded);
    } else {
      // Pages live-syncs a globe counterpart from the authoritative map frame.
      // Dev deliberately leaves the incoming URL unchanged. In both cases the
      // actual active map pose is checked from the outgoing share below.
      expect(
        deserializeViewState(actual.searchParams.get('view')),
      ).not.toBeNull();
    }
    expect(actual.searchParams.get('map')).toBe(map);
    if (mode === 'borders')
      await expect(page.getByLabel('Borders legend')).toContainText(
        'Bosnia and Herzegovina',
      );
    await openControls(page);
    await page
      .getByRole('button', { name: 'Copy share link', exact: true })
      .click();
    const copied = await page.evaluate(
      () =>
        (window as unknown as { __geoCopiedShare: string }).__geoCopiedShare,
    );
    const outgoing = new URL(copied);
    if (mode === 'geo') {
      const restored = deserializeViewState(outgoing.searchParams.get('view'))!;
      expect(restored.distance).toBeCloseTo(expectedGeo.distance, 3);
      expect(restored.fov).toBeCloseTo(expectedGeo.fov, 2);
      const dot = restored.rotation.reduce(
        (sum, value, index) => sum + value * expectedGeo.rotation[index]!,
        0,
      );
      expect(Math.abs(dot)).toBeGreaterThan(0.9999);
      // Use the app's own emitted frame as well: repeated sharing must not drift.
      await page.goto(copied);
      await readyRenderer(page, 'geo');
      await openControls(page);
      await page
        .getByRole('button', { name: 'Copy share link', exact: true })
        .click();
      const roundTrip = await page.evaluate(
        () =>
          (window as unknown as { __geoCopiedShare: string }).__geoCopiedShare,
      );
      expect(new URL(roundTrip).searchParams.get('view')).toBe(
        outgoing.searchParams.get('view'),
      );
    } else {
      const restored = (
        mode === 'borders'
          ? deserializeBordersViewState
          : deserializeHeadwayViewState
      )(outgoing.searchParams.get('map'))!;
      for (const index of [0, 1])
        expect(restored.center[index]).toBeCloseTo(
          expectedMap.center[index]!,
          3,
        );
      expect(restored.zoom).toBeCloseTo(expectedMap.zoom, 2);
      expect(restored.bearing).toBeCloseTo(expectedMap.bearing, 2);
      expect(restored.pitch).toBeCloseTo(expectedMap.pitch, 2);
    }
  });
}

for (const mode of ['headway', 'borders'] as const) {
  test(`${mode} style failure offers retry and a working Geo fallback`, async ({
    page,
  }) => {
    await page.route(
      `**/assets/${mode}/${mode === 'headway' ? 'headway-style' : 'style'}.json`,
      (route) =>
        route.fulfill({
          status: 503,
          body: 'Controlled fixture: unavailable style',
        }),
    );
    await page.goto(`./?mode=${mode}`);
    await expect(
      page.getByRole('heading', {
        name: `${mode === 'headway' ? 'Headway' : 'Borders'} view unavailable right now.`,
      }),
    ).toBeVisible({ timeout: 20000 });
    await expect(
      page.getByRole('button', {
        name: `Retry ${mode === 'headway' ? 'Headway' : 'Borders'}`,
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Switch to Geo', exact: true })
      .click();
    await readyRenderer(page, 'geo');
    await openControls(page);
    await expect(
      page.getByRole('button', { name: 'Help', exact: true }),
    ).toBeVisible();
  });
}

for (const mode of ['geo', 'headway', 'borders'] as const) {
  test(`${mode} WebGL initialization failure keeps the shell usable and can retry`, async ({
    page,
  }) => {
    await controlledHeadway(page);
    await page.addInitScript(() => {
      const runtime = window as unknown as { __geoBlockWebgl: boolean };
      runtime.__geoBlockWebgl = true;
      const original = HTMLCanvasElement.prototype.getContext;
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        value: function (
          this: HTMLCanvasElement,
          type: string,
          ...args: unknown[]
        ) {
          if (
            runtime.__geoBlockWebgl &&
            /^(webgl|experimental-webgl)/.test(type)
          )
            return null;
          return Reflect.apply(original, this, [type, ...args]);
        },
      });
    });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`./?mode=${mode}`);
    const title =
      mode === 'geo'
        ? '3D renderer unavailable right now.'
        : `${mode === 'headway' ? 'Headway' : 'Borders'} view unavailable right now.`;
    await expect(
      page.getByRole('heading', { name: title, exact: true }),
    ).toBeVisible({ timeout: 20000 });
    await openControls(page);
    await page.getByRole('button', { name: 'Help', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await openSection(page, 'Animation');
    await expect(
      page.getByRole('button', { name: 'Open editor', exact: true }),
    ).toBeDisabled();
    const retry =
      mode === 'geo'
        ? 'Retry renderer'
        : `Retry ${mode === 'headway' ? 'Headway' : 'Borders'}`;
    const retryButton = page.getByRole('button', { name: retry, exact: true });
    // Keep the injected fault in place through Help and release it atomically
    // with retry, rather than permitting a late boot before the click arrives.
    await retryButton.evaluate((button) => {
      button.addEventListener(
        'click',
        () => {
          (window as unknown as { __geoBlockWebgl: boolean }).__geoBlockWebgl =
            false;
        },
        { capture: true, once: true },
      );
    });
    await retryButton.click();
    await readyRenderer(page, mode);
    if (mode !== 'borders')
      await expect(
        page.getByRole('button', { name: 'Open editor', exact: true }),
      ).toBeEnabled();
    expect(errors).toEqual([]);
  });
}

test('Headway globe keeps attribution through every implemented layout look', async ({
  page,
}) => {
  await controlledHeadway(page);
  await page.goto('./?mode=headway');
  await readyRenderer(page, 'headway');
  await openControls(page);
  await openSection(page, 'Layout');
  for (const look of ['Mission', 'Daylight', 'Atlas', 'Blueprint', 'Mono']) {
    const button = page.getByRole('button', { name: new RegExp(`^${look} `) });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await readyRenderer(page, 'headway');
    await expect(page.locator('.maplibregl-ctrl-attrib-inner')).toContainText(
      'OpenFreeMap',
    );
  }
});

test('animation v1/v2 imports retain the saved pose and play/stop without changing mode', async ({
  page,
}) => {
  const timeline = {
    ...createDefaultAnimationTimeline('geo'),
    totalDurationMs: 2000,
    blocks: [
      {
        id: 'fixture',
        command: 'yaw+' as const,
        startMs: 0,
        endMs: 2000,
        amount: 10,
        acceleration: 0,
        enabled: true,
      },
    ],
  };
  await page.goto('./');
  await readyRenderer(page, 'geo');
  await openEditor(page);
  for (const version of [1, 2]) {
    const summary = page.locator('.animation-workspace__advanced summary');
    if (
      !(await page
        .locator('.animation-workspace__advanced')
        .evaluate((e) => (e as HTMLDetailsElement).open))
    )
      await summary.click();
    const hex =
      version === 1
        ? Buffer.from(
            JSON.stringify({
              v: 1,
              m: 'geo',
              t: 2000,
              b: [{ k: 'yaw+', s: 0, e: 2000, q: 10, a: 0, x: 1 }],
            }),
            'utf8',
          ).toString('hex')
        : serializeAnimationTimeline(timeline);
    await page.getByRole('textbox', { name: /^Hex timeline/ }).fill(hex);
    await page.getByRole('button', { name: 'Load hex', exact: true }).click();
    await expect(
      page.getByRole('spinbutton', { name: 'Total duration', exact: true }),
    ).toHaveValue('2.0');
    await expect(
      page.getByRole('spinbutton', { name: 'Latitude', exact: true }),
    ).toHaveValue('22');
    await page
      .getByRole('button', { name: 'Play from playhead', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: /stop playback/i }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('button', { name: 'Play from playhead', exact: true }),
    ).toBeVisible();
  }
});

test('a real globe pick pins and releases a sourced country outline', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  // At overview distance the center ray points at this sourced Brazil interior.
  // The closer legacy URL case above independently verifies exact pose restore.
  const view = serializeViewState(viewFromLatLon(-10, -54, DEFAULT_DISTANCE));
  await page.goto(`./?view=${view}`);
  await readyRenderer(page, 'geo');
  await openControls(page);
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  const canvas = page.locator('.scene-host canvas').first();
  const bounds = await canvas.boundingBox();
  await page.mouse.click(
    bounds!.x + bounds!.width / 2,
    bounds!.y + bounds!.height / 2,
  );
  await expect(page.getByTestId('country-compare-pinned')).toBeVisible();
  await expect(page.getByTestId('country-compare-pinned')).toContainText(
    'Brazil',
  );
  await page
    .getByRole('button', { name: 'Release outline for Brazil', exact: true })
    .click();
  await expect(page.getByTestId('country-compare-pinned')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Cancel compare mode', exact: true })
    .click();
});

test('Geo replaces a lost WebGL context while retaining its usable shell', async ({
  page,
}) => {
  await page.goto('./');
  await readyRenderer(page, 'geo');
  const original = await page
    .locator('.scene-host canvas')
    .first()
    .elementHandle();
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))),
      ),
  );
  const supported = await original!.evaluate((element) => {
    const gl = (element as HTMLCanvasElement).getContext('webgl2');
    const extension = gl?.getExtension('WEBGL_lose_context');
    if (!extension) return false;
    extension.loseContext();
    return true;
  });
  expect(
    supported,
    'This desktop fixture requires the WebGL context-loss extension',
  ).toBe(true);
  await expect
    .poll(() => original!.evaluate((element) => element.isConnected), {
      timeout: 20000,
    })
    .toBe(false);
  await readyRenderer(page, 'geo');
  await openControls(page);
  await expect(
    page.getByRole('button', { name: 'Help', exact: true }),
  ).toBeVisible();
});
