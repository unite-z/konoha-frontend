/**
 * «Solicitar priorización» (RN-IA-002): alcance, espacio y servicio opcionales y horizonte. La IA solo propone.
 * Si la IA no está disponible (503), el aviso ofrece «Continuar sin IA»: el flujo manual en Planificación.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router'
import AvisoEnLinea from '../../../../components/ui/AvisoEnLinea'
import DialogoFormulario from '../../../../components/ui/DialogoFormulario'
import GrupoOpciones from '../../../../components/ui/GrupoOpciones'
import Selector, { OPCION_TODOS } from '../../../../components/ui/Selector'
import { MOTIVO_CATALOGO_NO_DISPONIBLE } from '../../../../components/reportes-indicadores/useCatalogosFiltros'
import { useConsulta } from '../../../../hooks/useConsulta'
import { RUTAS_PLANIFICACION } from '../../../../router/rutasApp'
import { aErrorApi, type ErrorApi } from '../../../../services/api/cliente'
import { solicitarPriorizacion } from '../../../../services/api/priorizacionIa'
import { obtenerCatalogoComparacion } from '../../../../services/api/reportesGestion'
import type { AlcancePriorizacion, SolicitudPriorizacion, SugerenciaPriorizacion } from '../../../../types/priorizacionIa'
import { enteroPositivo } from '../../../../utils/reportesGestion'
import { OPCIONES_ALCANCE } from '../../../../utils/priorizacionIa'

const HORIZONTES: SolicitudPriorizacion['horizonte_dias'][] = [7, 15, 30]

/** `GrupoOpciones` en fila para valores de texto o número (el horizonte en días es un número). */
function GrupoRadios<V extends string | number>({
  leyenda,
  nombre,
  opciones,
  valor,
  onCambiar,
}: {
  leyenda: string
  nombre: string
  opciones: readonly { valor: V; texto: string }[]
  valor: V
  onCambiar: (valor: V) => void
}) {
  return (
    <GrupoOpciones
      etiqueta={leyenda}
      nombre={nombre}
      horizontal
      opciones={opciones.map((o) => ({ valor: String(o.valor), texto: o.texto }))}
      valor={String(valor)}
      onCambiar={(texto) => {
        const elegida = opciones.find((o) => String(o.valor) === texto)
        if (elegida) onCambiar(elegida.valor)
      }}
    />
  )
}

export interface DialogoSolicitudPriorizacionProps {
  abierto: boolean
  onCerrar: () => void
  onCreada: (propuesta: SugerenciaPriorizacion) => void
}

export default function DialogoSolicitudPriorizacion({ abierto, onCerrar, onCreada }: DialogoSolicitudPriorizacionProps) {
  const navigate = useNavigate()
  const [alcance, setAlcance] = useState<AlcancePriorizacion>('Ambos')
  const [espacio, setEspacio] = useState('')
  const [servicio, setServicio] = useState('')
  const [horizonte, setHorizonte] = useState<SolicitudPriorizacion['horizonte_dias']>(15)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<ErrorApi | null>(null)
  const catalogo = useConsulta(abierto ? 'catalogo-comparacion' : null, obtenerCatalogoComparacion)
  const bloqueo = catalogo.estado === 'error' ? MOTIVO_CATALOGO_NO_DISPONIBLE : undefined
  const opciones = (lista: { id: number; nombre: string }[] | undefined) =>
    (lista ?? []).map((e) => ({ valor: String(e.id), texto: e.nombre })).sort((a, b) => a.texto.localeCompare(b.texto, 'es'))
  const iaNoDisponible = error?.estado === 503

  function cerrar() {
    setError(null)
    onCerrar()
  }

  async function enviar() {
    if (enviando) return
    setEnviando(true)
    setError(null)
    try {
      const propuesta = await solicitarPriorizacion({
        alcance,
        area_verde_id: enteroPositivo(espacio),
        tipo_servicio_id: enteroPositivo(servicio),
        horizonte_dias: horizonte,
      })
      onCreada(propuesta)
    } catch (causa) {
      setError(aErrorApi(causa))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <DialogoFormulario
      abierto={abierto}
      titulo="Solicitar priorización"
      descripcion="La IA solo propone. Nada cambia en la programación hasta que valides."
      textoConfirmar="Solicitar priorización"
      enviando={enviando}
      error={error && !iaNoDisponible ? { titulo: 'No se pudo solicitar la priorización', detalle: error.detalle } : null}
      onEnviar={() => void enviar()}
      onCerrar={cerrar}
    >
      {iaNoDisponible && (
        <AvisoEnLinea
          tono="error"
          titulo="La IA no está disponible"
          accion={{ texto: 'Continuar sin IA', onClick: () => navigate(RUTAS_PLANIFICACION.servicios) }}
        >
          {error?.detalle}
        </AvisoEnLinea>
      )}
      <GrupoRadios leyenda="Qué priorizar" nombre="priorizacion-alcance" opciones={OPCIONES_ALCANCE} valor={alcance} onCambiar={setAlcance} />
      <Selector
        id="priorizacion-espacio"
        etiqueta="Espacio"
        valor={espacio}
        opciones={opciones(catalogo.datos?.espacios)}
        opcionTodos={`${OPCION_TODOS} los espacios`}
        bloqueadoMotivo={bloqueo}
        onCambiar={setEspacio}
      />
      <Selector
        id="priorizacion-servicio"
        etiqueta="Servicio"
        valor={servicio}
        opciones={opciones(catalogo.datos?.tipos_servicio)}
        opcionTodos={`${OPCION_TODOS} los servicios`}
        bloqueadoMotivo={bloqueo}
        onCambiar={setServicio}
      />
      <GrupoRadios
        leyenda="Horizonte que quieres programar"
        nombre="priorizacion-horizonte"
        opciones={HORIZONTES.map((h) => ({ valor: h, texto: `${h} días` }))}
        valor={horizonte}
        onCambiar={setHorizonte}
      />
    </DialogoFormulario>
  )
}
