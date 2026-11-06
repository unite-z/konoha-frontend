// RF-SER-007 · Decisiones del jefe de sección sobre el informe del proveedor
/**
 * Historial de conformidades y observaciones, de la más reciente a la más antigua. Cada decisión indica la
 * revisión del informe que evaluó: tras una subsanación hay una nueva revisión y una nueva decisión.
 * Se muestra desde que el servicio terminó. No incluye el acuerdo de la unidad, que tiene su propia tarjeta.
 */
import Estado from '@/components/ui/Estado'
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
import { insigniaAEstado } from '@/components/ui/tonos'
import type { Atencion, Conformidad } from '@/types/tercerizados'
import { haTerminado, insigniaConformidad } from '@/utils/estadosTercerizados'
import { formatearFecha, SIN_VALOR } from '@/utils/formato'
import estilos from './Tercerizados.module.css'

const COLUMNAS: ColumnaTabla<Conformidad>[] = [
  { clave: 'fecha', titulo: 'Fecha', render: (c) => formatearFecha(c.fecha_conformidad) },
  { clave: 'decision', titulo: 'Decisión', render: (c) => <Estado {...insigniaAEstado(insigniaConformidad(c.resultado))} /> },
  { clave: 'revision', titulo: 'Informe evaluado', render: (c) => `Revisión ${c.revision}` },
  { clave: 'comentarios', titulo: 'Comentarios', multilinea: true, render: (c) => c.comentarios || SIN_VALOR },
  { clave: 'usuario', titulo: 'Registrada por', render: (c) => c.usuario_nombre ?? SIN_VALOR },
]

export default function SeccionConformidad({ atencion }: { atencion: Atencion }) {
  if (!haTerminado(atencion.estado)) return null
  const decisiones = [...(atencion.conformidades ?? [])].reverse()
  return (
    <section className={estilos.seccion} aria-labelledby="titulo-conformidad">
      <div className={estilos.cabeceraSeccion}>
        <h2 id="titulo-conformidad" className={estilos.tituloSeccion}>
          Conformidad del servicio
        </h2>
        <span className={estilos.ayuda}>Decisión del jefe de sección sobre el informe</span>
      </div>
      <TablaDatos
        titulo="Decisiones de conformidad de la atención"
        columnas={COLUMNAS}
        filas={decisiones}
        claveFila={(c) => String(c.id)}
        vacio={{
          icono: 'documento',
          titulo: 'Aún no hay una decisión',
          descripcion: 'El jefe de sección dará la conformidad u observará el informe cuando el proveedor lo entregue.',
          nivel: 3,
        }}
        compacta
      />
    </section>
  )
}
