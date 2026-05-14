import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';
import ui from '@nuxt/ui/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    ui({
      colorMode: true,
      ui: {
        input: {
          variants: {
            variant: { outline: 'bg-[var(--input)] ring-[var(--border)]' },
          },
        },
        textarea: {
          variants: {
            variant: { outline: 'bg-[var(--input)] ring-[var(--border)]' },
          },
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
