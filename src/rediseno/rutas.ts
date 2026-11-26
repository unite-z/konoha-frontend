/**
 * Agregador de rutas del diseño nuevo (AV-420). Cuelgan de `/n`, están montadas siempre y no dependen del
 * interruptor. Cada módulo edita solo su `rutas.ts`; este fichero no se toca desde los módulos. Sin JSX: la regla
 * de nombres reserva `.tsx` a los componentes (PascalCase), así que las rutas usan `Component`, `lazy` o `createElement`.
 */
import { createElement, type ReactNode } from 'react'
import { Navigate, type RouteObject } from 'react-router'
import EnConstruccion from './base/EnConstruccion'
import LayoutRediseno from './base/LayoutRediseno'
import PuertaRediseno, { PuertaPrefijo } from './base/PuertaRediseno'
import { rutasCampo } from './campo/rutas'
import { rutasCuenta } from './cuenta/rutas'
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
        { index: true, element: createElement(EnConstruccion, { seccion: 'Diseño nuevo' }) },
        ...rutasMapa,
        ...rutasPlanificacion,
        ...rutasIncidencias,
        ...rutasProveedores,
        ...rutasReportes,
        ...rutasCuenta,
        ...rutasCampo,
        { path: '*', element: createElement(Navigate, { to: PREFIJO_REDISENO, replace: true }) },
      ],
    },
  ],
}
