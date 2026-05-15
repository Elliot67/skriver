<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

import { readPasteEvent, writeManyViaCopyEvent } from '@/core/clipboard';

interface Row {
  id: string;
  mimeType: string;
  payload: string;
  binary: boolean;
}

const entries = ref<Row[]>([]);
const saving = ref(false);
const toast = useToast();

function makeId(): string {
  return crypto.randomUUID();
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return true;
  return target.isContentEditable;
}

function onDocumentPaste(event: ClipboardEvent): void {
  if (isEditableTarget(event.target)) return;
  event.preventDefault();
  const pasted = readPasteEvent(event);
  entries.value = pasted.map((entry) => ({ id: makeId(), ...entry }));
  toast.add({
    title: `Captured ${pasted.length} MIME ${pasted.length === 1 ? 'type' : 'types'}`,
    color: 'success',
    icon: 'i-lucide-clipboard-paste',
  });
}

onMounted(() => document.addEventListener('paste', onDocumentPaste));
onBeforeUnmount(() => document.removeEventListener('paste', onDocumentPaste));

function addRow(): void {
  entries.value.push({ id: makeId(), mimeType: '', payload: '', binary: false });
}

function removeRow(id: string): void {
  entries.value = entries.value.filter((entry) => entry.id !== id);
}

function clearAll(): void {
  entries.value = [];
}

async function saveAll(): Promise<void> {
  const writable = entries.value.filter((entry) => !entry.binary && entry.mimeType.trim() !== '');
  if (writable.length === 0) {
    toast.add({
      title: 'Nothing to save',
      description: 'Add at least one MIME type with a non-empty name.',
      color: 'warning',
      icon: 'i-lucide-circle-alert',
    });
    return;
  }
  saving.value = true;
  try {
    await writeManyViaCopyEvent(writable.map(({ mimeType, payload }) => ({ mimeType, payload })));
    toast.add({
      title: `Wrote ${writable.length} MIME ${writable.length === 1 ? 'type' : 'types'}`,
      color: 'success',
      icon: 'i-lucide-clipboard-check',
    });
  } catch (err) {
    toast.add({
      title: 'Failed to write clipboard',
      description: err instanceof Error ? err.message : String(err),
      color: 'error',
      icon: 'i-lucide-circle-alert',
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6">
    <section class="flex flex-wrap items-center gap-2 rounded-xl border border-default p-4 shadow-xs">
      <UButton label="Add MIME type" icon="i-lucide-plus" color="neutral" variant="soft" @click="addRow" />
      <div class="grow" />
      <UButton label="Clear" variant="soft" color="neutral" :disabled="entries.length === 0" @click="clearAll" />
      <UButton
        label="Save all to clipboard"
        icon="i-lucide-clipboard"
        color="primary"
        :loading="saving"
        :disabled="entries.length === 0"
        @click="saveAll"
      />
    </section>

    <div
      v-if="entries.length === 0"
      class="flex flex-1 items-center justify-center rounded-xl border border-dashed border-default p-12 text-center"
    >
      <div class="flex flex-col items-center gap-2 text-muted">
        <UIcon name="i-lucide-clipboard-paste" class="size-8" />
        <p class="text-sm">Paste your content in the page (⌘V)</p>
      </div>
    </div>

    <div v-else class="flex gap-3 overflow-x-auto pb-2 lg:-mx-[calc(50vw-30.5rem)] lg:px-[calc(50vw-30.5rem)]">
      <div
        v-for="entry in entries"
        :key="entry.id"
        class="flex bg-elevated/75 w-[40%] min-w-[250px] shrink-0 flex-col gap-3 rounded-xl border border-default p-5 shadow-xs lg:w-96"
      >
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium">MIME type</label>
            <UButton
              icon="i-lucide-trash-2"
              color="neutral"
              variant="soft"
              size="xs"
              aria-label="Remove entry"
              @click="removeRow(entry.id)"
            />
          </div>
          <UInput v-model="entry.mimeType" placeholder="text/plain" class="font-mono" :disabled="entry.binary" />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium">Payload</label>
          <p v-if="entry.binary" class="rounded-md bg-muted px-3 py-2 text-sm text-muted italic">
            Binary content — not editable, skipped on save.
          </p>
          <UTextarea v-else v-model="entry.payload" :rows="6" autoresize class="font-mono" placeholder="(empty)" />
        </div>
      </div>
    </div>
  </div>
</template>
