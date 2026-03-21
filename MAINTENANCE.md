# Maintenance

## Support targets

- Primary: `Windows 11 + Edge + mouse`.
- Secondary: current Chrome and Firefox desktop releases.
- Touch/mobile: must not break layout, but desktop interaction quality is the release gate.

## Regular cadence

- Weekly: dependency check, smoke build, and Pages deployment review.
- Monthly: manual QA pass in Edge, Chrome, and Firefox.
- Quarterly: texture and performance budget audit.

## Dependency workflow

1. Run `npm outdated`.
2. Update low-risk packages first.
3. Run `npm run check`.
4. Run `npm run test:e2e` after installing Playwright browsers if needed.
5. Update `THIRD_PARTY.md` if new runtime dependencies materially affect licensing or attribution.

## Asset refresh procedure

1. Review `docs/ASSETS.md` for approved NASA source URLs and naming rules.
2. Replace only optimized runtime assets inside `public/assets/earth/`.
3. Keep the placeholder map smaller than `100 KB` if possible.
4. Run `npm run build` and verify there are no broken asset paths under `/Geo/`.
5. Update `docs/ASSETS.md` with the new source URL, date, and file size.

## Performance budgets

- Default balanced mode should feel smooth on integrated desktop GPUs.
- Runtime Earth assets should stay under roughly `2.5 MB` combined unless a justified visual gain is documented.
- Investigate any production JS bundle warning increases before merging.

## Release checklist

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run test:e2e`
- Manual Edge verification against `docs/QA.md`
- Confirm share URLs restore the same view
- Confirm GitHub Pages pathing works under `/Geo/`

## Rollback

- Revert the offending commit.
- Redeploy via GitHub Actions.
- If the regression is asset-related, restore the previous files in `public/assets/earth/`.

## Troubleshooting priorities

- Blank canvas: check WebGL support, asset paths, and console texture-load errors.
- Wrong GitHub Pages asset URLs: check `vite.config.ts` `base` and public asset references.
- Interaction drift or snapping: inspect `src/scene/GlobeController.tsx` and `src/lib/math.ts`.
- Wrong coordinates or preset framing: inspect `src/lib/geo.ts` and `src/lib/constants.ts`.
- Visual degradation: inspect `src/scene/Earth.tsx`, asset file sizes, and quality-mode behavior.
