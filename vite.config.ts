import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // PWA (RF-T-012, AV-226; docs/estandares/pwa-offline.md): el service worker solo guarda la aplicación. Nunca `/api/`:
    // los datos sin conexión van en IndexedDB (src/sincronizacion/). Versión nueva: aviso para recargar, sin sorpresas.
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Gestión de Áreas Verdes · PUCP',
        short_name: 'Áreas Verdes',
        description: 'Planificación, operación de campo e incidencias de las áreas verdes del campus PUCP.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        // Fondo de la app y color de éxito de tokens.css (--color-bg-page y --color-success).
        background_color: '#f6f7f9',
        theme_color: '#042354',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],
        // El mapa del campus pesa: entra en la precarga para verlo sin red.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/swagger-ui/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  // `@/` apunta a `src/` (AV-333). Lo mismo en `paths` de tsconfig.app.json.
  resolve: {
    alias: [
      // Las rutas antiguas @/components/ui/ y @/styles/ siguen funcionando; el código nuevo usa @/design-system/... y los imports antiguos se migran al tocar cada fichero.
      { find: /^@\/components\/ui\//, replacement: fileURLToPath(new URL('./src/design-system/', import.meta.url)) },
      { find: /^@\/styles\//, replacement: fileURLToPath(new URL('./src/design-system/', import.meta.url)) },
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
    ],
  },
  server: {
    // MOD-05 en Spring Boot; MOD-06 conserva Django. Orden: ruta específica primero.
    proxy: {
      '/api/tercerizados': process.env.KONOHA_API_LOCAL_URL || 'http://localhost:8000',
      '/swagger-ui': process.env.KONOHA_API_LOCAL_URL || 'http://localhost:8000',
      '/api': process.env.KONOHA_API_LOCAL_URL || 'http://localhost:8000',
    },
  },
})
