# `pages/corte/` (MOD-03, capataz)

Lo que el capataz usa en el móvil (AV-271, RF-COR-002, HU-011 y CU-011). La Planificación web le muestra «Acceso denegado» (Figma 374-7925).

- **Ruta de hoy** (`RutaDeHoyPage.tsx`, `/corte/ruta-de-hoy`, Figma 353-2335 y 375-6817):
  - el corte en curso de su cuadrilla con el avance («28 de 45 jardines»);
  - las pestañas «Por cortar» y «Marcados», con `FilaChecklist`;
  - un toque marca el jardín con la hora real y una clave de idempotencia;
  - en uno marcado, o si otro lo marcó antes (409 `ya-marcado`), la hoja inferior «ya está marcado» dice quién y cuándo y ofrece «Añadir observación»;
  - «Actualizar» va en la barra superior.
  - sin conexión (353-2396): la marca queda «Sin sincronizar» con la hora real y su clave, la banda dice cuántas faltan por enviar y, al volver la conexión, se envían solas. Si otro ya lo había marcado, un aviso lo dice («J-017 ya estaba marcado · J. Ramos, 11:02»). Las pendientes viven en la pantalla (`useEnLinea.ts`): la cola persistente en IndexedDB, que sobrevive a cerrar la aplicación, es la común de RF-T-012 (AV-226).

  Lógica en `rutaDeHoy.ts`, con prueba.
- **Calendario** (`CalendarioCuadrillaPage.tsx`, `/corte/calendario`, Figma 380-8307, RF-PLA-007): la semana de su cuadrilla en solo lectura («Cuadrilla B · solo lectura»), con la `VistaMovil` del calendario de Planificación (tira de días y agenda). Datos de `GET calendario-cuadrilla/` (contrato de AV-254); con datos simulados, las programaciones y restricciones de siempre a nombre de «Cuadrilla B».

**Datos simulados (D9):** el backend (AV-260) aún no existe. Con `VITE_DATOS_SIMULADOS=true`, `services/api/corte.ts` responde con `services/simulados/corte.ts` y la pantalla muestra `AvisoDatosSimulados`. Con `?simular=vacio`, hoy no hay corte.

| Qué | Dónde |
|---|---|
| Servicios | `services/api/corte.ts`: `obtenerRutaDeHoy`, `marcarJardin` y `registrarObservacionJardin` (contrato de AV-260) y `obtenerCalendarioCuadrilla` (AV-254) |
| Tipos | `types/corte.ts` (`RespuestaRutaDeHoy`, `NuevaMarca`, `CalendarioCuadrilla`) |
| Permisos | `PLA.CORTE.MARCAR` (AV-260 y AV-252). Con datos simulados, también el rol capataz |
| Rutas | `RUTAS_CORTE` (prefijo `/corte`). El capataz entra aquí desde `/` |

La barra inferior lleva «Ruta de hoy» y «Calendario». Pendiente en AV-271: jardín fuera de ruta.

**Destino:** `modulos/planificacion/paginas/corte/`.
