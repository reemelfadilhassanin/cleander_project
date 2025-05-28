import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Vite configuration
export default defineConfig({
  root: path.resolve(__dirname, 'client'), // 👈 root directory for React app
  plugins: [
    react(),
    // Remove or comment Replit-only plugins in production
    // runtimeErrorOverlay(),
    // cartographer()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client', 'src'), // 👈 alias to src
      '@shared': path.resolve(__dirname, 'shared'), // 👈 shared code
      '@assets': path.resolve(__dirname, 'attached_assets'), // optional
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/public'), // 👈 this matches server static serving
    emptyOutDir: true,
  },
  server: {
    port: 3000,
  },
});
