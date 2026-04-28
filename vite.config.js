import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Build produces a single artifact the hotelier embeds:
//   dist/widget.js — self-contained IIFE that auto-mounts a
//                    multi-platform review-score toast.
//
// React + ReactDOM are bundled in. No sibling stylesheet — every
// style is inline (CSS-in-JS) plus a small <style> tag injected by
// the component for keyframes and the mobile media query.
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/embed.jsx'),
      name: 'ReassuranceWidget',
      formats: ['iife'],
      fileName: () => 'widget.js',
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
    cssCodeSplit: false,
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2018',
  },
  server: {
    port: 5176,
    open: '/demo.html',
  },
});
