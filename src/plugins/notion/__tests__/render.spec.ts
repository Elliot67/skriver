import { describe, expect, it } from 'vitest';

import { parse } from '@/core/markdown';
import { renderNotion } from '../render';

function run(md: string) {
  return renderNotion(parse(md), {}, md);
}

describe('renderNotion', () => {
  it('returns the markdown source unchanged', () => {
    const md = '# Title\n\n- one\n- two\n\n[link](https://example.com)';
    expect(run(md).output).toBe(md);
  });

  it('preserves GFM features (task lists, tables, strikethrough) verbatim', () => {
    const md = '- [ ] todo\n- [x] done\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n~~struck~~';
    expect(run(md).output).toBe(md);
  });

  it('produces no warnings', () => {
    expect(run('# x').warnings).toEqual([]);
  });

  it('returns an empty string when no source is provided', () => {
    expect(renderNotion(parse(''), {}).output).toBe('');
  });
});
