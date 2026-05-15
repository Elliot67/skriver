<script setup lang="ts">
import MarkdownEditor from '@/components/MarkdownEditor.vue';
import PluginRow from '@/components/PluginRow.vue';
import { plugins } from '@/core/plugin-registry';
import type { ClientPlugin } from '@/core/plugin';
</script>

<template>
  <div class="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-6">
    <div class="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <MarkdownEditor />

      <aside class="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
        <p class="text-sm text-muted">Write once in Markdown, copy formatted for your chat client.</p>

        <div class="flex flex-col gap-3">
          <PluginRow
            v-for="plugin in plugins"
            :key="plugin.id"
            :plugin="plugin as unknown as ClientPlugin<Record<string, unknown>>"
          />
        </div>

        <RouterLink to="/debug" class="group inline-flex items-center gap-1.5 text-sm text-muted hover:text-default">
          <UIcon
            name="i-lucide-arrow-right"
            class="size-4 transition-transform duration-200 group-hover:translate-x-1"
          />
          <span>Clipboard Debugger</span>
        </RouterLink>
      </aside>
    </div>
  </div>
</template>
