<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import iconUrl from '@/assets/media/icon.svg';

const route = useRoute();
const isDebug = computed(() => route.name === 'debug');
</script>

<template>
  <UApp>
    <div class="flex min-h-svh flex-col light:bg-elevated/50 dark:bg-zinc-950 text-default">
      <header class="sticky top-0 z-10 border-b border-default bg-elevated/80 backdrop-blur">
        <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <RouterLink to="/" class="group flex items-center gap-2">
            <span class="flex size-10 items-center justify-center">
              <UIcon
                v-if="isDebug"
                name="i-lucide-arrow-left"
                class="size-5 text-highlighted transition-transform duration-200 group-hover:-translate-x-1"
                aria-label="Back to home"
              />
              <img v-else :src="iconUrl" alt="" class="size-10" />
            </span>
            <span class="text-base font-semibold text-highlighted">Skriver</span>
            <template v-if="isDebug">
              <USeparator orientation="vertical" class="h-5" />
              <span class="text-sm text-muted">Clipboard Debugger</span>
            </template>
          </RouterLink>
          <div class="flex items-center gap-1">
            <UButton
              to="#"
              target="_blank"
              rel="noopener noreferrer"
              icon="i-simple-icons:github"
              color="neutral"
              variant="ghost"
              aria-label="GitHub repository"
            />
            <UColorModeButton />
          </div>
        </div>
      </header>
      <main class="flex flex-1 flex-col">
        <RouterView />
      </main>
    </div>
  </UApp>
</template>

<style scoped></style>
