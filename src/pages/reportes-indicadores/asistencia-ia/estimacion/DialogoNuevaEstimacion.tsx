/**
 * «Nueva estimación» (RF-IA-004, CU-MOD06-006 pasos 1 a 4): la actividad registrada (buscador) o su descripción
 * (tipo, espacio, superficie, complejidad y nota). «Registrar recursos sin IA» está siempre disponible (criterio 4) y
 * vuelve a ofrecerse si la IA no responde (E1).
 */
import { useState } from 'react'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton from '@/components/ui/Boton'
import CampoFormulario, { AreaTexto } from '@/components/ui/CampoFormulario'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import GrupoOpciones from '@/components/ui/GrupoOpciones'
import Selector, { OPCION_TODOS } from '@/components/ui/Selector'
import SelectorBuscable from '@/components/ui/SelectorBuscable'
import { MOTIVO_CATALOGO_NO_DISPONIBLE } from '@/components/reportes-indicadores/useCatalogosFiltros'
import { useConsulta } from '@/hooks/useConsulta'
import { aErrorApi, type ErrorApi } from '@/services/api/cliente'
import { buscarActividadesEstimables, solicitarEstimacion } from '@/services/api/estimacionIa'
import { obtenerCatalogoComparacion } from '@/services/api/reportesGestion'
import type { ActividadEstimable, Complejidad, SolicitudEstimacion, SugerenciaEstimacion } from '@/types/estimacionIa'
import { formatearFecha } from '@/utils/formato'
import { enteroPositivo } from '@/utils/reportesGestion'
import { leerNumero } from '@/utils/estimacionIa'
import estilos from './Estimacion.module.css'

type Modo = 'actividad' | 'describir'

const MODOS: { valor: Modo; texto: string; descripcion: string }[] = [
  { valor: 'actividad', texto: 'Actividad registrada', descripcion: 'Un encargo o actividad de Operación de campo sin recursos confirmados' },
  { valor: 'describir', texto: 'Describir la actividad', descripcion: 'El tipo, el espacio y, si la conoces, la superficie' },
]

const COMPLEJIDADES: { valor: Complejidad; texto: string }[] = [
  { valor: 'Baja', texto: 'Baja' },
  { valor: 'Media', texto: 'Media' },
  { valor: 'Alta', texto: 'Alta' },
]

export interface DialogoNuevaEstimacionProps {
  abierto: boolean
  /** Actividad que llega en la URL (`?actividad_id=`), para que Operación de campo enlace desde su detalle. */
  actividadInicialId: number | null
  onCerrar: () => void
  onCreada: (estimacion: SugerenciaEstimacion) => void
  /** Abre el registro manual con la actividad o la descripción elegidas. */
  onManual: (contexto: { solicitud: SolicitudEstimacion; texto: string }) => void
}

export default function DialogoNuevaEstimacion({ abierto, actividadInicialId, onCerrar, onCreada, onManual }: DialogoNuevaEstimacionProps) {
  const [modo, setModo] = useState<Modo>('actividad')
  const [actividad, setActividad] = useState<ActividadEstimable | null>(null)
  const [tipo, setTipo] = useState('')
  const [espacio, setEspacio] = useState('')
  const [superficie, setSuperficie] = useState('')
  const [complejidad, setComplejidad] = useState<Complejidad | null>(null)
  const [nota, setNota] = useState('')
  const [errores, setErrores] = useState<{ actividad?: string; tipo?: string; superficie?: string }>({})
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<ErrorApi | null>(null)

  const catalogo = useConsulta(abierto && modo === 'describir' ? 'catalogo-comparacion' : null, obtenerCatalogoComparacion)
  const opciones = (lista: { id: number; nombre: string }[] | undefined) =>
    (lista ?? []).map((e) => ({ valor: String(e.id), texto: e.nombre })).sort((a, b) => a.texto.localeCompare(b.texto, 'es'))
  const bloqueo = catalogo.estado === 'error' ? MOTIVO_CATALOGO_NO_DISPONIBLE : undefined

  // La actividad de la URL llega preseleccionada (una sola vez).
  const inicial = useConsulta(abierto && actividadInicialId !== null ? `estimable|${actividadInicialId}` : null, (signal) =>
    buscarActividadesEstimables('', signal),
  )
  const [inicialAplicada, setInicialAplicada] = useState(false)
  if (!inicialAplicada && inicial.datos) {
    setInicialAplicada(true)
    setActividad(inicial.datos.results.find((a) => a.actividad_id === actividadInicialId) ?? null)
  }

  const iaNoDisponible = error?.estado === 503

  /** Solicitud y texto con lo elegido, o `null` si falta algo (y marca los errores). */
  function solicitud(): { solicitud: SolicitudEstimacion; texto: string } | null {
    const nuevos: typeof errores = {}
    const m2 = superficie.trim() === '' ? null : leerNumero(superficie)
    if (modo === 'actividad' && !actividad) nuevos.actividad = 'Elige la actividad'
    if (modo === 'describir' && !enteroPositivo(tipo)) nuevos.tipo = 'Elige el tipo de actividad'
    if (modo === 'describir' && superficie.trim() !== '' && (m2 === null || m2 <= 0)) nuevos.superficie = 'Indica una superficie mayor que 0'
    setErrores(nuevos)
    const primero = nuevos.actividad ? 'estimacion-actividad' : nuevos.tipo ? 'estimacion-tipo' : nuevos.superficie ? 'estimacion-superficie' : null
    if (primero) {
      document.getElementById(primero)?.focus()
      return null
    }
    if (modo === 'actividad' && actividad) {
      return { solicitud: { actividad_id: actividad.actividad_id }, texto: `${actividad.codigo} · ${actividad.tipo_actividad}` }
    }
    const nombreTipo = catalogo.datos?.tipos_servicio.find((t) => String(t.id) === tipo)?.nombre ?? 'Actividad descrita'
    return {
      solicitud: {
        descripcion: {
          tipo_servicio_id: enteroPositivo(tipo) ?? 0,
          area_verde_id: enteroPositivo(espacio) ?? null,
          superficie_m2: m2,
          complejidad,
          nota: nota.trim() || null,
        },
      },
      texto: nombreTipo,
    }
  }

  function cerrar() {
    setError(null)
    setErrores({})
    setInicialAplicada(false)
    onCerrar()
  }

  async function enviar() {
    if (enviando) return
    const elegido = solicitud()
    if (!elegido) return
    setEnviando(true)
    setError(null)
    try {
      onCreada(await solicitarEstimacion(elegido.solicitud))
    } catch (causa) {
      setError(aErrorApi(causa))
    } finally {
      setEnviando(false)
    }
  }

  function manual() {
    const elegido = solicitud()
    if (elegido) onManual(elegido)
  }

  return (
    <DialogoFormulario
      abierto={abierto}
      titulo="Nueva estimación"
      descripcion="La IA propone operarios, duración e insumos como referencia. Nada se registra hasta que lo confirmes."
      textoConfirmar="Solicitar estimación"
      enviando={enviando}
      error={error && !iaNoDisponible ? { titulo: 'No se pudo solicitar la estimación', detalle: error.detalle } : null}
      ancho="amplio"
      onEnviar={() => void enviar()}
      onCerrar={cerrar}
    >
      {iaNoDisponible && (
        <AvisoEnLinea tono="error" titulo="La IA no está disponible" accion={{ texto: 'Registrar recursos sin IA', onClick: manual }}>
          {error?.detalle}
        </AvisoEnLinea>
      )}
      <GrupoOpciones etiqueta="Qué quieres estimar" opciones={MODOS} valor={modo} onCambiar={setModo} />
      {modo === 'actividad' ? (
        <SelectorBuscable<ActividadEstimable>
          id="estimacion-actividad"
          etiqueta="Actividad"
          obligatorio
          valor={actividad}
          claveDe={(a) => a.actividad_id}
          textoDe={(a) => `${a.codigo} · ${a.tipo_actividad}`}
          detalleDe={(a) => [a.espacio, a.fecha_prevista && `Prevista el ${formatearFecha(a.fecha_prevista)}`].filter(Boolean).join(' · ')}
          buscar={(texto, signal) => buscarActividadesEstimables(texto, signal)}
          onCambiar={setActividad}
          placeholder="Busca por código, tipo o espacio"
          error={errores.actividad}
        />
      ) : (
        <div className={estilos.modoDescribir}>
          <Selector
            id="estimacion-tipo"
            etiqueta="Tipo de actividad"
            obligatorio
            valor={tipo}
            opciones={opciones(catalogo.datos?.tipos_servicio)}
            opcionTodos="Elige un tipo"
            bloqueadoMotivo={bloqueo}
            error={errores.tipo}
            onCambiar={setTipo}
          />
          <Selector
            id="estimacion-espacio"
            etiqueta="Espacio"
            valor={espacio}
            opciones={opciones(catalogo.datos?.espacios)}
            opcionTodos={`${OPCION_TODOS} los espacios`}
            bloqueadoMotivo={bloqueo}
            onCambiar={setEspacio}
          />
          <CampoFormulario
            id="estimacion-superficie"
            etiqueta="Superficie (m²)"
            formato="decimal"
            ayuda="Opcional"
            value={superficie}
            error={errores.superficie}
            onChange={(e) => setSuperficie(e.target.value)}
          />
          <GrupoOpciones etiqueta="Complejidad" opciones={COMPLEJIDADES} valor={complejidad} onCambiar={setComplejidad} />
          <AreaTexto id="estimacion-nota" etiqueta="Nota" ayuda="Opcional" rows={2} maxLength={500} value={nota} onChange={(e) => setNota(e.target.value)} />
        </div>
      )}
      <div>
        <Boton variante="fantasma" onClick={manual}>
          Registrar recursos sin IA
        </Boton>
      </div>
    </DialogoFormulario>
  )
}
