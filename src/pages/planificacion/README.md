# `pages/planificacion/` (MOD-03)

Planificación de servicios, en cuatro secciones desde el rediseño (AV-265): Resumen, Calendario, Ciclos y Configuración.

- **Resumen** (`resumen/ResumenPlanificacionPage.tsx`, RF-PLA-008 y 009): indicadores del mes, bandeja «Necesita atención» (`NecesitaAtencion`, sustituye a la pantalla de alertas), próximos 14 días y restricciones próximas. Su lógica está en `resumen/resumenPlanificacion.ts`, con prueba.
- **Calendario** (`calendario/CalendarioPage.tsx`, RF-PLA-003 y 007): un solo calendario con capas de restricciones y actividades (AV-266). Vista Mes (`VistaMes`) con agenda del día (`AgendaDia`) y «Nueva restricción». Su lógica (semanas, carriles de las barras de varios días y «+N más») está en `calendario/calendarioCapas.ts`, con prueba. Las vistas Semana y Lista, los filtros y «Dar de baja» llegan en los siguientes PR de AV-266.
- **Ciclos**: llega con AV-269; hasta entonces, el menú la muestra como «Próximamente».
- **Configuración** (`/planificacion/configuracion`): de momento, `ServiciosPeriodicosPage.tsx` (HU-MOD03-001 y 002) y sus diálogos (`DialogoFrecuencia`, `DialogoDuracion`, `DialogoRestriccion`). La vista unificada llega con AV-268.
- Las rutas anteriores (`servicios-periodicos` y `calendario-restricciones`) redirigen a su sección (`RUTAS_PLANIFICACION_ANTIGUAS`).

| Qué | Dónde |
|---|---|
| Servicios | `services/api/planificacion.ts`, `clientePlanificacion.ts` |
| Tipos | `types/planificacion.ts` |
| Lógica pura | `utils/planificacion.ts`, `validacionPlanificacion.ts`, `calendarioRestricciones.ts` |
| Permisos | `config/permisosPlanificacion.ts` |
| Rutas | `RUTAS_PLANIFICACION` (prefijo `/planificacion`) y `RUTAS_PLANIFICACION_ANTIGUAS` (redirecciones) |

**Pantallas nuevas (AV-265 a 271 y AV-282 a 285):**
- Se construyen sobre la página de Figma «MOD-03 · Propuesta SaaS» y solo con componentes de `components/ui`.
- Los componentes de calendario (Chip de actividad, Celda y Evento de calendario) van a `components/ui`, no a esta carpeta.

**Entre módulos:** derivar una incidencia a encargo de MOD-04 (AV-277) o a requerimiento de MOD-05 (AV-278) se hace con un endpoint de MOD-03. El backend crea el encargo o el requerimiento; el front no llama a los servicios de MOD-04 ni de MOD-05. Las áreas verdes y los sectores se leen de MOD-02.

**Ejemplo:** `calendario/VistaMes.tsx` pinta cada semana con `distribuirSemana` de `calendario/calendarioCapas.ts`, que tiene su prueba.

**Destino:** `modulos/planificacion/paginas/`.
