/**
 * Menú lateral (Arquitectura de la Información 1.3 y 1.4.1; Guía Web 3.2 y 4.2).
 *
 * Primer nivel con las 8 etiquetas de negocio. «Reportes e indicadores» (MOD-06), «Servicios tercerizados»
 * (MOD-05) y «Planificación» (MOD-03) tienen enlaces; el resto aún no está disponible y se muestra sin enlace (`aria-disabled`), atenuado
 * y con «Próximamente» bajo el nombre. «Configuración» solo es visible en la vista de Administrador.
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
import { PREFIJO_MODULO, RUTAS, RUTAS_INVENTARIO, RUTAS_PLANIFICACION, RUTAS_TERCERIZADOS, esRutaInventario, esRutaPlanificacion, esRutaTercerizados } from '../../router/rutasApp'
import estilos from './MenuLateral.module.css'

/** Rol de la vista de Administrador (todavía no existe en el catálogo de roles del MOD-01). */
const ROL_ADMINISTRADOR = 'Administrador'

/** Entradas de primer nivel que pertenecen a otros módulos (sin enlace). */
const OTROS_MODULOS_ANTES = ['Inicio']

/** Entradas de otros módulos entre «Planificación» y «Servicios tercerizados». */
const OTROS_MODULOS_TRAS_INVENTARIO = ['Operación de campo']

/** Entradas de primer nivel de otros módulos entre «Servicios tercerizados» y «Reportes e indicadores». */
const OTROS_MODULOS_ENTRE = ['Incidencias']

interface EntradaSegundoNivel {
  texto: string
  ruta?: string
}

/** Segundo nivel de «Servicios tercerizados» (MOD-05). */
const SEGUNDO_NIVEL_TERCERIZADOS: EntradaSegundoNivel[] = [
  { texto: 'Atenciones', ruta: RUTAS_TERCERIZADOS.atenciones }, // RF-SER-003 a 006 y 011
  { texto: 'Proveedores y contratos', ruta: RUTAS_TERCERIZADOS.proveedoresContratos }, // RF-SER-001 y RF-SER-002
  { texto: 'Control fitosanitario', ruta: RUTAS_TERCERIZADOS.controlFitosanitario }, // RF-INV-011
]

/** Segundo nivel de «Planificación» (MOD-03). */
const SEGUNDO_NIVEL_PLANIFICACION: EntradaSegundoNivel[] = [
  { texto: 'Servicios periódicos', ruta: RUTAS_PLANIFICACION.servicios },
  { texto: 'Calendario de restricciones', ruta: RUTAS_PLANIFICACION.restricciones },
  { texto: 'Programación' }, // otro requisito
  { texto: 'Calendario de actividades' }, // otro requisito
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

/** Entrada que aún no está disponible: sin enlace y con «Próximamente» bajo el nombre. */
function SinEnlace({ texto }: { texto: string }) {
  return (
    <li>
      <span className={`${estilos.item} ${estilos.sinEnlace}`} aria-disabled="true" title="Disponible próximamente">
        <span>{texto}</span>
        <span className={estilos.proximamente}>Próximamente</span>
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
  const enPlanificacion = esRutaPlanificacion(pathname)
  const enInventario = esRutaInventario(pathname)

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
              to={RUTAS_PLANIFICACION.servicios}
              className={() => `${estilos.item} ${enPlanificacion ? estilos.activo : ''}`}
              aria-current={enPlanificacion ? 'true' : undefined}
              end={false}
            >
              Planificación
            </NavLink>
            <ListaSegundoNivel entradas={SEGUNDO_NIVEL_PLANIFICACION} />
          </li>

          <li>
            <NavLink
              to={RUTAS_INVENTARIO.areasVerdes}
              className={() => `${estilos.item} ${enInventario ? estilos.activo : ''}`}
              aria-current={enInventario ? 'true' : undefined}
              end={false}
            >
              Áreas verdes y mapa
            </NavLink>
            <ListaSegundoNivel entradas={[{ texto: 'Inventario de áreas', ruta: RUTAS_INVENTARIO.areasVerdes }, { texto: 'Mapa del campus', ruta: RUTAS_INVENTARIO.mapa }, { texto: 'Catálogos y sectores', ruta: RUTAS_INVENTARIO.catalogos }]} />
          </li>

          {OTROS_MODULOS_TRAS_INVENTARIO.map((texto) => (
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
          {rol === ROL_ADMINISTRADOR && <SinEnlace texto="Configuración" />}
        </ul>
      </nav>

      <p className={estilos.pie}>Campus PUCP · 15,6 ha</p>
    </aside>
  )
}
