import type { SlackOp } from './render';

interface ListLevel {
  type: 'bullet' | 'ordered';
  counter: number;
}

interface OpAttrs {
  bold?: true;
  italic?: true;
  strike?: true;
  code?: true;
  link?: string;
  slackmention?: { label?: string; [k: string]: unknown };
  list?: 'bullet' | 'ordered';
  indent?: number;
  blockquote?: true;
  'code-block'?: true;
  header?: number;
}

export function deltaToMrkdwn(ops: SlackOp[]): string {
  const out: string[] = [];
  let currentLine = '';
  const listStack: ListLevel[] = [];
  let codeBlockOpen = false;
  let codeBlockBuffer: string[] = [];

  function finalizeCodeBlock(): void {
    if (!codeBlockOpen) return;
    out.push('```');
    for (const line of codeBlockBuffer) out.push(line);
    out.push('```');
    codeBlockBuffer = [];
    codeBlockOpen = false;
  }

  function flushParagraphLine(): void {
    finalizeCodeBlock();
    listStack.length = 0;
    out.push(currentLine);
    currentLine = '';
  }

  function flushListLine(attrs: OpAttrs): void {
    finalizeCodeBlock();
    const listType = attrs.list ?? 'bullet';
    const indent = attrs.indent ?? 0;
    if (listStack.length > indent + 1) listStack.length = indent + 1;
    let level = listStack[indent];
    if (!level || level.type !== listType) {
      level = { type: listType, counter: 0 };
      listStack[indent] = level;
    }
    level.counter += 1;
    let prefix = '';
    for (let i = 0; i < indent; i++) {
      const ancestor = listStack[i];
      prefix += ancestor && ancestor.type === 'ordered' ? '   ' : '  ';
    }
    prefix += listType === 'bullet' ? '- ' : `${level.counter}. `;
    out.push(prefix + currentLine);
    currentLine = '';
  }

  function flushBlockquoteLine(): void {
    finalizeCodeBlock();
    listStack.length = 0;
    out.push('> ' + currentLine);
    currentLine = '';
  }

  function flushCodeBlockLine(): void {
    listStack.length = 0;
    codeBlockOpen = true;
    codeBlockBuffer.push(currentLine);
    currentLine = '';
  }

  function flushHeaderLine(level: number): void {
    finalizeCodeBlock();
    listStack.length = 0;
    const n = Math.min(Math.max(level, 1), 6);
    out.push('#'.repeat(n) + ' ' + currentLine);
    currentLine = '';
  }

  function applyMarks(text: string, attrs: OpAttrs): string {
    if (attrs.slackmention) return text;
    if (attrs.code) return `\`${text}\``;

    let result: string;
    if (attrs.link) {
      result = text === attrs.link ? attrs.link : `[${text}](${attrs.link})`;
    } else {
      result = text;
    }
    if (attrs.strike) result = `~${result}~`;
    if (attrs.bold) result = `*${result}*`;
    if (attrs.italic) result = `_${result}_`;
    return result;
  }

  for (const op of ops) {
    const insert = op.insert;
    const attrs = (op.attributes ?? {}) as OpAttrs;

    if (typeof insert === 'object') {
      if ('slackemoji' in insert) {
        currentLine += insert.slackemoji.text;
      }
      continue;
    }

    const isBlockTerminator =
      insert === '\n' &&
      (attrs.list || attrs.blockquote || attrs['code-block'] || attrs.header);

    if (isBlockTerminator) {
      if (attrs['code-block']) flushCodeBlockLine();
      else if (attrs.list) flushListLine(attrs);
      else if (attrs.blockquote) flushBlockquoteLine();
      else if (attrs.header) flushHeaderLine(attrs.header);
      continue;
    }

    const parts = insert.split('\n');
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i] ?? '';
      if (part !== '') {
        currentLine += applyMarks(part, attrs);
      }
      if (i < parts.length - 1) {
        flushParagraphLine();
      }
    }
  }

  if (currentLine !== '') {
    flushParagraphLine();
  } else {
    finalizeCodeBlock();
  }

  while (out.length > 0 && out[out.length - 1] === '') out.pop();

  return out.join('\n');
}
