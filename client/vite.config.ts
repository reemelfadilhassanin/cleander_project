import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // 👈 هذا هو المهم الآن
      '@shared': path.resolve(__dirname, '../shared'),
      '@assets': path.resolve(__dirname, 'attached_assets'),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: path.resolve(__dirname, '../dist/public'), // خروج في مجلد خارج client
    emptyOutDir: true,
  },
});
