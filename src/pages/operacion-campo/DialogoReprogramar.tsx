import { useState } from 'react'
import CampoFormulario, { AreaTexto } from '@/design-system/CampoFormulario'
import DialogoFormulario from '@/design-system/DialogoFormulario'
import { campoApi } from '@/services/api/operacionCampo'
import type { EncargoCampo } from '@/types/operacionCampo'
import { validarReprogramacion } from '@/utils/operacionCampo'
import { useMutacionCampo } from './useCampo'
import estilos from './OperacionCampo.module.css'

/** Cambia el periodo y el plazo de un encargo vivo, con la justificación que queda en su historial (AV-405). */
export function DialogoReprogramar({
  encargo,
  onCerrar,
  onGuardado,
}: {
  encargo: EncargoCampo
  onCerrar: () => void
  onGuardado: () => void
}) {
  const directo = encargo.periodicidad === 'Directo'
  const [inicio, setInicio] = useState(encargo.fecha_inicio)
  const [fin, setFin] = useState(encargo.fecha_fin)
  const [plazo, setPlazo] = useState(encargo.plazo_previsto)
  const [justificacion, setJustificacion] = useState('')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const mutacion = useMutacionCampo()
  // En el encargo directo el periodo termina en el plazo.
  const finEfectivo = directo ? plazo : fin
  const hayCambios =
    inicio !== encargo.fecha_inicio ||
    finEfectivo !== encargo.fecha_fin ||
    plazo !== encargo.plazo_previsto ||
    Boolean(justificacion)

  function guardar() {
    const entrada = { fecha_inicio: inicio, fecha_fin: finEfectivo, plazo_previsto: plazo, justificacion }
    const problemas = validarReprogramacion(encargo, entrada)
    setErrores(problemas)
    const primero = Object.keys(problemas)[0]
    if (primero) {
      document.getElementById(`reprogramar-${primero}`)?.focus()
      return
    }
    void mutacion.enviar(
      () =>
        campoApi(`encargos/${encargo.id}/reprogramacion/`, {
          metodo: 'POST',
          cuerpo: {
            ...(directo ? {} : { fecha_inicio: inicio, fecha_fin: fin }),
            plazo_previsto: plazo,
            justificacion: justificacion.trim(),
          },
        }),
      onGuardado,
    )
  }

  return (
    <DialogoFormulario
      abierto
      titulo="Reprogramar encargo"
      descripcion={`${encargo.descripcion} · ${encargo.cuadrilla_nombre}`}
      textoConfirmar="Reprogramar"
      onEnviar={guardar}
      onCerrar={onCerrar}
      enviando={mutacion.enviando}
      error={mutacion.error}
      hayCambios={hayCambios}
    >
      <fieldset className={estilos.formulario} disabled={mutacion.enviando}>
        <div className={estilos.rejilla}>
          {!directo && (
            <>
              <CampoFormulario
                id="reprogramar-fecha_inicio"
                etiqueta="Inicio del periodo"
                type="date"
                obligatorio
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                error={errores.fecha_inicio}
              />
              <CampoFormulario
                id="reprogramar-fecha_fin"
                etiqueta="Fin del periodo"
                type="date"
                obligatorio
                value={fin}
                onChange={(e) => setFin(e.target.value)}
                error={errores.fecha_fin}
              />
            </>
          )}
          <CampoFormulario
            id="reprogramar-plazo_previsto"
            etiqueta="Plazo previsto"
            type="date"
            obligatorio
            value={plazo}
            onChange={(e) => setPlazo(e.target.value)}
            error={errores.plazo_previsto}
            ayuda="Fecha límite para completar el encargo. Debe estar dentro del nuevo periodo programado."
          />
        </div>
        <AreaTexto
          id="reprogramar-justificacion"
          etiqueta="Justificación"
          obligatorio
          maxLength={1000}
          value={justificacion}
          onChange={(e) => setJustificacion(e.target.value)}
          error={errores.justificacion}
        />
        <p className={estilos.ayuda}>
          Las actividades ya registradas deben quedar dentro del nuevo periodo. El cambio queda en el historial del
          encargo.
        </p>
      </fieldset>
    </DialogoFormulario>
  )
}
