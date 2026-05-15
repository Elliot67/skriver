<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

import { Compartment, EditorState, RangeSetBuilder } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  drawSelection,
  highlightSpecialChars,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting, syntaxTree } from '@codemirror/language';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { Tag, styleTags, tags as t } from '@lezer/highlight';

const tableCellTag = Tag.define();
const tableExtension = { props: [styleTags({ TableCell: tableCellTag })] };

const codeBlockLineDeco = Decoration.line({ class: 'cm-codeBlockLine' });

function buildCodeBlockDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        if (node.name !== 'FencedCode' && node.name !== 'CodeBlock') return;
        const startLine = view.state.doc.lineAt(node.from).number;
        const endLine = view.state.doc.lineAt(node.to).number;
        for (let n = startLine; n <= endLine; n++) {
          const line = view.state.doc.line(n);
          builder.add(line.from, line.from, codeBlockLineDeco);
        }
      },
    });
  }
  return builder.finish();
}

const codeBlockBackgroundPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildCodeBlockDecorations(view);
    }
    update(u: ViewUpdate) {
      if (u.docChanged || u.viewportChanged) {
        this.decorations = buildCodeBlockDecorations(u.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

import { useEditorStore } from '@/stores/editor';

const store = useEditorStore();
const { markdown: doc } = storeToRefs(store);

const host = ref<HTMLDivElement | null>(null);
let view: EditorView | null = null;
let observer: MutationObserver | null = null;
const highlightCompartment = new Compartment();

const lightHighlightStyle = HighlightStyle.define([
  { tag: t.heading, color: '#7c3aed', fontWeight: '700' },
  { tag: t.strong, color: '#0f172a', fontWeight: '700' },
  { tag: t.emphasis, color: '#0f172a', fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.link, color: '#2563eb', textDecoration: 'underline' },
  { tag: t.url, color: '#2563eb' },
  { tag: t.monospace, color: '#9333ea' },
  { tag: t.list, color: '#0f766e' },
  { tag: t.quote, color: '#475569', fontStyle: 'italic' },
  { tag: tableCellTag, color: '#0e7490' },
  { tag: t.contentSeparator, color: '#94a3b8' },
  { tag: t.processingInstruction, color: '#94a3b8' },
  { tag: t.meta, color: '#94a3b8' },
  { tag: t.keyword, color: '#9333ea' },
  { tag: [t.string, t.special(t.string)], color: '#15803d' },
  { tag: t.comment, color: '#64748b', fontStyle: 'italic' },
  { tag: [t.number, t.bool, t.atom], color: '#c2410c' },
  { tag: t.variableName, color: '#0f172a' },
  { tag: t.function(t.variableName), color: '#1d4ed8' },
  { tag: t.typeName, color: '#0891b2' },
  { tag: t.propertyName, color: '#0f766e' },
  { tag: t.operator, color: '#475569' },
  { tag: t.punctuation, color: '#475569' },
]);

const darkHighlightStyle = HighlightStyle.define([
  { tag: t.heading, color: '#c4b5fd', fontWeight: '700' },
  { tag: t.strong, color: '#f1f5f9', fontWeight: '700' },
  { tag: t.emphasis, color: '#f1f5f9', fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.link, color: '#93c5fd', textDecoration: 'underline' },
  { tag: t.url, color: '#93c5fd' },
  { tag: t.monospace, color: '#d8b4fe' },
  { tag: t.list, color: '#5eead4' },
  { tag: t.quote, color: '#cbd5e1', fontStyle: 'italic' },
  { tag: tableCellTag, color: '#67e8f9' },
  { tag: t.contentSeparator, color: '#64748b' },
  { tag: t.processingInstruction, color: '#64748b' },
  { tag: t.meta, color: '#64748b' },
  { tag: t.keyword, color: '#d8b4fe' },
  { tag: [t.string, t.special(t.string)], color: '#86efac' },
  { tag: t.comment, color: '#94a3b8', fontStyle: 'italic' },
  { tag: [t.number, t.bool, t.atom], color: '#fdba74' },
  { tag: t.variableName, color: '#e2e8f0' },
  { tag: t.function(t.variableName), color: '#93c5fd' },
  { tag: t.typeName, color: '#67e8f9' },
  { tag: t.propertyName, color: '#5eead4' },
  { tag: t.operator, color: '#cbd5e1' },
  { tag: t.punctuation, color: '#cbd5e1' },
]);

function isDark(): boolean {
  return document.documentElement.classList.contains('dark');
}

function currentHighlightStyle(): HighlightStyle {
  return isDark() ? darkHighlightStyle : lightHighlightStyle;
}

const chromeTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: 'var(--ui-bg)',
    color: 'var(--ui-text)',
    borderRadius: '0.75rem',
    border: '1px solid var(--ui-border)',
    fontSize: '0.875rem',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    lineHeight: '1.55',
  },
  '.cm-content': { caretColor: 'var(--ui-text)' },
  '.cm-codeBlockLine': { backgroundColor: 'rgba(127, 127, 127, 0.1)' },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: 'var(--ui-text-muted)',
    border: 'none',
    borderRight: '1px solid var(--ui-border)',
    paddingInline: '0.5rem',
  },
  '&.cm-focused': { outline: 'none', borderColor: 'var(--ui-primary)' },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, & > .cm-scroller > .cm-selectionLayer .cm-selectionBackground':
    {
      background: 'var(--ui-bg-accented)',
    },
  '.cm-cursor': { borderLeftColor: 'var(--ui-text)' },
});

onMounted(() => {
  if (!host.value) return;

  const state = EditorState.create({
    doc: doc.value,
    extensions: [
      lineNumbers(),
      history(),
      drawSelection(),
      highlightSpecialChars(),
      EditorView.lineWrapping,
      keymap.of([...defaultKeymap, ...historyKeymap]),
      markdown({
        base: markdownLanguage,
        codeLanguages: languages,
        extensions: [tableExtension],
      }),
      codeBlockBackgroundPlugin,
      highlightCompartment.of(syntaxHighlighting(currentHighlightStyle())),
      chromeTheme,
      EditorView.updateListener.of((u) => {
        if (!u.docChanged) return;
        const next = u.state.doc.toString();
        if (next !== doc.value) doc.value = next;
      }),
    ],
  });

  view = new EditorView({ state, parent: host.value });

  observer = new MutationObserver(() => {
    view?.dispatch({
      effects: highlightCompartment.reconfigure(syntaxHighlighting(currentHighlightStyle())),
    });
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
});

watch(
  doc,
  (val) => {
    if (!view) return;
    const current = view.state.doc.toString();
    if (val === current) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: val },
    });
  },
  { flush: 'post' },
);

onBeforeUnmount(() => {
  observer?.disconnect();
  observer = null;
  view?.destroy();
  view = null;
});
</script>

<template>
  <div ref="host" class="h-full w-full flex-1 overflow-hidden" />
</template>
