// RF-T-008 · Historial de altas y modificaciones (HU-MOD01-010)
import TablaDatos, { type ColumnaTabla } from '../ui/TablaDatos'
import { useConsulta } from '@/hooks/useConsulta'
import { historialRegistro } from '@/services/api/core'
import type { EntidadRegistro, EntradaHistorial } from '@/types/core'
import { resumenCambio, textoAccion } from '@/utils/etiquetasCore'
import { formatearFechaHora } from '@/utils/formato'
import estilos from './HistorialCambios.module.css'

const COLUMNAS_BASE: ColumnaTabla<EntradaHistorial>[] = [
  { clave: 'fecha', titulo: 'Fecha y hora', render: (e) => formatearFechaHora(e.fecha_hora) },
  { clave: 'accion', titulo: 'Cambio', render: (e) => textoAccion(e.accion) },
  {
    clave: 'detalle',
    titulo: 'Detalle',
    multilinea: true,
    render: (e) => resumenCambio(e.valores_anteriores, e.valores_nuevos) || '—',
  },
  { clave: 'usuario', titulo: 'Responsable', render: (e) => e.usuario },
]

interface CampoActividad {
  clave: string
  etiqueta: string
  formato?: 'fecha' | 'minutos' | 'superficie' | 'numero'
}

const CAMPOS_ACTIVIDAD: CampoActividad[] = [
  { clave: 'tipo_actividad_nombre', etiqueta: 'Actividad' },
  { clave: 'fecha_hora_actividad', etiqueta: 'Fecha y hora', formato: 'fecha' },
  { clave: 'area_verde_nombre', etiqueta: 'Ubicación' },
  { clave: 'tiempo_minutos', etiqueta: 'Tiempo empleado', formato: 'minutos' },
  { clave: 'superficie_m2', etiqueta: 'Superficie', formato: 'superficie' },
  { clave: 'cantidad_ejecutada', etiqueta: 'Cantidad ejecutada', formato: 'numero' },
  { clave: 'cantidad_solicitada', etiqueta: 'Cantidad solicitada', formato: 'numero' },
  { clave: 'unidad_medida_nombre', etiqueta: 'Unidad de medida' },
  { clave: 'observaciones', etiqueta: 'Observaciones' },
  { clave: 'verificacion_observaciones', etiqueta: 'Observaciones de verificación' },
  { clave: 'estado_actividad', etiqueta: 'Estado de la actividad' },
]

function tieneValor(valor: unknown): boolean {
  return valor !== null && valor !== undefined && valor !== ''
}

function formatearValor(valor: unknown, formato?: CampoActividad['formato']): string {
  if (!tieneValor(valor)) return ''
  if (formato === 'fecha' && typeof valor === 'string' && !Number.isNaN(Date.parse(valor))) {
    return formatearFechaHora(valor)
  }
  const numero = typeof valor === 'number' ? valor : Number(valor)
  if (formato && formato !== 'fecha' && Number.isFinite(numero)) {
    const texto = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 }).format(numero)
    if (formato === 'minutos') return `${texto} min`
    if (formato === 'superficie') return `${texto} m²`
    return texto
  }
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No'
  return String(valor)
}

function DetalleActividad({ entrada }: { entrada: EntradaHistorial }) {
  const alta = Object.keys(entrada.valores_anteriores).length === 0
  const elementos = CAMPOS_ACTIVIDAD.flatMap((campo) => {
    const antes = entrada.valores_anteriores[campo.clave]
    const despues = entrada.valores_nuevos[campo.clave]
    if (alta) {
      return tieneValor(despues) ? [{ etiqueta: campo.etiqueta, valor: formatearValor(despues, campo.formato) }] : []
    }
    if (JSON.stringify(antes) === JSON.stringify(despues)) return []
    if (!tieneValor(antes) && !tieneValor(despues)) return []
    return [
      {
        etiqueta: campo.etiqueta,
        valor: `${tieneValor(antes) ? formatearValor(antes, campo.formato) : 'Sin registrar'} → ${
          tieneValor(despues) ? formatearValor(despues, campo.formato) : 'Sin registrar'
        }`,
      },
    ]
  })
  if (entrada.accion === 'Anulacion' && tieneValor(entrada.motivo)) {
    elementos.push({ etiqueta: 'Motivo de anulación', valor: entrada.motivo ?? '' })
  }
  if (!elementos.length) return <span>Cambio registrado sin datos funcionales adicionales.</span>
  return (
    <dl className={estilos.detalle}>
      {elementos.map((elemento) => (
        <div key={elemento.etiqueta}>
          <dt>{elemento.etiqueta}</dt>
          <dd>{elemento.valor}</dd>
        </div>
      ))}
    </dl>
  )
}

interface HistorialCambiosProps {
  entidad: EntidadRegistro
  registroId: number
  presentacion?: 'general' | 'actividad'
}

export default function HistorialCambios({ entidad, registroId, presentacion = 'general' }: HistorialCambiosProps) {
  const consulta = useConsulta(
    `${entidad}-${registroId}`,
    (signal) => historialRegistro(entidad, registroId, signal),
    (datos) => datos.length === 0,
  )
  const sinPermiso = consulta.error?.estado === 403
  const columnas =
    presentacion === 'actividad'
      ? COLUMNAS_BASE.map((columna) =>
          columna.clave === 'detalle'
            ? { ...columna, render: (entrada: EntradaHistorial) => <DetalleActividad entrada={entrada} /> }
            : columna,
        )
      : COLUMNAS_BASE
  return (
    <div className={presentacion === 'actividad' ? estilos.actividad : undefined}>
      <TablaDatos
        titulo="Historial de cambios"
        tituloVisible
        columnas={columnas}
        filas={consulta.datos ?? []}
        claveFila={(e, i) => `${e.fecha_hora}-${i}`}
        estado={consulta.estado === 'inactivo' || consulta.estado === 'cargando' ? 'cargando' : consulta.estado}
        vacio={{ titulo: 'Sin cambios registrados', nivel: 3 }}
        error={{
          titulo: sinPermiso ? 'No tiene permiso para ver el historial' : 'No pudimos cargar el historial',
          descripcion: sinPermiso
            ? 'Tu rol no incluye la consulta del historial de este registro.'
            : (consulta.error?.detalle ?? ''),
          onReintentar: consulta.reintentar,
          nivel: 3,
        }}
        compacta
      />
    </div>
  )
}
