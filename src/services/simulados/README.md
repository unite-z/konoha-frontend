# `services/simulados/`

Respuestas simuladas para las pantallas de MOD-06 cuyos endpoints aún no existen o no tienen datos (S11 y S12).

**Cómo funciona:** con `VITE_DATOS_SIMULADOS=true` en `.env`, `config/datosSimulados.ts` activa `DATOS_SIMULADOS` y los servicios de `services/api/` responden desde aquí. `simulacion.ts` imita al backend: demora, cancelación con `AbortSignal` y errores `ErrorApi`. Con `?simular=error`, `sin-permiso`, `sin-sesion` o `ia-no-disponible` en la URL se fuerza cada estado.

**Va aquí:** un fichero por servicio simulado (`exportaciones.ts`, `inconsistenciasIa.ts`, `priorizacionIa.ts`, `programadoEjecutado.ts`, `reporteServicio.ts`), con su prueba.

**No va aquí:**
- Llamadas reales: van en `services/api/`.
- Datos de ejemplo para otros módulos: cada módulo nuevo trabaja contra su backend en local.

**Decisión D9 (AV-330):** los datos simulados se quedan, con `AvisoDatosSimulados` visible en cada pantalla afectada. Nunca datos simulados en producción sin aviso.

**Ejemplo:** `exportaciones.ts` simula el ciclo de una exportación; lo usa `services/api/exportaciones.ts` cuando `DATOS_SIMULADOS` es `true`.

**Destino:** `modulos/reportes-indicadores/api/simulados/`, hasta que existan los endpoints reales.
