import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // `@/` apunta a `src/` (AV-333). Lo mismo en `paths` de tsconfig.app.json.
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    // MOD-05 en Spring Boot; MOD-06 conserva Django. Orden: ruta específica primero.
    proxy: {
      '/api/tercerizados': process.env.KONOHA_API_LOCAL_URL || 'http://localhost:8000',
      '/swagger-ui': process.env.KONOHA_API_LOCAL_URL || 'http://localhost:8000',
      '/api': process.env.KONOHA_API_LOCAL_URL || 'http://localhost:8000',
    },
  },
})
