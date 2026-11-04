/**
 * Editor de insumos (RF-IA-004): una fila por insumo con nombre, cantidad y unidad, más «Añadir insumo» y «Quitar».
 * En móvil cada fila es un bloque. La unidad es texto libre con sugerencias (las de la estimación y las habituales).
 */
import Boton from '@/components/ui/Boton'
import CampoFormulario from '@/components/ui/CampoFormulario'
import type { InsumoEnEdicion } from '@/utils/estimacionIa'
import estilos from './Estimacion.module.css'

export interface EditorInsumosProps {
  /** Prefijo de los ids (único en la página). */
  idBase: string
  insumos: InsumoEnEdicion[]
  onCambiar: (insumos: InsumoEnEdicion[]) => void
  unidades: string[]
  errores?: Record<number, { nombre?: string; cantidad?: string; unidad?: string }>
}

export default function EditorInsumos({ idBase, insumos, onCambiar, unidades, errores = {} }: EditorInsumosProps) {
  const idUnidades = `${idBase}-unidades`
  const cambiar = (indice: number, campo: keyof InsumoEnEdicion, valor: string) =>
    onCambiar(insumos.map((i, j) => (j === indice ? { ...i, [campo]: valor } : i)))

  return (
    <div className={estilos.pila}>
      <datalist id={idUnidades}>
        {unidades.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>
      {insumos.length === 0 && <p className={estilos.secundario}>Sin insumos. Añade los que hagan falta.</p>}
      <ul className={estilos.insumos} aria-label="Insumos">
        {insumos.map((insumo, indice) => (
          <li key={indice} className={estilos.filaInsumo}>
            <CampoFormulario
              id={`${idBase}-nombre-${indice}`}
              etiqueta="Insumo"
              compacto
              value={insumo.nombre}
              error={errores[indice]?.nombre}
              onChange={(e) => cambiar(indice, 'nombre', e.target.value)}
            />
            <CampoFormulario
              id={`${idBase}-cantidad-${indice}`}
              etiqueta="Cantidad"
              compacto
              inputMode="decimal"
              value={insumo.cantidad}
              error={errores[indice]?.cantidad}
              onChange={(e) => cambiar(indice, 'cantidad', e.target.value)}
            />
            <CampoFormulario
              id={`${idBase}-unidad-${indice}`}
              etiqueta="Unidad"
              compacto
              list={idUnidades}
              value={insumo.unidad}
              error={errores[indice]?.unidad}
              onChange={(e) => cambiar(indice, 'unidad', e.target.value)}
            />
            <div className={estilos.quitar}>
              <Boton
                variante="fantasma"
                compacto
                aria-label={`Quitar ${insumo.nombre || `el insumo ${indice + 1}`}`}
                onClick={() => onCambiar(insumos.filter((_, j) => j !== indice))}
              >
                Quitar
              </Boton>
            </div>
          </li>
        ))}
      </ul>
      <div>
        <Boton variante="secundario" icono="plus" onClick={() => onCambiar([...insumos, { nombre: '', cantidad: '', unidad: '' }])}>
          Añadir insumo
        </Boton>
      </div>
    </div>
  )
}
