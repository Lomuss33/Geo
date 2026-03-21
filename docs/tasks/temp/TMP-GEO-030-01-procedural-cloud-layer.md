# TMP-GEO-030-01 Procedural Cloud Layer

## Status

- Owner: Codex
- Branch: `main`
- Parent: `GEO-030`
- Resolution: done

## Objective

Avoid shipping another large raster cloud map by generating a subtle cloud layer at runtime.

## Verification

```bash
npm run build
```

## Notes

- Implemented in `src/lib/proceduralTexture.ts`.
