# Diseño nuevo (rediseño, épica AV-412)

Todo lo del rediseño vive aquí. Las rutas cuelgan del prefijo temporal `/n` (`PREFIJO_REDISENO`, se retira en RD-80) y están montadas siempre: el router se crea una vez y no depende del interruptor.

## Interruptor

`useDisenoNuevo()` (`useDisenoNuevo.ts`) guarda tres estados: sin elegir, encendido y apagado. Sin elegir cuenta como apagado hasta RD-78. Se guarda en el navegador (`av:diseno-nuevo`) y en la cuenta (`apariencia.diseno_nuevo` de la sesión y del `PUT auth/apariencia/`, AV-414) si el backend lo admite. Manda lo elegido en el navegador; si no hay nada, la cuenta. Como ese `PUT` reemplaza la apariencia entera, Apariencia le añade `camposCuenta` al guardar el tema o el acento.

- Apagado o sin elegir: ninguna ruta actual cambia y `/n/…` muestra un aviso con «Activar diseño nuevo».
- Encendido: `PuertaRediseno` envuelve el layout actual y lleva cada ruta antigua a su equivalente `/n/…` según `base/redirecciones.ts`, conservando la consulta. La tabla cubre todas las rutas de `rutasApp.ts` y `rutasCampo.ts` (el test falla si una se queda sin destino); lleva a la vista nueva que ya existe (`/n/planificacion/ciclos`, `/cuadrillas`, `/reglas`, `/n/proveedores/atenciones[/:id]`…) o, mientras su ticket no la construya, a la raíz de su sección, y añade los parámetros de «Puntos de entrada entre módulos» sin pisar los que ya trae la URL (`?area=`, `?incidencia=`, `?contrato=`, `?informe=`, `?indicador=`, `?vista=actividades`…). `/n` es `InicioRediseno`: capataz → Campo, inventario → Mapa, si no la primera sección permitida, y sin secciones el aviso con «Cerrar sesión». `/ingreso` y `/cambiar-contrasena` llevan a `/n/ingreso` y `/n/cambiar-contrasena` con `cuenta/RedirigirAlDisenoNuevo` (AV-439), según la preferencia de este navegador y conservando la consulta y el estado. `/n/ingreso` es público y comparte layout y mapa vivo con el resto; lo demás de `/n` pasa por `RutaProtegida` (en `rutas.ts`). Sin sesión o con contraseña temporal, `LayoutRediseno` no pinta la cabecera ni la barra inferior.

## Estructura

| Ruta                                                                  | Qué es                                                                                     |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `rutas.ts`                                                            | Agregador: importa las 7 `rutas.ts` de módulo. No se edita desde los módulos               |
| `registro.ts`                                                         | Reúne los `seccion.ts`: etiqueta, icono, permisos por código, pestañas y entradas de móvil |
| `base/`                                                               | Piezas compartidas, una carpeta por pieza (`base/<Pieza>/`). Congelada tras la Puerta 2    |
| `{mapa,planificacion,incidencias,proveedores,reportes,cuenta,campo}/` | Un módulo cada una, con `rutas.ts`, `enlaces.ts` y `seccion.ts`                            |

Cuenta y campo no son secciones de la cabecera (`enCabecera: false`).

La cabecera (`base/Cabecera/`) y la única barra inferior del móvil (`base/BarraInferior/`) leen `registro.ts`. Las dos son fijas y publican en `<html>` lo que tapan (`--rediseno-alto-cabecera` y `--rediseno-alto-barra`): el layout y `PanelLateral` las usan para no quedar debajo. Ninguna vista pinta otra barra inferior.

## Reglas

1. Un ticket de módulo edita solo su carpeta. No toca `base/`, `rutas.ts`, `registro.ts` ni `src/pages/`.
2. `enlaces.ts` guarda constantes y funciones `ruta*()` y no importa pantallas. Ninguna URL se escribe a mano: se usa la función del módulo dueño.
3. Los permisos van por código (`PERMISOS`), nunca por nombre de rol.
4. Solo tokens semánticos (`--color-*`, `--vidrio-*`, `--mapa-*`); el tema amarillento lo pone `LayoutRediseno` mientras está montado.
5. Se reutiliza `src/services/api/`, `src/utils/` y `src/design-system/` antes de escribir algo nuevo.
6. Cada PR: menos de 200 líneas sin contar tests, comprobado a 1440 y 390 px con el interruptor encendido.

## Configuración (AV-441)

`/n/cuenta` es `cuenta/ConfiguracionPage`: una sola pantalla con secciones sobre fondo liso, elegidas con `?seccion=` (`rutaConfiguracion(id)`). Las secciones salen de `cuenta/secciones.ts` (`SECCIONES_CONFIGURACION`): cada ticket de Configuración añade la suya con `id`, `etiqueta`, `permisos` por código y su `Componente`; la página solo enseña las que la sesión puede ver, y un enlace directo a otra enseña «Sin acceso». Apariencia ofrece también el tema Amarillento (`utils/apariencia.ts`) y marca el tema guardado; como `LayoutRediseno` pone el amarillento mientras está montado, avisa cuando lo que se ve no es lo guardado, y cambiar solo el acento no lo quita. Lectura (P-16, tamaño del texto en el navegador) va la última y se quita borrando su entrada.

## Mapa vivo y capas (AV-426)

`LayoutRediseno` lleva el escenario (`base/Escenario/`): el `MapaCampus` 3D se monta una vez, detrás del contenido, y no se desmonta al navegar. No se monta (ni carga Three.js) hasta la primera vista de mapa.

- Una vista de mapa llama a `useVistaDeMapa({ areaSeleccionada, vista, onSeleccionarArea })`. Con alguna activa el mapa se ve; sin ninguna se difumina y deja de dibujar, pero sigue en memoria. Devuelve `volarA` y `volver`.
- Con el mapa detrás, `main` es transparente y deja pasar el ratón; los elementos de la vista lo reciben. Un contenedor que ocupe toda la pantalla lleva `data-mapa-libre` (`ATRIBUTO_MAPA_LIBRE`).
- Las capas se componen desde la vista del módulo, con sus datos: `CapaColores` (`mapa_id → clase` y `clase → token CSS`), `CapaMarcadores` (por lon/lat o por área; agrupa los solapados, despliega los que el zoom no separa y se maneja con teclado) y `CapaGeometrias` (áreas nuevas o cambiadas de `GET /inventario/mapa/geometria`, una sola petición en caché; el `areaSeleccionada` de `useVistaDeMapa` vuela también a ellas). Memoriza (`useMemo`) los objetos y listas que les pases.

## Herramientas de punto y de contorno (AV-428)

Se montan dentro del escenario, como las capas, y leen la escena de `ContextoMapa`. Mientras una está montada, un toque en el suelo no elige áreas (`escena.alPulsarSuelo`).

- `HerramientaPunto` (`punto`, `onElegir`, `validacion`, `puntoActual?`): devuelve `{ lon, lat }`; `puntoActual` enseña la ubicación guardada como referencia. El módulo calcula `validacion` con `useUbicacionEnMapa` y la herramienta enseña los avisos («fuera del área», «área detectada», «varias áreas»). Teclado: «Marcar el centro del mapa» y flechas con el foco en el punto.
- `HerramientaContorno` (`onCerrar`, `onReabrir?`, `inicial?`, `onCancelar?`): lleva la cámara a `planta`, dibuja, mueve vértices, deshace y cierra. `onCerrar` recibe `{ geojson, superficie_m2 }` (EPSG:4326); `onReabrir` avisa de que, al deshacer el cierre, ese resultado ya no vale. Rechaza contornos que se cruzan.

## Ficha flotante del ejemplar (RD-21, AV-462)

`mapa/FichaEjemplar/FichaEjemplar.tsx` abre sobre el área, sin cerrarla (el panel queda atenuado), cuando la URL lleva `?area=<id>&ejemplar=<id>` (`rutaMapaEjemplar`). El ejemplar sale de la lista del área: el servidor no tiene `GET ejemplares/{id}`, así que la ficha espera a esa lista y comparte sus estados de carga, error y 403. Pestañas Datos (foto, edición de alias y altura con `PATCH`, «Editar ubicación» y accesos a otros módulos), Situación (`&propuesta=muerto`, `rutaMapaEjemplarMuerto`, abre con la planta muerta por confirmar) e Historial. «Editar ubicación» aparta la ficha y monta `HerramientaPunto` con `useUbicacionEnMapa`: los tres avisos salen de `ValidacionUbicacion`. Los accesos (`enlacesEjemplar.ts`) solo enlazan; las actividades vienen de `GET ejemplares/{id}/historial-actividades` y cada bloque del historial tiene sus propios estados, sin romper el resto.
