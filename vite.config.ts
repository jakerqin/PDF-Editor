import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr(),
  ],
  server: {
    port: 3001,
    open: true,
  },
  build: {
    outDir: 'build',
  },
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
  },
  optimizeDeps: {
    include: ['pdfjs-dist', 'pdf-lib', 'fabric'],
  },
});
