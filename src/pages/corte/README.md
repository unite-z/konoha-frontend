# `pages/corte/` (MOD-03, capataz)

Lo que el capataz usa en el móvil (AV-271, RF-COR-002, HU-011 y CU-011). La Planificación web le muestra «Acceso denegado» (Figma 374-7925).

- **Ruta de hoy** (`RutaDeHoyPage.tsx`, `/corte/ruta-de-hoy`, Figma 353-2335 y 375-6817):
  - el corte en curso de su cuadrilla con el avance («28 de 45 jardines»);
  - las pestañas «Por cortar» y «Marcados», con `FilaChecklist`;
  - un toque marca el jardín con la hora real y una clave de idempotencia;
  - en uno marcado, o si otro lo marcó antes (409 `ya-marcado`), la hoja inferior «ya está marcado» dice quién y cuándo y ofrece «Añadir observación»;
  - «Actualizar» va en la barra superior.

  Lógica en `rutaDeHoy.ts`, con prueba.

**Datos simulados (D9):** el backend (AV-260) aún no existe. Con `VITE_DATOS_SIMULADOS=true`, `services/api/corte.ts` responde con `services/simulados/corte.ts` y la pantalla muestra `AvisoDatosSimulados`. Con `?simular=vacio`, hoy no hay corte.

| Qué | Dónde |
|---|---|
| Servicios | `services/api/corte.ts`: `obtenerRutaDeHoy`, `marcarJardin` y `registrarObservacionJardin` (contrato de AV-260) |
| Tipos | `types/corte.ts` (`RespuestaRutaDeHoy`, `NuevaMarca`) |
| Permisos | `PLA.CORTE.MARCAR` (AV-260 y AV-252). Con datos simulados, también el rol capataz |
| Rutas | `RUTAS_CORTE` (prefijo `/corte`). El capataz entra aquí desde `/` |

Pendiente en AV-271: sin conexión, jardín fuera de ruta y el calendario de la cuadrilla.

**Destino:** `modulos/planificacion/paginas/corte/`.
