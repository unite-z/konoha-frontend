/**
 * Menú lateral: «Menú lateral» y «Elemento de menú» del sistema de diseño de Figma (DESIGN.md, 4.3).
 *
 * Las entradas salen de `MODULOS_MENU` (`entradasMenuLateral.ts`) y el activo, de `activoEnMenu`: una única regla
 * (prefijo más largo) para el módulo y para la entrada de segundo nivel, así que nunca hay dos marcados.
 * Las entradas sin ruta aún no están disponibles: sin enlace (`aria-disabled`), atenuadas y con
 * «Próximamente». «Configuración» solo es visible para quien gestiona catálogos.
 *
 * RF-T-004 («Menú por rol»): cada módulo con enlace aparece solo si el rol tiene su permiso de menú
 * (`entradasMenu`). Es usabilidad: el servidor vuelve a comprobarlo.
 */
import { Link, useLocation } from 'react-router'
import { PERMISOS, entradasMenu, puede } from '../../config/permisosCore'
import { useSesionActiva } from '../../sesion/ContextoSesion'
import { MODULOS_MENU, activoEnMenu } from './entradasMenuLateral'
import estilos from './MenuLateral.module.css'

/** Entrada que aún no está disponible: sin enlace y con «Próximamente» bajo el nombre. */
function SinEnlace({ texto, secundaria = false }: { texto: string; secundaria?: boolean }) {
  return (
    <li>
      <span
        className={`${estilos.item} ${secundaria ? estilos.sub : ''} ${estilos.sinEnlace}`}
        aria-disabled="true"
        title="Disponible próximamente"
      >
        <span>{texto}</span>
        <span className={estilos.proximamente}>Próximamente</span>
      </span>
    </li>
  )
}

function Entrada({ texto, ruta, activa, secundaria = false }: { texto: string; ruta: string; activa: boolean; secundaria?: boolean }) {
  return (
    <Link
      to={ruta}
      className={[estilos.item, secundaria && estilos.sub, activa && estilos.activo].filter(Boolean).join(' ')}
      aria-current={activa ? 'page' : undefined}
    >
      {texto}
    </Link>
  )
}

export default function MenuLateral() {
  const { pathname } = useLocation()
  const sesion = useSesionActiva()
  const permitidas = entradasMenu(sesion)
  const activo = activoEnMenu(pathname)

  return (
    <aside className={estilos.lateral}>
      <div className={estilos.marca}>
        <span className={estilos.nombreMarca}>Gestión de Áreas Verdes</span>
        <span className={estilos.oficina}>Oficina de Servicios Generales</span>
      </div>

      <nav className={estilos.navegacion} aria-label="Menú principal">
        <p className={estilos.rotulo} aria-hidden="true">
          Menú principal
        </p>
        <ul className={estilos.lista}>
          {MODULOS_MENU.map((modulo) => {
            if (!modulo.clave || !modulo.ruta) return <SinEnlace key={modulo.texto} texto={modulo.texto} />
            if (!permitidas.has(modulo.clave)) return null
            const esActivo = activo.modulo === modulo
            return (
              <li key={modulo.texto}>
                {/* El módulo solo se marca si ninguna de sus entradas lo está: un único activo a la vista. */}
                <Entrada texto={modulo.texto} ruta={modulo.ruta} activa={esActivo && !activo.hijo} />
                {modulo.hijos && (
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
          {puede(sesion, PERMISOS.gestionarCatalogos) && <SinEnlace texto="Configuración" />}
        </ul>
      </nav>

      <p className={estilos.pie}>Campus PUCP · 15,6 ha</p>
    </aside>
  )
}
