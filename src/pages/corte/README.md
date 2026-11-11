# `pages/corte/` (MOD-03, capataz)

Lo que el capataz usa en el móvil (AV-271, RF-COR-002, HU-011 y CU-011). La Planificación web le muestra «Acceso denegado» (Figma 374-7925).

- **Ruta de hoy** (`RutaDeHoyPage.tsx`, `/corte/ruta-de-hoy`, Figma 353-2335 y 375-6817):
  - el corte en curso de su cuadrilla con el avance («28 de 45 jardines»);
  - las pestañas «Por cortar» y «Marcados», con `FilaChecklist`;
  - un toque marca el jardín con la hora real y una clave de idempotencia;
  - en uno marcado, o si otro lo marcó antes (409 `ya-marcado`), la hoja inferior «ya está marcado» dice quién y cuándo y ofrece «Añadir observación»;
  - «Actualizar» va en la barra superior.
  - sin conexión (353-2396): la marca queda «Sin sincronizar» con la hora real y su clave, la banda dice cuántas faltan por enviar y, al volver la conexión, se envían solas. Si otro ya lo había marcado, un aviso lo dice («J-017 ya estaba marcado · J. Ramos, 11:02»). Las marcas (también las de fuera de ruta si se corta la red) van a la cola común de RF-T-012 (`src/sincronizacion/`, tipos `corte.marca` y `corte.fuera-de-ruta`): sobreviven a cerrar la aplicación y se envían aunque la pantalla esté cerrada. La ruta se lee también sin red: la última descargada en el dispositivo (`conCache`).

  - jardín fuera de ruta (375-6772, CU-MOD03-011 flujo 2b): «Añadir jardín fuera de ruta» al pie de «Por cortar» abre la hoja `HojaFueraDeRuta`, que busca el jardín en el maestro por código o nombre y lo marca con nota obligatoria. Queda pendiente de que el jefe lo incorpore. **Supuesto por validar:** los requisitos no dicen cómo se llega; se eligió el buscador (consultado con dp2-32).

  Lógica en `rutaDeHoy.ts`, con prueba.
- **Calendario** (`CalendarioCuadrillaPage.tsx`, `/corte/calendario`, Figma 380-8307, RF-PLA-007): la semana de su cuadrilla en solo lectura («Cuadrilla B · solo lectura»), con la `VistaMovil` del calendario de Planificación (tira de días y agenda). Datos de `GET calendario-cuadrilla/` (contrato de AV-254).

**Backend:** `services/api/corte.ts` llama a los endpoints de AV-258 a AV-262 y AV-254. La entrada del menú aparece con `PLA.CORTE.REGISTRAR`.

| Qué | Dónde |
|---|---|
| Servicios | `services/api/corte.ts`: `obtenerRutaDeHoy`, `marcarJardin`, `registrarObservacionJardin`, `buscarJardinesFueraDeRuta` y `marcarFueraDeRuta` (contrato de AV-260) y `obtenerCalendarioCuadrilla` (AV-254) |
| Tipos | `types/corte.ts` (`RespuestaRutaDeHoy`, `NuevaMarca`, `JardinMaestro`, `NuevaMarcaFueraDeRuta`, `CalendarioCuadrilla`) |
| Permisos | `PLA.CORTE.MARCAR` (AV-260 y AV-252). Con datos simulados, también el rol capataz |
| Rutas | `RUTAS_CORTE` (prefijo `/corte`). El capataz entra aquí desde `/` |

La barra inferior lleva «Ruta de hoy» y «Calendario». Con esto quedan todas las pantallas de AV-271.

**Destino:** `modulos/planificacion/paginas/corte/`.
