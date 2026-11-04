# `pages/planificacion/` (MOD-03)

Planificación de servicios, en cuatro secciones desde el rediseño (AV-265): Resumen, Calendario, Ciclos y Configuración. La carpeta ya está migrada al sistema de diseño y el CI la vigila como las demás (`comprobar-estilos.sh`).

- **Resumen** (`resumen/ResumenPlanificacionPage.tsx`, RF-PLA-008 y 009): indicadores del mes, bandeja «Necesita atención» (`NecesitaAtencion`, sustituye a la pantalla de alertas), próximos 14 días y restricciones próximas. Su lógica está en `resumen/resumenPlanificacion.ts`, con prueba.
- **Calendario** (`calendario/CalendarioPage.tsx`, RF-PLA-003 y 007): un solo calendario con capas de restricciones y actividades (AV-266). Vista Mes (`VistaMes`) con agenda del día (`AgendaDia`), vista Semana (`VistaSemana`) con fila «todo el día» y detalle de actividad (`DetalleActividad`, con «Coincide con»), vista Lista (`VistaLista`, actividades del mes con sus restricciones) y «Nueva restricción». Su lógica (semanas, carriles de las barras de varios días, «+N más» y coincidencias) está en `calendario/calendarioCapas.ts`, con prueba. Filtros por tipo de servicio y proveedor (`PanelFiltros`), con chips, contador y «Limpiar filtros», que se conservan al cambiar de vista; cuadrilla, sector y lugar esperan a AV-254. «Programar ciclo» en panel lateral (`PanelProgramarCiclo`, AV-267: propuesta del sistema, conflictos en vivo, justificación de avisos, prohibiciones bloqueadas y ventana libre; lógica en `calendario/programarCiclo.ts`, con prueba), que también abre `?programar=` desde el Resumen. «Dar de baja» una restricción desde la agenda del día (`DialogoBajaRestriccion`), con la opción de toda la serie si se creó con repetición.
- **Ciclos** (`ciclos/CiclosPage.tsx`, RF-PLA-004 y CU-007): lista de los ciclos de seis meses atrás y adelante, con pestañas por estado y contador, proveedor, fechas, avance y estado. Su lógica está en `ciclos/ciclos.ts`, con prueba. Cada fila abre el detalle (`ciclos/CicloDetallePage.tsx`, `/planificacion/ciclos/:id`, CU-004): estado, fechas previstas, inicio y fin reales, duración con el exceso y las restricciones que coinciden con el periodo; el jefe inicia, finaliza (fecha real, nunca futura) o cancela (`DialogoCambioCiclo`). Lógica en `ciclos/detalleCiclo.ts`, con prueba. Como no hay `GET programaciones/{id}/`, el ciclo se busca en la lista. Faltan en el contrato el código, el historial, el requerimiento, «confirmado por» y el motivo de cancelación (AV-253), y «Registrar motivo» (AV-255).
- **Configuración** (`configuracion/ConfiguracionPage.tsx`, HU-MOD03-001 y 002, AV-268): tabla de servicios periódicos con la frecuencia de la estación en curso, la duración y el estado (configurado o incompleto). El panel lateral `PanelEditarServicio` une las cuatro frecuencias y la duración (días de servicio, de limpieza y franja horaria); solo envía lo que cambia y avisa si un ciclo en curso supera la duración nueva. Lógica en `configuracion/configuracionServicios.ts`, con prueba. La pestaña «Series de restricciones» (`SeriesRestricciones`, lógica en `configuracion/series.ts`, con prueba) agrupa por `serie` las restricciones de hoy en adelante, con nivel, fechas, horario y alcance, y el jefe da de baja la serie entera. Faltan «Ver historial» (AV-256), «Usar valores iniciales», el nombre del área verde en el alcance (el contrato solo da `area_verde_id`) y, en «Nueva restricción», el aviso de duplicado y los ciclos afectados (AV-257). `DialogoRestriccion` («Nueva restricción») sigue en uso desde el Calendario.
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
