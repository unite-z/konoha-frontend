# Front-end · Gestión de Áreas Verdes

React + TypeScript + Vite. Estilos con CSS Modules y los tokens de `src/styles/tokens.css` (Guía de Estilo Web).

## Comandos

```sh
npm install
cp .env.example .env
npm run dev      # Vite: MOD-05 → localhost:8080; MOD-06 → localhost:8000
npm run build    # tsc -b + vite build
npm run lint     # oxlint
npm test         # pruebas unitarias de lógica pura (Vitest)
```

## Módulos

- **MOD-06 «Reportes e indicadores»** (`/reportes-indicadores/…`): usa `VITE_API_BASE_URL` y la sesión simulada de `src/config/sesion.ts`.
- **MOD-05 «Servicios tercerizados»** (`/servicios-tercerizados/…`): usa `VITE_API_TERCERIZADOS_URL` (por defecto `/api/tercerizados`) y requiere el servicio Spring Boot de `../backend-mod05/`.
  - Ingreso propio con usuarios de Spring Security (HTTP Basic), comprobado con `GET me/`. Las credenciales se guardan en `sessionStorage` (duran lo que la pestaña) y se borran con «Cerrar sesión». TODO: sustituir por la sesión de MOD-01.
  - `src/sesion/`: proveedor, guardián de rutas y almacenamiento de la sesión.
  - `src/services/api/clienteTercerizados.ts` y `tercerizados.ts`: cliente (GET/POST/PATCH, multipart, descarga autenticada) y servicios.
  - `src/config/permisosTercerizados.ts`: acciones por rol y estado (la interfaz oculta; el back-end decide).
  - `src/utils/instanteLima.ts`: fechas y horas en America/Lima (UTC-05:00) independientes de la zona del navegador.
