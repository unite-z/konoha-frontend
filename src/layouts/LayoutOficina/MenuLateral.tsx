/**
 * Menú lateral: «Menú lateral» y «Elemento de menú» del sistema de diseño de Figma (DESIGN.md, 4.3).
 *
 * Las entradas salen de `MODULOS_MENU` (`entradasMenuLateral.ts`) y el activo, de `activoEnMenu`: una única regla
 * (prefijo más largo) para el módulo y para la entrada de segundo nivel, así que nunca hay dos marcados.
 * Las entradas sin ruta aún no están disponibles: sin enlace (`aria-disabled`), atenuadas y con
 * «Próximamente». «Configuración» solo es visible para quien gestiona catálogos.
 *
 * Comprimido por defecto («Menú lateral · Comprimido» y «Elemento compacto» de Figma): el logo arriba y solo los
 * iconos de primer nivel, con el nombre como texto accesible y `title`. Al pasar el cursor, o con el foco del
 * teclado dentro, se despliega y el contenido se desplaza con él (el layout ensancha su columna). Los iconos no
 * cambian de sitio entre los dos estados: solo se desvanecen los textos. El botón `panel-left` de la marca,
 * visible al desplegarse, fija el menú abierto.
 *
 * Los módulos con submódulos llevan un chevron que gira al plegar o desplegar su grupo (`aria-expanded`), con
 * una línea guía a la izquierda de los submódulos. Solo el grupo del módulo activo está abierto: al navegar a otro
 * módulo se abre el suyo y se pliegan los demás, también los que se abrieron a mano (AV-388).
 *
 * RF-T-004 («Menú por rol»): cada módulo con enlace aparece solo si el rol tiene su permiso de menú
 * (`entradasMenu`). Es usabilidad: el servidor vuelve a comprobarlo.
 */
import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { PERMISOS, entradasMenu, puede } from '@/config/permisosCore'
import Icono, { type NombreIconoFigma } from '@/components/ui/Icono'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import { MODULOS_MENU, activoEnMenu, hijosVisibles } from './entradasMenuLateral'
import UsuarioMenu from './UsuarioMenu'
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
      {icono && <Icono nombre={icono} tamano="md" />}
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
        {icono && <Icono nombre={icono} tamano="md" />}
        <span className={`${estilos.texto} ${estilos.textoSinEnlace}`}>
          <span>{texto}</span>
          <span className={estilos.proximamente}>Próximamente</span>
        </span>
      </span>
    </li>
  )
}

function Entrada({
  texto,
  icono,
  ruta,
  activa,
  moduloActivo = false,
  secundaria = false,
}: PropsEntrada & { ruta: string; activa: boolean; moduloActivo?: boolean }) {
  return (
    <Link
      to={ruta}
      className={[estilos.item, secundaria && estilos.sub, activa && estilos.activo].filter(Boolean).join(' ')}
      aria-current={activa ? 'page' : undefined}
      // Comprimido sin desplegar: se marca el módulo, porque sus subentradas no se ven.
      data-modulo-activo={moduloActivo || undefined}
      title={texto}
    >
      <Etiqueta texto={texto} icono={icono} />
    </Link>
  )
}

export interface MenuLateralProps {
  /** Solo iconos de primer nivel hasta que se pasa el cursor o el foco entra en el menú. */
  comprimido?: boolean
  onAlternarComprimido?: () => void
  /** En móvil el menú es un panel: botón «Cerrar menú». */
  onCerrarMovil?: () => void
}

export default function MenuLateral({ comprimido = false, onAlternarComprimido, onCerrarMovil }: MenuLateralProps) {
  const { pathname } = useLocation()
  const sesion = useSesionActiva()
  const permitidas = entradasMenu(sesion)
  const activo = activoEnMenu(pathname)

  // Grupos abiertos: solo el del módulo activo. Se puede abrir otro a mano, pero al cambiar de módulo se pliegan
  // todos menos el nuevo (AV-388; ajuste durante el render).
  const textoActivo = activo.modulo?.texto ?? null
  const [abiertos, setAbiertos] = useState<ReadonlySet<string>>(() => new Set(textoActivo ? [textoActivo] : []))
  const [activoPrevio, setActivoPrevio] = useState(textoActivo)
  if (textoActivo !== activoPrevio) {
    setActivoPrevio(textoActivo)
    setAbiertos(new Set(textoActivo ? [textoActivo] : []))
  }
  function alternarGrupo(texto: string) {
    const siguiente = new Set(abiertos)
    if (siguiente.has(texto)) siguiente.delete(texto)
    else siguiente.add(texto)
    setAbiertos(siguiente)
  }

  return (
    <aside className={`${estilos.lateral} ${comprimido ? estilos.comprimido : ''}`}>
      <div className={estilos.marca}>
        <span className={estilos.logo} aria-hidden="true">
          <Icono nombre="leaf" tamano="md" />
        </span>
        <span className={`${estilos.textosMarca} ${estilos.seDesvanece}`}>
          <span className={estilos.nombreMarca}>Áreas Verdes</span>
          <span className={estilos.oficina}>Servicios Generales</span>
        </span>
        {onAlternarComprimido && (
          <button
            type="button"
            className={`${estilos.alternar} ${estilos.seDesvanece}`}
            aria-label="Fijar menú abierto"
            aria-pressed={!comprimido}
            title={comprimido ? 'Fijar menú abierto' : 'Comprimir menú'}
            onClick={onAlternarComprimido}
          >
            <Icono nombre="panel-left" tamano="base" />
          </button>
        )}
        {onCerrarMovil && (
          <button type="button" className={estilos.cerrarMovil} aria-label="Cerrar menú" onClick={onCerrarMovil}>
            <Icono nombre="x" tamano="base" />
          </button>
        )}
      </div>

      <div className={estilos.desplazable}>
        <nav className={estilos.navegacion} aria-label="Menú principal">
          <p className={`${estilos.rotulo} ${estilos.seDesvanece}`} aria-hidden="true">
            Menú principal
          </p>
          <ul className={estilos.lista}>
            {MODULOS_MENU.map((modulo) => {
              if (!modulo.clave || !modulo.ruta)
                return <SinEnlace key={modulo.texto} texto={modulo.texto} icono={modulo.icono} />
              if (!permitidas.has(modulo.clave)) return null
              const esActivo = activo.modulo === modulo
              const abierto = abiertos.has(modulo.texto)
              const idGrupo = `menu-grupo-${modulo.clave}`
              return (
                <li key={modulo.texto}>
                  <div className={estilos.filaModulo}>
                    {/* El módulo solo se marca si ninguna de sus entradas lo está: un único activo a la vista. */}
                    <Entrada
                      texto={modulo.texto}
                      icono={modulo.icono}
                      ruta={modulo.ruta}
                      activa={esActivo && !activo.hijo}
                      moduloActivo={esActivo && Boolean(activo.hijo)}
                    />
                    {modulo.hijos && (
                      <button
                        type="button"
                        className={`${estilos.desplegar} ${estilos.seDesvanece}`}
                        aria-expanded={abierto}
                        aria-controls={idGrupo}
                        aria-label={`${abierto ? 'Plegar' : 'Desplegar'} ${modulo.texto}`}
                        onClick={() => alternarGrupo(modulo.texto)}
                      >
                        <Icono nombre="chevron-down" tamano="base" />
                      </button>
                    )}
                  </div>
                  {modulo.hijos && (
                    // Plegado con animación de altura: el grupo cerrado queda fuera del árbol accesible y del foco.
                    <div className={estilos.grupo} data-abierto={abierto || undefined}>
                      <ul
                        id={idGrupo}
                        className={`${estilos.lista} ${estilos.segundoNivel}`}
                        aria-hidden={!abierto || undefined}
                        inert={!abierto}
                      >
                        {hijosVisibles(modulo.hijos, sesion?.permisos ?? []).map((hijo) =>
                          hijo.ruta ? (
                            <li key={hijo.texto}>
                              <Entrada texto={hijo.texto} ruta={hijo.ruta} activa={activo.hijo === hijo} secundaria />
                            </li>
                          ) : (
                            <SinEnlace key={hijo.texto} texto={hijo.texto} secundaria />
                          ),
                        )}
                      </ul>
                    </div>
                  )}
                </li>
              )
            })}

            {/* Catálogos y parámetros: otro requisito; solo para quien los gestiona. */}
            {puede(sesion, PERMISOS.gestionarCatalogos) && <SinEnlace texto="Configuración" icono="settings" />}
          </ul>
        </nav>
      </div>
      <UsuarioMenu claseSeDesvanece={estilos.seDesvanece} />
    </aside>
  )
}
