import type { PhrasingContent, Text } from 'mdast';

// Splits a paragraph's phrasing content into one group per visual line. Soft
// newlines inside `text` nodes and `break` nodes each produce a split. Marks
// (`strong`, `emphasis`, `delete`, `link`) that span a newline are recursively
// split and re-wrapped on each side so the marks survive the split.
//
// Used by HTML renderers (Teams, Jira) inside blockquotes, where markdown
// parses `> a\n> b` as one paragraph with a soft break — but the target
// editors render each line as its own <p>.
export function splitInlineByNewlines(nodes: PhrasingContent[]): PhrasingContent[][] {
  const lines: PhrasingContent[][] = [[]];
  const push = (node: PhrasingContent): void => {
    lines[lines.length - 1]!.push(node);
  };
  const newline = (): void => {
    lines.push([]);
  };

  function visit(node: PhrasingContent): void {
    if (node.type === 'break') {
      newline();
      return;
    }
    if (node.type === 'text') {
      const value = node.value;
      if (!value.includes('\n')) {
        push(node);
        return;
      }
      const parts = value.split('\n');
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i] ?? '';
        if (part.length > 0) push({ type: 'text', value: part } as Text);
        if (i < parts.length - 1) newline();
      }
      return;
    }
    if (node.type === 'strong' || node.type === 'emphasis' || node.type === 'delete' || node.type === 'link') {
      const childLines = splitInlineByNewlines(node.children);
      childLines.forEach((line, i) => {
        if (i > 0) newline();
        push({ ...node, children: line } as PhrasingContent);
      });
      return;
    }
    push(node);
  }

  for (const n of nodes) visit(n);
  return lines;
}
