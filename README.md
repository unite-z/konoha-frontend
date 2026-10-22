# konoha-frontend

Interfaz (PWA) del sistema de gestión de áreas verdes del campus PUCP (DP2). React 19, TypeScript y Vite. Estilos con CSS Modules y los tokens de `src/styles/tokens.css` (Guía de Estilo Web).

Repos hermanos: `konoha-backend` (API Spring Boot) y `konoha-infra` (despliegue, estándares comunes y ADR).

## Comandos

Requisitos: Node.js 20.19 o posterior (o 22.12 o posterior) y el backend levantado en el puerto 8000.

```sh
npm install
cp .env.example .env
npm run dev        # http://localhost:5173; el proxy de Vite envía /api al backend en :8000
npm test           # Vitest
npm run lint       # oxlint
npm run typecheck  # tsc -b
npm run build      # tsc -b y vite build
```

## Módulos

- **MOD-06 «Reportes e indicadores»** (`/reportes-indicadores/...`): usa `VITE_API_BASE_URL` y la sesión simulada de `src/config/sesion.ts`.
- **MOD-05 «Servicios tercerizados»** (`/servicios-tercerizados/...`): usa `VITE_API_TERCERIZADOS_URL` (por defecto `/api/tercerizados`).
  - Ingreso propio con usuarios de Spring Security (HTTP Basic), comprobado con `GET me/`. Las credenciales se guardan en `sessionStorage` (duran lo que la pestaña) y se borran con «Cerrar sesión». TODO: sustituir por la sesión de MOD-01.
  - `src/sesion/`: proveedor, guardián de rutas y almacenamiento de la sesión.
  - `src/services/api/clienteTercerizados.ts` y `tercerizados.ts`: cliente (GET, POST, PATCH, multipart y descarga autenticada) y servicios.
  - `src/config/permisosTercerizados.ts`: acciones por rol y estado (la interfaz oculta; el backend decide).
  - `src/utils/instanteLima.ts`: fechas y horas en America/Lima (UTC-05:00), independientes de la zona del navegador.

Usuarios de prueba de MOD-05: `mod05_jefe`, `mod05_ingeniero` y `mod05_practicante`, con la clave de `MOD05_DEMO_PASSWORD` del backend. Entrada: `http://localhost:5173/servicios-tercerizados/ingreso`.

## Documentación

- [CLAUDE.md](CLAUDE.md): mapa del repo y reglas, para personas y agentes.
- [CONTRIBUTING.md](CONTRIBUTING.md): cómo contribuir.
- [docs/estandares/](docs/estandares/): TypeScript y React, pruebas, PWA y modo sin conexión.
- Estándares comunes y ADR: en `konoha-infra`.
