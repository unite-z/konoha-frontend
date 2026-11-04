/**
 * Diálogos del detalle de ciclo (AV-269): «Iniciar» y «Finalizar» piden la fecha real (hoy por defecto, nunca
 * futura); «Cancelar» pide confirmación. El motivo de la cancelación llega con AV-253: hasta entonces no se pide.
 */
import { useState } from 'react'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import CampoFormulario from '@/components/ui/CampoFormulario'
import DialogoConfirmacion from '@/components/ui/DialogoConfirmacion'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import { cambiarEstadoCiclo, type CambioEstadoCiclo } from '@/services/api/planificacion'
import type { FechaIso } from '@/types/comun'
import type { Programacion } from '@/types/planificacion'
import { periodoRestriccion } from '../resumen/resumenPlanificacion'
import { validarFechaReal } from './detalleCiclo'

export interface DialogoCambioCicloProps {
  ciclo: Programacion
  cambio: CambioEstadoCiclo
  hoy: FechaIso
  onCerrar: () => void
  onCambiado: (ciclo: Programacion, mensaje: string) => void
}

const TEXTOS = {
  inicio: { titulo: 'Iniciar ciclo', campo: 'Fecha de inicio real', confirmar: 'Iniciar ciclo', exito: 'Ciclo iniciado.' },
  fin: { titulo: 'Finalizar ciclo', campo: 'Fecha de fin real', confirmar: 'Finalizar ciclo', exito: 'Ciclo finalizado.' },
} as const

export default function DialogoCambioCiclo({ ciclo, cambio, hoy, onCerrar, onCambiado }: DialogoCambioCicloProps) {
  const [fecha, setFecha] = useState<string>(hoy)
  const [mostrarErrores, setMostrarErrores] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState<{ titulo: string; detalle: string } | null>(null)

  async function enviar(fechaReal?: FechaIso) {
    setEnviando(true)
    setErrorEnvio(null)
    try {
      const actualizado = await cambiarEstadoCiclo(ciclo.id, cambio, fechaReal)
      onCambiado(actualizado, cambio === 'cancelacion' ? 'Ciclo cancelado.' : TEXTOS[cambio].exito)
    } catch (causa) {
      setErrorEnvio({ titulo: 'No se pudo registrar el cambio', detalle: causa instanceof Error ? causa.message : 'Inténtalo de nuevo.' })
      setEnviando(false)
    }
  }

  if (cambio === 'cancelacion') {
    return (
      <DialogoConfirmacion
        abierto
        titulo={`Cancelar ${ciclo.servicio}`}
        consecuencia={`El ciclo del ${periodoRestriccion(ciclo.fecha_inicio_prevista, ciclo.fecha_fin_prevista)} pasa a Cancelado y no se puede reanudar.`}
        textoConfirmar="Cancelar ciclo"
        variante="destructivo"
        cargando={enviando}
        onConfirmar={() => void enviar()}
        onCancelar={onCerrar}
      >
        {errorEnvio && (
          <AvisoEnLinea tono="error" titulo={errorEnvio.titulo}>
            {errorEnvio.detalle}
          </AvisoEnLinea>
        )}
      </DialogoConfirmacion>
    )
  }

  const textos = TEXTOS[cambio]
  const error = validarFechaReal(cambio, fecha, ciclo, hoy)
  return (
    <DialogoFormulario
      abierto
      titulo={textos.titulo}
      descripcion={`${ciclo.servicio} · previsto del ${periodoRestriccion(ciclo.fecha_inicio_prevista, ciclo.fecha_fin_prevista)}`}
      textoConfirmar={textos.confirmar}
      enviando={enviando}
      hayCambios={fecha !== hoy}
      error={errorEnvio}
      conObligatorios
      onEnviar={() => {
        setMostrarErrores(true)
        if (!error) void enviar(fecha)
      }}
      onCerrar={onCerrar}
    >
      <CampoFormulario
        id={`ciclo-${cambio}`}
        etiqueta={textos.campo}
        obligatorio
        type="date"
        max={hoy}
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
        error={mostrarErrores ? error : undefined}
      />
    </DialogoFormulario>
  )
}
