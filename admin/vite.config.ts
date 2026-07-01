import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const API_URL = env.VITE_API_URL || '';

  return {
    base: mode === 'production' ? '/yunqi-canteen/admin/' : '/admin/',
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'icons/*.png',
          'icons/*.svg',
          'robots.txt',
        ],
        manifest: {
          name: '云栖浅食 - 商家管理后台',
          short_name: '商家后台',
          description: '云栖浅食商家订单与商品管理系统',
          theme_color: '#059669',
          background_color: '#FFFBEB',
          display: 'standalone',
          display_override: ['standalone', 'minimal-ui'],
          orientation: 'landscape',
          scope: '.',
          start_url: '.',
          lang: 'zh-CN',
          categories: ['business', 'productivity', 'food'],
          icons: [
            {
              src: 'icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'icons/icon-384.png',
              sizes: '384x384',
              type: 'image/png',
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'icons/maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webp}'],
          globIgnores: ['**/node_modules/**', '**/dist/**'],
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, '../shared'),
      },
    },
    server: {
      host: true,
      port: 5174,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/uploads': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/socket.io': {
          target: 'http://localhost:3001',
          ws: true,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'esbuild',
      cssCodeSplit: true,
    },
  };
});
