import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 8000,
    open: false, // Don't auto-open browser in dev mode since Electron/Batch script will handle launching
    host: true
  },
  build: {
    outDir: 'dist',
    minify: 'esbuild'
  }
});
