/**
 * Pestaña «Conformidad» del reporte por servicio (RF-REP-008): cada situación con su insignia (conforme en verde,
 * observada en ámbar) y su número. «Ver atenciones» abre las atenciones de esa situación.
 */
import Badge from '../../../../components/ui/Badge'
import Boton from '../../../../components/ui/Boton'
import EstadoVacio from '../../../../components/ui/EstadoVacio'
import type { ConformidadServicio, FilaAtencionServicio } from '../../../../types/reportesGestion'
import { formatearNumero } from '../../../../utils/formato'
import { atencionesDeConformidad, PARTES_CONFORMIDAD } from '../../../../utils/reporteServicio'
import estilos from './ServicioTercerizado.module.css'

export interface DesgloseConformidadProps {
  conformidad: ConformidadServicio
  filas: FilaAtencionServicio[]
  onVerDetalle: (titulo: string, filas: FilaAtencionServicio[]) => void
}

export default function DesgloseConformidad({ conformidad, filas, onVerDetalle }: DesgloseConformidadProps) {
  if (conformidad.sin_datos) {
    return <EstadoVacio nivel={3} titulo="Conformidad sin datos" descripcion={conformidad.mensaje_sin_datos ?? undefined} />
  }
  return (
    <ul className={estilos.desglose} aria-label="Conformidad del periodo">
      {PARTES_CONFORMIDAD.map((parte) => {
        const cantidad = conformidad[parte.clave]
        return (
          <li key={parte.clave} className={estilos.parte}>
            <Badge tono={parte.tono} texto={parte.texto} />
            <p className={`${estilos.cifraGrande} cifra`}>{formatearNumero(cantidad)}</p>
            <Boton
              variante="terciario"
              deshabilitado={cantidad === 0}
              aria-label={`Ver atenciones: ${parte.texto.toLowerCase()}`}
              onClick={() => onVerDetalle(`Atenciones: ${parte.texto.toLowerCase()}`, atencionesDeConformidad(filas, parte.clave))}
            >
              Ver atenciones
            </Boton>
          </li>
        )
      })}
    </ul>
  )
}
