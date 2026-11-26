import { User } from 'lucide-react'
import { useLocation } from 'react-router'
import { usePermisos, useSesionActiva } from '@/sesion/ContextoSesion'
import { rutaCuenta } from '../../cuenta/enlaces'
import { seccionesDeCabecera } from '../../registro'
import type { SeccionRediseno } from '../../tipos'
import { EnlaceTransicion, estiloTransicion, nombresTransicion } from '../movimiento'
import estilos from './Cabecera.module.css'
import { enRuta, indiceMasEspecifico } from './seccionActiva'
import Sincronizacion from './Sincronizacion'

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
 */
export default function Cabecera({ secciones }: { secciones?: readonly SeccionRediseno[] }) {
  const { pathname } = useLocation()
  const permisos = usePermisos()
  const sesion = useSesionActiva()
  const lista = secciones ?? seccionesDeCabecera(permisos ?? [])
  const activa = lista.find((s) => enRuta(pathname, s.ruta)) ?? null
  const pestanas = activa?.pestanas ?? []
  const pestanaActiva = indiceMasEspecifico(
    pathname,
    pestanas.map((p) => p.ruta),
  )
  const enCuenta = enRuta(pathname, rutaCuenta())
  return (
    <header
      className={estilos.cabecera}
      style={estiloTransicion(nombresTransicion.cabecera)} // estilo-calculado
    >
      <div className={estilos.capsula}>
        <span className={estilos.tituloMovil}>{activa?.etiqueta ?? ''}</span>
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
            >
              <User size={16} aria-hidden="true" />
              <span className={estilos.nombre}>{sesion.usuario.nombre}</span>
            </EnlaceTransicion>
          )}
        </div>
      </div>
      {activa && pestanas.length > 0 && (
        <nav aria-label={`Pestañas de ${activa.etiqueta}`} className={estilos.pestanas}>
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
