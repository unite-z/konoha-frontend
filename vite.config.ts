import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // MOD-05 en Spring Boot; MOD-06 conserva Django. Orden: ruta específica primero.
    proxy: {
      '/api/tercerizados': process.env.KONOHA_API_LOCAL_URL || 'http://localhost:8000',
      '/swagger-ui': process.env.KONOHA_API_LOCAL_URL || 'http://localhost:8000',
      '/api': process.env.KONOHA_API_LOCAL_URL || 'http://localhost:8000',
    },
  },
})
