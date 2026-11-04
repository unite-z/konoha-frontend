/**
 * Avance del requerimiento de una incidencia derivada a tercerizado (AV-284, Figma 394-9194; AV-278): el código, el
 * proveedor y el tipo de atención, y los pasos de MOD-05 (requerimiento, orden de compra, informe del proveedor y
 * conformidad) con un punto verde si está hecho, azul si está en curso y gris si falta.
 */
import Tarjeta from '@/components/ui/Tarjeta'
import type { RequerimientoIncidencia } from '@/types/incidencias'
import { diaMes } from './detalleIncidencia'
import estilos from './Incidencias.module.css'

const CLASE_PASO = { Hecho: estilos.pasoHecho, EnCurso: estilos.pasoEnCurso, Pendiente: estilos.pasoPendiente }
const TEXTO_ESTADO = { Hecho: 'hecho', EnCurso: 'en curso', Pendiente: 'pendiente' }

export default function TarjetaSeguimientoRequerimiento({ requerimiento }: { requerimiento: RequerimientoIncidencia }) {
  return (
    <Tarjeta titulo={`Requerimiento ${requerimiento.codigo}`} nivel={2}>
      <div className={estilos.accion}>
        <p className={estilos.subtituloAccion}>
          {requerimiento.proveedor} · {requerimiento.tipo_atencion.toLowerCase()}
        </p>
        <ol className={estilos.pasos}>
          {requerimiento.pasos.map((paso) => (
            <li key={paso.nombre} className={`${estilos.paso} ${CLASE_PASO[paso.estado]}`}>
              <span className={estilos.puntoPaso} aria-hidden="true" />
              <span className={estilos.nombrePaso}>
                {paso.nombre}
                <span className="sr-only">, {TEXTO_ESTADO[paso.estado]}</span>
              </span>
              <span className={estilos.fechaPaso}>{paso.fecha ? diaMes(paso.fecha) : paso.estado === 'EnCurso' ? 'pendiente' : '—'}</span>
            </li>
          ))}
        </ol>
      </div>
    </Tarjeta>
  )
}
