import type { RouteObject } from 'react-router'
import CambioContrasena from './CambioContrasena'
import ConfiguracionPage from './ConfiguracionPage'
import IngresoPage from './IngresoPage'
import { instalarLectura } from './tamanoLectura'
import { SEGMENTO_CAMBIAR_CONTRASENA, SEGMENTO_CUENTA, SEGMENTO_INGRESO } from './enlaces'

/** Con sesión (el agregador las envuelve en `RutaProtegida`). */
export const rutasCuenta: RouteObject[] = [
  { path: SEGMENTO_CUENTA, children: [{ index: true, Component: ConfiguracionPage }] },
]

/** Sin sesión: el inicio de sesión, con el mapa de fondo. */
export const rutasCuentaPublicas: RouteObject[] = [{ path: SEGMENTO_INGRESO, Component: IngresoPage }]

/** Con sesión aunque la contraseña sea temporal: es la única pantalla que el servidor permite entonces. */
export const rutasCuentaContrasenaTemporal: RouteObject[] = [
  { path: SEGMENTO_CAMBIAR_CONTRASENA, Component: CambioContrasena },
]

// Lectura (P-16): el tamaño del texto guardado se aplica al arrancar, no solo al abrir Configuración.
instalarLectura()
