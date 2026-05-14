import { describe, expect, it } from 'vitest';

import { parse } from '@/core/markdown';
import { renderTeams } from '../render';

function run(md: string) {
  const ast = parse(md);
  return renderTeams(ast, {});
}

describe('paragraphs and breaks', () => {
  it('wraps a paragraph in <p>', () => {
    expect(run('Hello world').output).toBe('<p>Hello world</p>');
  });

  it('emits one <p> per paragraph', () => {
    expect(run('First.\n\nSecond.').output).toBe('<p>First.</p><p>Second.</p>');
  });

  it('renders a hard break as <br>', () => {
    expect(run('Line one  \nLine two').output).toBe('<p>Line one<br>Line two</p>');
  });
});

describe('inline marks', () => {
  it('renders bold as <strong>', () => {
    expect(run('**bold**').output).toBe('<p><strong>bold</strong></p>');
  });

  it('renders italic as <em>', () => {
    expect(run('_italic_').output).toBe('<p><em>italic</em></p>');
  });

  it('renders strikethrough as <s>', () => {
    expect(run('~~striked~~').output).toBe('<p><s>striked</s></p>');
  });

  it('renders inline code as <code>', () => {
    expect(run('an `inline code` sample').output).toBe(
      '<p>an <code>inline code</code> sample</p>',
    );
  });

  it('nests marks', () => {
    expect(run('**_both_**').output).toBe('<p><strong><em>both</em></strong></p>');
  });
});

describe('links and images', () => {
  it('renders a link with href', () => {
    expect(run('[Google](https://google.com)').output).toBe(
      '<p><a href="https://google.com">Google</a></p>',
    );
  });

  it('escapes the href attribute', () => {
    expect(run('[x](https://e.com/?a=1&b=2)').output).toBe(
      '<p><a href="https://e.com/?a=1&amp;b=2">x</a></p>',
    );
  });

  it('renders an image with src and alt', () => {
    expect(run('![logo](https://x/y.png)').output).toBe(
      '<p><img src="https://x/y.png" alt="logo"></p>',
    );
  });
});

describe('lists', () => {
  it('emits <ul><li>', () => {
    expect(run('- one\n- two').output).toBe('<ul><li>one</li><li>two</li></ul>');
  });

  it('nests <ul> inside <li>', () => {
    expect(run('- top\n  - nested\n- root').output).toBe(
      '<ul><li>top<ul><li>nested</li></ul></li><li>root</li></ul>',
    );
  });

  it('emits <ol> for ordered lists', () => {
    expect(run('1. one\n2. two').output).toBe('<ol><li>one</li><li>two</li></ol>');
  });
});

describe('blockquote', () => {
  it('wraps content in <blockquote><p>', () => {
    expect(run('> quoted line').output).toBe('<blockquote><p>quoted line</p></blockquote>');
  });
});

describe('code block', () => {
  it('emits a bare <pre> when the fence has no language', () => {
    expect(run('```\nline one\nline two\n```').output).toBe(
      '<pre spellcheck="false"><code>line one\nline two</code></pre>',
    );
  });

  it('prepends the CK Editor placeholder when the fence has a language', () => {
    expect(run('```ts\nconst A  = "hello";\n```').output).toBe(
      '<p itemtype="http://schema.skype.com/CodeBlockEditor">&nbsp;</p>' +
        '<pre spellcheck="false"><code>const A  = "hello";</code></pre>',
    );
  });

  it('only places a placeholder before fenced-with-language blocks', () => {
    const output = run('```\nplain\n```\n\n```ts\ntyped\n```').output;
    const matches = output.match(
      /<p itemtype="http:\/\/schema.skype.com\/CodeBlockEditor">/g,
    );
    expect(matches).toHaveLength(1);
  });

  it('escapes HTML inside an unlabelled code block', () => {
    expect(run('```\n<script>alert("x")</script>\n```').output).toBe(
      '<pre spellcheck="false"><code>&lt;script&gt;alert("x")&lt;/script&gt;</code></pre>',
    );
  });
});

describe('thematic break', () => {
  it('emits <hr>', () => {
    expect(run('---').output).toBe('<hr>');
  });
});

describe('headings', () => {
  it('maps depth 1..6 to <h1>..<h6>', () => {
    expect(run('# a').output).toBe('<h1>a</h1>');
    expect(run('###### f').output).toBe('<h6>f</h6>');
  });
});

describe('tables', () => {
  it('emits <table><thead>/<tbody> with <th> and <td>', () => {
    const md = '| a | b |\n| - | - |\n| 1 | 2 |';
    expect(run(md).output).toBe(
      '<table><thead><tr><th>a</th><th>b</th></tr></thead>' +
        '<tbody><tr><td>1</td><td>2</td></tr></tbody></table>',
    );
  });
});

describe('escaping', () => {
  it('escapes <, >, & in text content', () => {
    expect(run('a < b & c > d').output).toBe('<p>a &lt; b &amp; c &gt; d</p>');
  });

  it('does not escape quotes in text content', () => {
    expect(run('she said "hi"').output).toBe('<p>she said "hi"</p>');
  });
});

describe('empty input', () => {
  it('emits empty output', () => {
    expect(run('').output).toBe('');
  });
});

describe('plain text companion', () => {
  it('mirrors the visible message text', () => {
    expect(run('- one\n- two').plainText).toBe('one\ntwo');
  });
});
