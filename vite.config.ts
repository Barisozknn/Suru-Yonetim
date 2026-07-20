import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // Yeni sürüm gelince kullanıcıya sor
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Sürü Yönetimi',
        short_name: 'SürüYönetimi',
        description: 'Profesyonel süt ve besi sığırcılığı yönetim uygulaması',
        theme_color: '#2f5c35',
        background_color: '#fbfbfb',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/pwa-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000, // 5 MB
        // Tüm JS/CSS/HTML/SVG/PNG dosyalarını önbelleğe al
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // ÖNEMLİ: Supabase API çağrıları ve auth asla cache'lenmemeli
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Supabase REST API — her zaman ağdan al (veri tutarlılığı)
            urlPattern: /^https:\/\/.*\.supabase\.co\/(rest|auth|realtime)\/.*/i,
            handler: 'NetworkOnly'
          },
          {
            // Supabase Edge Functions — her zaman ağdan al
            urlPattern: /^https:\/\/.*\.supabase\.co\/functions\/.*/i,
            handler: 'NetworkOnly'
          },
          {
            // Google Fonts — önbellekten sun (1 yıl)
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 365, maxEntries: 30 }
            }
          }
        ]
      },
      // Geliştirme modunda SW'yi etkinleştir (test için)
      devOptions: {
        enabled: false // Geliştirmede false bırak, production build'de otomatik aktif
      }
    })
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  }
});
