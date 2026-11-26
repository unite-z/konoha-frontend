/**
 * Agregador de rutas del diseño nuevo (AV-420). Cuelgan de `/n`, están montadas siempre y no dependen del
 * interruptor. Cada módulo edita solo su `rutas.tsx`; este fichero no se toca desde los módulos.
 */
import { Navigate, type RouteObject } from 'react-router'
import EnConstruccion from './base/EnConstruccion'
import LayoutRediseno from './base/LayoutRediseno'
import { PuertaPrefijo } from './base/PuertaRediseno'
import { rutasCampo } from './campo/rutas'
import { rutasCuenta } from './cuenta/rutas'
import { rutasIncidencias } from './incidencias/rutas'
import { rutasMapa } from './mapa/rutas'
import { PREFIJO_REDISENO } from './prefijo'
import { rutasPlanificacion } from './planificacion/rutas'
import { rutasProveedores } from './proveedores/rutas'
import { rutasReportes } from './reportes/rutas'

export { default as PuertaRediseno } from './base/PuertaRediseno'

export const rutaRediseno: RouteObject = {
  path: PREFIJO_REDISENO,
  element: <PuertaPrefijo />,
  children: [
    {
      element: <LayoutRediseno />,
      children: [
        { index: true, element: <EnConstruccion seccion="Diseño nuevo" /> },
        ...rutasMapa,
        ...rutasPlanificacion,
        ...rutasIncidencias,
        ...rutasProveedores,
        ...rutasReportes,
        ...rutasCuenta,
        ...rutasCampo,
        { path: '*', element: <Navigate to={PREFIJO_REDISENO} replace /> },
      ],
    },
  ],
}
