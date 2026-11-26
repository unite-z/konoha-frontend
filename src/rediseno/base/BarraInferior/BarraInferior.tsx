import { useLocation } from 'react-router'
import { usePermisos } from '@/sesion/ContextoSesion'
import { seccionesVisibles } from '../../registro'
import type { SeccionRediseno } from '../../tipos'
import { enRuta, indiceMasEspecifico } from '../Cabecera/seccionActiva'
import { EnlaceTransicion } from '../movimiento'
import estilos from './BarraInferior.module.css'
import { entradasBarraInferior } from './entradas'

/** Única barra inferior del móvil (<768 px). Sus entradas salen del registro; otras vistas no pintan otra. */
export default function BarraInferior({ secciones }: { secciones?: readonly SeccionRediseno[] }) {
  const { pathname } = useLocation()
  const permisos = usePermisos() ?? []
  const entradas = entradasBarraInferior(secciones ?? seccionesVisibles(permisos), permisos)
  if (entradas.length === 0) return null
  const activa = indiceMasEspecifico(
    pathname,
    entradas.map((e) => e.ruta),
  )
  return (
    <nav aria-label="Navegación principal" className={estilos.barra}>
      {entradas.map((e, i) => {
        const Icono = e.icono
        return (
          <EnlaceTransicion
            key={e.clave}
            to={e.ruta}
            className={estilos.entrada}
            aria-current={i === activa && enRuta(pathname, e.ruta) ? 'page' : undefined}
          >
            <Icono size={20} aria-hidden="true" />
            <span>{e.etiqueta}</span>
          </EnlaceTransicion>
        )
      })}
    </nav>
  )
}
