import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Target modern browsers for smaller, faster output
    target: 'es2020',
    // Increase warning threshold for the feature-rich app
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Manual chunk splitting — function form required by Rolldown (Vite 6+)
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('react-dom') ||
              id.includes('react-router-dom') ||
              (id.includes('/react/') && !id.includes('react-hook-form') && !id.includes('react-redux'))
            ) {
              return 'vendor-react';
            }
            if (id.includes('@reduxjs/toolkit') || id.includes('react-redux')) {
              return 'vendor-redux';
            }
            if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
              return 'vendor-forms';
            }
            if (id.includes('axios')) {
              return 'vendor-http';
            }
          }
        },
      },
    },
  },
  server: {
    host: true,
  },
});
