# Diseño nuevo (rediseño, épica AV-412)

Todo lo del rediseño vive aquí. Las rutas cuelgan del prefijo temporal `/n` (`PREFIJO_REDISENO`, se retira en RD-80) y están montadas siempre: el router se crea una vez y no depende del interruptor.

## Interruptor

`useDisenoNuevo()` (`useDisenoNuevo.ts`) guarda tres estados: sin elegir, encendido y apagado. Sin elegir cuenta como apagado hasta RD-78. Se guarda en el navegador (`av:diseno-nuevo`) y en la cuenta (`apariencia.diseno_nuevo` de la sesión y del `PUT auth/apariencia/`, AV-414) si el backend lo admite. Manda lo elegido en el navegador; si no hay nada, la cuenta. Como ese `PUT` reemplaza la apariencia entera, Apariencia le añade `camposCuenta` al guardar el tema o el acento.

- Apagado o sin elegir: ninguna ruta actual cambia y `/n/…` muestra un aviso con «Activar diseño nuevo».
- Encendido: `PuertaRediseno` envuelve el layout actual y lleva cada ruta antigua a su equivalente `/n/…` según `base/redirecciones.ts`, conservando la consulta. Hasta RD-05 la tabla solo tiene `/`; RD-05 la completa sin tocar el router. `/ingreso` se envuelve cuando exista su equivalente en `/n` (hoy `/n` exige sesión).

## Estructura

| Ruta                                                                  | Qué es                                                                                     |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `rutas.tsx`                                                           | Agregador: importa las 7 `rutas.tsx` de módulo. No se edita desde los módulos              |
| `registro.ts`                                                         | Reúne los `seccion.ts`: etiqueta, icono, permisos por código, pestañas y entradas de móvil |
| `base/`                                                               | Piezas compartidas, una carpeta por pieza (`base/<Pieza>/`). Congelada tras la Puerta 2    |
| `{mapa,planificacion,incidencias,proveedores,reportes,cuenta,campo}/` | Un módulo cada una, con `rutas.tsx`, `enlaces.ts` y `seccion.ts`                           |

Cuenta y campo no son secciones de la cabecera (`enCabecera: false`).

## Reglas

1. Un ticket de módulo edita solo su carpeta. No toca `base/`, `rutas.tsx`, `registro.ts` ni `src/pages/`.
2. `enlaces.ts` guarda constantes y funciones `ruta*()` y no importa pantallas. Ninguna URL se escribe a mano: se usa la función del módulo dueño.
3. Los permisos van por código (`PERMISOS`), nunca por nombre de rol.
4. Solo tokens semánticos (`--color-*`, `--vidrio-*`, `--mapa-*`); el tema amarillento lo pone `LayoutRediseno` mientras está montado.
5. Se reutiliza `src/services/api/`, `src/utils/` y `src/design-system/` antes de escribir algo nuevo.
6. Cada PR: menos de 200 líneas sin contar tests, comprobado a 1440 y 390 px con el interruptor encendido.
