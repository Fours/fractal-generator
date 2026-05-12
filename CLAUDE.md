# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A fractal generator web app (Vite + React 19 + TypeScript). The UI is a fixed two-column layout: a 360px control panel on the right, a full-bleed black canvas on the left. The control panel surfaces parameters for the selected fractal type; pressing **Generate** snapshots those params and triggers a render into the canvas. Six fractal types are implemented: Mandelbrot, Julia, Burning Ship, Newton, Sierpinski Triangle, Barnsley Fern.

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — `tsc -b` (project refs: `tsconfig.json` → `tsconfig.app.json` + `tsconfig.node.json`) then `vite build`. Type errors fail the build.
- `npm run lint` — ESLint flat config (`eslint.config.js`). Lints `**/*.{ts,tsx}`; ignores `dist/`.
- `npm run preview` — serve production build.

No test runner is configured.

## Architecture

Data flow is one-shot snapshot: `ControlPanel` owns *current* params; `App` holds the most recent **submitted** `RenderRequest` (`{ id, fractalId, params }`); `FractalCanvas` reacts to `request` changes and runs the renderer. The `id` (a `Date.now()` value) ensures identical-param resubmits still fire a new render.

Three layers, each in a flat file under `src/`:

1. **`fractals.ts`** — declarative `FractalDef[]`: id, display name, formula string, and a list of `ParamDef`s (`number` | `slider` | `select`). `getDefaults()` produces the initial params object. The control panel renders inputs by switching on `ParamDef.type` — no fractal-specific UI code.
2. **`renderers.ts`** — `renderFractal(canvas, fractalId, params)` switches on `fractalId` to dispatch to a per-fractal function. Each renderer reads its expected params off the loose `Record<string, number | string>` (no shared typed shape — the control panel and renderer agree by string key).
3. **`palettes.ts`** — palette name → `(t: number) => [r,g,b]`. Palettes are multi-stop gradients built by `makeGradient`.

### Adding a new fractal type

1. Append a `FractalDef` to `fractals` in `fractals.ts`.
2. Add a `case` to `renderFractal`'s switch and implement `renderX(canvas, params)` in `renderers.ts`.

That's it — no other files need changes.

### Rendering conventions

- All renderers are **synchronous on the main thread**. `FractalCanvas` shows a pulsing overlay, then uses a double-`requestAnimationFrame` so the overlay paints before the compute blocks. A Web Worker is the natural next optimization — not yet done.
- Canvas internal resolution = container `clientWidth`/`clientHeight` (1× DPR, no retina upscaling). Resized via `ResizeObserver`.
- Pixels are written through a `Uint32Array` view of the `ImageData` buffer using little-endian ABGR packing: `color = (255 << 24) | (b << 16) | (g << 8) | r`. Don't write byte-by-byte — it's significantly slower.
- Coloring strategies differ by fractal family — they all funnel into the same palette function but compute `t` differently:
  - **Escape-time** (Mandelbrot, Julia, Burning Ship): smooth iteration count μ = i + 1 − log(log|z|)/log 2, then `t = sqrt(μ / maxIter)`. Mandelbrot has a cardioid + period-2-bulb early exit; Burning Ship and Julia don't.
  - **Newton**: each root gets a fixed color sampled at `(k + 0.5)/n` of the palette; the chosen color is darkened by iteration count (floor 0.22).
  - **Sierpinski**: deterministic recursive subdivision. Leaves are bucketed into 32 color bands by centroid x and emitted into 32 `Path2D`s — one `ctx.fill` per band, not per triangle.
  - **Barnsley Fern**: chaos game with a Uint32 hit-counter per pixel, then `t = log(1 + count) / log(1 + maxCount)` for log-density coloring. First 20 iterations dropped as warmup.

### Styling

CSS lives next to its component (`App.css`, `ControlPanel.css`). Theme tokens (`--bg`, `--panel`, `--accent`, `--font-mono`, etc.) are defined as CSS custom properties on `:root` in `App.css` — reuse them rather than hardcoding the teal accent or panel grays. The aesthetic is dark, sleek, "lab instrument": monospace font for labels/values, thin borders, teal-300 (`#5eead4`) accent.

## Notes

- React 19 + `StrictMode` in `src/main.tsx` — expect double-invoked effects in dev. Renderers are idempotent so this isn't a problem in practice.
- ESLint flat config extends `typescript-eslint` recommended + `react-hooks` + `react-refresh/vite`.
