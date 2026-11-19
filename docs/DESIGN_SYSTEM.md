# Geo UI design contract

Owner decisions adopted 2026-11-16; maintained by UI task owners. Implementation:
`src/styles/global.css`, `src/styles/timeAtlas.css`, `src/lib/theme.ts` and
`src/components/ThemeToggle.tsx`. This describes actual tokens and future targets.

## Implemented foundation

- Dark/light theme tokens: `--bg`, `--panel`, `--panel-strong`, `--text`, `--muted`,
  `--line`, `--line-strong`, `--accent`. Accent is neutral, not a UI color palette.
- Square controls and panels; no pills, decorative blur/glass, gradients or glow.
  Maps, source-linked legends and data layers may use meaningful color.
- Selected controls invert foreground/background. Focus is visible, disabled
  controls are distinguished, and placeholders remain readable in both themes.
- Theme choice is local, survives reload and synchronizes tabs. Blocked storage
  falls back to session-only use. No tracking is involved.
- Touch-target work exists for the viewer rails, but a complete control audit
  across all workspaces remains necessary; do not claim universal 44px coverage.

## Component rules

Use tokens, not hardcoded decorative colors or a global grayscale filter. Keep
native form semantics, labels and an obvious selected/disabled/focus state. Text
inside inverted buttons inherits contrast. Test specificity at nested controls.
New UI should use the 4/8/12/16/24/32px spacing scale, approximately 13–15px control
type and 16px learning content. Existing dense rail type still needs refinement.
Touch targets aim for at least 44 × 44px; desktop controls about 38–40px.

Respect `prefers-reduced-motion`. Keyboard users can reach scrolling content and
operate tools without pointer-only gestures. Dialogs have one active focus loop,
Escape exit and focus restoration. Do not mount mandatory help on first load.

## Layout direction

Use stable header/context/tool/panel/viewport/inspector zones, with one primary
bottom responsibility (history, chart or animation). No arbitrary floating panels
or free docking. Keep Earth the largest useful region. Simple/Balanced/Advanced
UI density is planned; existing rendering quality is a separate concept.

Desktop may show two panels, laptop one, and mobile substitutes focused panels
for the same tools. Create needs preview/scenes/properties/timeline/export views
within one project. Context must survive layout/orientation/workspace changes.
Long names, BCS/English/German text, keyboard opening, safe areas and 200% zoom
need explicit checks; localization infrastructure is still planned.

Test 320×568, 390×844, 844×390, 1024×768, 1440×900 and a larger desktop. Chromium
screenshots are useful evidence but do not establish real Android Firefox support.
See [QA](QA.md) and the [feature inventory](FEATURE_REGISTRY.md).
