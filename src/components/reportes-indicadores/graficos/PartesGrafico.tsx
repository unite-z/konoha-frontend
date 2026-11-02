/**
 * Piezas comunes de los gráficos del MOD-06: cabecera con el título y el total, y aviso de la parte elegida con
 * «Ver detalles» (se habilita al elegir una barra, columna o celda).
 */
import Boton from '../../ui/Boton'
import estilos from './Graficos.module.css'

/** Título del gráfico y total del conjunto mostrado. */
export function CabeceraGrafico({ titulo, total }: { titulo: string; total?: string }) {
  return (
    <div className={estilos.cabecera}>
      <h3 className={estilos.tituloGrafico}>{titulo}</h3>
      {total !== undefined && (
        <p className={estilos.total}>
          <span className={estilos.etiquetaTotal}>Total</span>
          <span className={`${estilos.valorTotal} cifra`}>{total}</span>
        </p>
      )}
    </div>
  )
}

export function BarraSeleccion({
  seleccionado,
  indicacion,
  onVerDetalle,
}: {
  /** Nombre de la parte elegida, o null. */
  seleccionado: string | null
  /** Texto mientras no hay nada elegido. */
  indicacion: string
  onVerDetalle: () => void
}) {
  return (
    <div className={estilos.barraSeleccion}>
      <p className={estilos.textoSeleccion} aria-live="polite">
        {seleccionado ? (
          <>
            Seleccionado: <strong>{seleccionado}</strong>
          </>
        ) : (
          indicacion
        )}
      </p>
      <Boton variante="secundario" deshabilitado={!seleccionado} onClick={onVerDetalle}>
        Ver detalles
      </Boton>
    </div>
  )
}
