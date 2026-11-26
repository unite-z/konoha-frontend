# Diseño nuevo (rediseño, épica AV-412)

Todo lo del rediseño vive aquí. Las rutas cuelgan del prefijo temporal `/n` (`PREFIJO_REDISENO`, se retira en RD-80) y están montadas siempre: el router se crea una vez y no depende del interruptor.

## Interruptor

`useDisenoNuevo()` (`useDisenoNuevo.ts`) guarda tres estados: sin elegir, encendido y apagado. Sin elegir cuenta como apagado hasta RD-78. Se guarda en el navegador (`av:diseno-nuevo`) y en la cuenta (`apariencia.diseno_nuevo` de la sesión y del `PUT auth/apariencia/`, AV-414) si el backend lo admite. Manda lo elegido en el navegador; si no hay nada, la cuenta. Como ese `PUT` reemplaza la apariencia entera, Apariencia le añade `camposCuenta` al guardar el tema o el acento.

- Apagado o sin elegir: ninguna ruta actual cambia y `/n/…` muestra un aviso con «Activar diseño nuevo».
- Encendido: `PuertaRediseno` envuelve el layout actual y lleva cada ruta antigua a su equivalente `/n/…` según `base/redirecciones.ts`, conservando la consulta. Hasta RD-05 la tabla solo tiene `/`; RD-05 la completa sin tocar el router. `/ingreso` se envuelve cuando exista su equivalente en `/n` (hoy `/n` exige sesión).

## Estructura

| Ruta                                                                  | Qué es                                                                                     |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `rutas.ts`                                                            | Agregador: importa las 7 `rutas.ts` de módulo. No se edita desde los módulos               |
| `registro.ts`                                                         | Reúne los `seccion.ts`: etiqueta, icono, permisos por código, pestañas y entradas de móvil |
| `base/`                                                               | Piezas compartidas, una carpeta por pieza (`base/<Pieza>/`). Congelada tras la Puerta 2    |
| `{mapa,planificacion,incidencias,proveedores,reportes,cuenta,campo}/` | Un módulo cada una, con `rutas.ts`, `enlaces.ts` y `seccion.ts`                            |

Cuenta y campo no son secciones de la cabecera (`enCabecera: false`).

## Reglas

1. Un ticket de módulo edita solo su carpeta. No toca `base/`, `rutas.ts`, `registro.ts` ni `src/pages/`.
2. `enlaces.ts` guarda constantes y funciones `ruta*()` y no importa pantallas. Ninguna URL se escribe a mano: se usa la función del módulo dueño.
3. Los permisos van por código (`PERMISOS`), nunca por nombre de rol.
4. Solo tokens semánticos (`--color-*`, `--vidrio-*`, `--mapa-*`); el tema amarillento lo pone `LayoutRediseno` mientras está montado.
5. Se reutiliza `src/services/api/`, `src/utils/` y `src/design-system/` antes de escribir algo nuevo.
6. Cada PR: menos de 200 líneas sin contar tests, comprobado a 1440 y 390 px con el interruptor encendido.

## Mapa vivo y capas (AV-426)

`LayoutRediseno` lleva el escenario (`base/Escenario/`): el `MapaCampus` 3D se monta una vez, detrás del contenido, y no se desmonta al navegar. No se monta (ni carga Three.js) hasta la primera vista de mapa.

- Una vista de mapa llama a `useVistaDeMapa({ areaSeleccionada, vista, onSeleccionarArea })`. Con alguna activa el mapa se ve; sin ninguna se difumina y deja de dibujar, pero sigue en memoria. Devuelve `volarA` y `volver`.
- Con el mapa detrás, `main` es transparente y deja pasar el ratón; los elementos de la vista lo reciben. Un contenedor que ocupe toda la pantalla lleva `data-mapa-libre` (`ATRIBUTO_MAPA_LIBRE`).
- Las capas se componen desde la vista del módulo, con sus datos: `CapaColores` (`mapa_id → clase` y `clase → token CSS`), `CapaMarcadores` (por lon/lat o por área; agrupa los solapados y se maneja con teclado) y `CapaGeometrias` (áreas nuevas o cambiadas de `GET /inventario/mapa/geometria`, una sola petición en caché). Memoriza (`useMemo`) los objetos y listas que les pases.
