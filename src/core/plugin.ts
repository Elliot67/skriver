import type { Root } from 'mdast';

export interface RenderResult {
  output: string;
  plainText?: string;
  warnings: string[];
}

export interface ClientPlugin<TOptions extends object = object> {
  id: string;
  label: string;
  icon: string;
  mimeType: string;
  defaultOptions: TOptions;
  render(ast: Root, options: TOptions): RenderResult;
}
