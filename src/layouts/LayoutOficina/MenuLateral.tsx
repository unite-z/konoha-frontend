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
 *
 * RF-T-004 («Menú por rol»): cada entrada con enlace aparece solo si el rol tiene el permiso. El capataz no
 * ve usuarios, contratos ni conformidades. Es usabilidad: el servidor vuelve a comprobarlo.
 */
import { NavLink, useLocation } from 'react-router'
import { PERMISOS, entradasMenu, puede } from '../../config/permisosCore'
import { useSesionActiva } from '../../sesion/ContextoSesion'
import { RUTAS_CAMPO, esRutaCampo } from '../../router/rutasCampo'
import {
  PREFIJO_MODULO,
  PREFIJO_USUARIOS,
  RUTAS,
  RUTAS_CORE,
  RUTAS_PLANIFICACION,
  RUTAS_TERCERIZADOS,
  esRutaPlanificacion,
  esRutaTercerizados,
} from '../../router/rutasApp'
import estilos from './MenuLateral.module.css'

/** Entradas de primer nivel que pertenecen a otros módulos (sin enlace). */
const OTROS_MODULOS_ANTES = ['Inicio']

/** Entradas de otros módulos entre «Planificación» y «Servicios tercerizados». */
const OTROS_MODULOS_TRAS_PLANIFICACION = ['Áreas verdes y mapa']

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

/** Segundo nivel de «Usuarios y roles» (MOD-01). */
const SEGUNDO_NIVEL_USUARIOS: EntradaSegundoNivel[] = [
  { texto: 'Usuarios', ruta: RUTAS_CORE.usuarios }, // RF-T-002 y RF-T-003
  { texto: 'Registro de accesos', ruta: RUTAS_CORE.accesos }, // CU-MOD01-007
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
  const sesion = useSesionActiva()
  const entradas = entradasMenu(sesion)
  const enUsuarios = pathname.startsWith(PREFIJO_USUARIOS)
  const enModulo = pathname.startsWith(PREFIJO_MODULO)
  const enTercerizados = esRutaTercerizados(pathname)
  const enPlanificacion = esRutaPlanificacion(pathname)

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

          {entradas.has('planificacion') && (
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
          )}

          {OTROS_MODULOS_TRAS_PLANIFICACION.map((texto) => (
            <SinEnlace key={texto} texto={texto} />
          ))}

          {entradas.has('campo') && (
            <li>
              <NavLink
                to={RUTAS_CAMPO.cuadrillas}
                className={() => `${estilos.item} ${esRutaCampo(pathname) ? estilos.activo : ''}`}
                aria-current={esRutaCampo(pathname) ? 'true' : undefined}
                end={false}
              >
                Operación de campo
              </NavLink>
              <ListaSegundoNivel entradas={[
                { texto: 'Cuadrillas', ruta: RUTAS_CAMPO.cuadrillas },
                { texto: 'Encargos', ruta: RUTAS_CAMPO.encargos },
              ]} />
            </li>
          )}

          {entradas.has('tercerizados') && (
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
          )}

          {OTROS_MODULOS_ENTRE.map((texto) => (
            <SinEnlace key={texto} texto={texto} />
          ))}

          {entradas.has('reportes') && (
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
          )}

          {entradas.has('repositorio') && (
            <li>
              <NavLink to={RUTAS_CORE.repositorio} className={claseItem}>
                Repositorio
              </NavLink>
            </li>
          )}

          {entradas.has('usuarios') && (
            <li>
              <NavLink
                to={RUTAS_CORE.usuarios}
                className={() => `${estilos.item} ${enUsuarios ? estilos.activo : ''}`}
                aria-current={enUsuarios ? 'true' : undefined}
                end={false}
              >
                Usuarios y roles
              </NavLink>
              <ListaSegundoNivel entradas={SEGUNDO_NIVEL_USUARIOS} />
            </li>
          )}

          {/* Catálogos y parámetros: otro requisito; solo para quien los gestiona. */}
          {puede(sesion, PERMISOS.gestionarCatalogos) && <SinEnlace texto="Configuración" />}
        </ul>
      </nav>

      <p className={estilos.pie}>Campus PUCP · 15,6 ha</p>
    </aside>
  )
}
