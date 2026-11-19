/**
 * Ventana de un espacio o ejemplar del mapa de atenciones (RF-REP-007 · CU-MOD06-003, pasos 6 y 7): sus datos del
 * inventario, cuántas atenciones tiene por tipo y su lista, con acceso al historial del espacio.
 */
import Boton from '@/design-system/Boton'
import DialogoDetalle from '@/design-system/DialogoDetalle'
import EstadoVacio from '@/design-system/EstadoVacio'
import ListaDescripcion from '@/design-system/ListaDescripcion'
import TablaDatos from '@/design-system/TablaDatos'
import { formatearNumero } from '@/utils/formato'
import type { FilaMapa } from '@/utils/mapaAtenciones'
import { TIPOS_ATENCION } from '@/utils/reportesGestion'
import { COLUMNAS_VENTANA } from './ColumnasAtenciones'
import estilos from './MapaAtenciones.module.css'

/** Lo que se abre en la ventana: un espacio (polígono) o un ejemplar. */
export interface EleccionMapa {
  titulo: string
  /** Datos del inventario (tipo de uso, superficie…). */
  datos: { etiqueta: string; valor: string }[]
  filas: FilaMapa[]
}

export interface VentanaAtencionesEspacioProps {
  eleccion: EleccionMapa | null
  /** Periodo de las atenciones, para la descripción. */
  periodo: string
  onCerrar: () => void
  /** Filtra la pantalla por el espacio (historial del espacio, paso 7). */
  onVerHistorial: (areaVerdeId: number) => void
}

/** «3 atenciones: 2 de mantenimiento y 1 de poda». */
function resumenPorTipo(filas: FilaMapa[]): string {
  const partes = TIPOS_ATENCION.map((tipo) => [tipo, filas.filter((f) => f.tipo_atencion === tipo).length] as const)
    .filter(([, n]) => n > 0)
    .map(([tipo, n]) => `${formatearNumero(n)} de ${tipo.toLocaleLowerCase('es')}`)
  const total = `${formatearNumero(filas.length)} ${filas.length === 1 ? 'atención' : 'atenciones'}`
  return partes.length > 0 ? `${total}: ${partes.join(', ')}` : total
}

export default function VentanaAtencionesEspacio({
  eleccion,
  periodo,
  onCerrar,
  onVerHistorial,
}: VentanaAtencionesEspacioProps) {
  const areaVerdeId = eleccion?.filas.find((f) => f.area_verde_id !== null)?.area_verde_id ?? null
  return (
    <DialogoDetalle
      abierto={eleccion !== null}
      titulo={eleccion?.titulo ?? ''}
      descripcion={periodo}
      onCerrar={onCerrar}
    >
      {eleccion && (
        <div className={estilos.ventana}>
          {eleccion.datos.length > 0 && <ListaDescripcion columnas="una" elementos={eleccion.datos} />}
          {eleccion.filas.length === 0 ? (
            <EstadoVacio
              nivel={3}
              titulo="Sin atenciones en el periodo"
              descripcion="Este espacio no tiene atenciones con los filtros elegidos."
            />
          ) : (
            <>
              <p className={estilos.ayuda}>{resumenPorTipo(eleccion.filas)}</p>
              <TablaDatos
                titulo={`Atenciones de ${eleccion.titulo}`}
                columnas={COLUMNAS_VENTANA}
                filas={eleccion.filas}
                claveFila={(f) => f.clave}
                ordenInicial={{ clave: 'fecha', direccion: 'desc' }}
              />
            </>
          )}
          {areaVerdeId !== null && (
            <div className={estilos.acciones}>
              <Boton
                variante="secundario"
                onClick={() => {
                  onCerrar()
                  onVerHistorial(areaVerdeId)
                }}
              >
                Ver historial del espacio
              </Boton>
            </div>
          )}
        </div>
      )}
    </DialogoDetalle>
  )
}
