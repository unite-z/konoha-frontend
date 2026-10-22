/**
 * HU-MOD03-001 y 002: frecuencia por estación (las cuatro, configuradas o no) y duración de los servicios periódicos.
 */
import { useState } from 'react'
import AvisoTemporal from '../../components/ui/AvisoTemporal'
import Badge from '../../components/ui/Badge'
import Boton from '../../components/ui/Boton'
import EstadoCarga from '../../components/ui/EstadoCarga'
import EstadoError from '../../components/ui/EstadoError'
import EstadoVacio from '../../components/ui/EstadoVacio'
import ListaDescripcion from '../../components/ui/ListaDescripcion'
import TablaDatos, { type ColumnaTabla } from '../../components/ui/TablaDatos'
import { puedeEditarPlanificacion } from '../../config/permisosPlanificacion'
import { useConsulta } from '../../hooks/useConsulta'
import { usePaginaActual } from '../../hooks/usePaginaActual'
import { MIGAS_PLANIFICACION } from '../../router/rutasApp'
import { useSesionTercerizados } from '../../sesion/ContextoSesionTercerizados'
import { listarServiciosPeriodicos } from '../../services/api/planificacion'
import type { ServicioPeriodico } from '../../types/planificacion'
import { formatearFechaHora } from '../../utils/formato'
import { filasPorEstacion, textoDias, textoHorario, type FilaFrecuencia } from '../../utils/planificacion'
import DialogoDuracion from './DialogoDuracion'
import DialogoFrecuencia from './DialogoFrecuencia'
import estilos from './Planificacion.module.css'

function columnas(servicio: ServicioPeriodico, editar?: (f: FilaFrecuencia) => void): ColumnaTabla<FilaFrecuencia>[] {
  const base: ColumnaTabla<FilaFrecuencia>[] = [
  { clave: 'estacion', titulo: 'Estación' },
  { clave: 'teorica', titulo: 'Teórica', alineacion: 'derecha', render: (f) => textoDias(f.frecuencia?.frecuencia_teorica_dias) },
  { clave: 'practica', titulo: 'Práctica', alineacion: 'derecha', render: (f) => textoDias(f.frecuencia?.frecuencia_practica_dias) },
  { clave: 'maxima', titulo: 'Máxima', alineacion: 'derecha', render: (f) => textoDias(f.frecuencia?.frecuencia_maxima_dias) },
  {
    clave: 'modificado',
    titulo: 'Última modificación',
    render: (f) => (f.frecuencia ? `${f.frecuencia.modificado_por}, ${formatearFechaHora(f.frecuencia.fecha_modificacion)}` : 'Sin configurar'),
  },
  ]
  if (!editar) return base
  const accion: ColumnaTabla<FilaFrecuencia> = {
    clave: 'acciones',
    titulo: 'Acciones',
    render: (f) => (
      <Boton variante="terciario" compacto onClick={() => editar(f)}>
        <span aria-hidden="true">{f.frecuencia ? 'Editar' : 'Configurar'}</span>
        <span className="sr-only">{`${f.frecuencia ? 'Editar' : 'Configurar'} la frecuencia de ${servicio.nombre} en ${f.estacion}`}</span>
      </Boton>
    ),
  }
  return [...base, accion]
}

interface PropsTarjeta {
  servicio: ServicioPeriodico
  editar?: (f: FilaFrecuencia) => void
  editarDuracion?: () => void
}

function TarjetaServicio({ servicio, editar, editarDuracion }: PropsTarjeta) {
  const { duracion } = servicio
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
        filas={filasPorEstacion(servicio.frecuencias)}
        claveFila={(f) => f.estacion}
        compacta
      />
      <div className={estilos.cabeceraSeccion}>
        <h3 className={estilos.subtitulo}>Duración</h3>
        {editarDuracion && (
          <Boton variante="terciario" compacto onClick={editarDuracion}>
            <span aria-hidden="true">Editar</span>
            <span className="sr-only">{`Editar la duración de ${servicio.nombre}`}</span>
          </Boton>
        )}
      </div>
      {duracion ? (
        <ListaDescripcion
          elementos={[
            { etiqueta: 'Duración máxima', valor: textoDias(duracion.duracion_maxima_dias) },
            { etiqueta: 'Días de limpieza', valor: textoDias(duracion.dias_limpieza) },
            { etiqueta: 'Horario', valor: textoHorario(duracion.hora_inicio, duracion.hora_fin) },
            {
              etiqueta: 'Última modificación',
              valor: `${duracion.modificado_por}, ${formatearFechaHora(duracion.fecha_modificacion)}`,
            },
          ]}
        />
      ) : (
        <p>Sin duración definida.</p>
      )}
    </section>
  )
}

export default function ServiciosPeriodicosPage() {
  usePaginaActual('Servicios periódicos', [MIGAS_PLANIFICACION.planificacion])
  const { estado } = useSesionTercerizados()
  const puedeEditar = estado.tipo === 'activa' && puedeEditarPlanificacion(estado.usuario.rol)
  const [editando, setEditando] = useState<{ servicio: ServicioPeriodico; fila: FilaFrecuencia } | null>(null)
  const [editandoDuracion, setEditandoDuracion] = useState<ServicioPeriodico | null>(null)
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
            editar={puedeEditar ? (fila) => setEditando({ servicio, fila }) : undefined}
            editarDuracion={puedeEditar ? () => setEditandoDuracion(servicio) : undefined}
          />
        )
      })}
      {editando && (
        <DialogoFrecuencia
          servicio={editando.servicio}
          estacion={editando.fila.estacion}
          frecuencia={editando.fila.frecuencia}
          onCerrar={() => setEditando(null)}
          onGuardado={(actualizado) => {
            setCambios((previos) => ({ ...previos, [actualizado.id]: actualizado }))
            setAviso(`Frecuencia de ${editando.servicio.nombre} en ${editando.fila.estacion} guardada.`)
            setEditando(null)
          }}
        />
      )}
      {editandoDuracion && (
        <DialogoDuracion
          servicio={editandoDuracion}
          onCerrar={() => setEditandoDuracion(null)}
          onGuardado={(actualizado) => {
            setCambios((previos) => ({ ...previos, [actualizado.id]: actualizado }))
            setAviso(`Duración de ${actualizado.nombre} guardada.`)
            setEditandoDuracion(null)
          }}
        />
      )}
      <AvisoTemporal mensaje={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}
