import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // MOD-05 en Spring Boot; MOD-06 conserva Django. Orden: ruta específica primero.
    proxy: {
      '/api/tercerizados': 'http://localhost:8080',
      '/swagger-ui': 'http://localhost:8080',
      '/api': 'http://localhost:8000',
    },
  },
})
