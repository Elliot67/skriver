import { describe, expect, it } from 'vitest';

import { parse } from '@/core/markdown';
import { renderJira } from '../render';

function run(md: string) {
  return renderJira(parse(md), {});
}

const PM_P =
  '<p data-prosemirror-content-type="node" data-prosemirror-node-name="paragraph" data-prosemirror-node-block="true">';
const PM_UL =
  '<ul class="ak-ul" data-prosemirror-content-type="node" data-prosemirror-node-name="bulletList" data-prosemirror-node-block="true">';
const PM_OL =
  '<ol start="1" class="ak-ol" data-prosemirror-content-type="node" data-prosemirror-node-name="orderedList" data-prosemirror-node-block="true">';
const PM_LI =
  '<li data-prosemirror-content-type="node" data-prosemirror-node-name="listItem" data-prosemirror-node-block="true">';
const PM_BLOCKQUOTE =
  '<blockquote data-prosemirror-content-type="node" data-prosemirror-node-name="blockquote" data-prosemirror-node-block="true">';
const PM_HR =
  '<hr data-prosemirror-content-type="node" data-prosemirror-node-name="rule" data-prosemirror-node-block="true">';
const PM_TABLE =
  '<table data-prosemirror-content-type="node" data-prosemirror-node-name="table" data-prosemirror-node-block="true">';
const PM_TR =
  '<tr data-prosemirror-content-type="node" data-prosemirror-node-name="tableRow" data-prosemirror-node-block="true">';
const PM_TH =
  '<th data-prosemirror-content-type="node" data-prosemirror-node-name="tableHeader" data-prosemirror-node-block="true">';
const PM_TD =
  '<td data-prosemirror-content-type="node" data-prosemirror-node-name="tableCell" data-prosemirror-node-block="true">';
const PM_TASKLIST =
  '<div data-node-type="actionList" style="list-style: none; padding-left: 0" data-prosemirror-content-type="node" data-prosemirror-node-name="taskList" data-prosemirror-node-block="true">';
const taskItem = (state: 'TODO' | 'DONE') =>
  `<div data-task-state="${state}" data-prosemirror-content-type="node" data-prosemirror-node-name="taskItem" data-prosemirror-node-block="true">`;

const PM_STRONG =
  '<strong data-prosemirror-content-type="mark" data-prosemirror-mark-name="strong">';
const PM_EM =
  '<em data-prosemirror-content-type="mark" data-prosemirror-mark-name="em">';
const PM_STRIKE =
  '<s data-prosemirror-content-type="mark" data-prosemirror-mark-name="strike">';
const PM_CODE_MARK =
  '<span class="code" spellcheck="false" data-prosemirror-content-type="mark" data-prosemirror-mark-name="code">';

const pmHeading = (level: number) =>
  `<h${level} data-prosemirror-content-type="node" data-prosemirror-node-name="heading" data-prosemirror-node-block="true">`;
const pmLink = (href: string) =>
  `<a href="${href}" data-prosemirror-content-type="mark" data-prosemirror-mark-name="link">`;

describe('paragraphs and breaks', () => {
  it('wraps a paragraph with the paragraph ProseMirror attrs', () => {
    expect(run('Hello world').output).toBe(`${PM_P}Hello world</p>`);
  });

  it('emits one block per paragraph', () => {
    expect(run('First.\n\nSecond.').output).toBe(
      `${PM_P}First.</p>${PM_P}Second.</p>`,
    );
  });

  it('renders a hard break as <br>', () => {
    expect(run('Line one  \nLine two').output).toBe(
      `${PM_P}Line one<br>Line two</p>`,
    );
  });
});

describe('headings', () => {
  it('maps depth 1..6 to <h1>..<h6> with heading attrs', () => {
    expect(run('# a').output).toBe(`${pmHeading(1)}a</h1>`);
    expect(run('###### f').output).toBe(`${pmHeading(6)}f</h6>`);
  });
});

describe('inline marks', () => {
  it('renders bold as <strong> with strong mark attrs', () => {
    expect(run('**bold**').output).toBe(`${PM_P}${PM_STRONG}bold</strong></p>`);
  });

  it('renders italic as <em> with em mark attrs', () => {
    expect(run('_italic_').output).toBe(`${PM_P}${PM_EM}italic</em></p>`);
  });

  it('renders strikethrough as <s> with strike mark attrs', () => {
    expect(run('~~struck~~').output).toBe(`${PM_P}${PM_STRIKE}struck</s></p>`);
  });

  it('renders inline code as <span class="code"> with code mark attrs', () => {
    expect(run('an `x` sample').output).toBe(
      `${PM_P}an ${PM_CODE_MARK}x</span> sample</p>`,
    );
  });
});

describe('links', () => {
  it('emits <a> with href + link mark attrs', () => {
    expect(run('[Google](https://google.com)').output).toBe(
      `${PM_P}${pmLink('https://google.com')}Google</a></p>`,
    );
  });

  it('escapes the href attribute', () => {
    expect(run('[x](https://e.com/?a=1&b=2)').output).toBe(
      `${PM_P}${pmLink('https://e.com/?a=1&amp;b=2')}x</a></p>`,
    );
  });
});

describe('lists', () => {
  it('emits a bullet list with ak-ul and per-item <p> wrapping', () => {
    expect(run('- one\n- two').output).toBe(
      `${PM_UL}${PM_LI}${PM_P}one</p></li>${PM_LI}${PM_P}two</p></li></ul>`,
    );
  });

  it('emits an ordered list with start="1" and ak-ol', () => {
    expect(run('1. one\n2. two').output).toBe(
      `${PM_OL}${PM_LI}${PM_P}one</p></li>${PM_LI}${PM_P}two</p></li></ol>`,
    );
  });

  it('nests a child <ul> inside the parent <li> after its <p>', () => {
    expect(run('- top\n  - nested').output).toBe(
      `${PM_UL}${PM_LI}${PM_P}top</p>${PM_UL}${PM_LI}${PM_P}nested</p></li></ul></li></ul>`,
    );
  });
});

describe('task lists (GFM)', () => {
  it('emits actionList wrapper with TODO/DONE states and no IDs', () => {
    const { output } = run('- [ ] task one\n- [x] task two');
    expect(output).toBe(
      `${PM_TASKLIST}${taskItem('TODO')}task one</div>${taskItem('DONE')}task two</div></div>`,
    );
    expect(output).not.toContain('data-task-list-local-id');
    expect(output).not.toContain('data-task-local-id');
  });

  it('falls back to a regular list and warns when items are mixed', () => {
    const { output, warnings } = run('- [ ] task\n- regular');
    expect(output).toBe(
      `${PM_UL}${PM_LI}${PM_P}task</p></li>${PM_LI}${PM_P}regular</p></li></ul>`,
    );
    expect(warnings).toContain(
      'Mixed task and non-task items in a list — rendered as a regular list.',
    );
  });
});

describe('blockquote', () => {
  it('wraps each child paragraph in its own <p>', () => {
    expect(run('> line one\n>\n> line two').output).toBe(
      `${PM_BLOCKQUOTE}${PM_P}line one</p>${PM_P}line two</p></blockquote>`,
    );
  });
});

describe('thematic break', () => {
  it('emits <hr> with rule node attrs', () => {
    expect(run('---').output).toBe(PM_HR);
  });
});

describe('code block', () => {
  it('emits <pre class="code-block"> + <code> with data-language on both', () => {
    expect(run('```typescript\nconst x = 1;\n```').output).toBe(
      '<pre class="code-block" data-language="typescript" data-prosemirror-content-type="node" data-prosemirror-node-name="codeBlock" data-prosemirror-node-block="true">' +
        '<code data-language="typescript" spellcheck="false">const x = 1;</code></pre>',
    );
  });

  it('omits data-language when the fence has no language', () => {
    expect(run('```\nplain\n```').output).toBe(
      '<pre class="code-block" data-prosemirror-content-type="node" data-prosemirror-node-name="codeBlock" data-prosemirror-node-block="true">' +
        '<code spellcheck="false">plain</code></pre>',
    );
  });

  it('maps language shortcodes (ts → typescript)', () => {
    expect(run('```ts\nconst x = 1;\n```').output).toBe(
      '<pre class="code-block" data-language="typescript" data-prosemirror-content-type="node" data-prosemirror-node-name="codeBlock" data-prosemirror-node-block="true">' +
        '<code data-language="typescript" spellcheck="false">const x = 1;</code></pre>',
    );
  });

  it('escapes HTML inside code blocks', () => {
    expect(run('```\n<script>x</script>\n```').output).toBe(
      '<pre class="code-block" data-prosemirror-content-type="node" data-prosemirror-node-name="codeBlock" data-prosemirror-node-block="true">' +
        '<code spellcheck="false">&lt;script&gt;x&lt;/script&gt;</code></pre>',
    );
  });
});

describe('tables', () => {
  it('renders header cells as <th> and body cells as <td>, paragraph-wrapped, single <tbody>', () => {
    const md = '| a | b |\n| - | - |\n| 1 | 2 |';
    expect(run(md).output).toBe(
      `${PM_TABLE}<tbody>` +
        `${PM_TR}${PM_TH}${PM_P}a</p></th>${PM_TH}${PM_P}b</p></th></tr>` +
        `${PM_TR}${PM_TD}${PM_P}1</p></td>${PM_TD}${PM_P}2</p></td></tr>` +
        `</tbody></table>`,
    );
  });
});

describe('plain text companion', () => {
  it('uses the shared mdast → plain-text helper', () => {
    expect(run('- one\n- two').plainText).toBe('one\ntwo');
  });
});
