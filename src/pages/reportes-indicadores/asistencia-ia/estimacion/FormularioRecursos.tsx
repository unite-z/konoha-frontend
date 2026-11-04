/**
 * Campos de recursos (RF-IA-004): operarios, duración con su unidad e insumos. Lo usa el registro manual (E1 y A1);
 * la revisión reutiliza las mismas piezas al corregir.
 */
import CampoFormulario from '@/components/ui/CampoFormulario'
import GrupoOpciones from '@/components/ui/GrupoOpciones'
import { OPCIONES_UNIDAD, type ErroresConfirmados, type RecursosEnEdicion } from '@/utils/estimacionIa'
import EditorInsumos from './EditorInsumos'
import estilos from './Estimacion.module.css'

export interface FormularioRecursosProps {
  idBase: string
  valores: RecursosEnEdicion
  onCambiar: (valores: RecursosEnEdicion) => void
  errores: ErroresConfirmados
  unidades: string[]
}

export default function FormularioRecursos({ idBase, valores, onCambiar, errores, unidades }: FormularioRecursosProps) {
  const cambiar = (cambio: Partial<RecursosEnEdicion>) => onCambiar({ ...valores, ...cambio })
  return (
    <div className={estilos.pila}>
      <CampoFormulario
        id={`${idBase}-operarios`}
        etiqueta="Operarios"
        obligatorio
        formato="entero"
        value={valores.operarios}
        error={errores.operarios}
        onChange={(e) => cambiar({ operarios: e.target.value })}
      />
      <div className={estilos.duracion}>
        <CampoFormulario
          id={`${idBase}-duracion`}
          etiqueta="Duración"
          obligatorio
          formato="decimal"
          value={valores.duracion}
          error={errores.duracion}
          onChange={(e) => cambiar({ duracion: e.target.value })}
        />
        <GrupoOpciones
          etiqueta="Unidad de la duración"
          opciones={OPCIONES_UNIDAD}
          valor={valores.unidad_duracion}
          onCambiar={(unidad_duracion) => cambiar({ unidad_duracion })}
        />
      </div>
      <EditorInsumos
        idBase={`${idBase}-insumos`}
        insumos={valores.insumos}
        onCambiar={(insumos) => cambiar({ insumos })}
        unidades={unidades}
        errores={errores.insumos}
      />
    </div>
  )
}
