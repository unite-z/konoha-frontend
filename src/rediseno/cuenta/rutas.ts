import { createElement } from 'react'
import type { RouteObject } from 'react-router'
import EnConstruccion from '../base/EnConstruccion'
import CambioContrasena from './CambioContrasena'
import IngresoPage from './IngresoPage'
import { SEGMENTO_CAMBIAR_CONTRASENA, SEGMENTO_CUENTA, SEGMENTO_INGRESO } from './enlaces'

/** Con sesión (el agregador las envuelve en `RutaProtegida`). */
export const rutasCuenta: RouteObject[] = [
  { path: SEGMENTO_CUENTA, children: [{ index: true, element: createElement(EnConstruccion, { seccion: 'Cuenta' }) }] },
]

/** Sin sesión: el inicio de sesión, con el mapa de fondo. */
export const rutasCuentaPublicas: RouteObject[] = [{ path: SEGMENTO_INGRESO, Component: IngresoPage }]

/** Con sesión aunque la contraseña sea temporal: es la única pantalla que el servidor permite entonces. */
export const rutasCuentaContrasenaTemporal: RouteObject[] = [
  { path: SEGMENTO_CAMBIAR_CONTRASENA, Component: CambioContrasena },
]
