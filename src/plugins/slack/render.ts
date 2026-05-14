import type {
  Blockquote,
  Code,
  Heading,
  Image,
  InlineCode,
  Link,
  List,
  ListItem,
  Paragraph,
  PhrasingContent,
  Root,
  RootContent,
  Table,
  Text,
} from 'mdast';

import type { RenderResult } from '@/core/plugin';
import { splitTextWithEmoji } from './emoji';
import { deltaToMrkdwn } from './mrkdwn';

export interface SlackOptions {
  detectEmoji: boolean;
}

type Insert = string | { slackemoji: { text: string } };

export interface SlackOp {
  insert: Insert;
  attributes?: Record<string, unknown>;
}

interface Marks {
  bold?: true;
  italic?: true;
  strike?: true;
  code?: true;
  link?: string;
}

interface Ctx {
  ops: SlackOp[];
  warnings: Set<string>;
  options: SlackOptions;
  blockquoteMode: boolean;
}

export function renderSlack(ast: Root, options: SlackOptions): RenderResult {
  const ctx: Ctx = { ops: [], warnings: new Set(), options, blockquoteMode: false };
  const blocks = ast.children;
  blocks.forEach((block, i) => {
    renderBlock(ctx, block);
    if (i < blocks.length - 1) {
      appendInsert(ctx, '\n', undefined);
    }
  });
  if (ctx.ops.length === 0) ctx.ops.push({ insert: '\n' });
  return {
    output: JSON.stringify({ ops: ctx.ops }),
    plainText: deltaToMrkdwn(ctx.ops),
    warnings: [...ctx.warnings],
  };
}

function renderBlock(ctx: Ctx, node: RootContent): void {
  switch (node.type) {
    case 'paragraph':
      renderInline(ctx, (node as Paragraph).children, {});
      pushLine(ctx);
      break;
    case 'heading':
      renderHeading(ctx, node as Heading);
      break;
    case 'list':
      renderList(ctx, node as List, 0);
      break;
    case 'blockquote':
      renderBlockquote(ctx, node as Blockquote);
      break;
    case 'code':
      renderCode(ctx, node as Code);
      break;
    case 'thematicBreak':
      appendInsert(ctx, '--------', undefined);
      pushLine(ctx);
      break;
    case 'table':
      renderTable(ctx, node as Table);
      break;
    case 'html':
      ctx.warnings.add('Raw HTML is not supported; emitted as plain text.');
      appendInsert(ctx, (node as { value: string }).value, undefined);
      pushLine(ctx);
      break;
    default:
      ctx.warnings.add(`Unsupported block: ${node.type}`);
  }
}

function renderHeading(ctx: Ctx, node: Heading): void {
  renderInline(ctx, node.children, {});
  const level = Math.min(node.depth, 3);
  if (node.depth > 3) ctx.warnings.add(`Heading depth ${node.depth} clamped to 3.`);
  pushLine(ctx, { header: level });
}

function renderList(ctx: Ctx, node: List, depth: number): void {
  const ordered = !!node.ordered;
  for (const item of node.children) {
    renderListItem(ctx, item, ordered, depth);
  }
}

function renderListItem(ctx: Ctx, item: ListItem, ordered: boolean, depth: number): void {
  let emittedLine = false;
  for (const child of item.children) {
    if (child.type === 'list') {
      renderList(ctx, child as List, depth + 1);
    } else if (child.type === 'paragraph') {
      renderInline(ctx, (child as Paragraph).children, {});
      const attrs: Record<string, unknown> = { list: ordered ? 'ordered' : 'bullet' };
      if (depth > 0) attrs.indent = depth;
      pushLine(ctx, attrs);
      emittedLine = true;
    } else {
      renderBlock(ctx, child);
    }
  }
  if (!emittedLine) {
    const attrs: Record<string, unknown> = { list: ordered ? 'ordered' : 'bullet' };
    if (depth > 0) attrs.indent = depth;
    pushLine(ctx, attrs);
  }
}

function renderBlockquote(ctx: Ctx, node: Blockquote): void {
  const previous = ctx.blockquoteMode;
  ctx.blockquoteMode = true;
  try {
    node.children.forEach((child, i) => {
      if (i > 0) pushLine(ctx, { blockquote: true });
      if (child.type === 'paragraph') {
        renderInline(ctx, (child as Paragraph).children, {});
        pushLine(ctx, { blockquote: true });
      } else {
        renderBlock(ctx, child);
      }
    });
  } finally {
    ctx.blockquoteMode = previous;
  }
}

function renderCode(ctx: Ctx, node: Code): void {
  const lines = node.value.split('\n');
  for (const line of lines) {
    if (line.length > 0) appendInsert(ctx, line, undefined);
    pushLine(ctx, { 'code-block': true });
  }
}

const TABLE_ALIGN_MAX_WIDTH = 80;

function renderTable(ctx: Ctx, node: Table): void {
  ctx.warnings.add('Tables are flattened to a code block.');
  const rows = node.children.map((row) =>
    row.children.map((cell) => inlineToPlainText(cell.children)),
  );
  const numCols = rows.reduce((max, r) => Math.max(max, r.length), 0);
  const colWidths: number[] = [];
  for (let c = 0; c < numCols; c++) {
    let max = 0;
    for (const row of rows) {
      const cell = row[c] ?? '';
      if (cell.length > max) max = cell.length;
    }
    colWidths.push(max);
  }
  const alignedWidth =
    colWidths.reduce((s, w) => s + w, 0) + Math.max(0, numCols - 1) * 3;
  const shouldAlign = alignedWidth <= TABLE_ALIGN_MAX_WIDTH;

  for (const row of rows) {
    const cells: string[] = [];
    for (let c = 0; c < numCols; c++) {
      const cell = row[c] ?? '';
      cells.push(
        shouldAlign && c < numCols - 1 ? cell.padEnd(colWidths[c] ?? 0) : cell,
      );
    }
    const line = cells.join(' | ');
    if (line.length > 0) appendInsert(ctx, line, undefined);
    pushLine(ctx, { 'code-block': true });
  }
}

function inlineToPlainText(nodes: PhrasingContent[]): string {
  let out = '';
  for (const n of nodes) {
    switch (n.type) {
      case 'text':
      case 'inlineCode':
        out += (n as Text | InlineCode).value;
        break;
      case 'strong':
      case 'emphasis':
      case 'delete':
      case 'link':
        out += inlineToPlainText((n as { children: PhrasingContent[] }).children);
        break;
      case 'break':
        out += '\n';
        break;
    }
  }
  return out;
}

function renderInline(ctx: Ctx, nodes: PhrasingContent[], marks: Marks): void {
  for (const n of nodes) {
    switch (n.type) {
      case 'text':
        pushText(ctx, (n as Text).value, marks);
        break;
      case 'strong':
        renderInline(ctx, n.children, { ...marks, bold: true });
        break;
      case 'emphasis':
        renderInline(ctx, n.children, { ...marks, italic: true });
        break;
      case 'delete':
        renderInline(ctx, n.children, { ...marks, strike: true });
        break;
      case 'inlineCode':
        pushText(ctx, (n as InlineCode).value, { ...marks, code: true });
        break;
      case 'link':
        renderInline(ctx, (n as Link).children, { ...marks, link: (n as Link).url });
        break;
      case 'break':
        if (ctx.blockquoteMode) {
          pushLine(ctx, { blockquote: true });
        } else {
          pushText(ctx, '\n', marks);
        }
        break;
      case 'image': {
        ctx.warnings.add('Images are not supported; emitted as alt text.');
        const img = n as Image;
        pushText(ctx, img.alt || img.url, marks);
        break;
      }
      case 'html':
        ctx.warnings.add('Inline HTML is not supported; emitted as plain text.');
        pushText(ctx, (n as { value: string }).value, marks);
        break;
      default:
        ctx.warnings.add(`Unsupported inline: ${n.type}`);
    }
  }
}

function pushText(ctx: Ctx, text: string, marks: Marks): void {
  if (text === '') return;
  if (ctx.blockquoteMode && text.includes('\n')) {
    const parts = text.split('\n');
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i] ?? '';
      if (part.length > 0) pushText(ctx, part, marks);
      if (i < parts.length - 1) pushLine(ctx, { blockquote: true });
    }
    return;
  }
  const attributes = marksToAttrs(marks);
  const detect = ctx.options.detectEmoji && !marks.code;
  if (!detect) {
    appendInsert(ctx, text, attributes);
    return;
  }
  for (const seg of splitTextWithEmoji(text)) {
    if (seg.kind === 'text') {
      appendInsert(ctx, seg.value, attributes);
    } else {
      ctx.ops.push({ insert: { slackemoji: { text: seg.value } } });
    }
  }
}

function appendInsert(
  ctx: Ctx,
  text: string,
  attributes: Record<string, unknown> | undefined,
): void {
  const last = ctx.ops[ctx.ops.length - 1];
  if (last && typeof last.insert === 'string' && attrsEqual(last.attributes, attributes)) {
    last.insert += text;
    return;
  }
  const op: SlackOp = { insert: text };
  if (attributes) op.attributes = attributes;
  ctx.ops.push(op);
}

function pushLine(ctx: Ctx, attrs?: Record<string, unknown>): void {
  if (!attrs || Object.keys(attrs).length === 0) {
    appendInsert(ctx, '\n', undefined);
    return;
  }
  ctx.ops.push({ insert: '\n', attributes: attrs });
}

function marksToAttrs(marks: Marks): Record<string, unknown> | undefined {
  const out: Record<string, unknown> = {};
  let any = false;
  if (marks.bold) {
    out.bold = true;
    any = true;
  }
  if (marks.italic) {
    out.italic = true;
    any = true;
  }
  if (marks.strike) {
    out.strike = true;
    any = true;
  }
  if (marks.code) {
    out.code = true;
    any = true;
  }
  if (marks.link) {
    out.link = marks.link;
    any = true;
  }
  return any ? out : undefined;
}

function attrsEqual(
  a: Record<string, unknown> | undefined,
  b: Record<string, unknown> | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  return ak.every((k) => a[k] === b[k]);
}
