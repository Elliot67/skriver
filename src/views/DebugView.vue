<script setup lang="ts">
import { ref } from 'vue';

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

function onPaste(event: ClipboardEvent): void {
  event.preventDefault();
  const pasted = readPasteEvent(event);
  entries.value = pasted.map((entry) => ({ id: makeId(), ...entry }));
  toast.add({
    title: `Captured ${pasted.length} MIME ${pasted.length === 1 ? 'type' : 'types'}`,
    color: 'success',
    icon: 'i-lucide-clipboard-paste',
  });
}

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
  const writable = entries.value.filter(
    (entry) => !entry.binary && entry.mimeType.trim() !== '',
  );
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
    await writeManyViaCopyEvent(
      writable.map(({ mimeType, payload }) => ({ mimeType, payload })),
    );
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
  <div class="mx-auto flex max-w-5xl flex-col gap-6 p-6">
    <header class="flex flex-col gap-1">
      <h1 class="text-2xl font-semibold">Clipboard debug</h1>
      <p class="text-sm text-muted">
        Paste (⌘V) into the box below to inspect every MIME type the clipboard
        carried. Edit, add custom types, then save back to round-trip into
        another app.
      </p>
    </header>

    <section
      class="flex flex-col gap-2 rounded-xl border border-default bg-elevated p-5 shadow-xs"
    >
      <label class="text-sm font-medium">Paste capture</label>
      <p class="text-xs text-muted">
        Focus the box and press ⌘V — every MIME type the clipboard exposes will
        appear below.
      </p>
      <UTextarea
        placeholder="Paste here to capture clipboard contents…"
        :rows="3"
        autoresize
        @paste="onPaste"
      />
    </section>

    <div v-if="entries.length > 0" class="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div
        v-for="entry in entries"
        :key="entry.id"
        class="flex flex-col gap-3 rounded-xl border border-default bg-elevated p-5 shadow-xs"
      >
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium">MIME type</label>
            <UButton
              icon="i-lucide-trash-2"
              color="neutral"
              variant="ghost"
              size="xs"
              aria-label="Remove entry"
              @click="removeRow(entry.id)"
            />
          </div>
          <UInput
            v-model="entry.mimeType"
            placeholder="text/plain"
            class="font-mono"
            :disabled="entry.binary"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium">Payload</label>
          <p v-if="entry.binary" class="rounded-md bg-muted px-3 py-2 text-sm text-muted italic">
            Binary content — not editable, skipped on save.
          </p>
          <UTextarea
            v-else
            v-model="entry.payload"
            :rows="6"
            autoresize
            class="font-mono"
            placeholder="(empty)"
          />
        </div>
      </div>
    </div>

    <section
      class="flex flex-wrap items-center gap-2 rounded-xl border border-default bg-elevated p-4 shadow-xs"
    >
      <UButton
        label="Add MIME type"
        icon="i-lucide-plus"
        color="neutral"
        variant="outline"
        @click="addRow"
      />
      <div class="grow" />
      <UButton
        v-if="entries.length > 0"
        label="Clear"
        variant="ghost"
        color="neutral"
        @click="clearAll"
      />
      <UButton
        label="Save all to clipboard"
        icon="i-lucide-clipboard"
        color="primary"
        :loading="saving"
        :disabled="entries.length === 0"
        @click="saveAll"
      />
    </section>
  </div>
</template>
