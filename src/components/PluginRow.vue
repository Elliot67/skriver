<script setup lang="ts">
import { computed, ref } from 'vue';

import { writeForPlugin } from '@/core/clipboard';
import { parse } from '@/core/markdown';
import type { ClientPlugin } from '@/core/plugin';
import type { PluginId } from '@/core/plugin-registry';
import { useEditorStore } from '@/stores/editor';

const props = defineProps<{ plugin: ClientPlugin<Record<string, unknown>> }>();

const store = useEditorStore();
const toast = useToast();

const pluginId = computed(() => props.plugin.id as PluginId);
const options = computed(() => store.pluginOptions[pluginId.value] ?? {});
const optionKeys = computed(() => Object.keys(props.plugin.defaultOptions));
const hasOptions = computed(() => optionKeys.value.length > 0);
const warnings = computed(() => store.lastWarnings[pluginId.value] ?? []);

const copying = ref(false);

async function copy(): Promise<void> {
  copying.value = true;
  try {
    const ast = parse(store.markdown);
    const result = props.plugin.render(ast, options.value);
    store.setLastWarnings(pluginId.value, result.warnings);
    await writeForPlugin(props.plugin, result.output, result.plainText);
    toast.add({
      title: `Copied for ${props.plugin.label}`,
      color: 'success',
      icon: 'i-lucide-clipboard-check',
    });
  } catch (err) {
    toast.add({
      title: `Failed to copy for ${props.plugin.label}`,
      description: err instanceof Error ? err.message : String(err),
      color: 'error',
      icon: 'i-lucide-circle-alert',
    });
  } finally {
    copying.value = false;
  }
}

function setOption(key: string, value: unknown): void {
  store.setPluginOption(pluginId.value, key, value);
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}
</script>

<template>
  <div class="flex flex-col gap-2 rounded-lg border border-default p-4">
    <div class="flex items-center gap-2">
      <span class="grow font-medium">{{ plugin.label }}</span>

      <UPopover v-if="hasOptions">
        <UButton
          icon="i-lucide-settings"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="`Options for ${plugin.label}`"
        />
        <template #content>
          <div class="flex flex-col gap-2 p-3 min-w-56">
            <div
              v-for="key in optionKeys"
              :key="key"
              class="flex items-center justify-between gap-3"
            >
              <span class="text-sm">{{ formatKey(key) }}</span>
              <USwitch
                v-if="typeof options[key] === 'boolean'"
                :model-value="options[key] as boolean"
                @update:model-value="(v: boolean) => setOption(key, v)"
              />
              <UInput
                v-else
                :model-value="String(options[key] ?? '')"
                size="xs"
                @update:model-value="(v: string) => setOption(key, v)"
              />
            </div>
          </div>
        </template>
      </UPopover>

      <UButton
        :label="`Copy for ${plugin.label}`"
        icon="i-lucide-clipboard"
        color="primary"
        :loading="copying"
        @click="copy"
      />
    </div>

    <ul v-if="warnings.length > 0" class="flex flex-col gap-1 text-sm text-warning">
      <li v-for="(w, i) in warnings" :key="i" class="flex items-start gap-1">
        <UIcon name="i-lucide-triangle-alert" class="mt-0.5 shrink-0" />
        <span>{{ w }}</span>
      </li>
    </ul>
  </div>
</template>
