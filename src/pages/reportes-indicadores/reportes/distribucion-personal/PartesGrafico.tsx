/**
 * Piezas comunes de los gráficos de RF-REP-004: selector de medida, aviso de la parte elegida con
 * «Ver detalles» y mensaje sin datos.
 */
import Boton from '../../../../components/ui/Boton'
import { GrupoChips } from '../../../../components/ui/ChipsFiltro'
import EstadoVacio from '../../../../components/ui/EstadoVacio'
import { MEDIDAS, MEDIDAS_CON_TIEMPO, type Medida } from './agregacion'
import type { Seleccion } from './DetalleSeleccion'
import estilos from './Graficos.module.css'

export function ControlMedida({ medida, onCambiar }: { medida: Medida; onCambiar: (medida: Medida) => void }) {
  return (
    <div className={estilos.control}>
      <span className={estilos.etiquetaControl}>Medida</span>
      <GrupoChips etiqueta="Medida" opciones={MEDIDAS} valor={medida} onCambiar={(v) => onCambiar(v as Medida)} />
    </div>
  )
}

export function BarraSeleccion({
  seleccion,
  indicacion,
  onVerDetalle,
}: {
  seleccion: Seleccion | null
  /** Texto mientras no hay nada elegido. */
  indicacion: string
  onVerDetalle: (seleccion: Seleccion) => void
}) {
  return (
    <div className={estilos.barraSeleccion}>
      <p className={estilos.textoSeleccion} aria-live="polite">
        {seleccion ? (
          <>
            Seleccionado: <strong>{seleccion.titulo}</strong>
          </>
        ) : (
          indicacion
        )}
      </p>
      <Boton variante="secundario" deshabilitado={!seleccion} onClick={() => seleccion && onVerDetalle(seleccion)}>
        Ver detalles
      </Boton>
    </div>
  )
}

export function SinDatosMedida({ medida }: { medida: Medida }) {
  return (
    <EstadoVacio
      nivel={3}
      titulo="Sin datos para esta medida"
      descripcion={
        MEDIDAS_CON_TIEMPO.includes(medida)
          ? 'Las actividades mostradas no tienen tiempo registrado. Elige otra medida.'
          : 'Ninguna actividad mostrada tiene este dato. Elige otra medida.'
      }
    />
  )
}

/** Título del gráfico y total de la medida en el conjunto mostrado. */
export function CabeceraGrafico({ titulo, total }: { titulo: string; total: string }) {
  return (
    <div className={estilos.cabecera}>
      <h3 className={estilos.tituloGrafico}>{titulo}</h3>
      <p className={estilos.total}>
        <span className={estilos.etiquetaTotal}>Total</span>
        <span className={`${estilos.valorTotal} cifra`}>{total}</span>
      </p>
    </div>
  )
}
