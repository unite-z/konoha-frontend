import { User } from 'lucide-react'
import { useRef } from 'react'
import { useLocation } from 'react-router'
import { usePermisos, useSesionActiva } from '@/sesion/ContextoSesion'
import { rutaCuenta } from '@/rediseno/cuenta/enlaces'
import { seccionesDeCabecera, seccionesVisibles } from '@/rediseno/registro'
import type { SeccionRediseno } from '@/rediseno/tipos'
import { EnlaceTransicion, estiloTransicion, nombresTransicion } from '../movimiento'
import estilos from './Cabecera.module.css'
import { enRuta, indiceMasEspecifico } from './seccionActiva'
import Sincronizacion from './Sincronizacion'
import { bordeInferior, useEspacioReservado, VARIABLE_CABECERA } from './useEspacioReservado'

function Lente() {
  return (
    <span
      className={estilos.lente}
      aria-hidden="true"
      style={estiloTransicion(nombresTransicion.lentePestanas)} // estilo-calculado
    />
  )
}

/**
 * Cápsula de vidrio con las secciones que los permisos dejan ver y, debajo, las pestañas de la sección activa.
 * Lo que muestra sale del registro (`seccion.ts` de cada módulo): aquí no hay ninguna sección ni pestaña escrita.
 * En móvil (<768 px) la cápsula es la barra superior (sección actual, indicador y usuario); las secciones van en la barra inferior.
 *
 * El `view-transition-name` va en la cápsula y en la fila de pestañas, no en `<header>`: un antecesor con nombre es raíz
 * de fondo (backdrop root) y anularía el desenfoque del vidrio.
 */
export default function Cabecera({ secciones }: { secciones?: readonly SeccionRediseno[] }) {
  const { pathname } = useLocation()
  const permisos = usePermisos() ?? []
  const sesion = useSesionActiva()
  const referencia = useRef<HTMLElement>(null)
  useEspacioReservado(referencia, VARIABLE_CABECERA, bordeInferior)
  const lista = secciones ?? seccionesDeCabecera(permisos)
  const activa = lista.find((s) => enRuta(pathname, s.ruta)) ?? null
  // El título del móvil también nombra Cuenta y Campo, que no son secciones de la cabecera.
  const titulo = activa ?? (secciones ?? seccionesVisibles(permisos)).find((s) => enRuta(pathname, s.ruta)) ?? null
  const pestanas = activa?.pestanas ?? []
  const pestanaActiva = indiceMasEspecifico(
    pathname,
    pestanas.map((p) => p.ruta),
  )
  const enCuenta = enRuta(pathname, rutaCuenta())
  return (
    <header ref={referencia} className={estilos.cabecera}>
      <div
        className={estilos.capsula}
        style={estiloTransicion(nombresTransicion.cabecera)} // estilo-calculado
      >
        <span className={estilos.tituloMovil}>{titulo?.etiqueta ?? ''}</span>
        {lista.length > 0 && (
          <nav aria-label="Secciones" className={estilos.secciones}>
            {lista.map((s) => {
              const actual = s === activa
              const Icono = s.icono
              return (
                <EnlaceTransicion
                  key={s.id}
                  to={s.ruta}
                  className={estilos.enlace}
                  aria-current={actual ? 'page' : undefined}
                  title={s.etiqueta}
                >
                  {actual && pestanas.length === 0 && <Lente />}
                  <Icono size={16} aria-hidden="true" className={estilos.icono} />
                  <span className={estilos.texto}>{s.etiqueta}</span>
                </EnlaceTransicion>
              )
            })}
          </nav>
        )}
        <div className={estilos.cuenta}>
          <Sincronizacion />
          {sesion && (
            <EnlaceTransicion
              to={rutaCuenta()}
              className={estilos.usuario}
              aria-current={enCuenta ? 'page' : undefined}
              aria-label={`${sesion.usuario.nombre}: Configuración`}
              title="Configuración"
            >
              <User size={16} aria-hidden="true" />
              <span className={estilos.nombre}>{sesion.usuario.nombre}</span>
            </EnlaceTransicion>
          )}
        </div>
      </div>
      {activa && pestanas.length > 0 && (
        <nav
          aria-label={`Pestañas de ${activa.etiqueta}`}
          className={estilos.pestanas}
          style={estiloTransicion(nombresTransicion.pestanas)} // estilo-calculado
        >
          {pestanas.map((p, i) => (
            <EnlaceTransicion
              key={p.ruta}
              to={p.ruta}
              className={estilos.pestana}
              aria-current={i === pestanaActiva ? 'page' : undefined}
            >
              {i === pestanaActiva && <Lente />}
              <span className={estilos.texto}>{p.etiqueta}</span>
            </EnlaceTransicion>
          ))}
        </nav>
      )}
    </header>
  )
}
