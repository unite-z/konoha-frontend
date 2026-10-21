/**
 * Menú lateral (Arquitectura de la Información 1.3 y 1.4.1; Guía Web 3.2 y 4.2).
 *
 * Primer nivel con las 8 etiquetas de negocio. «Reportes e indicadores» (MOD-06) y «Servicios tercerizados»
 * (MOD-05) tienen enlaces; el resto pertenece a otros módulos y se muestra sin enlace (`aria-disabled`).
 * «Configuración» solo es visible en la vista de Administrador.
 *
 * Segundo nivel de «Servicios tercerizados»: Atenciones (con enlace), Proveedores y contratos y Control
 * fitosanitario (sin enlace: fuera de esta entrega).
 *
 * Segundo nivel de «Reportes e indicadores»: Panel, Reportes, Mapa de atenciones, Exportaciones y
 * Asistencia IA. Solo «Reportes» y «Asistencia IA» tienen enlace (los demás son otros requisitos).
 *
 * Sin iconos: la librería de iconos de menú está pendiente de decisión y el menú expandido lleva siempre
 * etiqueta.
 */
import { NavLink, useLocation } from 'react-router'
import { obtenerSesion, type Rol } from '../../config/sesion'
import { PREFIJO_MODULO, RUTAS, RUTAS_TERCERIZADOS, esRutaTercerizados } from '../../router/rutasApp'
import estilos from './MenuLateral.module.css'

/** Rol de la vista de Administrador (todavía no existe en el catálogo de roles del MOD-01). */
const ROL_ADMINISTRADOR = 'Administrador'

/** Entradas de primer nivel que pertenecen a otros módulos (sin enlace). */
const OTROS_MODULOS_ANTES = ['Inicio', 'Planificación', 'Áreas verdes y mapa', 'Operación de campo']

/** Entradas de primer nivel de otros módulos entre «Servicios tercerizados» y «Reportes e indicadores». */
const OTROS_MODULOS_ENTRE = ['Incidencias']

interface EntradaSegundoNivel {
  texto: string
  ruta?: string
}

/** Segundo nivel de «Servicios tercerizados» (MOD-05). */
const SEGUNDO_NIVEL_TERCERIZADOS: EntradaSegundoNivel[] = [
  { texto: 'Atenciones', ruta: RUTAS_TERCERIZADOS.atenciones }, // RF-SER-003 a 006 y 011
  { texto: 'Proveedores y contratos' }, // TODO: mantenimiento (CU-MOD05-001 y 002)
  { texto: 'Control fitosanitario' }, // otro requisito
]

const SEGUNDO_NIVEL: EntradaSegundoNivel[] = [
  { texto: 'Panel' }, // RF-REP-001, otro requisito
  { texto: 'Reportes', ruta: RUTAS.reportes },
  { texto: 'Mapa de atenciones' }, // RF-REP-007, otro requisito
  { texto: 'Exportaciones' }, // RF-REP-009, otro requisito
  { texto: 'Asistencia IA', ruta: RUTAS.asistenciaIa },
]

function claseItem({ isActive }: { isActive: boolean }) {
  return `${estilos.item} ${isActive ? estilos.activo : ''}`
}

function SinEnlace({ texto }: { texto: string }) {
  return (
    <li>
      <span className={`${estilos.item} ${estilos.sinEnlace}`} aria-disabled="true">
        {texto}
      </span>
    </li>
  )
}

function ListaSegundoNivel({ entradas }: { entradas: EntradaSegundoNivel[] }) {
  return (
    <ul className={`${estilos.lista} ${estilos.segundoNivel}`}>
      {entradas.map((entrada) =>
        entrada.ruta ? (
          <li key={entrada.texto}>
            <NavLink to={entrada.ruta} className={claseItem}>
              {entrada.texto}
            </NavLink>
          </li>
        ) : (
          // Pertenece a otro requisito o queda fuera de esta entrega.
          <SinEnlace key={entrada.texto} texto={entrada.texto} />
        ),
      )}
    </ul>
  )
}

export default function MenuLateral() {
  const { pathname } = useLocation()
  const rol = obtenerSesion().rol as Rol | typeof ROL_ADMINISTRADOR
  const enModulo = pathname.startsWith(PREFIJO_MODULO)
  const enTercerizados = esRutaTercerizados(pathname)

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
          {/* Pertenecen a otros módulos. */}
          {OTROS_MODULOS_ANTES.map((texto) => (
            <SinEnlace key={texto} texto={texto} />
          ))}

          <li>
            <NavLink
              to={RUTAS_TERCERIZADOS.atenciones}
              className={() => `${estilos.item} ${enTercerizados ? estilos.activo : ''}`}
              aria-current={enTercerizados ? 'true' : undefined}
              end={false}
            >
              Servicios tercerizados
            </NavLink>
            <ListaSegundoNivel entradas={SEGUNDO_NIVEL_TERCERIZADOS} />
          </li>

          {OTROS_MODULOS_ENTRE.map((texto) => (
            <SinEnlace key={texto} texto={texto} />
          ))}

          <li>
            <NavLink
              to={RUTAS.reportes}
              className={() => `${estilos.item} ${enModulo ? estilos.activo : ''}`}
              aria-current={enModulo ? 'true' : undefined}
              end={false}
            >
              Reportes e indicadores
            </NavLink>
            <ListaSegundoNivel entradas={SEGUNDO_NIVEL} />
          </li>

          {/* Pertenece a otros módulos; solo en la vista de Administrador. */}
          {rol === ROL_ADMINISTRADOR && (
            <li>
              <span className={`${estilos.item} ${estilos.sinEnlace}`} aria-disabled="true">
                Configuración
              </span>
            </li>
          )}
        </ul>
      </nav>

      <p className={estilos.pie}>Campus PUCP · 15,6 ha</p>
    </aside>
  )
}
