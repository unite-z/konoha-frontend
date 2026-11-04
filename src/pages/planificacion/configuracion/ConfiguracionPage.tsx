// HU-MOD03-001 y 002, RF-PLA-001 y 002 · Configuración (AV-268, Figma «Configuración» 348-1743)
/**
 * Servicios periódicos con la frecuencia de la estación en curso, la duración y el estado (configurado o incompleto).
 * El jefe edita cada servicio en el panel lateral `PanelEditarServicio`. La pestaña «Series de restricciones»
 * (`SeriesRestricciones`) lista las series con fechas de hoy en adelante y deja darlas de baja.
 */
import { useCallback, useState } from 'react'
import AvisoTemporal from '@/components/ui/AvisoTemporal'
import Boton from '@/components/ui/Boton'
import { CeldaDobleLinea, CeldaTexto } from '@/components/ui/CeldasTabla'
import Estado from '@/components/ui/Estado'
import EstadoError from '@/components/ui/EstadoError'
import Pestanas from '@/components/ui/Pestanas'
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
import { puedeEditarPlanificacion } from '@/config/permisosPlanificacion'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_PLANIFICACION } from '@/router/rutasApp'
import { listarRestricciones, listarServiciosPeriodicos } from '@/services/api/planificacion'
import { useRolTercerizados } from '@/sesion/ContextoSesion'
import type { ServicioPeriodico } from '@/types/planificacion'
import { hoyLima } from '@/utils/instanteLima'
import PanelEditarServicio from './PanelEditarServicio'
import SeriesRestricciones from './SeriesRestricciones'
import { SIN_CONFIGURAR, estacionDe, estadoServicio, textoDuracionServicio, textoFrecuencia } from './configuracionServicios'
import { agruparSeries, rangoSeries } from './series'

type PestanaConfiguracion = 'servicios' | 'series'

export default function ConfiguracionPage() {
  usePaginaActual('Configuración', [MIGAS_PLANIFICACION.planificacion, { texto: 'Configuración' }])
  const puedeEditar = puedeEditarPlanificacion(useRolTercerizados())
  const hoy = hoyLima()
  const estacion = estacionDe(hoy)
  const consulta = useConsulta('servicios', listarServiciosPeriodicos)
  const { desde, hasta } = rangoSeries(hoy)
  const restricciones = useConsulta(`series:${desde}`, (signal) => listarRestricciones(desde, hasta, signal))
  const [pestana, setPestana] = useState<PestanaConfiguracion>('servicios')
  const [bajas, setBajas] = useState<string[]>([])
  const [cambios, setCambios] = useState<Record<number, ServicioPeriodico>>({})
  const [editando, setEditando] = useState<ServicioPeriodico | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const cerrarAviso = useCallback(() => setAviso(null), [setAviso])
  const actualizar = useCallback((s: ServicioPeriodico) => setCambios((previos) => ({ ...previos, [s.id]: s })), [setCambios])

  const columnas: ColumnaTabla<ServicioPeriodico>[] = [
    {
      clave: 'servicio',
      titulo: 'Servicio',
      multilinea: true,
      render: (s) => (s.es_ruidoso ? <CeldaDobleLinea principal={s.nombre} detalle="Ruidoso" /> : <CeldaTexto texto={s.nombre} />),
    },
    {
      clave: 'frecuencia',
      titulo: `Frecuencia (${estacion.toLowerCase()})`,
      render: (s) => {
        const texto = textoFrecuencia(s.frecuencias.find((f) => f.estacion === estacion))
        return <CeldaTexto texto={texto} tono={texto === SIN_CONFIGURAR ? 'secundario' : 'principal'} />
      },
    },
    {
      clave: 'duracion',
      titulo: 'Duración máxima',
      render: (s) => {
        const texto = textoDuracionServicio(s.duracion)
        return <CeldaTexto texto={texto} tono={texto === SIN_CONFIGURAR ? 'secundario' : 'principal'} />
      },
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      render: (s) => {
        const estado = estadoServicio(s)
        return <Estado tono={estado.tono} texto={estado.texto} punto />
      },
    },
  ]
  if (puedeEditar) {
    columnas.push({
      clave: 'acciones',
      titulo: 'Acciones',
      render: (s) => {
        const completo = estadoServicio(s).texto === 'Configurado'
        return (
          <Boton variante={completo ? 'fantasma' : 'secundario'} compacto onClick={() => setEditando(s)}>
            <span aria-hidden="true">{completo ? 'Editar' : 'Configurar'}</span>
            <span className="sr-only">{`${completo ? 'Editar' : 'Configurar'} ${s.nombre}`}</span>
          </Boton>
        )
      },
    })
  }

  if (consulta.estado === 'error' && !consulta.datos) {
    return <EstadoError titulo="No pudimos cargar los servicios periódicos" descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} />
  }

  const servicios = (consulta.datos ?? []).map((s) => cambios[s.id] ?? s)
  const series = agruparSeries(restricciones.datos ?? [], hoy).filter((s) => !bajas.includes(s.serie))
  return (
    <>
      <Pestanas
        etiqueta="Configuración"
        pestanas={[
          { valor: 'servicios', texto: 'Servicios periódicos', contador: consulta.datos ? servicios.length : undefined },
          { valor: 'series', texto: 'Series de restricciones', contador: restricciones.datos ? series.length : undefined },
        ]}
        valor={pestana}
        onCambiar={(valor) => setPestana(valor as PestanaConfiguracion)}
      >
        {pestana === 'servicios' ? (
          <TablaDatos
            titulo="Servicios periódicos"
            columnas={columnas}
            filas={servicios}
            claveFila={(s) => String(s.id)}
            estado={consulta.datos ? 'exito' : 'cargando'}
            vacio={{ titulo: 'No hay servicios periódicos', descripcion: 'Aparecerán aquí cuando se den de alta en el catálogo.' }}
          />
        ) : restricciones.estado === 'error' && !restricciones.datos ? (
          <EstadoError titulo="No pudimos cargar las series" descripcion={restricciones.error?.detalle ?? ''} onReintentar={restricciones.reintentar} />
        ) : (
          <SeriesRestricciones
            series={series}
            cargando={!restricciones.datos}
            puedeEditar={puedeEditar}
            onBaja={(serie) => {
              setBajas((previas) => [...previas, serie.serie])
              setAviso(`Serie ${serie.tipo} dada de baja.`)
            }}
          />
        )}
      </Pestanas>
      {editando && (
        <PanelEditarServicio
          servicio={editando}
          onCerrar={() => setEditando(null)}
          onActualizado={actualizar}
          onGuardado={(s) => {
            actualizar(s)
            setEditando(null)
            setAviso(`Configuración de ${s.nombre} guardada.`)
          }}
        />
      )}
      <AvisoTemporal mensaje={aviso} onCerrar={cerrarAviso} />
    </>
  )
}
