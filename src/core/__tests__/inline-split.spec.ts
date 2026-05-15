import type { PhrasingContent, Text } from 'mdast';
import { describe, expect, it } from 'vitest';

import { splitInlineByNewlines } from '../inline-split';

function text(value: string): Text {
  return { type: 'text', value };
}

describe('splitInlineByNewlines', () => {
  it('returns a single group when there are no newlines', () => {
    expect(splitInlineByNewlines([text('one'), text(' two')])).toEqual([[text('one'), text(' two')]]);
  });

  it('splits a text node at every soft newline', () => {
    expect(splitInlineByNewlines([text('a\nb\nc')])).toEqual([[text('a')], [text('b')], [text('c')]]);
  });

  it('treats a break node as a split point', () => {
    expect(splitInlineByNewlines([text('one'), { type: 'break' }, text('two')] as PhrasingContent[])).toEqual([
      [text('one')],
      [text('two')],
    ]);
  });

  it('re-wraps marks across a split so each line keeps the formatting', () => {
    const input: PhrasingContent[] = [{ type: 'strong', children: [text('bold one\nbold two')] }];
    expect(splitInlineByNewlines(input)).toEqual([
      [{ type: 'strong', children: [text('bold one')] }],
      [{ type: 'strong', children: [text('bold two')] }],
    ]);
  });

  it('drops empty segments produced by consecutive newlines', () => {
    expect(splitInlineByNewlines([text('a\n\nb')])).toEqual([[text('a')], [], [text('b')]]);
  });
});
