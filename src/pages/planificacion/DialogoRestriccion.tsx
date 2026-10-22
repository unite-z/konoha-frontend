/** HU-MOD03-003: alta de una restricción (solo jefe de sección). */
import { useRef, useState } from 'react'
import CampoFormulario, { AreaTexto } from '../../components/ui/CampoFormulario'
import DialogoFormulario from '../../components/ui/DialogoFormulario'
import Selector from '../../components/ui/Selector'
import { useConsulta } from '../../hooks/useConsulta'
import { aErrorApi } from '../../services/api/cliente'
import { crearRestriccion, listarTiposRestriccion } from '../../services/api/planificacion'
import type { Restriccion } from '../../types/planificacion'
import { PRESENTACION_EFECTO } from '../../utils/calendarioRestricciones'
import {
  validarRestriccion,
  type BorradorRestriccion,
  type ErroresRestriccion,
} from '../../utils/validacionPlanificacion'

export interface DialogoRestriccionProps {
  /** Fecha sugerida para el inicio y el fin (`AAAA-MM-DD`). */
  fechaInicial: string
  onCerrar: () => void
  onCreadas: (restricciones: Restriccion[]) => void
}

const CAMPOS_API: Record<string, keyof BorradorRestriccion> = {
  tipo_restriccion_id: 'tipo',
  fecha_inicio: 'fechaInicio',
  fecha_fin: 'fechaFin',
  hora_inicio: 'horaInicio',
  hora_fin: 'horaFin',
  descripcion: 'descripcion',
}

const CODIGOS_A_CAMPO: Record<string, keyof BorradorRestriccion> = { 'tipo-invalido': 'tipo', 'periodo-invalido': 'fechaFin' }

export default function DialogoRestriccion({ fechaInicial, onCerrar, onCreadas }: DialogoRestriccionProps) {
  const inicial: BorradorRestriccion = {
    tipo: '',
    fechaInicio: fechaInicial,
    fechaFin: fechaInicial,
    horaInicio: '',
    horaFin: '',
    descripcion: '',
  }
  const tipos = useConsulta('tipos-restriccion', listarTiposRestriccion)
  const [borrador, setBorrador] = useState(inicial)
  const [errores, setErrores] = useState<ErroresRestriccion>({})
  const [error, setError] = useState<{ titulo: string; detalle: string } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const enCurso = useRef(false)

  async function guardar() {
    if (enCurso.current) return
    const { errores: locales, entrada } = validarRestriccion(borrador)
    setErrores(locales)
    setError(null)
    if (!entrada) {
      document.getElementById(`restriccion-${Object.keys(locales)[0]}`)?.focus()
      return
    }
    enCurso.current = true
    setEnviando(true)
    try {
      onCreadas(await crearRestriccion(entrada))
    } catch (causa) {
      const fallo = aErrorApi(causa)
      const delServidor: ErroresRestriccion = {}
      for (const [campoApi, mensajes] of Object.entries(fallo.errores_campo)) {
        const campo = CAMPOS_API[campoApi]
        if (campo && mensajes.length) delServidor[campo] = mensajes.join('. ')
      }
      const campoDeCodigo = fallo.codigo ? CODIGOS_A_CAMPO[fallo.codigo] : undefined
      if (campoDeCodigo) delServidor[campoDeCodigo] = fallo.detalle
      setErrores(delServidor)
      if (Object.keys(delServidor).length === 0) {
        setError({ titulo: fallo.estado === 403 ? 'Sin permiso' : 'No se pudo guardar', detalle: fallo.detalle })
      }
    } finally {
      enCurso.current = false
      setEnviando(false)
    }
  }

  const cambiar = (clave: keyof BorradorRestriccion, valor: string) => setBorrador({ ...borrador, [clave]: valor })
  const campo = (clave: keyof BorradorRestriccion, etiqueta: string, tipo: 'date' | 'time', obligatorio = false) => (
    <CampoFormulario
      id={`restriccion-${clave}`}
      etiqueta={etiqueta}
      obligatorio={obligatorio}
      type={tipo}
      value={borrador[clave]}
      onChange={(e) => cambiar(clave, e.target.value)}
      error={errores[clave]}
      disabled={enviando}
    />
  )

  return (
    <DialogoFormulario
      abierto
      titulo="Registrar restricción"
      descripcion="Fechas en las que un tipo de restricción afecta a la programación."
      textoConfirmar="Registrar restricción"
      enviando={enviando}
      hayCambios={JSON.stringify(borrador) !== JSON.stringify(inicial)}
      error={error ?? (tipos.estado === 'error' ? { titulo: 'No se pudieron cargar los tipos', detalle: tipos.error?.detalle ?? '' } : null)}
      onEnviar={guardar}
      onCerrar={onCerrar}
    >
      <Selector
        id="restriccion-tipo"
        etiqueta="Tipo de restricción"
        obligatorio
        valor={borrador.tipo}
        opcionTodos="Elige un tipo"
        opciones={(tipos.datos ?? []).map((t) => ({ valor: String(t.id), texto: `${t.nombre} (${PRESENTACION_EFECTO[t.efecto].texto})` }))}
        onCambiar={(valor) => cambiar('tipo', valor)}
        error={errores.tipo}
        disabled={enviando}
      />
      {campo('fechaInicio', 'Fecha de inicio', 'date', true)}
      {campo('fechaFin', 'Fecha de fin', 'date', true)}
      {campo('horaInicio', 'Hora de inicio', 'time')}
      {campo('horaFin', 'Hora de fin', 'time')}
      <AreaTexto
        id="restriccion-descripcion"
        etiqueta="Descripción"
        value={borrador.descripcion}
        onChange={(e) => cambiar('descripcion', e.target.value)}
        error={errores.descripcion}
        disabled={enviando}
      />
    </DialogoFormulario>
  )
}
