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

import { splitInlineByNewlines } from '@/core/inline-split';
import { mdastToPlainText } from '@/core/plain-text';
import type { RenderResult, Warning } from '@/core/plugin';

export type TeamsOptions = Record<string, never>;

export const TEAMS_WARNINGS = {
  TASK_LIST: {
    title: 'Checklists not supported',
    description:
      'Task list items are rendered as bullets prefixed with ☐ (unchecked) or ✓ (checked).',
    severity: 'warn',
  },
  UNSUPPORTED: {
    title: 'Unsupported markdown',
    description: 'Some markdown features are not supported and have been skipped.',
    severity: 'warn',
  },
} as const satisfies Record<string, Warning>;

interface Ctx {
  out: string[];
  warnings: Set<Warning>;
}

export function renderTeams(ast: Root, _options: TeamsOptions): RenderResult {
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
      ctx.out.push('<p>');
      renderInline(ctx, (node as Paragraph).children);
      ctx.out.push('</p>');
      break;
    case 'heading': {
      const h = node as Heading;
      const tag = `h${Math.min(Math.max(h.depth, 1), 6)}`;
      ctx.out.push(`<${tag}>`);
      renderInline(ctx, h.children);
      ctx.out.push(`</${tag}>`);
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
      ctx.out.push('<hr>');
      break;
    case 'table':
      renderTable(ctx, node as Table);
      break;
    case 'html':
      ctx.out.push((node as { value: string }).value);
      break;
    default:
      ctx.warnings.add(TEAMS_WARNINGS.UNSUPPORTED);
  }
}

function renderList(ctx: Ctx, node: List): void {
  if (node.children.some((item) => typeof item.checked === 'boolean')) {
    ctx.warnings.add(TEAMS_WARNINGS.TASK_LIST);
  }
  const tag = node.ordered ? 'ol' : 'ul';
  ctx.out.push(`<${tag}>`);
  for (const item of node.children) {
    renderListItem(ctx, item);
  }
  ctx.out.push(`</${tag}>`);
}

function renderListItem(ctx: Ctx, item: ListItem): void {
  ctx.out.push('<li>');
  item.children.forEach((child, i) => {
    if (child.type === 'paragraph') {
      // Inline the first paragraph's content directly inside <li> so simple lists
      // don't get wrapped in <p>; wrap later paragraphs in <p>.
      if (i === 0) {
        if (typeof item.checked === 'boolean') {
          ctx.out.push(item.checked ? '✓ ' : '☐ ');
        }
        renderInline(ctx, (child as Paragraph).children);
      } else {
        ctx.out.push('<p>');
        renderInline(ctx, (child as Paragraph).children);
        ctx.out.push('</p>');
      }
    } else {
      renderBlock(ctx, child);
    }
  });
  ctx.out.push('</li>');
}

function renderBlockquote(ctx: Ctx, node: Blockquote): void {
  ctx.out.push('<blockquote>');
  for (const child of node.children) {
    if (child.type === 'paragraph') {
      for (const line of splitInlineByNewlines((child as Paragraph).children)) {
        ctx.out.push('<p>');
        renderInline(ctx, line);
        ctx.out.push('</p>');
      }
    } else {
      renderBlock(ctx, child);
    }
  }
  ctx.out.push('</blockquote>');
}

// A fenced block with a language hint becomes a Teams CK Editor code block
// (placeholder <p> + <pre>). Teams discards the language itself on paste, but
// the presence of `node.lang` is how we know the author meant "code block" vs
// plain preformatted text — the latter pastes as a bare <pre> with no header.
function renderCode(ctx: Ctx, node: Code): void {
  if (node.lang) {
    ctx.out.push(
      '<p itemtype="http://schema.skype.com/CodeBlockEditor">&nbsp;</p>',
    );
  }
  ctx.out.push('<pre spellcheck="false"><code>');
  ctx.out.push(escapeText(node.value));
  ctx.out.push('</code></pre>');
}

function renderTable(ctx: Ctx, node: Table): void {
  ctx.out.push('<table>');
  const [headerRow, ...bodyRows] = node.children;
  if (headerRow) {
    ctx.out.push('<thead>');
    renderTableRow(ctx, headerRow, 'th');
    ctx.out.push('</thead>');
  }
  if (bodyRows.length > 0) {
    ctx.out.push('<tbody>');
    for (const row of bodyRows) {
      renderTableRow(ctx, row, 'td');
    }
    ctx.out.push('</tbody>');
  }
  ctx.out.push('</table>');
}

function renderTableRow(ctx: Ctx, row: TableRow, cellTag: 'th' | 'td'): void {
  ctx.out.push('<tr>');
  for (const cell of row.children) {
    renderTableCell(ctx, cell, cellTag);
  }
  ctx.out.push('</tr>');
}

function renderTableCell(ctx: Ctx, cell: TableCell, tag: 'th' | 'td'): void {
  ctx.out.push(`<${tag}>`);
  renderInline(ctx, cell.children);
  ctx.out.push(`</${tag}>`);
}

function renderInline(ctx: Ctx, nodes: PhrasingContent[]): void {
  for (const n of nodes) {
    switch (n.type) {
      case 'text':
        ctx.out.push(escapeText((n as Text).value));
        break;
      case 'strong':
        ctx.out.push('<strong>');
        renderInline(ctx, n.children);
        ctx.out.push('</strong>');
        break;
      case 'emphasis':
        ctx.out.push('<em>');
        renderInline(ctx, n.children);
        ctx.out.push('</em>');
        break;
      case 'delete':
        ctx.out.push('<s>');
        renderInline(ctx, n.children);
        ctx.out.push('</s>');
        break;
      case 'inlineCode':
        ctx.out.push('<code>');
        ctx.out.push(escapeText((n as InlineCode).value));
        ctx.out.push('</code>');
        break;
      case 'link': {
        const link = n as Link;
        ctx.out.push(`<a href="${escapeAttr(link.url)}">`);
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
        ctx.warnings.add(TEAMS_WARNINGS.UNSUPPORTED);
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
