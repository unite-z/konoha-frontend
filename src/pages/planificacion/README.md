# `pages/planificacion/` (MOD-03)

Planificación de servicios: `ServiciosPeriodicosPage.tsx` (HU-MOD03-001 y 002), `CalendarioRestriccionesPage.tsx` (HU-MOD03-003) y sus diálogos (`DialogoFrecuencia`, `DialogoDuracion`, `DialogoRestriccion`).

| Qué | Dónde |
|---|---|
| Servicios | `services/api/planificacion.ts`, `clientePlanificacion.ts` |
| Tipos | `types/planificacion.ts` |
| Lógica pura | `utils/planificacion.ts`, `validacionPlanificacion.ts`, `calendarioRestricciones.ts` |
| Permisos | `config/permisosPlanificacion.ts` |
| Rutas | `RUTAS_PLANIFICACION` (prefijo `/planificacion`) |

**Pantallas nuevas (AV-265 a 271 y AV-282 a 285):**
- Se construyen sobre la página de Figma «MOD-03 · Propuesta SaaS» y solo con componentes de `components/ui`.
- Los componentes de calendario (Chip de actividad, Celda y Evento de calendario) van a `components/ui`, no a esta carpeta.

**Entre módulos:** derivar una incidencia a encargo de MOD-04 (AV-277) o a requerimiento de MOD-05 (AV-278) se hace con un endpoint de MOD-03. El backend crea el encargo o el requerimiento; el front no llama a los servicios de MOD-04 ni de MOD-05. Las áreas verdes y los sectores se leen de MOD-02.

**Ejemplo:** `CalendarioRestriccionesPage.tsx` calcula la rejilla del mes con `utils/calendarioRestricciones.ts`, que tiene su prueba.

**Destino:** `modulos/planificacion/paginas/`.
