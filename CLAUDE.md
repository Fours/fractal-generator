# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A fractal generator web app: the user tweaks parameters in a UI, then generates a fractal image. The repo is currently a fresh Vite + React 19 + TypeScript scaffold — `src/App.tsx` renders an empty fragment, so the fractal functionality is yet to be built.

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — type-check (`tsc -b`, project references in `tsconfig.json` → `tsconfig.app.json` + `tsconfig.node.json`) then bundle with Vite. Type errors fail the build.
- `npm run lint` — run ESLint over the repo
- `npm run preview` — serve the production build locally

There is no test runner configured yet.

## Notes

- React 19 with `StrictMode` in `src/main.tsx` — expect double-invocation of effects/renders in dev.
- ESLint flat config (`eslint.config.js`) extends `typescript-eslint` recommended plus `react-hooks` and `react-refresh/vite` rules. Lint applies to `**/*.{ts,tsx}`; `dist/` is ignored.
