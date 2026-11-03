/**
 * Menú lateral: «Menú lateral» y «Elemento de menú» del sistema de diseño de Figma (DESIGN.md, 4.3).
 *
 * Las entradas salen de `MODULOS_MENU` (`entradasMenuLateral.ts`) y el activo, de `activoEnMenu`: una única regla
 * (prefijo más largo) para el módulo y para la entrada de segundo nivel, así que nunca hay dos marcados.
 * Las entradas sin ruta aún no están disponibles: sin enlace (`aria-disabled`), atenuadas y con
 * «Próximamente». «Configuración» solo es visible para quien gestiona catálogos.
 *
 * Comprimido («Menú lateral · Comprimido» y «Elemento compacto» de Figma): solo los iconos de primer nivel, con
 * el nombre como texto accesible y `title`. El botón de la marca alterna entre expandido y comprimido.
 *
 * RF-T-004 («Menú por rol»): cada módulo con enlace aparece solo si el rol tiene su permiso de menú
 * (`entradasMenu`). Es usabilidad: el servidor vuelve a comprobarlo.
 */
import { Link, useLocation } from 'react-router'
import { PERMISOS, entradasMenu, puede } from '../../config/permisosCore'
import Icono, { type NombreIconoFigma } from '../../components/ui/Icono'
import { useSesionActiva } from '../../sesion/ContextoSesion'
import { MODULOS_MENU, activoEnMenu } from './entradasMenuLateral'
import estilos from './MenuLateral.module.css'

/** Entrada que aún no está disponible: sin enlace y con «Próximamente» bajo el nombre. */
interface PropsEntrada {
  texto: string
  icono?: NombreIconoFigma
  secundaria?: boolean
}

function Etiqueta({ texto, icono }: Pick<PropsEntrada, 'texto' | 'icono'>) {
  return (
    <>
      {icono && <Icono nombre={icono} tamano="base" />}
      <span className={estilos.texto}>{texto}</span>
    </>
  )
}

function SinEnlace({ texto, icono, secundaria = false }: PropsEntrada) {
  return (
    <li>
      <span
        className={`${estilos.item} ${secundaria ? estilos.sub : ''} ${estilos.sinEnlace}`}
        aria-disabled="true"
        title={`${texto}: disponible próximamente`}
      >
        {icono && <Icono nombre={icono} tamano="base" />}
        <span className={`${estilos.texto} ${estilos.textoSinEnlace}`}>
          <span>{texto}</span>
          <span className={estilos.proximamente}>Próximamente</span>
        </span>
      </span>
    </li>
  )
}

function Entrada({ texto, icono, ruta, activa, secundaria = false }: PropsEntrada & { ruta: string; activa: boolean }) {
  return (
    <Link
      to={ruta}
      className={[estilos.item, secundaria && estilos.sub, activa && estilos.activo].filter(Boolean).join(' ')}
      aria-current={activa ? 'page' : undefined}
      title={texto}
    >
      <Etiqueta texto={texto} icono={icono} />
    </Link>
  )
}

export interface MenuLateralProps {
  /** Solo iconos de primer nivel. */
  comprimido?: boolean
  onAlternarComprimido?: () => void
}

export default function MenuLateral({ comprimido = false, onAlternarComprimido }: MenuLateralProps) {
  const { pathname } = useLocation()
  const sesion = useSesionActiva()
  const permitidas = entradasMenu(sesion)
  const activo = activoEnMenu(pathname)

  return (
    <aside className={`${estilos.lateral} ${comprimido ? estilos.comprimido : ''}`}>
      <div className={estilos.marca}>
        <span className={estilos.logo} aria-hidden="true">
          <Icono nombre="leaf" tamano="base" />
        </span>
        <span className={estilos.textosMarca}>
          <span className={estilos.nombreMarca}>Áreas Verdes</span>
          <span className={estilos.oficina}>Servicios Generales</span>
        </span>
        {onAlternarComprimido && (
          <button
            type="button"
            className={estilos.alternar}
            aria-label={comprimido ? 'Expandir menú' : 'Comprimir menú'}
            aria-pressed={comprimido}
            title={comprimido ? 'Expandir menú' : 'Comprimir menú'}
            onClick={onAlternarComprimido}
          >
            <Icono nombre="panel-left" tamano="base" />
          </button>
        )}
      </div>

      <nav className={estilos.navegacion} aria-label="Menú principal">
        <p className={estilos.rotulo} aria-hidden="true">
          Menú principal
        </p>
        <ul className={estilos.lista}>
          {MODULOS_MENU.map((modulo) => {
            if (!modulo.clave || !modulo.ruta) return <SinEnlace key={modulo.texto} texto={modulo.texto} icono={modulo.icono} />
            if (!permitidas.has(modulo.clave)) return null
            const esActivo = activo.modulo === modulo
            return (
              <li key={modulo.texto}>
                {/* El módulo solo se marca si ninguna de sus entradas lo está: un único activo a la vista. */}
                {/* Comprimido: sin subentradas, así que el módulo se marca si es el activo. */}
                <Entrada
                  texto={modulo.texto}
                  icono={modulo.icono}
                  ruta={modulo.ruta}
                  activa={esActivo && (comprimido || !activo.hijo)}
                />
                {modulo.hijos && !comprimido && (
                  <ul className={`${estilos.lista} ${estilos.segundoNivel}`}>
                    {modulo.hijos.map((hijo) =>
                      hijo.ruta ? (
                        <li key={hijo.texto}>
                          <Entrada texto={hijo.texto} ruta={hijo.ruta} activa={activo.hijo === hijo} secundaria />
                        </li>
                      ) : (
                        <SinEnlace key={hijo.texto} texto={hijo.texto} secundaria />
                      ),
                    )}
                  </ul>
                )}
              </li>
            )
          })}

          {/* Catálogos y parámetros: otro requisito; solo para quien los gestiona. */}
          {puede(sesion, PERMISOS.gestionarCatalogos) && <SinEnlace texto="Configuración" icono="settings" />}
        </ul>
      </nav>

      <p className={estilos.pie}>Campus PUCP · 15,6 ha</p>
    </aside>
  )
}
