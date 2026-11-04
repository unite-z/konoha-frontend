/**
 * Diálogos del detalle de ciclo (AV-269, Figma 370-4060, 370-4167 y 380-7409): «Iniciar CC-2026-11» y «Finalizar
 * …» piden la fecha real (hoy por defecto, nunca futura); «Cancelar …» pide el motivo, obligatorio (contrato de
 * AV-253: se envía ya y el backend lo ignora hasta entonces). Botones «Volver» y la acción.
 */
import { useState } from 'react'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import CampoFormulario from '@/components/ui/CampoFormulario'
import DialogoConfirmacion from '@/components/ui/DialogoConfirmacion'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import { cambiarEstadoCiclo, type CambioEstadoCiclo } from '@/services/api/planificacion'
import type { FechaIso } from '@/types/comun'
import type { Programacion } from '@/types/planificacion'
import { validarFechaReal } from './detalleCiclo'

export interface DialogoCambioCicloProps {
  ciclo: Programacion
  cambio: CambioEstadoCiclo
  hoy: FechaIso
  onCerrar: () => void
  onCambiado: (ciclo: Programacion, mensaje: string) => void
}

const TEXTOS = {
  inicio: { titulo: 'Iniciar', campo: 'Fecha de inicio real', confirmar: 'Iniciar ciclo', exito: 'Ciclo iniciado.' },
  fin: { titulo: 'Finalizar', campo: 'Fecha de fin real', confirmar: 'Finalizar ciclo', exito: 'Ciclo finalizado.' },
} as const

export const MAXIMO_MOTIVO_CANCELACION = 300

export default function DialogoCambioCiclo({ ciclo, cambio, hoy, onCerrar, onCambiado }: DialogoCambioCicloProps) {
  const [fecha, setFecha] = useState<string>(hoy)
  const [motivo, setMotivo] = useState('')
  const nombre = ciclo.codigo ?? ciclo.servicio
  const [mostrarErrores, setMostrarErrores] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState<{ titulo: string; detalle: string } | null>(null)

  async function enviar(fechaReal?: FechaIso) {
    setEnviando(true)
    setErrorEnvio(null)
    try {
      const actualizado = await cambiarEstadoCiclo(ciclo.id, cambio, fechaReal, cambio === 'cancelacion' ? motivo.trim() : undefined)
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
        titulo={`Cancelar ${nombre}`}
        consecuencia="El ciclo queda cancelado y se mantiene en el historial."
        textoConfirmar="Cancelar ciclo"
        variante="destructivo"
        cargando={enviando}
        onConfirmar={() => {
          setMostrarErrores(true)
          if (motivo.trim()) void enviar()
        }}
        onCancelar={onCerrar}
      >
        <CampoFormulario
          id="ciclo-motivo-cancelacion"
          etiqueta="Motivo"
          obligatorio
          value={motivo}
          maxLength={MAXIMO_MOTIVO_CANCELACION}
          onChange={(e) => setMotivo(e.target.value)}
          error={mostrarErrores && !motivo.trim() ? 'Escribe el motivo de la cancelación.' : undefined}
        />
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
      ancho="estrecho"
      titulo={`${textos.titulo} ${nombre}`}
      descripcion={cambio === 'inicio' ? `${ciclo.servicio} · ${ciclo.proveedor ?? 'Personal propio'}` : undefined}
      textoConfirmar={textos.confirmar}
      textoCancelar="Volver"
      enviando={enviando}
      hayCambios={fecha !== hoy}
      error={errorEnvio}
      conObligatorios={false}
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
