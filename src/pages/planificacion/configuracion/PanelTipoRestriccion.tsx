import { useRef, useState } from 'react'
import CampoFormulario from '@/design-system/CampoFormulario'
import Casilla from '@/design-system/Casilla'
import Selector from '@/design-system/Selector'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import DialogoFormulario from '@/design-system/DialogoFormulario'
import DialogoConfirmacion from '@/design-system/DialogoConfirmacion'
import { crearTipoRestriccion, modificarTipoRestriccion } from '@/services/api/planificacion'
import type { EntradaTipoRestriccion, ResultadoTipoRestriccion, TipoRestriccion } from '@/types/planificacion'

export const CONSECUENCIA_BAJA =
  'Este tipo dejará de estar disponible para nuevas restricciones. Las restricciones registradas anteriormente se conservarán.'
export const EFECTOS_TIPO = [
  { valor: 'Advertencia', texto: 'Aviso' },
  { valor: 'Prohibicion', texto: 'Prohibición' },
  { valor: 'Favorable', texto: 'Favorable' },
]
export default function PanelTipoRestriccion({
  tipo,
  onCerrar,
  onGuardado,
}: {
  tipo: TipoRestriccion | null
  onCerrar: () => void
  onGuardado: (tipo: ResultadoTipoRestriccion) => void
}) {
  const inicial: EntradaTipoRestriccion = {
    nombre: tipo?.nombre ?? '',
    efecto: tipo?.efecto ?? 'Advertencia',
    aplica_servicios_ruidosos: tipo?.aplica_servicios_ruidosos ?? false,
  }
  const [datos, setDatos] = useState(inicial)
  const [activo, setActivo] = useState(tipo?.activo !== false)
  const [validando, setValidando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<{ titulo: string; detalle: string } | null>(null)
  const enCurso = useRef(false)
  const protegido = tipo?.protegido || tipo?.nombre === 'Cierre del campus'
  const nombre = datos.nombre.trim().replace(/\s+/g, ' ')
  const errorNombre = !nombre ? 'Indica el nombre del tipo.' : nombre.length > 80 ? 'Máximo 80 caracteres.' : undefined
  const cambios = JSON.stringify(datos) !== JSON.stringify(inicial) || activo !== (tipo?.activo !== false)
  async function guardar(confirmado = false) {
    if (enCurso.current) return
    setValidando(true)
    if (errorNombre) return
    if (tipo && tipo.activo !== false && !activo && !confirmado) {
      setConfirmando(true)
      return
    }
    enCurso.current = true
    setEnviando(true)
    setError(null)
    setConfirmando(false)
    try {
      const entrada = { ...datos, nombre }
      onGuardado(
        tipo ? await modificarTipoRestriccion(tipo.id, { ...entrada, activo }) : await crearTipoRestriccion(entrada),
      )
    } catch (causa) {
      setError({
        titulo: 'No se pudo guardar el tipo',
        detalle: causa instanceof Error ? causa.message : 'Inténtalo de nuevo.',
      })
      enCurso.current = false
      setEnviando(false)
    }
  }
  return (
    <>
      <DialogoFormulario
        abierto
        ancho="lateral"
        titulo={tipo ? 'Editar tipo de restricción' : 'Crear tipo de restricción'}
        textoConfirmar="Guardar tipo"
        onCerrar={onCerrar}
        onEnviar={() => void guardar()}
        enviando={enviando}
        envioDeshabilitado={Boolean(tipo) && !cambios}
        hayCambios={cambios}
        error={error}
      >
        <CampoFormulario
          id="tipo-nombre"
          etiqueta="Nombre"
          obligatorio
          value={datos.nombre}
          maxLength={80}
          disabled={protegido || enviando}
          onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
          error={validando ? errorNombre : undefined}
        />
        <Selector
          id="tipo-efecto"
          etiqueta="Efecto"
          obligatorio
          opciones={EFECTOS_TIPO}
          valor={datos.efecto}
          disabled={enviando}
          onCambiar={(valor) => setDatos({ ...datos, efecto: valor as EntradaTipoRestriccion['efecto'] })}
        />
        <Casilla
          etiqueta="Solo servicios ruidosos"
          marcada={datos.aplica_servicios_ruidosos}
          disabled={enviando}
          onCambiar={(valor) => setDatos({ ...datos, aplica_servicios_ruidosos: valor })}
        />
        {tipo && (
          <Casilla etiqueta="Tipo activo" marcada={activo} disabled={protegido || enviando} onCambiar={setActivo} />
        )}
        {protegido && (
          <AvisoEnLinea tono="info" titulo="Tipo protegido">
            Cierre del campus no puede renombrarse ni desactivarse porque participa en la planificación de poda mayor.
            Su efecto y aplicación a servicios ruidosos sí pueden modificarse. Cambiarlo a Prohibición puede impedir
            programar en esas mismas fechas.
          </AvisoEnLinea>
        )}
        {tipo && (
          <AvisoEnLinea tono="info" titulo="Cambios en el calendario">
            El efecto y el nombre se aplican también a las restricciones ya registradas. Si una prohibición afecta
            ciclos, se informará para revisarlos; no se cancelarán automáticamente.
          </AvisoEnLinea>
        )}
      </DialogoFormulario>
      {confirmando && (
        <DialogoConfirmacion
          abierto
          titulo={`Desactivar ${tipo?.nombre}`}
          consecuencia={CONSECUENCIA_BAJA}
          textoConfirmar="Desactivar tipo"
          variante="destructivo"
          cargando={enviando}
          onCancelar={() => setConfirmando(false)}
          onConfirmar={() => void guardar(true)}
        />
      )}
    </>
  )
}
