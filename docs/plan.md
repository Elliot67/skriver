# Skriver — Markdown → Slack/Teams Clipboard Formatter

## Context

A web app that lets a user write once in Markdown and paste the result, fully
formatted, into a chat or issue-tracking client. Each target client has its own
clipboard MIME type and structural format:

| Client | MIME type     | Format                       |
| ------ | ------------- | ---------------------------- |
| Slack  | `slack/texty` | Quill Delta JSON             |
| Teams  | `text/html`   | HTML (rendered by CK Editor) |
| Jira   | —             | _deferred; not in v1_        |

The current repo is a near-empty Vue 3 + Vite + Pinia + Nuxt UI v4 + Tailwind v4
starter (see `CLAUDE.md`). Everything below is to be built.

**Two non-negotiable constraints**:

1. Plugin system — each client is an isolated module behind one contract; adding
   or swapping a client is a localized change.
2. Unit-tested — feature-level Vitest coverage for every plugin.

## Decisions (from the requirements pass)

| Area              | Choice                                                                      |
| ----------------- | --------------------------------------------------------------------------- |
| Conversion model  | Markdown → unified mdast AST → per-plugin renderer                          |
| Parser            | `remark-parse` + `remark-gfm` via `unified`                                 |
| MD feature set    | GFM (tables, strikethrough, task lists, autolinks)                          |
| Plugin packaging  | In-repo modules under `src/plugins/<id>/`, **static registry**              |
| UI                | Single page — `UTextarea` editor + a list of "Copy for X" buttons           |
| Clipboard trigger | Render + `navigator.clipboard.write` only on button click                   |
| Clipboard impl    | `ClipboardItem` with the plugin's native MIME, no fallback                  |
| Degradation       | Best-effort; renderer returns `{ output, warnings: string[] }`              |
| Warnings UI       | Inline list under the copy button (most-recent attempt)                     |
| Persistence       | Editor content **and per-plugin options** in `localStorage`, autosaved      |
| Routing           | Keep `vue-router` scaffold, single `/` route only for now                   |
| Editor            | Plain `UTextarea` (no syntax highlighting)                                  |
| Teams fidelity    | Emit minimal semantic HTML; harden CK quirks only if real paste breaks      |
| Slack emoji       | Plugin-configurable; default **on** (detect `:shortcode:` → emoji insert)   |
| Tests             | Feature-by-feature unit tests per plugin (no golden-file integration)       |
| v1 plugins        | **Slack + Teams**. Jira deferred.                                           |

## Architecture

```
markdown text
     │
     ▼
┌──────────────────┐
│ core/markdown.ts │   parse(md) → Root (mdast, GFM-enabled)
└──────────────────┘
     │
     ▼  (Root)
┌──────────────────────────┐
│ ClientPlugin.render(ast, │   pure: mdast Root → { output, warnings }
│   options)               │
└──────────────────────────┘
     │
     ▼  (rendered string)
┌──────────────────────┐
│ core/clipboard.ts    │   new ClipboardItem({ [plugin.mimeType]: Blob })
│  writeForPlugin()    │
└──────────────────────┘
```

### Plugin contract

```ts
// src/core/plugin.ts
import type { Root } from 'mdast';

export interface RenderResult {
  output: string;            // serialized payload
  warnings: string[];        // human-readable lossy-conversion notes
}

export interface ClientPlugin<TOptions extends object = object> {
  id: string;                // 'slack' | 'teams' …
  label: string;             // 'Slack', 'Microsoft Teams'
  mimeType: string;          // 'slack/texty', 'text/html'
  defaultOptions: TOptions;  // {} when none
  render(ast: Root, options: TOptions): RenderResult;
}
```

Plugins are **pure functions of (ast, options)** — no DOM, no clipboard, no Vue.
That keeps unit tests trivial: feed an mdast subtree, assert the output and the
warnings array.

### Static registry

```ts
// src/core/plugin-registry.ts
import { slackPlugin } from '@/plugins/slack';
import { teamsPlugin } from '@/plugins/teams';

export const plugins = [slackPlugin, teamsPlugin] as const;
export type PluginId = (typeof plugins)[number]['id'];
```

Swapping a plugin = one import + one array entry.

### Clipboard write

```ts
// src/core/clipboard.ts
export async function writeForPlugin(
  plugin: ClientPlugin,
  payload: string,
): Promise<void> {
  const item = new ClipboardItem({
    [plugin.mimeType]: new Blob([payload], { type: plugin.mimeType }),
  });
  await navigator.clipboard.write([item]);
}
```

If the browser rejects the custom MIME (Slack's `slack/texty`), the promise
rejects and the UI surfaces a toast error. No silent fallback.

### Options & persistence

A single Pinia store owns:

- `markdown: string` — current editor content
- `pluginOptions: Record<PluginId, object>` — keyed by plugin id, seeded from
  each plugin's `defaultOptions`
- `lastWarnings: Record<PluginId, string[]>` — populated after each copy

Both `markdown` and `pluginOptions` are persisted to `localStorage` via a small
`watch`-based serializer (no extra library — keep deps minimal). The
`lastWarnings` map is in-memory only.

Per-plugin options are exposed in the UI via a tiny gear popover on each
plugin's row (Nuxt UI `UPopover` + a single switch for Slack's emoji
detection). If a plugin has no options, no gear is shown.

## File layout

```
src/
├── core/
│   ├── markdown.ts          # parse(md): Root  — unified + remark-parse + remark-gfm
│   ├── plugin.ts            # ClientPlugin / RenderResult types
│   ├── plugin-registry.ts   # static plugins[] array
│   └── clipboard.ts         # writeForPlugin(plugin, payload)
├── plugins/
│   ├── slack/
│   │   ├── index.ts         # slackPlugin: ClientPlugin<{ detectEmoji: boolean }>
│   │   ├── render.ts        # mdast → Quill Delta ops[]
│   │   ├── emoji.ts         # :shortcode: detection (gated by option)
│   │   └── __tests__/render.spec.ts
│   └── teams/
│       ├── index.ts         # teamsPlugin: ClientPlugin
│       ├── render.ts        # mdast → minimal semantic HTML
│       └── __tests__/render.spec.ts
├── stores/
│   └── editor.ts            # markdown, pluginOptions, lastWarnings, persistence
├── components/
│   ├── MarkdownEditor.vue   # UTextarea wrapper bound to store
│   └── PluginRow.vue        # one row: label, options gear, copy button, warnings
├── views/
│   └── HomeView.vue         # editor + v-for plugin row
├── router/index.ts          # single '/' → HomeView
├── App.vue                  # unchanged (UApp + RouterView)
└── main.ts                  # unchanged
```

The scaffolded `src/stores/counter.ts` is deleted.

## Implementation order

1. **Core scaffolding** — `core/plugin.ts`, `core/markdown.ts`, install
   `unified`, `remark-parse`, `remark-gfm`, `mdast` types.
2. **Slack plugin** — `render.ts` (text marks, links, lists incl. nested with
   `indent`, blockquotes, code blocks, inline code, paragraphs/line breaks),
   then `emoji.ts` behind `defaultOptions.detectEmoji = true`. Tests alongside
   each piece. Tables → warning + flatten to code block.
3. **Teams plugin** — `render.ts` to minimal semantic HTML (`<ul>/<ol>/<li>`,
   `<p>`, `<strong>/<em>/<s>`, `<code>/<pre>`, `<blockquote>`, `<a>`, `<hr>`,
   `<table>`). No CK Editor IDs/hljs spans in v1. Tests alongside.
4. **Clipboard helper** — `core/clipboard.ts` + small Vitest using a mocked
   `navigator.clipboard.write`.
5. **Plugin registry** — `core/plugin-registry.ts`.
6. **Pinia store** — `stores/editor.ts` with localStorage autosave.
7. **UI** — `MarkdownEditor.vue`, `PluginRow.vue`, `HomeView.vue`. Router stays
   but only `/`.
8. **Manual paste test** — `pnpm dev`, paste output into real Slack and Teams.

## Critical files to read before/while implementing

- `docs/formatting-markdown.md` — canonical input.
- `docs/formatting-slack.md` — the Quill Delta shape the Slack renderer must
  produce (especially nested-list `indent` attrs, link inserts, and the
  `slackemoji` insert).
- `docs/formatting-teams.md` — the HTML the Teams renderer should accept as
  inspiration; v1 emits a simpler subset.
- `src/main.ts`, `src/App.vue` — Nuxt UI plugin already registered.
- `CLAUDE.md` — Nuxt UI v4 in Vue/SPA mode, Tailwind v4 CSS-first; the three
  Nuxt UI integration points must stay in sync (vite plugin, vue plugin,
  `main.css` imports).

## Dependencies to add

- `unified`, `remark-parse`, `remark-gfm` (runtime)
- `@types/mdast` (dev)

Nothing else — Nuxt UI gives us `UTextarea`, `UButton`, `UPopover`, `UToast`.

## Verification

- `pnpm test:unit` — feature-level tests in `src/plugins/*/__tests__/` cover
  each mdast node type per plugin, plus warnings for unsupported features.
  Also a test for `core/markdown.ts` confirming GFM features parse.
- `pnpm build` — `vue-tsc --build` passes; bundle builds.
- `pnpm lint` — both oxlint and eslint pass.
- **Manual smoke**: `pnpm dev`, paste the canonical example from
  `docs/formatting-markdown.md` into the editor, click "Copy for Slack" and
  paste into Slack → verify formatting. Repeat for Teams.

## Out of scope for v1 (explicitly)

- Jira plugin (architecture supports adding it later as `src/plugins/jira/`).
- Live preview / WYSIWYG.
- Multiple named drafts.
- Strict-mode toggle that blocks copy on lossy conversion.
- Dynamic plugin loading from external bundles.
- CK Editor-specific HTML quirks for Teams (`<figure><table>`,
  `codeBlockEditor` IDs, `hljs` spans) — added later only if paste in real
  Teams breaks without them.
