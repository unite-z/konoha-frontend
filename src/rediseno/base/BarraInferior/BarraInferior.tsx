import { useRef } from 'react'
import { useLocation } from 'react-router'
import { usePermisos } from '@/sesion/ContextoSesion'
import { seccionesVisibles } from '../../registro'
import type { SeccionRediseno } from '../../tipos'
import { indiceMasEspecifico } from '../Cabecera/seccionActiva'
import { desdeAbajo, useEspacioReservado, VARIABLE_BARRA } from '../Cabecera/useEspacioReservado'
import { EnlaceTransicion, estiloTransicion, nombresTransicion } from '../movimiento'
import estilos from './BarraInferior.module.css'
import { entradasBarraInferior } from './entradas'

/** Única barra inferior del móvil (<768 px). Sus entradas salen del registro; otras vistas no pintan otra. */
export default function BarraInferior({ secciones }: { secciones?: readonly SeccionRediseno[] }) {
  const { pathname } = useLocation()
  const permisos = usePermisos() ?? []
  const referencia = useRef<HTMLElement>(null)
  const entradas = entradasBarraInferior(secciones ?? seccionesVisibles(permisos), permisos)
  useEspacioReservado(referencia, VARIABLE_BARRA, desdeAbajo, entradas.length > 0)
  if (entradas.length === 0) return null
  const activa = indiceMasEspecifico(
    pathname,
    entradas.map((e) => e.ruta),
  )
  return (
    <nav
      ref={referencia}
      aria-label="Navegación principal"
      className={estilos.barra}
      style={estiloTransicion(nombresTransicion.barraInferior)} // estilo-calculado
    >
      {entradas.map((e, i) => {
        const Icono = e.icono
        return (
          <EnlaceTransicion
            key={e.clave}
            to={e.ruta}
            className={estilos.entrada}
            aria-current={i === activa ? 'page' : undefined}
          >
            <Icono size={20} aria-hidden="true" />
            <span>{e.etiqueta}</span>
          </EnlaceTransicion>
        )
      })}
    </nav>
  )
}
