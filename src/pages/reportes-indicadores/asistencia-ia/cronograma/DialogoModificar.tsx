/**
 * «Modificar» una propuesta del cronograma (RF-IA-003, A1): fechas, espacio, responsable (cuadrilla o proveedor, según
 * la modalidad) y operarios. Lo modificado se registra como decisión del usuario (criterio 3).
 * Las cuadrillas y los proveedores son los que aparecen en la propuesta (sin llamar a otros módulos).
 */
import { useState } from 'react'
import CampoFormulario from '@/components/ui/CampoFormulario'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import Selector from '@/components/ui/Selector'
import { validarPeriodo, type ErroresPeriodo } from '@/components/ui/validacionPeriodo'
import type { PropuestaCronograma, ValoresCronograma } from '@/types/cronogramaIa'
import type { RecursoOpcion } from '@/utils/cronogramaIa'
import { enteroPositivo } from '@/utils/reportesGestion'
import estilos from './Cronograma.module.css'

export interface DialogoModificarProps {
  propuesta: PropuestaCronograma
  valoresIniciales: ValoresCronograma
  espacios: RecursoOpcion[]
  cuadrillas: RecursoOpcion[]
  proveedores: RecursoOpcion[]
  onGuardar: (valores: ValoresCronograma) => void
  onCerrar: () => void
}

const opciones = (lista: RecursoOpcion[]) => lista.map((r) => ({ valor: String(r.id), texto: r.nombre }))

export default function DialogoModificar({ propuesta, valoresIniciales, espacios, cuadrillas, proveedores, onGuardar, onCerrar }: DialogoModificarProps) {
  const [inicio, setInicio] = useState(valoresIniciales.fecha_inicio)
  const [fin, setFin] = useState(valoresIniciales.fecha_fin)
  const [espacio, setEspacio] = useState(valoresIniciales.area_verde_id === null ? '' : String(valoresIniciales.area_verde_id))
  const propio = propuesta.recursos.modalidad === 'PersonalPropio'
  const [responsable, setResponsable] = useState(String((propio ? valoresIniciales.cuadrilla_id : valoresIniciales.proveedor_id) ?? ''))
  const [operarios, setOperarios] = useState(valoresIniciales.operarios === null ? '' : String(valoresIniciales.operarios))
  const [errores, setErrores] = useState<ErroresPeriodo & { operarios?: string }>({})
  // El espacio actual siempre se puede elegir, aunque no esté en el catálogo.
  const opcionesEspacio = espacios.some((e) => e.id === propuesta.area_verde_id) || propuesta.area_verde_id === null
    ? opciones(espacios)
    : [{ valor: String(propuesta.area_verde_id), texto: propuesta.ubicacion }, ...opciones(espacios)]

  function guardar() {
    const nuevos: ErroresPeriodo & { operarios?: string } = validarPeriodo(inicio, fin)
    const numeroOperarios = operarios.trim() === '' ? null : enteroPositivo(operarios)
    if (propio && operarios.trim() !== '' && numeroOperarios === undefined) nuevos.operarios = 'Indica un número entero de operarios'
    setErrores(nuevos)
    const primero = nuevos.desde ? 'modificar-inicio' : nuevos.hasta ? 'modificar-fin' : nuevos.operarios ? 'modificar-operarios' : null
    if (primero) {
      document.getElementById(primero)?.focus()
      return
    }
    const idResponsable = enteroPositivo(responsable) ?? null
    onGuardar({
      fecha_inicio: inicio,
      fecha_fin: fin,
      area_verde_id: enteroPositivo(espacio) ?? null,
      cuadrilla_id: propio ? idResponsable : null,
      proveedor_id: propio ? null : idResponsable,
      operarios: propio ? (numeroOperarios ?? null) : null,
    })
  }

  return (
    <DialogoFormulario
      abierto
      titulo="Modificar propuesta"
      descripcion={`${propuesta.actividad} · ${propuesta.ubicacion}`}
      textoConfirmar="Guardar cambios"
      onEnviar={guardar}
      onCerrar={onCerrar}
    >
      <div className={estilos.periodo}>
        <CampoFormulario id="modificar-inicio" etiqueta="Inicio" type="date" obligatorio value={inicio} error={errores.desde} onChange={(e) => setInicio(e.target.value)} />
        <CampoFormulario id="modificar-fin" etiqueta="Fin" type="date" obligatorio value={fin} error={errores.hasta} onChange={(e) => setFin(e.target.value)} />
      </div>
      <Selector id="modificar-espacio" etiqueta="Espacio" valor={espacio} opciones={opcionesEspacio} onCambiar={setEspacio} />
      <Selector
        id="modificar-responsable"
        etiqueta={propio ? 'Cuadrilla' : 'Proveedor'}
        valor={responsable}
        opciones={opciones(propio ? cuadrillas : proveedores)}
        onCambiar={setResponsable}
      />
      {propio && (
        <CampoFormulario
          id="modificar-operarios"
          etiqueta="Operarios"
          inputMode="numeric"
          value={operarios}
          error={errores.operarios}
          onChange={(e) => setOperarios(e.target.value)}
        />
      )}
    </DialogoFormulario>
  )
}
