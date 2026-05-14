<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';

const navItems = [
  { label: 'Home', icon: 'i-lucide-home', to: '/' },
  { label: 'Clipboard debugger', icon: 'i-lucide-clipboard', to: '/debug' },
];
</script>

<template>
  <UApp>
    <div class="flex min-h-svh flex-col bg-default text-default">
      <nav class="border-b border-default">
        <div class="mx-auto flex max-w-6xl items-center px-4 py-3">
          <ul class="mx-auto flex items-center gap-6">
            <li v-for="item in navItems" :key="item.to">
              <RouterLink
                :to="item.to"
                class="flex items-center gap-2 text-sm text-muted hover:text-default"
                active-class="text-primary"
              >
                <UIcon :name="item.icon" class="size-4" />
                <span>{{ item.label }}</span>
              </RouterLink>
            </li>
          </ul>
          <UColorModeButton />
        </div>
      </nav>
      <main class="flex-1">
        <RouterView />
      </main>
    </div>
  </UApp>
</template>

<style scoped></style>
