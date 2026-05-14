<script setup lang="ts">
import MarkdownEditor from '@/components/MarkdownEditor.vue';
import PluginRow from '@/components/PluginRow.vue';
import { plugins } from '@/core/plugin-registry';
import type { ClientPlugin } from '@/core/plugin';
</script>

<template>
  <div class="mx-auto flex max-w-3xl flex-col gap-6 p-6">
    <header class="flex flex-col gap-1">
      <h1 class="text-2xl font-semibold">Skriver</h1>
      <p class="text-sm text-muted">
        Write once in Markdown, copy formatted for your chat client.
      </p>
    </header>

    <MarkdownEditor />

    <div class="flex flex-col gap-3">
      <PluginRow
        v-for="plugin in plugins"
        :key="plugin.id"
        :plugin="plugin as unknown as ClientPlugin<Record<string, unknown>>"
      />
    </div>
  </div>
</template>
