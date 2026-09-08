import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The client builds into dist/client, which the wave 3 API serves on
// 0.0.0.0:3000 as the same origin. In production nothing here runs.
//
// The dev server binds 3001 (the API owns 3000; the two must never contend)
// and proxies /api to the API. It configures NO response-header block: any
// X-Frame-Options or CSP frame-ancestors value would blank the preview iframe,
// and this is the one place a frontend build could accidentally reintroduce it.
export default defineConfig({
  plugins: [react()],
  root: 'src/client',
  base: '/',
  build: { outDir: '../../dist/client', emptyOutDir: true },
  server: {
    host: '0.0.0.0',
    port: 3001,
    strictPort: true,
    proxy: { '/api': { target: 'http://127.0.0.1:3000', changeOrigin: false } },
  },
});
