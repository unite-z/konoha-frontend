/**
 * «Analizar datos» (RF-IA-002): la IA revisa un conjunto de datos, con un periodo opcional. Solo señala posibles
 * problemas: ningún registro se modifica. Si la IA no está disponible (503), «Revisar de forma manual» cierra el
 * diálogo y deja la bandeja usable.
 */
import { useState } from 'react'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import CampoFormulario from '@/components/ui/CampoFormulario'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import Selector from '@/components/ui/Selector'
import { validarPeriodo, type ErroresPeriodo } from '@/components/ui/validacionPeriodo'
import { aErrorApi, type ErrorApi } from '@/services/api/cliente'
import { analizarInconsistencias } from '@/services/api/inconsistenciasIa'
import type { ConjuntoDatos, ResultadoAnalisisInconsistencias } from '@/types/inconsistenciasIa'
import { CONJUNTOS, ETIQUETA_CONJUNTO } from '@/utils/inconsistenciasIa'
import estilos from './Inconsistencias.module.css'

export interface DialogoAnalisisProps {
  abierto: boolean
  onCerrar: () => void
  onTerminado: (resultado: ResultadoAnalisisInconsistencias) => void
}

export default function DialogoAnalisis({ abierto, onCerrar, onTerminado }: DialogoAnalisisProps) {
  const [conjunto, setConjunto] = useState<ConjuntoDatos>('Atenciones')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [errores, setErrores] = useState<ErroresPeriodo>({})
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<ErrorApi | null>(null)
  const iaNoDisponible = error?.estado === 503

  function cerrar() {
    setError(null)
    setErrores({})
    onCerrar()
  }

  async function enviar() {
    if (enviando) return
    // El periodo es opcional, pero si se indica debe estar completo y en orden.
    const nuevos = desde || hasta ? validarPeriodo(desde, hasta) : {}
    setErrores(nuevos)
    if (nuevos.desde || nuevos.hasta) {
      document.getElementById(nuevos.desde ? 'analisis-desde' : 'analisis-hasta')?.focus()
      return
    }
    setEnviando(true)
    setError(null)
    try {
      onTerminado(await analizarInconsistencias({ conjunto, ...(desde && hasta ? { desde, hasta } : {}) }))
    } catch (causa) {
      setError(aErrorApi(causa))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <DialogoFormulario
      abierto={abierto}
      titulo="Analizar datos"
      descripcion="La IA solo señala posibles problemas. Ningún registro se modifica."
      textoConfirmar="Analizar datos"
      enviando={enviando}
      error={error && !iaNoDisponible ? { titulo: 'No se pudo analizar el conjunto', detalle: error.detalle } : null}
      onEnviar={() => void enviar()}
      onCerrar={cerrar}
    >
      {iaNoDisponible && (
        <AvisoEnLinea tono="error" titulo="La IA no está disponible" accion={{ texto: 'Revisar de forma manual', onClick: cerrar }}>
          {error?.detalle}
        </AvisoEnLinea>
      )}
      <Selector
        id="analisis-conjunto"
        etiqueta="Conjunto de datos"
        obligatorio
        valor={conjunto}
        opciones={CONJUNTOS.map((c) => ({ valor: c, texto: ETIQUETA_CONJUNTO[c] }))}
        onCambiar={(valor) => setConjunto(CONJUNTOS.find((c) => c === valor) ?? 'Atenciones')}
      />
      <div className={estilos.periodo}>
        <CampoFormulario
          id="analisis-desde"
          etiqueta="Desde"
          type="date"
          ayuda="Opcional"
          value={desde}
          error={errores.desde}
          onChange={(e) => setDesde(e.target.value)}
        />
        <CampoFormulario
          id="analisis-hasta"
          etiqueta="Hasta"
          type="date"
          ayuda="Opcional"
          value={hasta}
          error={errores.hasta}
          onChange={(e) => setHasta(e.target.value)}
        />
      </div>
    </DialogoFormulario>
  )
}
