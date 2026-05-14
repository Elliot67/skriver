import { describe, expect, it } from 'vitest';

import { parse } from '../markdown';
import { mdastToPlainText } from '../plain-text';

function pt(md: string): string {
  return mdastToPlainText(parse(md));
}

describe('mdastToPlainText', () => {
  it('returns paragraph text', () => {
    expect(pt('Hello world')).toBe('Hello world');
  });

  it('joins paragraphs with a blank line', () => {
    expect(pt('First.\n\nSecond.')).toBe('First.\n\nSecond.');
  });

  it('preserves soft and hard breaks as newlines', () => {
    expect(pt('Line one\nLine two')).toBe('Line one\nLine two');
    expect(pt('Line one  \nLine two')).toBe('Line one\nLine two');
  });

  it('strips inline formatting marks but keeps text', () => {
    expect(pt('I am **bold** and _italic_ and ~~struck~~.')).toBe(
      'I am bold and italic and struck.',
    );
  });

  it('keeps inline code content', () => {
    expect(pt('use `code` here')).toBe('use code here');
  });

  it('uses link text only', () => {
    expect(pt('[Google](https://google.com)')).toBe('Google');
  });

  it('renders bullet list items on consecutive lines', () => {
    expect(pt('- one\n- two\n- three')).toBe('one\ntwo\nthree');
  });

  it('renders nested list items inline with their parent list', () => {
    expect(pt('- Hello\n- How are you?\n  - Doing?')).toBe(
      'Hello\nHow are you?\nDoing?',
    );
  });

  it('renders ordered list items as plain lines', () => {
    expect(pt('1. one\n2. two')).toBe('one\ntwo');
  });

  it('renders blockquote content', () => {
    expect(pt('> quoted line')).toBe('quoted line');
  });

  it('renders code blocks verbatim', () => {
    expect(pt('```\nline one\nline two\n```')).toBe('line one\nline two');
  });

  it('renders thematic break as ---', () => {
    expect(pt('---')).toBe('---');
  });

  it('renders headings as plain text', () => {
    expect(pt('# Title')).toBe('Title');
  });

  it('renders tables with pipe-separated cells', () => {
    expect(pt('| a | b |\n| - | - |\n| 1 | 2 |')).toBe('a | b\n1 | 2');
  });

  it('renders image as alt text', () => {
    expect(pt('![logo](https://x/y.png)')).toBe('logo');
  });

  it('returns an empty string for empty input', () => {
    expect(pt('')).toBe('');
  });

  it('separates a list and a following paragraph with a blank line', () => {
    expect(pt('- one\n- two\n\nA paragraph.')).toBe('one\ntwo\n\nA paragraph.');
  });
});
