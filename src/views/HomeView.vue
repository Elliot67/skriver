<script setup lang="ts">
import MarkdownEditor from '@/components/MarkdownEditor.vue';
import PluginRow from '@/components/PluginRow.vue';
import { plugins } from '@/core/plugin-registry';
import type { ClientPlugin } from '@/core/plugin';
</script>

<template>
  <div class="mx-auto flex max-w-6xl flex-col gap-6 p-6">
    <header class="flex flex-col gap-1">
      <h1 class="text-2xl font-semibold">Skriver</h1>
      <p class="text-sm text-muted">
        Write once in Markdown, copy formatted for your chat client.
      </p>
    </header>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <MarkdownEditor />

      <aside class="flex flex-col gap-3 lg:sticky lg:top-6 lg:self-start">
        <PluginRow
          v-for="plugin in plugins"
          :key="plugin.id"
          :plugin="plugin as unknown as ClientPlugin<Record<string, unknown>>"
        />
      </aside>
    </div>
  </div>
</template>
