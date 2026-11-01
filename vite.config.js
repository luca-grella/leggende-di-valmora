import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // served from luca-grella.github.io/leggende-di-valmora/
  build: { chunkSizeWarningLimit: 1200 },
});
