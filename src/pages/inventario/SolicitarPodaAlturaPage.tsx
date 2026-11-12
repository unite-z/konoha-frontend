import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton from '@/components/ui/Boton'
import CampoFormulario, { AreaTexto } from '@/components/ui/CampoFormulario'
import Estado from '@/components/ui/Estado'
import EstadoError from '@/components/ui/EstadoError'
import EstadoSinAcceso from '@/components/ui/EstadoSinAcceso'
import Selector from '@/components/ui/Selector'
import Tarjeta from '@/components/ui/Tarjeta'
import { PERMISOS, puede } from '@/config/permisosCore'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_INVENTARIO, rutaIntervencionPoda } from '@/router/rutasApp'
import { listarTiposIntervencion } from '@/services/api/catalogosInventario'
import { aErrorApi } from '@/services/api/cliente'
import { listarEjemplares } from '@/services/api/ejemplares'
import { consultarEjemplarPodaAltura, listarContratosPodaAltura, listarIncidenciasEjemplar, solicitarPodaAltura } from '@/services/api/intervencionesPoda'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import type { EjemplarPodaAltura, MotivoPodaAltura, PrioridadPoda } from '@/types/intervencionesPoda'
import { TEXTO_MOTIVO_PODA_ALTURA } from '@/utils/podaAltura'
import estilos from './CampanasPoda.module.css'

const PRIORIDADES: PrioridadPoda[] = ['Alta', 'Media', 'Baja']

/** Recomendación de RN-005 según la altura del ejemplar. */
function clasificacion(ejemplar: EjemplarPodaAltura): { tono: 'info' | 'aviso' | 'neutro'; texto: string } {
  if (ejemplar.altura_total_m === null) return { tono: 'neutro', texto: 'Altura sin registrar: no se puede aplicar la regla de los 5 m.' }
  if (ejemplar.requiere_justificacion) return { tono: 'aviso', texto: `Mide ${ejemplar.altura_total_m} m: corresponde poda menor con personal propio. Para enviarla al proveedor, explica por qué.` }
  return { tono: 'info', texto: `Mide ${ejemplar.altura_total_m} m: poda de altura mediante proveedor.` }
}

export default function SolicitarPodaAlturaPage() {
  usePaginaActual('Solicitar poda de altura', [MIGAS_INVENTARIO.areasVerdes, MIGAS_INVENTARIO.podaAltura])
  const navegar = useNavigate()
  const sesion = useSesionActiva()
  const [parametros] = useSearchParams()
  const [busqueda, setBusqueda] = useState('')
  const [termino, setTermino] = useState('')
  const [ejemplarId, setEjemplarId] = useState(parametros.get('ejemplar') ?? '')
  const [motivo, setMotivo] = useState('')
  const [contratoId, setContratoId] = useState('')
  const [tipoId, setTipoId] = useState('')
  const [prioridad, setPrioridad] = useState('')
  const [incidenciaId, setIncidenciaId] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [justificacion, setJustificacion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const puedeSolicitar = puede(sesion, PERMISOS.planificarPoda)
  const ejemplares = useConsulta(puedeSolicitar ? `poda-altura-ejemplares|${termino}` : null, (signal) => listarEjemplares(termino, 1, signal))
  const contratos = useConsulta(puedeSolicitar ? 'poda-altura-contratos' : null, listarContratosPodaAltura)
  const tipos = useConsulta(puedeSolicitar ? 'tipos-intervencion-activos' : null, (signal) => listarTiposIntervencion(false, signal))
  const ejemplar = useConsulta(ejemplarId ? `poda-altura-ejemplar|${ejemplarId}` : null, (signal) => consultarEjemplarPodaAltura(Number(ejemplarId), signal))
  const incidencias = useConsulta(ejemplarId ? `poda-altura-incidencias|${ejemplarId}` : null, (signal) => listarIncidenciasEjemplar(Number(ejemplarId), signal))

  if (!puedeSolicitar) return <EstadoSinAcceso descripcion="Solo el jefe de sección puede solicitar la poda de altura." />
  if (contratos.error?.estado === 403) return <EstadoSinAcceso descripcion={contratos.error.detalle} />

  const datosEjemplar = ejemplar.datos?.id === Number(ejemplarId) ? ejemplar.datos : null
  const pideJustificacion = datosEjemplar?.requiere_justificacion ?? false
  const completo = Boolean(ejemplarId && motivo && contratoId && descripcion.trim() && (!pideJustificacion || justificacion.trim()))

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!completo) return
    setError(null)
    setGuardando(true)
    try {
      const creada = await solicitarPodaAltura({
        ejemplar_id: Number(ejemplarId),
        motivo: motivo as MotivoPodaAltura,
        contrato_id: Number(contratoId),
        descripcion: descripcion.trim(),
        tipo_intervencion_id: tipoId ? Number(tipoId) : null,
        prioridad: prioridad ? (prioridad as PrioridadPoda) : null,
        incidencia_id: incidenciaId ? Number(incidenciaId) : null,
        justificacion: pideJustificacion ? justificacion.trim() : null,
      })
      navegar(rutaIntervencionPoda(creada.id))
    } catch (causa) {
      setError(aErrorApi(causa).detalle)
      setGuardando(false)
    }
  }

  const opcionesEjemplar = (ejemplares.datos ?? []).map((e) => ({ valor: String(e.id), texto: `${e.codigo} · ${e.especie_nombre_comun ?? 'Especie sin asignar'}` }))
  if (datosEjemplar && !opcionesEjemplar.some((o) => o.valor === ejemplarId)) {
    opcionesEjemplar.unshift({ valor: ejemplarId, texto: `${datosEjemplar.codigo} · ${datosEjemplar.especie_nombre_comun ?? 'Especie sin asignar'}` })
  }
  const sugerencia = datosEjemplar ? clasificacion(datosEjemplar) : null

  return (
    <form className={estilos.pagina} onSubmit={(evento) => void enviar(evento)}>
      <p className={estilos.descripcion}>Atención a demanda del proveedor, vinculada al ejemplar y con su motivo. Queda en el historial del árbol.</p>
      {error && <AvisoEnLinea tono="error">{error}</AvisoEnLinea>}

      <Tarjeta titulo="Ejemplar y motivo" descripcion="Motivos: riesgo, obstrucción, planta muerta o reducción de tamaño o de ramas." relleno="amplio">
        <div className={estilos.busqueda} role="search" aria-label="Buscar ejemplares">
          <CampoFormulario id="buscar-ejemplar-altura" etiqueta="Buscar por código o especie" type="search" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} />
          <Boton type="button" variante="secundario" onClick={() => setTermino(busqueda.trim())}>Buscar</Boton>
        </div>
        {ejemplares.estado === 'error' && <EstadoError titulo="No se pudieron cargar los ejemplares" descripcion={ejemplares.error?.detalle ?? ''} onReintentar={ejemplares.reintentar} nivel={3} />}
        <div className={estilos.campos}>
          <Selector id="ejemplar-altura" etiqueta="Ejemplar" valor={ejemplarId} onCambiar={(valor) => { setEjemplarId(valor); setIncidenciaId(''); setJustificacion('') }} opcionTodos="Selecciona un ejemplar" opciones={opcionesEjemplar} />
          <Selector id="motivo-altura" etiqueta="Motivo" valor={motivo} onCambiar={setMotivo} opcionTodos="Selecciona el motivo" opciones={(Object.keys(TEXTO_MOTIVO_PODA_ALTURA) as MotivoPodaAltura[]).map((valor) => ({ valor, texto: TEXTO_MOTIVO_PODA_ALTURA[valor] }))} />
        </div>
        {motivo === 'Riesgo' && <AvisoEnLinea tono="info" titulo="Atención de riesgo">Antes de iniciarla, el jefe o el ingeniero deben registrar la verificación de seguridad en Servicios tercerizados (RN-009).</AvisoEnLinea>}
        {motivo === 'PlantaMuerta' && <AvisoEnLinea tono="info" titulo="Planta muerta">El motivo queda registrado. El cambio de situación del ejemplar se hace en su ficha.</AvisoEnLinea>}
      </Tarjeta>

      {sugerencia && (
        <Tarjeta titulo="Clasificación sugerida" junto={<Estado tono={sugerencia.tono} texto="Sugerencia" />} relleno="amplio">
          <p className={estilos.resumen}>{sugerencia.texto}</p>
          {pideJustificacion && <AreaTexto id="justificacion-altura" etiqueta="Por qué va al proveedor" maxLength={300} required value={justificacion} onChange={(evento) => setJustificacion(evento.target.value)} />}
        </Tarjeta>
      )}

      <Tarjeta titulo="Datos para el proveedor" relleno="amplio">
        {contratos.estado === 'error' && <EstadoError titulo="No se pudieron cargar los contratos" descripcion={contratos.error?.detalle ?? ''} onReintentar={contratos.reintentar} nivel={3} />}
        {contratos.datos?.length === 0 && <AvisoEnLinea tono="advertencia" titulo="Sin contratos vigentes">Registra un contrato vigente de un servicio tercerizado en Servicios tercerizados.</AvisoEnLinea>}
        <div className={estilos.campos}>
          <Selector id="contrato-altura" etiqueta="Proveedor y contrato" valor={contratoId} onCambiar={setContratoId} opcionTodos="Selecciona el contrato" opciones={(contratos.datos ?? []).map((c) => ({ valor: String(c.id), texto: `${c.proveedor} · ${c.servicio} · ${c.numero}` }))} />
          <Selector id="tipo-altura" etiqueta="Tipo de intervención" valor={tipoId} onCambiar={setTipoId} opcionTodos="Sin especificar" opciones={(tipos.datos ?? []).map((t) => ({ valor: String(t.id), texto: t.nombre }))} />
          <Selector id="prioridad-altura" etiqueta="Prioridad" valor={prioridad} onCambiar={setPrioridad} opcionTodos="Sin prioridad" opciones={PRIORIDADES.map((valor) => ({ valor, texto: valor }))} />
          <Selector id="incidencia-altura" etiqueta="Incidencia de origen" valor={incidenciaId} onCambiar={setIncidenciaId} opcionTodos="Sin incidencia" opciones={(incidencias.datos ?? []).map((i) => ({ valor: String(i.id), texto: i.nombre }))} />
        </div>
        <AreaTexto id="descripcion-altura" etiqueta="Descripción" maxLength={1000} required value={descripcion} onChange={(evento) => setDescripcion(evento.target.value)} />
      </Tarjeta>

      <div className={estilos.acciones}>
        <Boton type="submit" variante="primario" cargando={guardando} deshabilitado={!completo}>Crear atención</Boton>
      </div>
    </form>
  )
}
