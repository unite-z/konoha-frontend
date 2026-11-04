/**
 * «Registrar interrupción» del corte (AV-270 y AV-258, HU-009, Figma 347-1342), solo para el jefe: zona afectada,
 * hora, motivo, zona alternativa de la ruta (con sus jardines pendientes y el aviso de hoy), avisar al proveedor y
 * registrar también como restricción. Si no hay zona libre, «Sin zona libre: reprogramar» lleva a programar el
 * servicio de nuevo. Hasta que exista el backend responde la simulación (D9).
 */
import { useState } from 'react'
import { Link } from 'react-router'
import Casilla from '@/components/ui/Casilla'
import CampoFormulario from '@/components/ui/CampoFormulario'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import GrupoOpciones from '@/components/ui/GrupoOpciones'
import Selector from '@/components/ui/Selector'
import { useConsulta } from '@/hooks/useConsulta'
import { RUTAS_PLANIFICACION } from '@/router/rutasApp'
import { listarZonasAlternativas, registrarInterrupcion } from '@/services/api/corte'
import type { CicloCorte, InterrupcionCorte } from '@/types/corte'
import type { Programacion } from '@/types/planificacion'
import { aInstanteLima, esLocalValido } from '@/utils/instanteLima'
import { porCortar } from './corte'
import estilos from './Ciclos.module.css'

export interface DialogoInterrupcionProps {
  ciclo: Programacion
  corte: CicloCorte
  /** `AAAA-MM-DDTHH:mm` de Lima: la hora propuesta. */
  ahora: string
  onCerrar: () => void
  onRegistrada: (interrupcion: InterrupcionCorte) => void
}

/** Zonas con jardines pendientes, con el primero de cada una («Sociales · Pabellón Z»). */
export function zonasAfectables(corte: CicloCorte): { valor: string; texto: string }[] {
  const primeras = new Map<string, string>()
  for (const jardin of porCortar(corte.jardines)) if (!primeras.has(jardin.zona)) primeras.set(jardin.zona, jardin.nombre)
  return [...primeras].map(([zona, jardin]) => ({ valor: zona, texto: `${zona} · ${jardin}` }))
}

export default function DialogoInterrupcion({ ciclo, corte, ahora, onCerrar, onRegistrada }: DialogoInterrupcionProps) {
  const zonas = zonasAfectables(corte)
  const detenida = corte.jardines.find((j) => j.detenido_por_interrupcion)?.zona
  const [zona, setZona] = useState(detenida ?? zonas[0]?.valor ?? '')
  const [hora, setHora] = useState(ahora)
  const [motivo, setMotivo] = useState('')
  const [alternativa, setAlternativa] = useState<string | null>(null)
  const [avisar, setAvisar] = useState(ciclo.proveedor !== null)
  const [comoRestriccion, setComoRestriccion] = useState(false)
  const [mostrarErrores, setMostrarErrores] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState<{ titulo: string; detalle: string } | null>(null)
  const alternativas = useConsulta(`zonas-alternativas:${ciclo.id}`, (signal) => listarZonasAlternativas(ciclo.id, signal))
  const opciones = (alternativas.datos ?? [])
    .filter((z) => z.zona !== zona)
    .map((z) => ({
      valor: z.zona,
      texto: z.zona,
      descripcion: `${z.pendientes} ${z.pendientes === 1 ? 'jardín pendiente' : 'jardines pendientes'} · ${z.aviso_hoy ? `aviso: ${z.aviso_hoy.toLowerCase()} hoy` : 'sin restricciones hoy'}`,
    }))
  const errores = {
    hora: esLocalValido(hora) ? undefined : 'Indica la hora.',
    motivo: motivo.trim() ? undefined : 'Escribe el motivo.',
    alternativa: alternativa ? undefined : 'Elige la zona a la que se traslada.',
  }

  async function detener() {
    setMostrarErrores(true)
    if (errores.hora || errores.motivo || errores.alternativa || !alternativa) return
    setEnviando(true)
    setErrorEnvio(null)
    try {
      const registrada = await registrarInterrupcion(ciclo.id, {
        zona_afectada: zona,
        zona_alternativa: alternativa,
        hora: aInstanteLima(hora),
        motivo: motivo.trim(),
        aviso_proveedor: avisar,
        registrar_restriccion: comoRestriccion,
      })
      onRegistrada(registrada)
    } catch (causa) {
      setErrorEnvio({ titulo: 'No se pudo registrar la interrupción', detalle: causa instanceof Error ? causa.message : 'Inténtalo de nuevo.' })
      setEnviando(false)
    }
  }

  return (
    <DialogoFormulario
      abierto
      ancho="medio"
      conCierre
      titulo="Registrar interrupción"
      textoConfirmar="Detener y trasladar"
      enviando={enviando}
      hayCambios={Boolean(motivo.trim() || alternativa)}
      error={errorEnvio}
      conObligatorios={false}
      onEnviar={() => void detener()}
      onCerrar={onCerrar}
    >
      <div className={estilos.filaInterrupcion}>
        <Selector id="interrupcion-zona" etiqueta="Zona afectada" obligatorio valor={zona} opciones={zonas} onCambiar={setZona} />
        <CampoFormulario
          id="interrupcion-hora"
          etiqueta="Hora"
          obligatorio
          type="datetime-local"
          value={hora}
          onChange={(e) => setHora(e.target.value)}
          error={mostrarErrores ? errores.hora : undefined}
        />
      </div>
      <CampoFormulario
        id="interrupcion-motivo"
        etiqueta="Motivo"
        obligatorio
        value={motivo}
        maxLength={300}
        onChange={(e) => setMotivo(e.target.value)}
        error={mostrarErrores ? errores.motivo : undefined}
      />
      <GrupoOpciones
        etiqueta="Zona alternativa"
        obligatorio
        idBase="interrupcion-alternativa"
        opciones={opciones}
        valor={alternativa}
        onCambiar={setAlternativa}
        error={mostrarErrores ? errores.alternativa : undefined}
      />
      {ciclo.proveedor && <Casilla id="interrupcion-avisar" etiqueta="Avisar al proveedor" marcada={avisar} onCambiar={setAvisar} />}
      <Casilla id="interrupcion-restriccion" etiqueta="Registrar también como restricción" marcada={comoRestriccion} onCambiar={setComoRestriccion} />
      <Link to={`${RUTAS_PLANIFICACION.calendario}?programar=${ciclo.tipo_servicio_id}`} className={estilos.enlace}>
        Sin zona libre: reprogramar
      </Link>
    </DialogoFormulario>
  )
}
