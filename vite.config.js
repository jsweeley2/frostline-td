import { defineConfig } from 'vite';

export default defineConfig({
  // Vercel serves the built site from the "dist" folder by default.
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173,
    open: false,
  },
});
