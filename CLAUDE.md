# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product

**Skriver** is a markdown-to-multi-client clipboard formatter: the user writes Markdown once and copies it pre-formatted for chat / issue-tracking clients. Plugins ship for **Slack** (`slack/texty` Quill Delta JSON), **Microsoft Teams** (`text/html`) and **Jira** (`text/html`, ProseMirror shape). See `docs/plan.md` for the v1 architecture; `docs/formatting-*.md` document the per-client output shapes.

## Stack

Vue 3 SPA + TypeScript + Vite scaffold with Pinia (state), Vue Router, and **Nuxt UI v4** for components (used in Vue/SPA mode, not Nuxt). Styling is **Tailwind CSS v4** via the CSS-first `@import` setup. Package manager is **pnpm** (see `packageManager` in `package.json`). Node v24.

The single editor view lives at `/` (`src/views/HomeView.vue`); `/debug` (`src/views/DebugView.vue`) is a clipboard-MIME inspector handy when reverse-engineering a new client's paste format.

## Commands

- `pnpm dev` — Vite dev server with `vite-plugin-vue-devtools` enabled.
- `pnpm build` — runs `type-check` and `build-only` **in parallel** via `npm-run-all2` (`run-p`). Type-checking uses `vue-tsc --build` (project references via `tsconfig.json`).
- `pnpm test:unit` — Vitest in `jsdom`; `e2e/**` is excluded.
  - Single test file: `pnpm test:unit src/plugins/slack/__tests__/render.spec.ts`
  - Single test by name: `pnpm test:unit -t "test name"`
- `pnpm lint` — runs `lint:oxlint` then `lint:eslint` **in sequence** (`run-s`). Both auto-fix. ESLint uses `--cache` (`.eslintcache`).
- `pnpm format` — Prettier (uses `--experimental-cli`), scoped to `src/`.

## Architecture notes

- Path alias `@` → `./src` (configured in `vite.config.ts`; matched in `tsconfig.app.json`).
- TS is split via project references: `tsconfig.app.json` (app sources), `tsconfig.node.json` (build tooling), `tsconfig.vitest.json` (tests). Edit the right one when adding paths or types.
- Lint pipeline is two-stage by design: **oxlint** runs first for fast core rules, then **eslint** runs with `eslint-plugin-oxlint` configured to disable rules oxlint already covered (see `eslint.config.ts`). Add new ESLint rules knowing oxlint may pre-handle them.
- Vitest config (`vitest.config.ts`) merges Vite config, so the `@` alias and Vue plugin apply in tests too.
- Pinia stores use the **setup-store** style (composition API with `ref`/`computed`), not options style — see `src/stores/editor.ts` (the only store; holds the markdown text, per-plugin options, and `lastWarnings`, with `localStorage` autosave for the first two).
- **Nuxt UI integration** lives in three places that must stay in sync: the `@nuxt/ui/vite` plugin in `vite.config.ts`, the `@nuxt/ui/vue-plugin` registered via `app.use(ui)` in `src/main.ts`, and the `@import 'tailwindcss'` + `@import '@nuxt/ui'` in `src/assets/css/main.css`. Tailwind v4 is configured CSS-first (no `tailwind.config.js`) — extend theme tokens in `main.css` via `@theme`. Nuxt UI components (`U*`) are globally registered by the plugin; do not import them manually.
- **Plugin architecture**: each target client is an isolated module under `src/plugins/<id>/` with a `ClientPlugin` contract (`id`, `label`, `icon` Iconify name like `i-simple-icons:slack`, `mimeType`, `defaultOptions`, `render(ast, options) → { output, plainText?, warnings }`). Markdown is parsed once to an mdast `Root` via `unified` + `remark-parse` + `remark-gfm`; plugins are pure functions of `(ast, options)` and stay free of DOM / clipboard / Vue concerns. The static registry in `src/core/plugin-registry.ts` is the one place plugins are wired in — `HomeView.vue` iterates it, so adding a plugin to the array surfaces it in the UI automatically.
- **`plainText` companion**: each plugin populates `RenderResult.plainText` for the `text/plain` companion clipboard write. Slack derives **Slack mrkdwn** from its own Delta via `src/plugins/slack/mrkdwn.ts` (so pasting the plain-text fallback into Slack still renders formatting). Teams and Jira call the shared `mdastToPlainText` helper in `src/core/plain-text.ts`.
- **Clipboard write uses the legacy `copy` event**, not `navigator.clipboard.write` — Chrome's Async Clipboard API rejects non-allowlisted MIME types like Slack's `slack/texty`. `src/core/clipboard.ts` installs a one-shot `copy` listener, fires `document.execCommand('copy')` synchronously, and the listener calls `clipboardData.setData(mimeType, payload)` (plus `text/plain` when `plainText` is set). The chain from button click to `execCommand` must stay synchronous (no `await` between them) so the call sits inside the user-gesture stack.
- **Tests** mirror the source layout: feature-by-feature specs in `src/plugins/<id>/__tests__/`, core-helper specs in `src/core/__tests__/`. Slack additionally has `mrkdwn.spec.ts` because Delta → Slack mrkdwn is its own pure function worth exercising independently.
