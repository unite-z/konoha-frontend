/**
 * «Más» (RD-69, V13, N-21): lo que el capataz tiene hoy y la barra inferior no enseña. Mapa (lectura), Datos sin
 * conexión, Repositorio, Apariencia, «Cambiar contraseña» y «Cerrar sesión». Cada entrada aparece según sus permisos;
 * Apariencia, Cambiar contraseña y Cerrar sesión, con cualquier sesión. Fondo liso.
 */
import { FolderOpen, KeyRound, LogOut, Map as IconoMapa, Palette, RefreshCw, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { PERMISOS } from '@/config/permisosCore'
import { tiene } from '@/config/permisosSesion'
import { RUTAS_CORE } from '@/router/rutasApp'
import { useSesion, usePermisos, useSesionActiva } from '@/sesion/ContextoSesion'
import { porSincronizar, useCola } from '@/sincronizacion/cola'
import { nombresTransicion, estiloTransicion, useFocoConLaVista } from '../base/movimiento'
import { rutaCuenta } from '../cuenta/enlaces'
import { rutaMapa } from '../mapa/enlaces'
import estilos from './Campo.module.css'

interface Entrada {
  clave: string
  etiqueta: string
  detalle?: string
  icono: LucideIcon
  ruta: string
  visible: boolean
}

export default function Mas() {
  const permisos = usePermisos()
  const sesion = useSesionActiva()
  const { cerrarSesion } = useSesion()
  const pendientes = porSincronizar(useCola()).length
  const encabezado = useFocoConLaVista<HTMLHeadingElement>()

  // Datos sin conexión, Repositorio y Apariencia viven en Cuenta (RD-68); hasta que publique sus rutas, llevan a su entrada.
  const entradas: Entrada[] = [
    {
      clave: 'mapa',
      etiqueta: 'Mapa',
      detalle: 'Solo lectura',
      icono: IconoMapa,
      ruta: rutaMapa(),
      visible: tiene(permisos, PERMISOS.consultarInventario),
    },
    {
      clave: 'datos-sin-conexion',
      etiqueta: 'Datos sin conexión',
      detalle: pendientes > 0 ? `${pendientes} por enviar` : 'Nada por enviar',
      icono: RefreshCw,
      ruta: rutaCuenta(),
      visible: true,
    },
    {
      clave: 'repositorio',
      etiqueta: 'Repositorio',
      icono: FolderOpen,
      ruta: rutaCuenta(),
      visible: tiene(permisos, PERMISOS.consultarRepositorio),
    },
    { clave: 'apariencia', etiqueta: 'Apariencia', icono: Palette, ruta: rutaCuenta(), visible: true },
    {
      clave: 'contrasena',
      etiqueta: 'Cambiar contraseña',
      icono: KeyRound,
      ruta: RUTAS_CORE.cambiarContrasena,
      visible: true,
    },
  ]

  return (
    <div className={estilos.pagina}>
      <header className={estilos.encabezado} style={estiloTransicion(nombresTransicion.encabezado)}>
        <h1 ref={encabezado} tabIndex={-1} className={estilos.titulo}>
          Más
        </h1>
      </header>
      {sesion && (
        <div className={estilos.identidad}>
          <div>
            <p className={estilos.bandaTitulo}>{sesion.usuario.nombre}</p>
            <p className={estilos.bandaDetalle}>
              {sesion.usuario.nombre_usuario} · {sesion.rol.nombre}
            </p>
          </div>
        </div>
      )}
      <ul className={estilos.enlaces}>
        {entradas
          .filter((e) => e.visible)
          .map((e) => {
            const Icono = e.icono
            return (
              <li key={e.clave}>
                <Link to={e.ruta} className={estilos.enlace}>
                  <Icono size={20} aria-hidden="true" />
                  <span className={estilos.textoEnlace}>
                    <span>{e.etiqueta}</span>
                    {e.detalle && <span className={estilos.detalleEnlace}>{e.detalle}</span>}
                  </span>
                </Link>
              </li>
            )
          })}
      </ul>
      {/* Excepción al sistema (AV-351): fila de menú de vidrio, igual que los enlaces de la lista. */}
      <button type="button" className={`${estilos.enlace} ${estilos.separado}`} onClick={() => void cerrarSesion()}>
        <LogOut size={20} aria-hidden="true" />
        <span>Cerrar sesión</span>
      </button>
    </div>
  )
}
