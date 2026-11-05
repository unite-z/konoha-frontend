import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton from '@/components/ui/Boton'
import CampoFormulario from '@/components/ui/CampoFormulario'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoSinAcceso from '@/components/ui/EstadoSinAcceso'
import Selector from '@/components/ui/Selector'
import Tarjeta from '@/components/ui/Tarjeta'
import ZonaCarga from '@/components/ui/ZonaCarga'
import { PERMISOS, puede } from '@/config/permisosCore'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_INVENTARIO, rutaCampanaPoda, rutaIntervencionPoda } from '@/router/rutasApp'
import { aErrorApi } from '@/services/api/cliente'
import { listarTodosEjemplaresCampana, obtenerCampana } from '@/services/api/campanasPoda'
import { subirAdjunto } from '@/services/api/core'
import { consultarCatalogosPoda, crearIntervencion, listarIncidenciasEjemplar } from '@/services/api/intervencionesPoda'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import type { PrioridadPoda } from '@/types/intervencionesPoda'
import { hoyLima } from '@/utils/instanteLima'
import estilos from './CampanasPoda.module.css'

const TIPOS_FOTO = '.jpg,.jpeg,.png'
const PRIORIDADES: PrioridadPoda[] = ['Alta', 'Media', 'Baja']

function textoONulo(valor: string): string | null {
  return valor.trim() === '' ? null : valor.trim()
}

export default function RegistrarPodaPage() {
  const campanaId = Number(useParams().id)
  usePaginaActual('Registrar intervención', [MIGAS_INVENTARIO.areasVerdes, MIGAS_INVENTARIO.campanasPoda, { texto: 'Registrar intervención' }])
  const navegar = useNavigate()
  const sesion = useSesionActiva()
  const [ejemplarId, setEjemplarId] = useState('')
  const [fecha, setFecha] = useState(hoyLima())
  const [tipoId, setTipoId] = useState('')
  const [reduccion, setReduccion] = useState('')
  const [ramas, setRamas] = useState('')
  const [solicitada, setSolicitada] = useState('')
  const [ejecutada, setEjecutada] = useState('')
  const [unidadId, setUnidadId] = useState('')
  const [prioridad, setPrioridad] = useState('')
  const [incidenciaId, setIncidenciaId] = useState('')
  const [foto, setFoto] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const campana = useConsulta(`registro-poda-campana|${campanaId}`, (signal) => obtenerCampana(campanaId, signal))
  const ejemplares = useConsulta(`registro-poda-ejemplares|${campanaId}`, (signal) => listarTodosEjemplaresCampana(campanaId, signal))
  const catalogos = useConsulta('registro-poda-catalogos', (signal) => consultarCatalogosPoda(signal))
  const incidencias = useConsulta(ejemplarId ? `registro-poda-incidencias|${ejemplarId}` : null, (signal) => listarIncidenciasEjemplar(Number(ejemplarId), signal))

  async function guardar() {
    setError(null)
    setGuardando(true)
    let creada: number | null = null
    try {
      const intervencion = await crearIntervencion({
        ejemplar_id: Number(ejemplarId),
        campana_id: campanaId,
        tipo_intervencion_id: Number(tipoId),
        fecha_ejecucion: fecha,
        incidencia_id: incidenciaId ? Number(incidenciaId) : null,
        reduccion_copa_pct: textoONulo(reduccion),
        ramas_laterales_cortadas: ramas === '' ? null : Number(ramas),
        cantidad_solicitada: textoONulo(solicitada),
        cantidad_ejecutada: textoONulo(ejecutada),
        unidad_medida_id: unidadId ? Number(unidadId) : null,
        prioridad: prioridad ? (prioridad as PrioridadPoda) : null,
      })
      creada = intervencion.id
      if (foto) await subirAdjunto('intervencion', intervencion.id, foto, crypto.randomUUID(), 'Fotografía de la poda')
      navegar(rutaIntervencionPoda(intervencion.id))
    } catch (causa) {
      // La intervención ya existe: la ficha deja reintentar la foto sin registrarla otra vez.
      if (creada !== null) {
        navegar(rutaIntervencionPoda(creada), { state: { errorFoto: aErrorApi(causa).detalle } })
        return
      }
      setError(aErrorApi(causa).detalle)
      setGuardando(false)
    }
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!ejemplarId || !tipoId || !fecha) return
    if ((solicitada.trim() || ejecutada.trim()) && !unidadId) return
    void guardar()
  }

  if (!puede(sesion, PERMISOS.registrarPoda)) return <EstadoSinAcceso descripcion="Solo el ingeniero de campo puede registrar la poda." />
  const fallo = campana.error ?? ejemplares.error ?? catalogos.error
  if (fallo?.estado === 403) return <EstadoSinAcceso descripcion={fallo.detalle} />
  if (fallo && (!campana.datos || !ejemplares.datos || !catalogos.datos)) {
    return <EstadoError titulo="No pudimos preparar el registro" descripcion={fallo.detalle} onReintentar={() => { campana.reintentar(); ejemplares.reintentar(); catalogos.reintentar() }} />
  }
  if (!campana.datos || !ejemplares.datos || !catalogos.datos) return <EstadoCarga forma="tabla" texto="Preparando el registro…" retrasar />

  if (campana.datos.estado !== 'EnEjecucion') {
    return (
      <div className={estilos.pagina}>
        <AvisoEnLinea tono="advertencia" titulo="La campaña no está en ejecución">Solo se registra la poda cuando el jefe de sección ha autorizado la ejecución.</AvisoEnLinea>
        <div className={estilos.acciones}>
          <Boton variante="secundario" onClick={() => navegar(rutaCampanaPoda(campanaId))}>Volver a la campaña</Boton>
        </div>
      </div>
    )
  }

  const hayCantidad = solicitada.trim() !== '' || ejecutada.trim() !== ''
  const completo = ejemplarId !== '' && tipoId !== '' && fecha !== '' && (!hayCantidad || unidadId !== '')

  return (
    <form className={estilos.pagina} onSubmit={enviar}>
      {error && <AvisoEnLinea tono="error">{error}</AvisoEnLinea>}

      <Tarjeta titulo="Ejemplar y fecha" descripcion={`Campaña ${campana.datos.nombre}.`} relleno="amplio">
        <div className={estilos.campos}>
          <Selector id="ejemplar-poda" etiqueta="Ejemplar" valor={ejemplarId} onCambiar={(valor) => { setEjemplarId(valor); setIncidenciaId('') }} opcionTodos="Selecciona un ejemplar" opciones={ejemplares.datos.map((ejemplar) => ({ valor: String(ejemplar.id), texto: `${ejemplar.codigo} · ${ejemplar.especie_nombre_comun ?? 'Especie sin asignar'}` }))} />
          <CampoFormulario id="fecha-poda" etiqueta="Fecha ejecutada" type="date" min={campana.datos.fecha_inicio} max={campana.datos.fecha_fin} value={fecha} onChange={(evento) => setFecha(evento.target.value)} required />
        </div>
      </Tarjeta>

      <Tarjeta titulo="Detalle de poda" relleno="amplio">
        <div className={estilos.campos}>
          <Selector id="tipo-poda" etiqueta="Tipo de poda" valor={tipoId} onCambiar={setTipoId} opcionTodos="Selecciona un tipo" opciones={catalogos.datos.tipos.map((tipo) => ({ valor: String(tipo.id), texto: tipo.nombre }))} />
          <CampoFormulario id="reduccion-poda" etiqueta="Reducción de copa (%)" type="number" min="0" max="100" step="0.01" value={reduccion} onChange={(evento) => setReduccion(evento.target.value)} />
          <CampoFormulario id="ramas-poda" etiqueta="Ramas laterales cortadas" type="number" min="0" step="1" value={ramas} onChange={(evento) => setRamas(evento.target.value)} />
          <CampoFormulario id="solicitada-poda" etiqueta="Cantidad solicitada" type="number" min="0" step="0.01" value={solicitada} onChange={(evento) => setSolicitada(evento.target.value)} />
          <CampoFormulario id="ejecutada-poda" etiqueta="Cantidad ejecutada" type="number" min="0" step="0.01" value={ejecutada} onChange={(evento) => setEjecutada(evento.target.value)} />
          <Selector id="unidad-poda" etiqueta="Unidad" valor={unidadId} onCambiar={setUnidadId} opcionTodos="Sin unidad" opciones={catalogos.datos.unidades.map((unidad) => ({ valor: String(unidad.id), texto: unidad.nombre }))} />
          <Selector id="prioridad-poda" etiqueta="Prioridad" valor={prioridad} onCambiar={setPrioridad} opcionTodos="Sin prioridad" opciones={PRIORIDADES.map((valor) => ({ valor, texto: valor }))} />
          <Selector id="incidencia-poda" etiqueta="Incidencia de origen" valor={incidenciaId} onCambiar={setIncidenciaId} opcionTodos="Sin incidencia" opciones={(incidencias.datos ?? []).map((incidencia) => ({ valor: String(incidencia.id), texto: incidencia.nombre }))} />
        </div>
      </Tarjeta>

      <Tarjeta titulo="Fotografía de evidencia" descripcion="Sin foto queda incompleta y no cuenta como verificada." relleno="amplio">
        <ZonaCarga compacta multiple={false} acepta={TIPOS_FOTO} ayuda="JPEG o PNG, de hasta 20 MB." textoBoton="Adjuntar fotografía" deshabilitada={guardando} onArchivos={(archivos) => setFoto(archivos[0] ?? null)} />
        {foto && <p className={estilos.resumen}>Fotografía elegida: {foto.name}</p>}
      </Tarjeta>

      {hayCantidad && !unidadId && <AvisoEnLinea tono="advertencia">Indica la unidad de las cantidades.</AvisoEnLinea>}
      {!foto && <AvisoEnLinea tono="advertencia" titulo="Incompleta">Falta la fotografía. Puedes guardarla ahora y añadirla después desde la ficha.</AvisoEnLinea>}

      <div className={estilos.acciones}>
        <Boton type="submit" variante="primario" cargando={guardando} deshabilitado={!completo}>{foto ? 'Guardar intervención' : 'Guardar incompleta'}</Boton>
        <Boton type="button" variante="secundario" deshabilitado={guardando} onClick={() => navegar(rutaCampanaPoda(campanaId))}>Cancelar</Boton>
      </div>
    </form>
  )
}
