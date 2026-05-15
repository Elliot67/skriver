<script setup lang="ts">
import { storeToRefs } from 'pinia';

import { useEditorStore } from '@/stores/editor';

const store = useEditorStore();
const { markdown } = storeToRefs(store);
</script>

<template>
  <UTextarea
    v-model="markdown"
    placeholder="Write your markdown here…"
    class="h-full rounded-xl w-full flex-1 font-mono"
    :ui="{ base: 'h-full resize-none' }"
  />
</template>
