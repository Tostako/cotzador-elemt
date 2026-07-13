import { defineConfig } from 'vitest/config'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Vendors pesados en chunks aparte (mejor caché y menos bloqueo del hilo en móvil).
        // Vite 8 usa Rolldown por debajo: manualChunks solo acepta forma de función.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('konva')) return 'konva';
          if (id.includes('react-router-dom') || id.includes('/react/') || id.includes('/react-dom/')) return 'react';
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.ts',
  },
})
