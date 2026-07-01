import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const API_URL = env.VITE_API_URL || '';

  return {
    base: mode === 'production' ? '/yunqi-canteen/client/' : '/',
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
          name: '云栖浅食',
          short_name: '云栖浅食',
          description: '云栖浅食 - 健康轻食在线点餐',
          theme_color: '#10B981',
          background_color: '#FFFBEB',
          display: 'standalone',
          display_override: ['standalone', 'fullscreen', 'minimal-ui'],
          orientation: 'portrait',
          scope: '.',
          start_url: '.',
          lang: 'zh-CN',
          dir: 'ltr',
          categories: ['food', 'lifestyle', 'shopping'],
          prefer_related_applications: false,
          shortcuts: [
            {
              name: '点餐',
              description: '浏览菜单并下单',
              url: '.',
              icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
            },
            {
              name: '我的订单',
              description: '查看订单状态',
              url: 'orders',
              icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
            },
          ],
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
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'unsplash-images',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/plus\.unsplash\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'unsplash-plus',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
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
      port: 5173,
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
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'pwa': ['virtual:pwa-register'],
          },
        },
      },
    },
  };
});
