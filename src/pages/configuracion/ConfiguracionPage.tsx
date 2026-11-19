/**
 * Configuración (AV-397): panel de módulos. Una tarjeta por ajuste, en dos columnas, y cada una abre su pantalla.
 * Apariencia la ve cualquier sesión; los ajustes de IA, solo quien tiene IA.PROPUESTA.VALIDAR.
 */
import { PERMISO_VALIDAR_IA } from '@/config/permisos'
import ListaEnlaces, { type EnlaceIndice } from '@/design-system/ListaEnlaces'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { RUTAS_CORE } from '@/router/rutasApp'
import { usePermisos } from '@/sesion/ContextoSesion'

const TITULO = 'Configuración'

/** Miga de vuelta al panel, para las pantallas de cada ajuste. */
export const MIGA_CONFIGURACION = { texto: TITULO, ruta: RUTAS_CORE.configuracion }

const APARIENCIA: EnlaceIndice = {
  titulo: 'Apariencia',
  descripcion: 'Tema claro, cálido u oscuro y color de acento. Se guarda en tu cuenta.',
  ruta: RUTAS_CORE.configuracionApariencia,
  icono: 'sun',
}

const DE_IA: EnlaceIndice[] = [
  {
    titulo: 'Inteligencia artificial',
    descripcion: 'Proveedor y modelo que usan los siete asistentes de IA, y prueba de conexión.',
    ruta: RUTAS_CORE.configuracionIa,
    icono: 'destello',
  },
  {
    titulo: 'Uso y costes de la IA',
    descripcion: 'Cuánto cuesta, cuánto tarda y cuándo falla cada llamada de los asistentes, por periodo.',
    ruta: RUTAS_CORE.configuracionUsoIa,
    icono: 'chart',
  },
]

export default function ConfiguracionPage() {
  usePaginaActual(TITULO, [{ texto: TITULO }])
  const gestionaIa = usePermisos()?.includes(PERMISO_VALIDAR_IA) ?? false
  return <ListaEnlaces icono="settings" accion="Abrir" enlaces={gestionaIa ? [APARIENCIA, ...DE_IA] : [APARIENCIA]} />
}
