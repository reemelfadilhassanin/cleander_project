import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// تعريف __dirname في ESM:
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, '../shared'),
      '@assets': resolve(__dirname, 'attached_assets'),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: resolve(__dirname, '../dist/public'),
    emptyOutDir: true,
  },
});
