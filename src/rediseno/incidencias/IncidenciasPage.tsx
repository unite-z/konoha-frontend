/**
 * Incidencias (RD-42): bandeja, plazos y mapa 3D con un marcador por incidencia. Es una vista de mapa: el escenario del
 * layout se ve detrás y el contenido es vidrio a la izquierda. La selección vive en la URL (`?incidencia=`): elegir un
 * marcador marca la fila y al revés, la cámara vuela al área y «Atrás» deshace el vuelo. El detalle lo construye RD-43.
 * Sin `area_verde_id` en las incidencias (RD-84) o sin polígono del área, la vista funciona sin marcadores.
 */
import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import AvisoTemporal from '@/design-system/AvisoTemporal'
import { PERMISOS } from '@/config/permisosCore'
import { tiene } from '@/config/permisosSesion'
import { useConsulta } from '@/hooks/useConsulta'
import { alertasPlazo, incidenciasDePestana } from '@/pages/incidencias/bandeja'
import { listarIncidencias } from '@/services/api/incidencias'
import { listarPoligonosMapa } from '@/services/api/mapaAsignaciones'
import { usePermisos } from '@/sesion/ContextoSesion'
import type { AreaCampus } from '@/types/campus3d'
import { ATRIBUTO_MAPA_LIBRE, useVistaDeMapa } from '../base/Escenario'
import CapaColores from '../base/MapaCampus/CapaColores'
import CapaMarcadores from '../base/MapaCampus/CapaMarcadores'
import { estiloTransicion, nombresTransicion, transicionar, useFocoConLaVista } from '../base/movimiento'
import { useParametroPanel } from '../base/PanelLateral/useParametroPanel'
import Bandeja from './Bandeja'
import { PARAM_INCIDENCIA } from './enlaces'
import { conCambios, filtrosDeUrl, incidenciaDeMarcador, marcadoresDeIncidencias } from './filtros'
import estilos from './Incidencias.module.css'
import Plazos from './Plazos'

const CLASES_SELECCION = { seleccion: '--color-info' } as const

function VistaIncidencias({ veTodas, gestiona }: { veTodas: boolean; gestiona: boolean }) {
  const [parametros, setParametros] = useSearchParams()
  const encabezado = useFocoConLaVista<HTMLHeadingElement>()
  const filtros = filtrosDeUrl(parametros)
  const panel = useParametroPanel(PARAM_INCIDENCIA)
  const seleccionada = panel.valor !== null && /^\d{1,9}$/.test(panel.valor) ? Number(panel.valor) : null
  const [ahora] = useState(() => Date.now())
  const [aviso, setAviso] = useState<string | null>(null)
  const cerrarAviso = useCallback(() => setAviso(null), [])

  const consulta = useConsulta(`rd-incidencias|${filtros.q}`, (signal) => listarIncidencias(signal, filtros.q))
  // Sin permiso de inventario (o sin RD-84) no hay polígonos: la vista sigue sin marcadores.
  const poligonos = useConsulta('rd-incidencias-poligonos', listarPoligonosMapa)

  const incidencias = useMemo(() => consulta.datos ?? [], [consulta.datos])
  const areaMapa = useMemo(() => {
    const mapa = new Map<number, string>()
    for (const p of poligonos.datos ?? [])
      if (p.area_verde_id !== null && !mapa.has(p.area_verde_id)) mapa.set(p.area_verde_id, p.id_fuente)
    return mapa
  }, [poligonos.datos])
  const { grupo } = filtros
  const delGrupo = useMemo(() => incidenciasDePestana(incidencias, grupo), [incidencias, grupo])
  const marcadores = useMemo(() => marcadoresDeIncidencias(delGrupo, areaMapa, ahora), [delGrupo, areaMapa, ahora])
  const alertas = useMemo(() => alertasPlazo(incidencias, ahora), [incidencias, ahora])

  const areaElegida = useMemo(() => {
    const incidencia = incidencias.find((i) => i.id === seleccionada)
    return incidencia?.area_verde_id == null ? undefined : areaMapa.get(incidencia.area_verde_id)
  }, [incidencias, seleccionada, areaMapa])
  const clases = useMemo(() => (areaElegida ? { [areaElegida]: 'seleccion' } : {}), [areaElegida])

  /** Elegir (fila, marcador o aviso de plazo) sustituye la selección con la transición de la fila. */
  const seleccionar = useCallback((id: number) => transicionar(() => panel.abrir(String(id))), [panel])

  // Clic en un área del mapa: selecciona la primera incidencia de esa área que está en la bandeja.
  const alSeleccionarArea = useCallback(
    (area: AreaCampus | null) => {
      if (!area) return
      const delArea = delGrupo.find((i) => i.area_verde_id != null && areaMapa.get(i.area_verde_id) === area.id)
      if (delArea) seleccionar(delArea.id)
    },
    [delGrupo, areaMapa, seleccionar],
  )
  useVistaDeMapa({ areaSeleccionada: areaElegida, onSeleccionarArea: alSeleccionarArea })

  function cambiarFiltros(cambios: Record<string, string | null>) {
    setParametros(conCambios(parametros, cambios), { replace: true })
  }

  return (
    <div className={estilos.pagina} {...{ [ATRIBUTO_MAPA_LIBRE]: '' }}>
      <div className={estilos.columna}>
        <header
          className={estilos.encabezado}
          style={estiloTransicion(nombresTransicion.encabezado)} /* estilo-calculado */
        >
          <h1 ref={encabezado} tabIndex={-1} className={estilos.titulo}>
            {veTodas ? 'Incidencias' : 'Incidencias de mi cuadrilla'}
          </h1>
          <p className={estilos.subtitulo}>Bandeja con sus plazos y su ubicación en el campus.</p>
        </header>
        {gestiona && (
          <Plazos
            alertas={alertas}
            seleccionada={seleccionada}
            onSeleccionar={seleccionar}
            onAviso={setAviso}
            onCambio={consulta.reintentar}
          />
        )}
        <Bandeja
          consulta={consulta}
          filtros={filtros}
          ahora={ahora}
          veTodas={veTodas}
          seleccionada={seleccionada}
          onSeleccionar={seleccionar}
          onFiltros={cambiarFiltros}
        />
      </div>
      <CapaColores clases={clases} colores={CLASES_SELECCION} />
      <CapaMarcadores
        marcadores={marcadores}
        onActivar={(marcador) => {
          const id = incidenciaDeMarcador(marcador)
          if (id !== null) seleccionar(id)
        }}
      />
      <AvisoTemporal mensaje={aviso} onCerrar={cerrarAviso} />
    </div>
  )
}

export default function IncidenciasPage() {
  const permisos = usePermisos()
  if (!tiene(permisos, PERMISOS.consultarPlanificacion)) {
    return (
      <div className={estilos.paginaLisa}>
        <EstadoSinAcceso
          titulo="No puedes ver las incidencias"
          descripcion="Tu cuenta no tiene permiso para consultar la bandeja de incidencias."
        />
      </div>
    )
  }
  return (
    <VistaIncidencias
      veTodas={tiene(permisos, PERMISOS.consultarTodasIncidencias)}
      gestiona={tiene(permisos, PERMISOS.clasificarIncidencia)}
    />
  )
}
