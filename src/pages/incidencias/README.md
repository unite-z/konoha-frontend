# `pages/incidencias/` (MOD-03)

Incidencias de MOD-03 (HU-020 a 024 y 027, RF-INC-001 a 005 y 008): bandeja del jefe, detalle con clasificación y derivación, cierre y registro en nombre de otro, y reporte en móvil (AV-282 a 285).

- **Bandeja** (`BandejaIncidenciasPage.tsx`, `/incidencias`, AV-283): pestañas Todas, Abiertas, En proceso y Cerradas con contador, y tabla con incidencia, ubicación, severidad, vía, estado y tiempo abierta. El tiempo se pinta en tono de aviso cuando una sencilla del personal propio pasa las 24 h (RN-019). «Reportar incidencia» abre «Registrar incidencia» (`DialogoRegistrarIncidencia.tsx`, 394-8504, AV-285), el registro en nombre de otro desde la oficina. Pide el canal, el tipo, quién la reporta (usuario del sistema o persona externa con nombre y contacto), el espacio, el ejemplar, la descripción y una foto opcional. Antes de registrar, como el reporte móvil, avisa si ya hay una abierta del mismo tipo en el mismo ejemplar o espacio (HU-020, escenario 2), con «Añadir a la existente» o «Registrar igualmente». Encima va la tarjeta «Plazo de incidencias sencillas» (`AlertasPlazo.tsx`, Figma 388-7027 y 394-9392, AV-280), con «Supera el objetivo» a partir de las 24 h, «Cerca del máximo» desde las 40 h y «Vencida» pasadas las 48 h. Cada alerta tiene «Reasignar», que elige otro capataz, y «Anotar causa». Lógica en `bandeja.ts`, con prueba.

- **Detalle** (`IncidenciaDetallePage.tsx`, `/incidencias/:id`, AV-284, Figma 388-7305): foto y ficha (ubicación, ejemplar, descripción y quién la reportó) y, a la derecha, la tarjeta de acción según el estado. Las filas de la bandeja llevan aquí.
  - **Registrada:** «Clasificar» (`TarjetaClasificar.tsx`) con severidad e impacto, «Quién lo atiende» con la vía sugerida (un árbol de 5 m o más va al proveedor tercerizado) y «Sugerencia de IA» como Próximamente.
  - **Otra vía:** si se elige otra que la sugerida, la severidad y el impacto quedan como insignias y se pide el motivo del cambio (389-7300).
  - **Descartar** pide el motivo (394-8700) y **«Solicitar inspección en campo»** abre su tarjeta, con el responsable y qué verificar (394-8782).
  - **Clasificada por personal propio:** «Encargo a un capataz» (`TarjetaEncargo.tsx`, 389-7502, AV-277). Lleva el capataz libre ese día, el espacio, la actividad, el plazo (por defecto mañana, RN-019), lo que se incluye y «Avisar al capataz». Si ninguna cuadrilla tiene hueco, el capataz queda en error con la carga de cada cuadrilla y «Reprogramar plazo» (394-8975).
  - **Clasificada por la vía tercerizada:** «Requerimiento a un proveedor» (`TarjetaRequerimiento.tsx`, 389-7706, AV-278). Lleva el proveedor, el contrato vigente, el servicio y el tipo de atención (por defecto extraordinaria); el backend crea la atención en MOD-05 con el ejemplar o el espacio. Dos diferencias con Figma porque los módulos dueños aún no lo admiten: sin contrato vigente avisa y no deja crearlo (MOD-05 no registra la extraordinaria sin contrato, 389-7903), y no ofrece «Crear también la poda del ejemplar» (MOD-02 aún no tiene la poda vinculada).
  - **Encargo cancelado:** un aviso con el encargo y el motivo, y «Derivar de nuevo» (`TarjetaDerivarDeNuevo.tsx`, 390-8582), que abre el encargo o el requerimiento.
  - **Atendida:** «Revisar atención» (`TarjetaRevisarAtencion.tsx`, 390-8008, AV-285). Muestra quién la atendió y cuándo, el encargo, la evidencia y las observaciones, con «Devolver» y «Cerrar incidencia». Sin evidencia no se puede cerrar (390-8205). «Devolver» pide observaciones y la vuelve a En atención (390-8390).
  - **Cerrada:** el tiempo de cierre, la evidencia y a quién se avisó (`TarjetaCerrada.tsx`). A la izquierda, el historial de transiciones, con «Sistema» en las automáticas (`HistorialIncidencia.tsx`, 390-7811).
  - **Derivada a tercerizado:** el avance del requerimiento de MOD-05 (`TarjetaSeguimientoRequerimiento.tsx`, 394-9194). Muestra los pasos requerimiento, orden de compra, informe del proveedor y conformidad, con su fecha o «pendiente».

  Lógica en `detalleIncidencia.ts`, con prueba.

- **Mis incidencias** (`MisIncidenciasPage.tsx`, `/mis-incidencias`, AV-282, Figma 391-8522 y 394-9964), en el móvil y para cualquier usuario con sesión:
  - las incidencias que reportó, con el espacio, cuándo («hoy», «ayer», «12/10») y el estado;
  - «+» en la barra superior para reportar;
  - las reportadas sin conexión van arriba como «Pendiente de enviar» (`reportesPendientes.ts`, sobre la cola común de RF-T-012, tipo `incidencia.reporte`, con su foto, su hora real y su UUID como `Idempotency-Key`) y, sin conexión, una banda lo avisa.

  - «Reportar incidencia» (`DialogoReportarIncidencia.tsx`, `?reportar=`, 391-8394): el panel lateral, a pantalla completa en el móvil.
    - Pide el tipo en chips, la foto obligatoria, el espacio (entra con el que propone la ubicación), el ejemplar y la descripción.
    - Si ya hay una abierta igual, la hoja «Ya hay una incidencia abierta» ofrece «Añadir a la existente» o «Reportar igualmente» (391-8469).
    - Sin conexión queda pendiente y se envía al volver.
  - Seguimiento (`MiIncidenciaPage.tsx`, `/mis-incidencias/:id`, 391-8560): cada fila de la lista lleva a él. Muestra el tiempo de cierre, los estados por los que pasó con su hora (el actual arriba) y la evidencia.

  Lógica en `misIncidencias.ts`, con prueba.

**Backend:** `services/api/incidencias.ts` llama a los endpoints de AV-274 a AV-281. «Incidencias» y «Mis incidencias» aparecen en el menú con `PLA.INCIDENCIA.REGISTRAR` (los cuatro roles). El requerimiento a un proveedor (AV-278) va al backend, que lo crea en MOD-05; cuando el proveedor adjunta su informe, la incidencia pasa sola a Atendida («Sistema») y ese informe vale como evidencia para cerrarla (MOD-05 aún no registra la conformidad). El encargo a un capataz (AV-277) aún no tiene backend: solo responde con `VITE_DATOS_SIMULADOS=true` (`services/simulados/incidencias.ts`, D9); sin datos simulados, la ficha avisa de que el encargo aún no está disponible (`ENCARGO_DISPONIBLE`).

| Qué | Dónde |
|---|---|
| Servicios | `services/api/incidencias.ts` (base `/api/v1/planificacion/incidencias/`): `listarIncidencias`, `anotarCausaRetraso`, `listarCapatacesDisponibles` y `reasignarIncidencia` (AV-280), `obtenerIncidencia`, `clasificarIncidencia`, `descartarIncidencia`, `listarInspectores` y `solicitarInspeccion` (AV-274 y AV-276), `listarActividadesEncargo` y `crearEncargo` (AV-277), `listarProveedoresIncidencia` y `crearRequerimiento` (AV-278), `cerrarIncidencia` y `devolverIncidencia` (AV-279), `obtenerCatalogosRegistro`, `registrarIncidencia`, `listarMisIncidencias`, `obtenerMiIncidencia`, `buscarPosiblesDuplicados` y `sumarReporte` (AV-274) |
| Tipos | `types/incidencias.ts` (contrato de AV-274 y AV-280) |
| Permisos | hasta AV-281, el de Planificación (`PLA.PLANIFICACION.CONSULTAR`) |
| Rutas | `RUTAS_INCIDENCIAS` (prefijo `/incidencias`) y `rutaIncidencia(id)`; `RUTAS_MIS_INCIDENCIAS` (`/mis-incidencias`, entrada `misIncidencias` del menú) |

**Ejemplo:** la columna «Abierta» usa `horasAbierta` y `superaObjetivo` de `bandeja.ts`.

**Destino:** `modulos/planificacion/paginas/incidencias/`.
