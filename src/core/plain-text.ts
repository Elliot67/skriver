import type {
  Blockquote,
  Code,
  Heading,
  Image,
  InlineCode,
  Link,
  List,
  Paragraph,
  PhrasingContent,
  Root,
  RootContent,
  Table,
  Text,
} from 'mdast';

export function mdastToPlainText(ast: Root): string {
  return ast.children.map(blockText).join('\n\n');
}

function blockText(node: RootContent): string {
  switch (node.type) {
    case 'paragraph':
      return inlineText((node as Paragraph).children);
    case 'heading':
      return inlineText((node as Heading).children);
    case 'list':
      return listText(node as List);
    case 'blockquote':
      return (node as Blockquote).children.map(blockText).join('\n\n');
    case 'code':
      return (node as Code).value;
    case 'thematicBreak':
      return '---';
    case 'table':
      return tableText(node as Table);
    case 'html':
      return (node as { value: string }).value;
    default:
      return '';
  }
}

function listText(node: List): string {
  const lines: string[] = [];
  for (const item of node.children) {
    for (const child of item.children) {
      if (child.type === 'list') {
        lines.push(listText(child as List));
      } else if (child.type === 'paragraph') {
        lines.push(inlineText((child as Paragraph).children));
      } else {
        lines.push(blockText(child));
      }
    }
  }
  return lines.join('\n');
}

function tableText(node: Table): string {
  return node.children
    .map((row) => row.children.map((cell) => inlineText(cell.children)).join(' | '))
    .join('\n');
}

function inlineText(nodes: PhrasingContent[]): string {
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
        out += inlineText(n.children);
        break;
      case 'link':
        out += inlineText((n as Link).children);
        break;
      case 'break':
        out += '\n';
        break;
      case 'image': {
        const img = n as Image;
        out += img.alt ?? img.url;
        break;
      }
      case 'html':
        out += (n as { value: string }).value;
        break;
    }
  }
  return out;
}
