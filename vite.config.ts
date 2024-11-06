import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: true,
  },
  assetsInclude: ['**/*.pdf'],  // This ensures Vite recognizes PDF files as assets
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('pdfjs-dist')) {
            return 'pdfjs';
          }
        },
      },
    },
  },
});
