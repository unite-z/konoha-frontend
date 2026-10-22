/**
 * HU-MOD03-001: frecuencia por estación de los servicios periódicos (duración y edición en cambios siguientes).
 */
import { useState } from 'react'
import AvisoTemporal from '../../components/ui/AvisoTemporal'
import Badge from '../../components/ui/Badge'
import Boton from '../../components/ui/Boton'
import EstadoCarga from '../../components/ui/EstadoCarga'
import EstadoError from '../../components/ui/EstadoError'
import EstadoVacio from '../../components/ui/EstadoVacio'
import TablaDatos, { type ColumnaTabla } from '../../components/ui/TablaDatos'
import { puedeEditarPlanificacion } from '../../config/permisosPlanificacion'
import { useConsulta } from '../../hooks/useConsulta'
import { usePaginaActual } from '../../hooks/usePaginaActual'
import { MIGAS_PLANIFICACION } from '../../router/rutasApp'
import { useSesionTercerizados } from '../../sesion/ContextoSesionTercerizados'
import { listarServiciosPeriodicos } from '../../services/api/planificacion'
import type { FrecuenciaEstacion, ServicioPeriodico } from '../../types/planificacion'
import { formatearFechaHora } from '../../utils/formato'
import { ordenarPorEstacion, textoDias } from '../../utils/planificacion'
import DialogoFrecuencia from './DialogoFrecuencia'
import estilos from './Planificacion.module.css'

function columnas(servicio: ServicioPeriodico, editar?: (f: FrecuenciaEstacion) => void): ColumnaTabla<FrecuenciaEstacion>[] {
  const base: ColumnaTabla<FrecuenciaEstacion>[] = [
  { clave: 'estacion', titulo: 'Estación' },
  { clave: 'teorica', titulo: 'Teórica', alineacion: 'derecha', render: (f) => textoDias(f.frecuencia_teorica_dias) },
  { clave: 'practica', titulo: 'Práctica', alineacion: 'derecha', render: (f) => textoDias(f.frecuencia_practica_dias) },
  { clave: 'maxima', titulo: 'Máxima', alineacion: 'derecha', render: (f) => textoDias(f.frecuencia_maxima_dias) },
  {
    clave: 'modificado',
    titulo: 'Última modificación',
    render: (f) => `${f.modificado_por}, ${formatearFechaHora(f.fecha_modificacion)}`,
  },
  ]
  if (!editar) return base
  const accion: ColumnaTabla<FrecuenciaEstacion> = {
    clave: 'acciones',
    titulo: 'Acciones',
    render: (f) => (
      <Boton variante="terciario" compacto onClick={() => editar(f)}>
        <span aria-hidden="true">Editar</span>
        <span className="sr-only">{`Editar la frecuencia de ${servicio.nombre} en ${f.estacion}`}</span>
      </Boton>
    ),
  }
  return [...base, accion]
}

function TarjetaServicio({ servicio, editar }: { servicio: ServicioPeriodico; editar?: (f: FrecuenciaEstacion) => void }) {
  return (
    <section className={estilos.superficie} aria-labelledby={`servicio-${servicio.id}`}>
      <div className={estilos.cabeceraSeccion}>
        <h2 id={`servicio-${servicio.id}`} className={estilos.tituloSeccion}>
          {servicio.nombre}
        </h2>
        {servicio.es_ruidoso && <Badge tono="advertencia" texto="Servicio ruidoso" />}
      </div>
      <TablaDatos
        titulo={`Frecuencia por estación de ${servicio.nombre}`}
        columnas={columnas(servicio, editar)}
        filas={ordenarPorEstacion(servicio.frecuencias)}
        claveFila={(f) => f.estacion}
        compacta
      />
    </section>
  )
}

export default function ServiciosPeriodicosPage() {
  usePaginaActual('Servicios periódicos', [MIGAS_PLANIFICACION.planificacion])
  const { estado } = useSesionTercerizados()
  const puedeEditar = estado.tipo === 'activa' && puedeEditarPlanificacion(estado.usuario.rol)
  const [editando, setEditando] = useState<{ servicio: ServicioPeriodico; frecuencia: FrecuenciaEstacion } | null>(null)
  const [cambios, setCambios] = useState<Record<number, ServicioPeriodico>>({})
  const [aviso, setAviso] = useState<string | null>(null)
  const consulta = useConsulta('servicios', listarServiciosPeriodicos, (servicios) => servicios.length === 0)

  if (consulta.estado === 'error' && !consulta.datos) {
    return (
      <EstadoError
        titulo="No pudimos cargar los servicios periódicos"
        descripcion={consulta.error?.detalle ?? ''}
        onReintentar={consulta.reintentar}
      />
    )
  }
  if (consulta.estado === 'vacio') {
    return <EstadoVacio titulo="No hay servicios periódicos" descripcion="Aparecerán aquí cuando se den de alta en el catálogo." />
  }
  if (!consulta.datos) return consulta.cargaVisible ? <EstadoCarga forma="tabla" /> : null

  return (
    <div className={estilos.pagina}>
      {consulta.datos.map((original) => {
        const servicio = cambios[original.id] ?? original
        return (
          <TarjetaServicio
            key={servicio.id}
            servicio={servicio}
            editar={puedeEditar ? (frecuencia) => setEditando({ servicio, frecuencia }) : undefined}
          />
        )
      })}
      {editando && (
        <DialogoFrecuencia
          {...editando}
          onCerrar={() => setEditando(null)}
          onGuardado={(actualizado) => {
            setCambios((previos) => ({ ...previos, [actualizado.id]: actualizado }))
            setAviso(`Frecuencia de ${editando.servicio.nombre} en ${editando.frecuencia.estacion} guardada.`)
            setEditando(null)
          }}
        />
      )}
      <AvisoTemporal mensaje={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}
