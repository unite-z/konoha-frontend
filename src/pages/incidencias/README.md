# `pages/incidencias/` (MOD-03)

Incidencias de MOD-03 (HU-020 a 024 y 027, RF-INC-001 a 005 y 008): bandeja del jefe, detalle con clasificación y derivación, cierre y registro en nombre de otro, y reporte en móvil (AV-282 a 285).

- **Bandeja** (`BandejaIncidenciasPage.tsx`, `/incidencias`, AV-283): pestañas Todas, Abiertas, En proceso y Cerradas con contador, y tabla con incidencia, ubicación, severidad, vía, estado y tiempo abierta. El tiempo se pinta en tono de aviso cuando una sencilla del personal propio pasa las 24 h (RN-019). Encima va la tarjeta «Plazo de incidencias sencillas» (`AlertasPlazo.tsx`, Figma 388-7027 y 394-9392, AV-280), con «Supera el objetivo» a partir de las 24 h, «Cerca del máximo» desde las 40 h y «Vencida» pasadas las 48 h. Cada alerta tiene «Reasignar», que elige otro capataz, y «Anotar causa». Lógica en `bandeja.ts`, con prueba.

- **Detalle** (`IncidenciaDetallePage.tsx`, `/incidencias/:id`, AV-284, Figma 388-7305): foto y ficha (ubicación, ejemplar, descripción y quién la reportó) y, a la derecha, la tarjeta de acción según el estado. Las filas de la bandeja llevan aquí.
  - **Registrada:** «Clasificar» (`TarjetaClasificar.tsx`) con severidad e impacto, «Quién lo atiende» con la vía sugerida (un árbol de 5 m o más va al proveedor tercerizado) y «Sugerencia de IA» como Próximamente.
  - **Otra vía:** si se elige otra que la sugerida, la severidad y el impacto quedan como insignias y se pide el motivo del cambio (389-7300).
  - **Descartar** pide el motivo (394-8700) y **«Solicitar inspección en campo»** abre su tarjeta, con el responsable y qué verificar (394-8782).
  - **Clasificada por personal propio:** «Encargo a un capataz» (`TarjetaEncargo.tsx`, 389-7502, AV-277). Lleva el capataz libre ese día, el espacio, la actividad, el plazo (por defecto mañana, RN-019), lo que se incluye y «Avisar al capataz». Si ninguna cuadrilla tiene hueco, el capataz queda en error con la carga de cada cuadrilla y «Reprogramar plazo» (394-8975).
  - **Clasificada por la vía tercerizada:** «Requerimiento a un proveedor» (`TarjetaRequerimiento.tsx`, 389-7706, AV-278). Lleva el proveedor, el contrato vigente, el servicio, el tipo de atención (por defecto extraordinaria) y, con ejemplar, «Crear también la poda del ejemplar». Si el proveedor no tiene contrato, avisa de que va como extraordinaria con orden de servicio (389-7903).

  Lógica en `detalleIncidencia.ts`, con prueba.

**Datos simulados (D9):** el backend (AV-274 a 281) aún no existe. Con `VITE_DATOS_SIMULADOS=true`, `services/api/incidencias.ts` responde con `services/simulados/incidencias.ts` y la pantalla muestra `AvisoDatosSimulados`. Sin datos simulados, la entrada del menú sigue como «Próximamente».

| Qué | Dónde |
|---|---|
| Servicios | `services/api/incidencias.ts` (base prevista `/api/v1/planificacion/incidencias/`): `listarIncidencias`, `anotarCausaRetraso`, `listarCapatacesDisponibles` y `reasignarIncidencia` (AV-280), `obtenerIncidencia`, `clasificarIncidencia`, `descartarIncidencia`, `listarInspectores` y `solicitarInspeccion` (AV-274 y AV-276), `listarActividadesEncargo` y `crearEncargo` (AV-277), `listarProveedoresIncidencia` y `crearRequerimiento` (AV-278) |
| Tipos | `types/incidencias.ts` (contrato de AV-274 y AV-280) |
| Permisos | hasta AV-281, el de Planificación (`PLA.PLANIFICACION.CONSULTAR`) |
| Rutas | `RUTAS_INCIDENCIAS` (prefijo `/incidencias`) y `rutaIncidencia(id)` |

**Ejemplo:** la columna «Abierta» usa `horasAbierta` y `superaObjetivo` de `bandeja.ts`.

**Destino:** `modulos/planificacion/paginas/incidencias/`.
