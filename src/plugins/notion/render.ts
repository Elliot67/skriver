import type { Root } from 'mdast';

import type { RenderResult } from '@/core/plugin';

export type NotionOptions = Record<string, never>;

// Notion's paste handler already understands GFM markdown, so the cleanest
// path is to put the user's original source on the clipboard verbatim and let
// Notion parse it. No AST walk, no warnings.
export function renderNotion(_ast: Root, _options: NotionOptions, source = ''): RenderResult {
  void _ast;
  void _options;
  return { output: source, warnings: [] };
}
