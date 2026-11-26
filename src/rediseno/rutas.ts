/**
 * Agregador de rutas del diseño nuevo (AV-420). Cuelgan de `/n`, están montadas siempre y no dependen del
 * interruptor. Cada módulo edita solo su `rutas.ts`; este fichero no se toca desde los módulos. Sin JSX: la regla
 * de nombres reserva `.tsx` a los componentes (PascalCase), así que las rutas usan `Component`, `lazy` o `createElement`.
 */
import { createElement, type ReactNode } from 'react'
import type { RouteObject } from 'react-router'
import InicioRediseno from './base/InicioRediseno'
import NoEncontradoRediseno from './base/NoEncontradoRediseno'
import LayoutRediseno from './base/LayoutRediseno'
import PuertaRediseno, { PuertaPrefijo } from './base/PuertaRediseno'
import ErrorCargaPantalla from '../pages/ErrorCargaPantalla'
import RutaProtegida from '../sesion/RutaProtegida'
import { rutasCampo } from './campo/rutas'
import { rutasCuenta, rutasCuentaContrasenaTemporal, rutasCuentaPublicas } from './cuenta/rutas'
import { rutasIncidencias } from './incidencias/rutas'
import { rutasMapa } from './mapa/rutas'
import { PREFIJO_REDISENO } from './prefijo'
import { rutasPlanificacion } from './planificacion/rutas'
import { rutasProveedores } from './proveedores/rutas'
import { rutasReportes } from './reportes/rutas'

/** El layout actual dentro de `PuertaRediseno`: encendido, sus rutas llevan al diseño nuevo (`base/redirecciones.ts`). */
export function conPuertaRediseno(layout: ReactNode) {
  return createElement(PuertaRediseno, null, layout)
}

export const rutaRediseno: RouteObject = {
  path: PREFIJO_REDISENO,
  Component: PuertaPrefijo,
  children: [
    {
      Component: LayoutRediseno,
      children: [
        // Sin sesión: el ingreso comparte el layout (y el mapa vivo) con el resto, que pasa por `RutaProtegida`.
        ...rutasCuentaPublicas,
        {
          element: createElement(RutaProtegida, { permitirContrasenaTemporal: true }),
          children: rutasCuentaContrasenaTemporal,
        },
        {
          element: createElement(RutaProtegida),
          errorElement: createElement(ErrorCargaPantalla),
          children: [
            { index: true, Component: InicioRediseno },
            ...rutasMapa,
            ...rutasPlanificacion,
            ...rutasIncidencias,
            ...rutasProveedores,
            ...rutasReportes,
            ...rutasCuenta,
            ...rutasCampo,
            { path: '*', Component: NoEncontradoRediseno },
          ],
        },
      ],
    },
  ],
}
