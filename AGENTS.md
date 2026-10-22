# konoha-frontend

PWA en React 19, TypeScript y Vite del sistema de gestión de áreas verdes del campus PUCP (DP2). Consume la API de `konoha-backend`.

Estándares comunes (nombres, git y PR, seguridad) y ADR: en el repo `konoha-infra`, en `docs/estandares/` y `docs/adr/`.

## Mapa

| Ruta | Qué hay |
|---|---|
| `src/pages/<modulo>/` | Pantallas: `servicios-tercerizados/` (MOD-05) y `reportes-indicadores/` (MOD-06) |
| `src/components/ui/` | Componentes base. Reutilízalos antes de crear otro |
| `src/services/api/` | Clientes y servicios tipados por módulo |
| `src/types/` | Tipos del contrato de la API |
| `src/hooks/`, `src/utils/` | Hooks compartidos y lógica pura con pruebas |
| `src/config/` | Permisos de interfaz por rol |
| `src/sesion/`, `src/router/` | Sesión, guardián de rutas y rutas |
| `src/styles/tokens.css` | Tokens de diseño: colores, espacios, tipografía |
| `docs/estandares/` | TypeScript y React, pruebas, PWA y modo sin conexión |

## Comandos

```sh
npm run dev        # :5173, con proxy de /api al backend en :8000
npm test           # Vitest
npm run lint       # oxlint
npm run typecheck  # tsc -b
npm run build
```

Antes de abrir un PR tienen que pasar las cuatro últimas, que es lo que corre CI.

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
  - otros ficheros TS en camelCase;
  - carpetas en kebab-case, salvo las de componente;
  - el resto, en kebab-case.
- Accesibilidad: `label` en cada control, encabezados en orden, uso completo con teclado.
- Todo en español de España: interfaz, código de dominio, docs y commits.

## Deuda conocida (no la arregles de paso: tiene ticket propio)

- Aún no es PWA: faltan el manifiesto, el service worker y la cola sin conexión.
- La API devuelve claves en snake_case. Cuando el backend migre a camelCase (ADR 0005), se actualizan los tipos.
- Dos formatos de error del backend (ADR 0004). El cliente acepta ambos hasta la migración.
- No hay Testing Library: los componentes no tienen pruebas.

## Flujo de trabajo

Rama `<feat|fix|chore>/<ID>-<descripcion>`, commit `tipo(ID): descripción`, PR con squash. Al fusionar en `main` se despliega en UAT.
