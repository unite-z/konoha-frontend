# konoha-frontend

PWA en React 19, TypeScript y Vite del sistema de gestión de áreas verdes del campus PUCP (DP2). Consume la API de `konoha-backend`.

Este fichero es la guía para personas y agentes. Estándares comunes y ADR: en el repo `konoha-infra` (`docs/estandares/` y `docs/adr/`).

## Estado

- Sprint 0 (en curso): repos, estándares, CI y despliegue preparados. Aún sin EC2: `deploy-uat.yml` se salta hasta que `DESPLIEGUE_ACTIVO=true`.
- MOD-05 y MOD-06: pantallas del borrador importadas y funcionando en local contra el backend.
- MOD-01: inicio de sesión, menú por permisos, usuarios y roles, registro de accesos, repositorio, y los componentes comunes `Adjuntos` e `HistorialCambios`. Contrato en `konoha-backend/docs/modulos/mod01.md`.
- Pendiente de arranque: manifiesto y service worker (PWA) y cola sin conexión.

## Mapa

| Ruta | Qué hay |
|---|---|
| `src/pages/<modulo>/` | Pantallas: `acceso/`, `usuarios-roles/` y `repositorio/` (MOD-01), `servicios-tercerizados/` (MOD-05) y `reportes-indicadores/` (MOD-06) |
| `src/pages/operacion-campo/` | MOD-04: cuadrillas, encargos y participantes; sesión común de MOD-01, menú y rutas según `CAM.CUADRILLA.CONSULTAR` |
| `src/components/core/` | Componentes comunes de MOD-01 para las fichas de otros módulos: `Adjuntos` e `HistorialCambios` |
| `src/components/ui/` | Componentes base. Reutilízalos antes de crear otro |
| `src/services/api/` | Clientes y servicios tipados por módulo |
| `src/types/` | Tipos del contrato de la API |
| `src/hooks/`, `src/utils/` | Hooks compartidos y lógica pura con pruebas |
| `src/config/` | Permisos de interfaz por rol (`permisosCore.ts`: códigos de permiso de la sesión) |
| `src/sesion/`, `src/router/` | Sesión, guardián de rutas y rutas |
| `src/styles/tokens.css` | Tokens de diseño: colores, espacios, tipografía |
| `Dockerfile`, `docker/Caddyfile` | Imagen `konoha-web`: la PWA servida por Caddy sin root |
| `.github/workflows/` | `ci.yml`, `deploy-uat.yml`, `limpiar-imagenes.yml` y `tamano-pr.yml` (aviso si el PR pasa de 400 líneas) |
| `.github/copilot-instructions.md`, `.github/instructions/` | Normas que usa Copilot al revisar los PR |

## Comandos

```sh
npm run dev        # :5173, con proxy de /api al backend en :8000
npm test           # Vitest
npm run lint       # oxlint
npm run typecheck  # tsc -b
npm run build
```

## Gates: lo que tiene que pasar antes de pushear

Es lo mismo que exige `ci-ok`:

```sh
npm run typecheck && npm run lint && npm test && npm run build
```

- El hook `pre-push` ya ejecuta typecheck y oxlint. Actívalo con `git config core.hooksPath .githooks`.
- En el PR, CI comprueba además el título, la rama, los nombres de fichero, los artefactos y los secretos (gitleaks), y `comprobar-estilos.sh` rechaza colores fuera de `tokens.css` y `fetch` fuera de `services/api/` y, en las líneas nuevas, medidas en px y `style={…}`.
- oxlint rechaza `any`, `!` sin justificar (`// oxlint-disable-next-line typescript/no-non-null-assertion -- motivo`) y `console.*`.

## Reglas no negociables

- **Nada de `any`**, y TypeScript en `strict`.
- **Ninguna pantalla llama a `fetch`**: todo pasa por `src/services/api/`.
- **El backend decide los permisos.** La interfaz solo oculta, y siempre se maneja el 403.
- **Nada secreto en variables `VITE_*`**: llegan al navegador.
- Colores, espacios y tipografía solo con tokens de `tokens.css`.
- Toda pantalla con datos remotos muestra carga, error y vacío (`EstadoCarga`, `EstadoError`, `EstadoVacio`).
- Fechas con `utils/instanteLima.ts` (America/Lima), nunca con la zona del navegador.
- Operaciones de campo sin conexión: a la cola de IndexedDB con UUID del cliente como `Idempotency-Key`. Background Sync es solo una mejora (no existe en iOS). Ver `docs/estandares/pwa-offline.md`.
- Nombres:
  - componentes y su CSS en PascalCase;
  - hooks `useAlgo.ts`;
  - otros ficheros TS en camelCase (nunca kebab-case);
  - claves de los tipos de la API en snake_case, como el contrato (ADR 0005);
  - carpetas en kebab-case, salvo las de componente;
  - el resto, en kebab-case.
- Accesibilidad: `label` en cada control, encabezados en orden, uso completo con teclado.
- Todo en español de España: interfaz, código de dominio, docs y commits.

## Decisiones cerradas (no se re-discuten)

Cambiarlas exige un ADR nuevo que sustituya al anterior.

| Decisión | Dónde |
|---|---|
| Backend en Spring Boot; este repo solo consume su API | `konoha-infra`: `docs/adr/0001-backend-spring-boot.md` |
| Tres repos: backend, frontend e infra | `konoha-infra`: `docs/adr/0002-repos-backend-frontend-infra.md` |
| Una EC2 con Docker Compose; entornos UAT y prod, sin DEV en la nube | `konoha-infra`: `docs/adr/0003-despliegue-ec2-compose.md` |
| Alertas solo dentro de la aplicación | `konoha-infra`: `docs/adr/0003-despliegue-ec2-compose.md` |
| Cola sin conexión con idempotencia; Background Sync solo como mejora | `docs/estandares/pwa-offline.md` |
| Ficheros TS que no son componentes en camelCase | `konoha-infra`: `docs/estandares/nombres.md` |
| Claves JSON de la API en snake_case: los tipos de `src/types/` las reflejan tal cual | `konoha-infra`: `docs/adr/0005-claves-json-snake-case.md` |
| Prefijo de tickets `AV`; el primer issue es AV-1 | `konoha-infra`: `docs/estandares/git-y-prs.md` |

Pendiente de decisión (no la cambies por tu cuenta): formato de errores del backend (ADR 0004, propuesto).

## Seguridad abierta: no empeorar

- Toda la aplicación entra con la sesión de MOD-01 (cookie `HttpOnly`): la interfaz no guarda ninguna credencial (AV-234).
- Una cuenta creada solo en MOD-01 entra en Servicios tercerizados, pero no puede registrar ahí hasta la consolidación de usuarios del backend.

Ningún PR puede ampliar estas brechas (por ejemplo, guardar credenciales en `localStorage`). Cerrarlas va en tickets propios.

## Deuda conocida (no la arregles de paso: tiene ticket propio)

- Aún no es PWA: faltan el manifiesto, el service worker y la cola sin conexión.
- Dos formatos de error del backend (ADR 0004). El cliente acepta ambos hasta la migración.
- No hay Testing Library: los componentes no tienen pruebas.

## Qué no entra al repo

- `.env` (solo `.env.example`), credenciales y tokens.
- Datos reales de la sección y capturas con datos personales.
- PDF de entregables del curso.
- `node_modules/`, `dist/` y binarios de más de 5 MB.

## Planes y artefactos de sesión

Los planes, notas y borradores de trabajo de personas y agentes van en `.notas/` (ignorada por git) o fuera del repo. Nunca se commitean. Lo que deba perdurar se pasa a uno de los documentos de abajo.

## Mapa de documentos

| Documento | Para qué |
|---|---|
| `AGENTS.md` | Esta guía: estado, gates, reglas y decisiones |
| `CLAUDE.md` | Solo importa `AGENTS.md` |
| `README.md` | Qué es y cómo arrancarlo |
| `CONTRIBUTING.md` | Ciclo de trabajo y checklist de revisión del frontend |
| `SECURITY.md` | Cómo avisar de una vulnerabilidad |
| `docs/estandares/*.md` | TypeScript y React, pruebas, PWA y modo sin conexión |

**No se crean documentos nuevos** sin fusionar antes su contenido en uno existente o justificar en el PR por qué no cabe.

## Flujo de trabajo

Rama `<feat|fix|chore>/<ID>-<descripcion>`, commit `tipo(ID): descripción`, PR con squash. Al fusionar en `main` se despliega en UAT.
