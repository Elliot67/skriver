<script setup lang="ts">
import { storeToRefs } from 'pinia';

import { useEditorStore } from '@/stores/editor';

const store = useEditorStore();
const { markdown } = storeToRefs(store);
</script>

<template>
  <UTextarea
    v-model="markdown"
    :rows="16"
    autoresize
    placeholder="Write your markdown here…"
    class="w-full font-mono"
  />
</template>
