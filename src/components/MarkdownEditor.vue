<script setup lang="ts">
import { storeToRefs } from 'pinia';

import { useEditorStore } from '@/stores/editor';

const store = useEditorStore();
const { markdown } = storeToRefs(store);
</script>

<template>
  <section
    class="flex flex-col gap-2 rounded-xl border border-default bg-elevated p-5 shadow-xs"
  >
    <label class="text-sm font-medium">Markdown</label>
    <UTextarea
      v-model="markdown"
      :rows="16"
      autoresize
      placeholder="Write your markdown here…"
      class="w-full font-mono"
    />
  </section>
</template>
