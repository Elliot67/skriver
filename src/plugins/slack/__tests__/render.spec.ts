import { describe, expect, it } from 'vitest';

import { parse } from '@/core/markdown';
import { renderSlack, SLACK_WARNINGS, type SlackOp } from '../render';

function run(md: string) {
  const ast = parse(md);
  const result = renderSlack(ast, {});
  return {
    ops: JSON.parse(result.output).ops as SlackOp[],
    plainText: result.plainText,
    warnings: result.warnings,
  };
}

describe('paragraphs and breaks', () => {
  it('emits plain paragraph terminated with a newline', () => {
    const { ops } = run('Hello world');
    expect(ops).toEqual([{ insert: 'Hello world\n' }]);
  });

  it('separates two paragraphs with a blank-line newline', () => {
    const { ops } = run('First paragraph.\n\nSecond paragraph.');
    expect(ops).toEqual([{ insert: 'First paragraph.\n\nSecond paragraph.\n' }]);
  });

  it('preserves a soft break inside a paragraph as a newline', () => {
    const { ops } = run('Line one\nLine two');
    expect(ops).toEqual([{ insert: 'Line one\nLine two\n' }]);
  });

  it('preserves a hard break as a newline inside the paragraph', () => {
    const { ops } = run('Line one  \nLine two');
    expect(ops).toEqual([{ insert: 'Line one\nLine two\n' }]);
  });
});

describe('inline marks', () => {
  it('applies bold', () => {
    const { ops } = run('I am **bold**.');
    expect(ops).toEqual([
      { insert: 'I am ' },
      { insert: 'bold', attributes: { bold: true } },
      { insert: '.\n' },
    ]);
  });

  it('applies italic', () => {
    const { ops } = run('I am _italic_.');
    expect(ops).toEqual([
      { insert: 'I am ' },
      { insert: 'italic', attributes: { italic: true } },
      { insert: '.\n' },
    ]);
  });

  it('applies strike from GFM ~~text~~', () => {
    const { ops } = run('I am ~~striked~~.');
    expect(ops).toEqual([
      { insert: 'I am ' },
      { insert: 'striked', attributes: { strike: true } },
      { insert: '.\n' },
    ]);
  });

  it('applies inline code', () => {
    const { ops } = run('an `inline code` sample.');
    expect(ops).toEqual([
      { insert: 'an ' },
      { insert: 'inline code', attributes: { code: true } },
      { insert: ' sample.\n' },
    ]);
  });

  it('combines nested marks', () => {
    const { ops } = run('**_both_**');
    expect(ops).toEqual([
      { insert: 'both', attributes: { bold: true, italic: true } },
      { insert: '\n' },
    ]);
  });
});

describe('links', () => {
  it('attaches a link attribute on the visible text', () => {
    const { ops } = run('See [Google](https://google.com).');
    expect(ops).toEqual([
      { insert: 'See ' },
      { insert: 'Google', attributes: { link: 'https://google.com' } },
      { insert: '.\n' },
    ]);
  });

  it('keeps bold inside a link', () => {
    const { ops } = run('[**Google**](https://google.com)');
    expect(ops).toEqual([
      { insert: 'Google', attributes: { bold: true, link: 'https://google.com' } },
      { insert: '\n' },
    ]);
  });
});

describe('lists', () => {
  it('emits bullet list items with list:bullet on each terminator', () => {
    const { ops } = run('- one\n- two');
    expect(ops).toEqual([
      { insert: 'one' },
      { insert: '\n', attributes: { list: 'bullet' } },
      { insert: 'two' },
      { insert: '\n', attributes: { list: 'bullet' } },
    ]);
  });

  it('uses indent on nested bullet items', () => {
    const { ops } = run('- top\n  - nested\n- root');
    expect(ops).toEqual([
      { insert: 'top' },
      { insert: '\n', attributes: { list: 'bullet' } },
      { insert: 'nested' },
      { insert: '\n', attributes: { list: 'bullet', indent: 1 } },
      { insert: 'root' },
      { insert: '\n', attributes: { list: 'bullet' } },
    ]);
  });

  it('emits ordered list with list:ordered', () => {
    const { ops } = run('1. one\n2. two');
    expect(ops).toEqual([
      { insert: 'one' },
      { insert: '\n', attributes: { list: 'ordered' } },
      { insert: 'two' },
      { insert: '\n', attributes: { list: 'ordered' } },
    ]);
  });

  it('preserves indent for three-level deep nesting', () => {
    const { ops } = run('- a\n  - b\n    - c');
    expect(ops).toEqual([
      { insert: 'a' },
      { insert: '\n', attributes: { list: 'bullet' } },
      { insert: 'b' },
      { insert: '\n', attributes: { list: 'bullet', indent: 1 } },
      { insert: 'c' },
      { insert: '\n', attributes: { list: 'bullet', indent: 2 } },
    ]);
  });

  it('keeps inline marks on list item content', () => {
    const { ops } = run('- **bold item**');
    expect(ops).toEqual([
      { insert: 'bold item', attributes: { bold: true } },
      { insert: '\n', attributes: { list: 'bullet' } },
    ]);
  });
});

describe('task lists (GFM)', () => {
  it('prefixes task items with ☐ / ✓ and warns', () => {
    const { ops, warnings } = run('- [ ] todo\n- [x] done');
    expect(ops).toEqual([
      { insert: '☐ todo' },
      { insert: '\n', attributes: { list: 'bullet' } },
      { insert: '✓ done' },
      { insert: '\n', attributes: { list: 'bullet' } },
    ]);
    expect(warnings).toContain(SLACK_WARNINGS.TASK_LIST);
  });

  it('leaves non-task siblings unprefixed in a mixed list and still warns', () => {
    const { ops, warnings } = run('- [ ] task\n- regular');
    expect(ops).toEqual([
      { insert: '☐ task' },
      { insert: '\n', attributes: { list: 'bullet' } },
      { insert: 'regular' },
      { insert: '\n', attributes: { list: 'bullet' } },
    ]);
    expect(warnings).toContain(SLACK_WARNINGS.TASK_LIST);
  });
});

describe('blockquote', () => {
  it('emits blockquote:true on the terminator', () => {
    const { ops } = run('> quoted line');
    expect(ops).toEqual([
      { insert: 'quoted line' },
      { insert: '\n', attributes: { blockquote: true } },
    ]);
  });

  it('attributes every line of a multi-line blockquote', () => {
    const { ops } = run('> line one\n> line two');
    expect(ops).toEqual([
      { insert: 'line one' },
      { insert: '\n', attributes: { blockquote: true } },
      { insert: 'line two' },
      { insert: '\n', attributes: { blockquote: true } },
    ]);
  });
});

describe('code block', () => {
  it('emits code-block:true on each line terminator', () => {
    const { ops } = run('```\nline one\nline two\n```');
    expect(ops).toEqual([
      { insert: 'line one' },
      { insert: '\n', attributes: { 'code-block': true } },
      { insert: 'line two' },
      { insert: '\n', attributes: { 'code-block': true } },
    ]);
  });
});

describe('thematic break', () => {
  it('emits -------- as a paragraph (Slack has no native hr)', () => {
    const { ops, plainText } = run('---');
    expect(ops).toEqual([{ insert: '--------\n' }]);
    expect(plainText).toBe('--------');
  });
});

describe('headings', () => {
  it('maps depth 1..3 to header:N', () => {
    const { ops: h1 } = run('# title');
    expect(h1).toEqual([
      { insert: 'title' },
      { insert: '\n', attributes: { header: 1 } },
    ]);
    const { ops: h3 } = run('### title');
    expect(h3).toEqual([
      { insert: 'title' },
      { insert: '\n', attributes: { header: 3 } },
    ]);
  });

  it('clamps depth > 3 to header:3 and warns', () => {
    const { ops, warnings } = run('#### deep');
    expect(ops).toEqual([
      { insert: 'deep' },
      { insert: '\n', attributes: { header: 3 } },
    ]);
    expect(warnings).toContain(SLACK_WARNINGS.HEADING_DEPTH);
  });
});

describe('tables', () => {
  it('flattens to a code block and warns', () => {
    const md = '| a | b |\n| - | - |\n| 1 | 2 |';
    const { ops, warnings } = run(md);
    expect(warnings).toContain(SLACK_WARNINGS.TABLES);
    expect(ops).toEqual([
      { insert: 'a | b' },
      { insert: '\n', attributes: { 'code-block': true } },
      { insert: '1 | 2' },
      { insert: '\n', attributes: { 'code-block': true } },
    ]);
  });

  it('aligns columns when the aligned row stays within 80 chars', () => {
    const md = '| short | longer cell |\n| - | - |\n| longer | x |';
    const { ops } = run(md);
    expect(ops).toEqual([
      { insert: 'short  | longer cell' },
      { insert: '\n', attributes: { 'code-block': true } },
      { insert: 'longer | x' },
      { insert: '\n', attributes: { 'code-block': true } },
    ]);
  });

  it('does not align when the aligned row would exceed 80 chars', () => {
    const left = 'x'.repeat(40);
    const right = 'y'.repeat(40);
    const md = `| ${left} | ${right} |\n| - | - |\n| a | b |`;
    const { ops } = run(md);
    expect(ops[0]).toEqual({ insert: `${left} | ${right}` });
    expect(ops[2]).toEqual({ insert: 'a | b' });
  });
});

describe('images', () => {
  it('emits alt text and warns', () => {
    const { ops, warnings } = run('![logo](https://x/y.png)');
    expect(warnings).toContain(SLACK_WARNINGS.IMAGES);
    expect(ops).toEqual([{ insert: 'logo\n' }]);
  });
});

describe('emoji shortcodes', () => {
  // We don't emit `slackemoji` embeds — Slack's client auto-converts shortcode
  // text on render. The asymmetry we *do* care about: shortcodes inside `code`
  // / `code-block` spans must keep that attribute so Slack's renderer skips
  // them. These tests pin that contract down.
  it('emits :shortcode: in prose as plain text (Slack auto-converts on render)', () => {
    const { ops } = run('hi :smile: there');
    expect(ops).toEqual([{ insert: 'hi :smile: there\n' }]);
  });

  it('keeps :shortcode: inside inline code under the code attribute (Slack skips it)', () => {
    const { ops } = run('use `:smile:` here');
    expect(ops).toEqual([
      { insert: 'use ' },
      { insert: ':smile:', attributes: { code: true } },
      { insert: ' here\n' },
    ]);
  });

  it('keeps :shortcode: inside a fenced code block under code-block (Slack skips it)', () => {
    const { ops } = run('```\n:smile:\n```');
    expect(ops).toEqual([
      { insert: ':smile:' },
      { insert: '\n', attributes: { 'code-block': true } },
    ]);
  });
});

describe('multi-block separation', () => {
  it('inserts a blank-line newline between paragraph and list', () => {
    const { ops } = run('A paragraph.\n\n- item');
    expect(ops).toEqual([
      { insert: 'A paragraph.\n\nitem' },
      { insert: '\n', attributes: { list: 'bullet' } },
    ]);
  });
});

describe('empty input', () => {
  it('emits a single newline op', () => {
    const { ops } = run('');
    expect(ops).toEqual([{ insert: '\n' }]);
  });
});

describe('plain text companion', () => {
  it('emits Slack mrkdwn matching the rendered Delta', () => {
    const { plainText } = run('- Hello\n- How are you?\n  - Doing?');
    expect(plainText).toBe('- Hello\n- How are you?\n  - Doing?');
  });
});
