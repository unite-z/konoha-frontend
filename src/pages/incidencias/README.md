# `pages/incidencias/` (MOD-03)

Incidencias de MOD-03 (HU-020 a 024 y 027, RF-INC-001 a 005 y 008): bandeja del jefe, detalle con clasificación y derivación, cierre y registro en nombre de otro, y reporte en móvil (AV-282 a 285).

- **Bandeja** (`BandejaIncidenciasPage.tsx`, `/incidencias`, AV-283): pestañas Todas, Abiertas, En proceso y Cerradas con contador, y tabla con incidencia, ubicación, severidad, vía, estado y tiempo abierta. El tiempo se pinta en tono de aviso cuando una sencilla del personal propio pasa las 24 h (RN-019). Lógica en `bandeja.ts`, con prueba.

**Datos simulados (D9):** el backend (AV-274 a 281) aún no existe. Con `VITE_DATOS_SIMULADOS=true`, `services/api/incidencias.ts` responde con `services/simulados/incidencias.ts` y la pantalla muestra `AvisoDatosSimulados`. Sin datos simulados, la entrada del menú sigue como «Próximamente».

| Qué | Dónde |
|---|---|
| Servicios | `services/api/incidencias.ts` (base prevista `/api/v1/planificacion/incidencias/`) |
| Tipos | `types/incidencias.ts` (contrato de AV-274 y AV-280) |
| Permisos | hasta AV-281, el de Planificación (`PLA.PLANIFICACION.CONSULTAR`) |
| Rutas | `RUTAS_INCIDENCIAS` (prefijo `/incidencias`) |

**Ejemplo:** la columna «Abierta» usa `horasAbierta` y `superaObjetivo` de `bandeja.ts`.

**Destino:** `modulos/planificacion/paginas/incidencias/`.
