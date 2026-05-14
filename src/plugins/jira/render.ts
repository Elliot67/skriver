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
  TableCell,
  TableRow,
  Text,
} from 'mdast';

import { mdastToPlainText } from '@/core/plain-text';
import type { RenderResult } from '@/core/plugin';

export type JiraOptions = Record<string, never>;

interface Ctx {
  out: string[];
  warnings: Set<string>;
}

// ProseMirror block-node open tags. Attribute order intentionally matches
// what Jira's editor emits on copy (see docs/formatting-jira.md) — the paste
// rules are forgiving but matching the canonical shape is the safe bet.
const OPEN_PARAGRAPH =
  '<p data-prosemirror-content-type="node" data-prosemirror-node-name="paragraph" data-prosemirror-node-block="true">';
const OPEN_UL =
  '<ul class="ak-ul" data-prosemirror-content-type="node" data-prosemirror-node-name="bulletList" data-prosemirror-node-block="true">';
const OPEN_OL =
  '<ol start="1" class="ak-ol" data-prosemirror-content-type="node" data-prosemirror-node-name="orderedList" data-prosemirror-node-block="true">';
const OPEN_LI =
  '<li data-prosemirror-content-type="node" data-prosemirror-node-name="listItem" data-prosemirror-node-block="true">';
const OPEN_BLOCKQUOTE =
  '<blockquote data-prosemirror-content-type="node" data-prosemirror-node-name="blockquote" data-prosemirror-node-block="true">';
const OPEN_TABLE =
  '<table data-prosemirror-content-type="node" data-prosemirror-node-name="table" data-prosemirror-node-block="true">';
const OPEN_TR =
  '<tr data-prosemirror-content-type="node" data-prosemirror-node-name="tableRow" data-prosemirror-node-block="true">';
const OPEN_TH =
  '<th data-prosemirror-content-type="node" data-prosemirror-node-name="tableHeader" data-prosemirror-node-block="true">';
const OPEN_TD =
  '<td data-prosemirror-content-type="node" data-prosemirror-node-name="tableCell" data-prosemirror-node-block="true">';
const HR =
  '<hr data-prosemirror-content-type="node" data-prosemirror-node-name="rule" data-prosemirror-node-block="true">';
const OPEN_TASK_LIST =
  '<div data-node-type="actionList" style="list-style: none; padding-left: 0" data-prosemirror-content-type="node" data-prosemirror-node-name="taskList" data-prosemirror-node-block="true">';

const OPEN_STRONG =
  '<strong data-prosemirror-content-type="mark" data-prosemirror-mark-name="strong">';
const OPEN_EM =
  '<em data-prosemirror-content-type="mark" data-prosemirror-mark-name="em">';
const OPEN_STRIKE =
  '<s data-prosemirror-content-type="mark" data-prosemirror-mark-name="strike">';
const OPEN_CODE_MARK =
  '<span class="code" spellcheck="false" data-prosemirror-content-type="mark" data-prosemirror-mark-name="code">';

const LANGUAGE_ALIAS: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  py: 'python',
  rb: 'ruby',
  yml: 'yaml',
  md: 'markdown',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
};

function normalizeLanguage(lang: string): string {
  const key = lang.toLowerCase();
  return LANGUAGE_ALIAS[key] ?? key;
}

export function renderJira(ast: Root, _options: JiraOptions): RenderResult {
  void _options;
  const ctx: Ctx = { out: [], warnings: new Set() };
  for (const block of ast.children) {
    renderBlock(ctx, block);
  }
  return {
    output: ctx.out.join(''),
    plainText: mdastToPlainText(ast),
    warnings: [...ctx.warnings],
  };
}

function renderBlock(ctx: Ctx, node: RootContent): void {
  switch (node.type) {
    case 'paragraph':
      ctx.out.push(OPEN_PARAGRAPH);
      renderInline(ctx, (node as Paragraph).children);
      ctx.out.push('</p>');
      break;
    case 'heading': {
      const h = node as Heading;
      const level = Math.min(Math.max(h.depth, 1), 6);
      ctx.out.push(
        `<h${level} data-prosemirror-content-type="node" data-prosemirror-node-name="heading" data-prosemirror-node-block="true">`,
      );
      renderInline(ctx, h.children);
      ctx.out.push(`</h${level}>`);
      break;
    }
    case 'list':
      renderList(ctx, node as List);
      break;
    case 'blockquote':
      renderBlockquote(ctx, node as Blockquote);
      break;
    case 'code':
      renderCode(ctx, node as Code);
      break;
    case 'thematicBreak':
      ctx.out.push(HR);
      break;
    case 'table':
      renderTable(ctx, node as Table);
      break;
    case 'html':
      ctx.out.push((node as { value: string }).value);
      break;
    default:
      ctx.warnings.add(`Unsupported block: ${node.type}`);
  }
}

function renderList(ctx: Ctx, node: List): void {
  if (node.children.length > 0 && node.children.every(isCheckedItem)) {
    renderTaskList(ctx, node);
    return;
  }
  if (node.children.some(isCheckedItem)) {
    ctx.warnings.add(
      'Mixed task and non-task items in a list — rendered as a regular list.',
    );
  }
  const open = node.ordered ? OPEN_OL : OPEN_UL;
  const close = node.ordered ? '</ol>' : '</ul>';
  ctx.out.push(open);
  for (const item of node.children) {
    renderListItem(ctx, item);
  }
  ctx.out.push(close);
}

function isCheckedItem(item: ListItem): boolean {
  return typeof item.checked === 'boolean';
}

function renderListItem(ctx: Ctx, item: ListItem): void {
  ctx.out.push(OPEN_LI);
  for (const child of item.children) {
    if (child.type === 'paragraph') {
      ctx.out.push(OPEN_PARAGRAPH);
      renderInline(ctx, (child as Paragraph).children);
      ctx.out.push('</p>');
    } else {
      renderBlock(ctx, child);
    }
  }
  ctx.out.push('</li>');
}

function renderTaskList(ctx: Ctx, node: List): void {
  ctx.out.push(OPEN_TASK_LIST);
  for (const item of node.children) {
    renderTaskItem(ctx, item);
  }
  ctx.out.push('</div>');
}

function renderTaskItem(ctx: Ctx, item: ListItem): void {
  const state = item.checked ? 'DONE' : 'TODO';
  ctx.out.push(
    `<div data-task-state="${state}" data-prosemirror-content-type="node" data-prosemirror-node-name="taskItem" data-prosemirror-node-block="true">`,
  );
  const first = item.children[0];
  if (first && first.type === 'paragraph') {
    renderInline(ctx, (first as Paragraph).children);
  }
  if (item.children.length > 1) {
    ctx.warnings.add(
      'Nested content inside a task item is not supported — only the first line is rendered.',
    );
  }
  ctx.out.push('</div>');
}

function renderBlockquote(ctx: Ctx, node: Blockquote): void {
  ctx.out.push(OPEN_BLOCKQUOTE);
  for (const child of node.children) {
    renderBlock(ctx, child);
  }
  ctx.out.push('</blockquote>');
}

function renderCode(ctx: Ctx, node: Code): void {
  const lang = node.lang ? normalizeLanguage(node.lang) : null;
  const langAttr = lang ? ` data-language="${escapeAttr(lang)}"` : '';
  ctx.out.push(
    `<pre class="code-block"${langAttr} data-prosemirror-content-type="node" data-prosemirror-node-name="codeBlock" data-prosemirror-node-block="true">`,
  );
  ctx.out.push(`<code${langAttr} spellcheck="false">`);
  ctx.out.push(escapeText(node.value));
  ctx.out.push('</code></pre>');
}

function renderTable(ctx: Ctx, node: Table): void {
  ctx.out.push(OPEN_TABLE);
  ctx.out.push('<tbody>');
  node.children.forEach((row, i) => {
    renderTableRow(ctx, row, i === 0 ? 'th' : 'td');
  });
  ctx.out.push('</tbody>');
  ctx.out.push('</table>');
}

function renderTableRow(ctx: Ctx, row: TableRow, cellTag: 'th' | 'td'): void {
  ctx.out.push(OPEN_TR);
  for (const cell of row.children) {
    renderTableCell(ctx, cell, cellTag);
  }
  ctx.out.push('</tr>');
}

function renderTableCell(ctx: Ctx, cell: TableCell, tag: 'th' | 'td'): void {
  ctx.out.push(tag === 'th' ? OPEN_TH : OPEN_TD);
  ctx.out.push(OPEN_PARAGRAPH);
  renderInline(ctx, cell.children);
  ctx.out.push('</p>');
  ctx.out.push(`</${tag}>`);
}

function renderInline(ctx: Ctx, nodes: PhrasingContent[]): void {
  for (const n of nodes) {
    switch (n.type) {
      case 'text':
        ctx.out.push(escapeText((n as Text).value));
        break;
      case 'strong':
        ctx.out.push(OPEN_STRONG);
        renderInline(ctx, n.children);
        ctx.out.push('</strong>');
        break;
      case 'emphasis':
        ctx.out.push(OPEN_EM);
        renderInline(ctx, n.children);
        ctx.out.push('</em>');
        break;
      case 'delete':
        ctx.out.push(OPEN_STRIKE);
        renderInline(ctx, n.children);
        ctx.out.push('</s>');
        break;
      case 'inlineCode':
        ctx.out.push(OPEN_CODE_MARK);
        ctx.out.push(escapeText((n as InlineCode).value));
        ctx.out.push('</span>');
        break;
      case 'link': {
        const link = n as Link;
        ctx.out.push(
          `<a href="${escapeAttr(link.url)}" data-prosemirror-content-type="mark" data-prosemirror-mark-name="link">`,
        );
        renderInline(ctx, link.children);
        ctx.out.push('</a>');
        break;
      }
      case 'image': {
        const img = n as Image;
        const alt = img.alt ?? '';
        ctx.out.push(`<img src="${escapeAttr(img.url)}" alt="${escapeAttr(alt)}">`);
        break;
      }
      case 'break':
        ctx.out.push('<br>');
        break;
      case 'html':
        ctx.out.push((n as { value: string }).value);
        break;
      default:
        ctx.warnings.add(`Unsupported inline: ${n.type}`);
    }
  }
}

function escapeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
