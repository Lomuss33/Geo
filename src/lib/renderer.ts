import { WebGLRenderer } from 'three';
import type { WebGLRendererParameters } from 'three';
import type {
  QualityMode,
  RendererFailureReason,
  RendererTier,
} from '../state/viewerStore';

export type RendererFactoryDefaults = Omit<WebGLRendererParameters, 'canvas'> & {
  canvas: HTMLCanvasElement | OffscreenCanvas | EventTarget;
};

export type RendererInitSuccess<TRenderer> = {
  renderer: TRenderer;
  tier: RendererTier;
  attemptedTiers: RendererTier[];
};

export type RendererInitFailure = {
  tier: RendererTier | null;
  attemptedTiers: RendererTier[];
  reason: RendererFailureReason;
  message: string | null;
};

type RendererCreator<TRenderer> = (
  params: RendererFactoryDefaults,
) => TRenderer;

export class RendererInitError extends Error {
  attemptedTiers: RendererTier[];
  lastTier: RendererTier | null;
  reason: RendererFailureReason;

  constructor({
    attemptedTiers,
    lastTier,
    message,
  }: {
    attemptedTiers: RendererTier[];
    lastTier: RendererTier | null;
    message: string | null;
  }) {
    super(message ?? 'Renderer initialization failed.');
    this.name = 'RendererInitError';
    this.attemptedTiers = attemptedTiers;
    this.lastTier = lastTier;
    this.reason = 'renderer-init-failed';
  }
}

export const RENDERER_TIER_ORDER: RendererTier[] = [
  'standard',
  'compatibility',
  'minimal',
];

export const getRendererTierOptions = (
  tier: RendererTier,
  quality: QualityMode,
): Partial<RendererFactoryDefaults> => {
  switch (tier) {
    case 'standard':
      return {
        antialias: quality === 'high',
        alpha: false,
        stencil: false,
        powerPreference: 'default',
      };
    case 'compatibility':
      return {
        antialias: false,
        alpha: false,
        stencil: false,
        powerPreference: 'low-power',
        precision: 'mediump',
      };
    case 'minimal':
      return {
        antialias: false,
        alpha: false,
        stencil: false,
        powerPreference: 'low-power',
        precision: 'lowp',
      };
  }
};

export const formatRendererTier = (tier: RendererTier | null) => {
  switch (tier) {
    case 'standard':
      return 'Standard';
    case 'compatibility':
      return 'Compatibility';
    case 'minimal':
      return 'Minimal';
    default:
      return 'Unavailable';
  }
};

export const toRendererInitFailure = (
  error: unknown,
  attemptedTiers: RendererTier[] = [],
): RendererInitFailure => {
  if (error instanceof RendererInitError) {
    return {
      tier: error.lastTier,
      attemptedTiers: error.attemptedTiers,
      reason: error.reason,
      message: error.message,
    };
  }

  if (error instanceof Error) {
    return {
      tier: attemptedTiers.at(-1) ?? null,
      attemptedTiers,
      reason: 'canvas-fallback',
      message: error.message,
    };
  }

  return {
    tier: attemptedTiers.at(-1) ?? null,
    attemptedTiers,
    reason: 'canvas-fallback',
    message: null,
  };
};

export const createRendererWithTiers = <TRenderer = WebGLRenderer>(
  defaultProps: RendererFactoryDefaults,
  quality: QualityMode,
  createRenderer: RendererCreator<TRenderer> = (params) =>
    new WebGLRenderer(params as WebGLRendererParameters) as TRenderer,
): RendererInitSuccess<TRenderer> => {
  const attemptedTiers: RendererTier[] = [];
  let lastMessage: string | null = null;

  for (const tier of RENDERER_TIER_ORDER) {
    attemptedTiers.push(tier);

    try {
      return {
        renderer: createRenderer({
          ...defaultProps,
          ...getRendererTierOptions(tier, quality),
          canvas: defaultProps.canvas,
        }),
        tier,
        attemptedTiers,
      };
    } catch (error) {
      lastMessage =
        error instanceof Error ? error.message : 'Renderer initialization failed.';
    }
  }

  throw new RendererInitError({
    attemptedTiers,
    lastTier: attemptedTiers.at(-1) ?? null,
    message: lastMessage,
  });
};
