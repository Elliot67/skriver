# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

Vue 3 SPA + TypeScript + Vite scaffold with Pinia (state), Vue Router, and **Nuxt UI v4** for components (used in Vue/SPA mode, not Nuxt). Styling is **Tailwind CSS v4** via the CSS-first `@import` setup. Package manager is **pnpm** (see `packageManager` in `package.json`). Node v24.

The project is currently a near-empty starter: `App.vue` is a placeholder, `src/router/index.ts` has an empty `routes: []`, and `src/stores/counter.ts` is the default Pinia example. Treat existing files as scaffolding to extend, not patterns to preserve verbatim.

## Commands

- `pnpm dev` — Vite dev server with `vite-plugin-vue-devtools` enabled.
- `pnpm build` — runs `type-check` and `build-only` **in parallel** via `npm-run-all2` (`run-p`). Type-checking uses `vue-tsc --build` (project references via `tsconfig.json`).
- `pnpm test:unit` — Vitest in `jsdom`; `e2e/**` is excluded.
  - Single test file: `pnpm test:unit src/__tests__/App.spec.ts`
  - Single test by name: `pnpm test:unit -t "test name"`
- `pnpm lint` — runs `lint:oxlint` then `lint:eslint` **in sequence** (`run-s`). Both auto-fix. ESLint uses `--cache` (`.eslintcache`).
- `pnpm format` — Prettier (uses `--experimental-cli`), scoped to `src/`.

## Architecture notes

- Path alias `@` → `./src` (configured in `vite.config.ts`; matched in `tsconfig.app.json`).
- TS is split via project references: `tsconfig.app.json` (app sources), `tsconfig.node.json` (build tooling), `tsconfig.vitest.json` (tests). Edit the right one when adding paths or types.
- Lint pipeline is two-stage by design: **oxlint** runs first for fast core rules, then **eslint** runs with `eslint-plugin-oxlint` configured to disable rules oxlint already covered (see `eslint.config.ts`). Add new ESLint rules knowing oxlint may pre-handle them.
- Vitest config (`vitest.config.ts`) merges Vite config, so the `@` alias and Vue plugin apply in tests too.
- Pinia stores use the **setup-store** style (composition API with `ref`/`computed`), not options style — see `src/stores/counter.ts`.
- **Nuxt UI integration** lives in three places that must stay in sync: the `@nuxt/ui/vite` plugin in `vite.config.ts`, the `@nuxt/ui/vue-plugin` registered via `app.use(ui)` in `src/main.ts`, and the `@import 'tailwindcss'` + `@import '@nuxt/ui'` in `src/assets/css/main.css`. Tailwind v4 is configured CSS-first (no `tailwind.config.js`) — extend theme tokens in `main.css` via `@theme`. Nuxt UI components (`U*`) are globally registered by the plugin; do not import them manually.
