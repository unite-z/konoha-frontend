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

## MOD-04: operación de campo

Entrada: `/operacion-campo/cuadrillas`. Integra RF-T-005, RF-PLA-005 y RF-ACT-003 con la API real `/api/v1/operacion-campo/`. Reutiliza los componentes, tokens y layout existentes. Conserva las pantallas y rutas de planificación, tercerizados y reportes.

La aplicación utiliza la sesión común de MOD-01 y el permiso `CAM.CUADRILLA.CONSULTAR`, sin un segundo ingreso ni credenciales en el almacenamiento del navegador. Las escrituras llevan el token CSRF; un 401 vuelve al ingreso común y un 403 muestra la falta de permiso. El capataz entra por defecto en Operación de campo y solo ve sus cuadrillas. La autorización efectiva siempre la decide el backend.

En Vite se puede definir `KONOHA_API_LOCAL_URL=http://127.0.0.1:8001` en el entorno del proceso para probar contra otro puerto sin alterar el valor predeterminado 8000. Es una opción del servidor de desarrollo; la configuración de despliegue no cambia.

Prueba manual con la precarga del backend habilitada:

1. Ingresar en `/ingreso` como `mod04_jefe`, con la contraseña configurada en `MOD04_DEMO_PASSWORD` del backend. El mismo ingreso sirve para Operación de campo. En local por HTTP, definir `CORE_COOKIE_SEGURA=false`; UAT y producción conservan cookies seguras.
2. En **Cuadrillas**, registrar un capataz y dos operarios, crear un equipo y comprobar que muestra 2 integrantes. Editarlo y verificar que los operarios ocupados en otro equipo no se pueden seleccionar.
3. En **Encargos**, crear uno semanal con actividad, espacio, reunión, periodo y plazo. Comprobar búsqueda y filtros; rechazar un periodo semanal de 8 días y un plazo fuera del periodo. Repetir con quincenal (hasta 14 días).
4. En **Participantes por actividad**, registrar una actividad realizada para ese equipo y vincular el encargo coincidente. Seleccionar dos operarios y guardar; recargar y comprobar nombres y cantidad. Cambiar a uno y comprobar el nuevo conteo.
5. Cerrar sesión e ingresar como `mod04_capataz_2`: solo ve Cuadrilla 1 y sus registros, no gestiona cuadrillas ni encargos, pero registra actividades y participantes propios.
6. Comprobar que **Planificación**, **Servicios tercerizados** y **Reportes** conservan sus rutas, pantallas y datos con el ingreso común.

El registro requiere conexión; la cola global de HU-MOD04-012 no forma parte de estos requisitos. La actividad conserva su clave de idempotencia al reintentar una carga idéntica para evitar duplicados por pérdida de respuesta.

## Documentación

- [AGENTS.md](AGENTS.md): estado, mapa, gates y reglas, para personas y agentes.
- [CONTRIBUTING.md](CONTRIBUTING.md): cómo contribuir.
- [docs/estandares/](docs/estandares/): TypeScript y React, pruebas, PWA y modo sin conexión.
- Estándares comunes y ADR: en `konoha-infra`.
