import { afterEach, describe, expect, it, vi } from 'vitest';
import maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap } from 'maplibre-gl';

vi.hoisted(() => {
  // Attribution controls do not need a map worker/WebGL context in these tests.
  window.URL.createObjectURL = () => 'blob:attribution-test';
});

const credit =
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>';
const payloads = [
  [
    'adjacent event handlers',
    '<details open onload="void 0" ontoggle="window.__geoAttributionXss = 1">Credit</details>',
  ],
  [
    'script URL then handler',
    '<a href="javascript:void(0)" onclick="window.__geoAttributionXss = 1">Credit</a>',
  ],
  [
    'multiple image attributes',
    '<img src="data:text/html,unsafe" onerror="window.__geoAttributionXss = 1" onload="void 0">',
  ],
  [
    'nested SVG attributes',
    '<svg><a xlink:href="javascript:void(0)" onclick="window.__geoAttributionXss = 1">Credit</a></svg>',
  ],
] as const;

function renderAttribution(html: string, entrance: 'custom' | 'source') {
  let sourceHtml = html;
  const map = {
    style: {
      stylesheet: {},
      tileManagers: {
        test: {
          used: true,
          getSource: () => ({
            attribution: entrance === 'source' ? sourceHtml : credit,
          }),
        },
      },
    },
    on: vi.fn(),
    off: vi.fn(),
    getCanvasContainer: () => document.createElement('div'),
    _getUIString: (name: string) => name,
  } as unknown as MapLibreMap;
  const control = new maplibregl.AttributionControl({
    compact: false,
    customAttribution: entrance === 'custom' ? [credit, html] : credit,
  });
  const element = control.onAdd(map);
  document.body.append(element);
  return {
    element,
    update(next: string) {
      sourceHtml = next;
      if (entrance === 'custom')
        control.options.customAttribution = [credit, next];
      control._updateAttributions();
    },
  };
}

afterEach(() => document.body.replaceChildren());

describe.each(['custom', 'source'] as const)(
  'installed MapLibre %s attribution',
  (entrance) => {
    it.each(payloads)(
      'removes %s without losing required credits',
      (_label, html) => {
        const { element } = renderAttribution(html, entrance);
        for (const node of element.querySelectorAll('*')) {
          for (const attribute of node.attributes) {
            expect(attribute.name.startsWith('on'), attribute.name).toBe(false);
            if (['src', 'href', 'xlink:href'].includes(attribute.name)) {
              expect(
                attribute.value.replace(/\s/g, '').toLowerCase(),
              ).not.toMatch(/javascript:|data:/);
            }
          }
        }
        expect(
          element.querySelector(
            'a[href="https://www.openstreetmap.org/copyright"]',
          ),
        ).toHaveTextContent('© OpenStreetMap');
      },
    );

    it('sanitizes later source metadata updates as well as initial attribution', () => {
      const { element, update } = renderAttribution(credit, entrance);
      update(payloads[0][1]);
      expect(element.querySelector('[ontoggle], [onload]')).toBeNull();
      expect(element.textContent).toContain('© OpenStreetMap');
      expect(element.querySelector('a')?.getAttribute('target')).toBe('_blank');
    });
  },
);
