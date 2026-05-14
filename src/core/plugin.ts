import type { Root } from 'mdast';

export type WarningSeverity = 'warn' | 'error';

// `warn` = degraded but the intent survives (a sensible fallback was emitted).
// `error` = content or context is lost. Reserved for future use; v1 warnings
// all use `warn` because every fallback path here is non-destructive.
export interface Warning {
  title: string;
  description: string;
  severity: WarningSeverity;
}

export interface RenderResult {
  output: string;
  plainText?: string;
  warnings: Warning[];
}

export interface ClientPlugin<TOptions extends object = object> {
  id: string;
  label: string;
  icon: string;
  mimeType: string;
  defaultOptions: TOptions;
  render(ast: Root, options: TOptions): RenderResult;
}
