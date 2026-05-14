import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

import { plugins, type PluginId } from '@/core/plugin-registry';

const STORAGE_KEY_MARKDOWN = 'skriver:markdown';
const STORAGE_KEY_OPTIONS = 'skriver:pluginOptions';

type PluginOptionsMap = Record<PluginId, Record<string, unknown>>;
type WarningsMap = Record<PluginId, string[]>;

function defaultPluginOptions(): PluginOptionsMap {
  const out = {} as PluginOptionsMap;
  for (const p of plugins) {
    out[p.id as PluginId] = { ...p.defaultOptions } as Record<string, unknown>;
  }
  return out;
}

function emptyWarnings(): WarningsMap {
  const out = {} as WarningsMap;
  for (const p of plugins) {
    out[p.id as PluginId] = [];
  }
  return out;
}

function loadString(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function loadOptions(): PluginOptionsMap {
  const defaults = defaultPluginOptions();
  const raw = loadString(STORAGE_KEY_OPTIONS);
  if (!raw) return defaults;
  try {
    const parsed = JSON.parse(raw) as Partial<PluginOptionsMap>;
    for (const p of plugins) {
      const id = p.id as PluginId;
      const stored = parsed[id];
      if (stored && typeof stored === 'object') {
        defaults[id] = { ...defaults[id], ...stored };
      }
    }
  } catch {
    // ignore — fall back to defaults
  }
  return defaults;
}

function save(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore quota / privacy-mode errors
  }
}

export const useEditorStore = defineStore('editor', () => {
  const markdown = ref<string>(loadString(STORAGE_KEY_MARKDOWN) ?? '');
  const pluginOptions = ref<PluginOptionsMap>(loadOptions());
  const lastWarnings = ref<WarningsMap>(emptyWarnings());

  watch(markdown, (value) => {
    save(STORAGE_KEY_MARKDOWN, value);
  });

  watch(
    pluginOptions,
    (value) => {
      save(STORAGE_KEY_OPTIONS, JSON.stringify(value));
    },
    { deep: true },
  );

  function setPluginOption(id: PluginId, key: string, value: unknown): void {
    pluginOptions.value[id] = { ...pluginOptions.value[id], [key]: value };
  }

  function setLastWarnings(id: PluginId, warnings: string[]): void {
    lastWarnings.value[id] = warnings;
  }

  return {
    markdown,
    pluginOptions,
    lastWarnings,
    setPluginOption,
    setLastWarnings,
  };
});
