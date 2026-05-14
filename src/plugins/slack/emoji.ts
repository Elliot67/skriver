const EMOJI_RE = /:[a-z0-9_+-]+:/g;

export type EmojiSegment =
  | { kind: 'text'; value: string }
  | { kind: 'emoji'; value: string };

export function splitTextWithEmoji(text: string): EmojiSegment[] {
  const segments: EmojiSegment[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(EMOJI_RE)) {
    const i = match.index ?? 0;
    if (i > lastIndex) {
      segments.push({ kind: 'text', value: text.slice(lastIndex, i) });
    }
    segments.push({ kind: 'emoji', value: match[0] });
    lastIndex = i + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ kind: 'text', value: text.slice(lastIndex) });
  }
  return segments;
}
