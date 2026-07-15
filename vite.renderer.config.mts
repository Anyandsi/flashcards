import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig(({ command }) => ({
  plugins: [
    {
      name: 'content-security-policy',
      transformIndexHtml(html) {
        const connectSources = command === 'serve' ? "'self' ws: wss:" : "'self'";

        return html.replace('__CSP_CONNECT_SOURCES__', connectSources);
      },
    },
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}));
