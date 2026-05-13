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

Data flow is one-shot snapshot: `ControlPanel` owns *current* params; `App` holds the most recent **submitted** `RenderRequest` (`{ id, fractalId, params }`) plus a `rendering` flag; `FractalCanvas` reacts to `request` changes and dispatches the render to a Web Worker. The `id` (a `Date.now()` value) ensures identical-param resubmits still fire a new render, and also doubles as a stale-result guard for worker responses.

Four layers, each in a flat file under `src/`:

1. **`fractals.ts`** — declarative `FractalDef[]`: id, display name, formula string, and a list of `ParamDef`s (`number` | `slider` | `select`). `getDefaults()` produces the initial params object. The control panel renders inputs by switching on `ParamDef.type` — no fractal-specific UI code.
2. **`renderers.ts`** — `renderFractal(canvas, fractalId, params)` switches on `fractalId` to dispatch to a per-fractal function. **The `canvas` parameter is an `OffscreenCanvas`** (not an `HTMLCanvasElement`) — renderers run inside the worker. Each renderer reads its expected params off the loose `Record<string, number | string>` (no shared typed shape — the control panel and renderer agree by string key).
3. **`fractal.worker.ts`** — dedicated module Worker. Receives `{ name: "RenderFractal", data: { fractalType, fractalParams, width, height, requestId } }`, creates an `OffscreenCanvas` of the given size, calls `renderFractal`, then transfers an `ImageBitmap` back as `{ name: "FractalRendered", data: { bitmap, width, height, elapsedMs, requestId } }`.
4. **`palettes.ts`** — palette name → `(t: number) => [r,g,b]`. Palettes are multi-stop gradients built by `makeGradient`.

### Adding a new fractal type

1. Append a `FractalDef` to `fractals` in `fractals.ts`.
2. Add a `case` to `renderFractal`'s switch and implement `renderX(canvas, params)` in `renderers.ts`. The canvas is an `OffscreenCanvas`; `getContext('2d')` returns `OffscreenCanvasRenderingContext2D` (supports `createImageData`/`putImageData`/`fillStyle`/`Path2D`/`fill` — all current renderers use only these).

That's it — no other files need changes. The worker and `FractalCanvas` are fractal-agnostic.

### Rendering conventions

- **All rendering runs in `fractal.worker.ts`** — the main thread stays responsive. `FractalCanvas` spins up the worker once on mount (via `new Worker(new URL('./fractal.worker.ts', import.meta.url), { type: 'module' })`), posts a `RenderFractal` message on each request, and paints the returned `ImageBitmap` via `ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)` (scaled-down draw — see supersampling below). The worker also measures `elapsedMs` with `performance.now()` and echoes the `requestId`; responses whose id doesn't match `latestRequestIdRef.current` are discarded (bitmap closed) — this guards against StrictMode double-fire and resize-triggered re-renders.
- **2× supersampling**: the worker renders at `width * 2` and `height * 2`; the main thread downscales via `drawImage(...)` 5-arg form (relies on the context's default `imageSmoothingEnabled = true` for bilinear filtering). Pixel work is 4× the display area — keep this in mind when tuning per-fractal defaults like `maxIterations` or `points`.
- **Generate button disable + spinner**: `FractalCanvas` exposes `onRenderingChange(rendering)`. `App` lifts this state and passes `disabled={rendering}` to `ControlPanel`. The in-flight UI is *both* the small top-left `.canvas-overlay` pulse and a centered `.canvas-spinner` rotating ring.
- Canvas internal resolution = container `clientWidth`/`clientHeight` (1× DPR, no retina upscaling). Resized via `ResizeObserver`.
- Pixels are written through a `Uint32Array` view of the `ImageData` buffer using little-endian ABGR packing: `color = (255 << 24) | (b << 16) | (g << 8) | r`. Don't write byte-by-byte — it's significantly slower.
- Coloring strategies differ by fractal family — they all funnel into the same palette function but compute `t` differently:
  - **Escape-time** (Mandelbrot, Julia, Burning Ship): smooth iteration count μ = i + 1 − log(log|z|)/log 2, then `t = sqrt(μ / maxIter)`. Mandelbrot has a cardioid + period-2-bulb early exit; Burning Ship and Julia don't.
  - **Newton**: each root gets a fixed color sampled at `(k + 0.5)/n` of the palette; the chosen color is darkened by iteration count (floor 0.22).
  - **Sierpinski**: deterministic recursive subdivision. Leaves are bucketed into 32 color bands by centroid x and emitted into 32 `Path2D`s — one `ctx.fill` per band, not per triangle.
  - **Barnsley Fern**: chaos game with a Uint32 hit-counter per pixel, then `t = log(1 + count) / log(1 + maxCount)` for log-density coloring. First 20 iterations dropped as warmup.

### User presets

`ControlPanel` exposes a "User presets" section (top of the scroll body) for saving named snapshots of `{ fractalId, params }`. Persisted to `localStorage` under the key `fractal-generator:presets` as `Record<name, Preset>`. Save flow uses `window.prompt` for the name and `window.confirm` for overwrite; the load flow merges the saved params over the target fractal's `getDefaults(...)` so missing keys (e.g. a param added after the preset was saved) fall back to defaults instead of becoming `undefined`. A `useEffect` on `presets` is the single writer to `localStorage` — don't write from event handlers. Load is guarded by `fractals.find(f => f.id === preset.fractalId)`; a preset referencing a removed fractal is silently ignored.

### Styling

CSS lives next to its component (`App.css`, `ControlPanel.css`). Theme tokens (`--bg`, `--panel`, `--accent`, `--font-mono`, etc.) are defined as CSS custom properties on `:root` in `App.css` — reuse them rather than hardcoding the teal accent or panel grays. The aesthetic is dark, sleek, "lab instrument": monospace font for labels/values, thin borders, teal-300 (`#5eead4`) accent.

## Notes

- React 19 + `StrictMode` in `src/main.tsx` — expect double-invoked effects in dev. Renderers are idempotent, and the worker effect terminates its worker on cleanup so the dev-only double-spawn is harmless; the `requestId` guard also drops the duplicate response.
- Vite handles the worker bundle automatically via the `new Worker(new URL(...), { type: 'module' })` idiom — no `vite.config.ts` worker config needed. The worker file uses a `/// <reference lib="webworker" />` triple-slash so `self`, `OffscreenCanvas`, etc. are typed correctly without changing `tsconfig.app.json`.
- ESLint flat config extends `typescript-eslint` recommended + `react-hooks` + `react-refresh/vite`.
