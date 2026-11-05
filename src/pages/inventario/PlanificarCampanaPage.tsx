import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton from '@/components/ui/Boton'
import CampoFormulario from '@/components/ui/CampoFormulario'
import Casilla from '@/components/ui/Casilla'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoSinAcceso from '@/components/ui/EstadoSinAcceso'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Tarjeta from '@/components/ui/Tarjeta'
import { PERMISOS, puede } from '@/config/permisosCore'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_INVENTARIO, rutaCampanaPoda } from '@/router/rutasApp'
import { ErrorApi } from '@/services/api/cliente'
import { cambiarCampana, consultarVentanaCierre, crearCampana, listarTodosEjemplaresCampana, obtenerCampana } from '@/services/api/campanasPoda'
import { listarEjemplares } from '@/services/api/ejemplares'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import type { ClaseCampana } from '@/types/campanasPoda'
import { calcularCapacidad, finSugerido } from '@/utils/capacidadCampana'
import { hoyLima } from '@/utils/instanteLima'
import estilos from './CampanasPoda.module.css'

const OBJETIVO_INICIAL = '12'

/** Lo que hace falta para mostrar un ejemplar elegido aunque ya no esté en los resultados de la búsqueda. */
interface EjemplarElegido {
  id: number
  codigo: string
  especie: string | null
}

function descripcion(ejemplar: EjemplarElegido): string {
  return `${ejemplar.codigo} · ${ejemplar.especie ?? 'Especie sin asignar'}`
}

export default function PlanificarCampanaPage() {
  const parametro = useParams().id
  const idEdicion = parametro ? Number(parametro) : null
  usePaginaActual(idEdicion ? 'Editar campaña' : 'Planificar campaña', [MIGAS_INVENTARIO.areasVerdes, MIGAS_INVENTARIO.campanasPoda, { texto: idEdicion ? 'Editar campaña' : 'Planificar campaña' }])
  const navegar = useNavigate()
  const sesion = useSesionActiva()
  const anio = Number(hoyLima().slice(0, 4))
  const [nombre, setNombre] = useState(`Cierre ${anio}-${anio + 1}`)
  const [inicio, setInicio] = useState('')
  const [fin, setFin] = useState('')
  const [objetivo, setObjetivo] = useState(OBJETIVO_INICIAL)
  const [clase, setClase] = useState<ClaseCampana>('Anual')
  const [motivo, setMotivo] = useState('')
  const [pedirMotivo, setPedirMotivo] = useState(false)
  const [estadoPedido, setEstadoPedido] = useState<'Borrador' | 'Planificada'>('Planificada')
  const [elegidos, setElegidos] = useState<EjemplarElegido[]>([])
  const [estadoCampana, setEstadoCampana] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [termino, setTermino] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [cargada, setCargada] = useState(idEdicion === null)

  const ventana = useConsulta(idEdicion === null ? `ventana-cierre|${anio}` : null, (signal) => consultarVentanaCierre(anio, signal))
  const resultados = useConsulta(`ejemplares-campana|${termino}`, (signal) => listarEjemplares(termino, 1, signal))
  const campana = useConsulta(idEdicion === null ? null : `campana-poda-edicion|${idEdicion}`, async (signal) => {
    const id = idEdicion as number
    const [datos, lista] = await Promise.all([obtenerCampana(id, signal), listarTodosEjemplaresCampana(id, signal)])
    return { datos, lista }
  })

  useEffect(() => {
    if (idEdicion !== null || !ventana.datos) return
    const { fecha_inicio: inicioCierre, fecha_fin: finCierre, duracion_maxima_dias: maximo } = ventana.datos
    setInicio((actual) => actual || inicioCierre)
    setFin((actual) => actual || finSugerido(inicioCierre, finCierre, maximo))
  }, [idEdicion, ventana.datos])

  useEffect(() => {
    if (!campana.datos || cargada) return
    const { datos, lista } = campana.datos
    setNombre(datos.nombre)
    setInicio(datos.fecha_inicio)
    setFin(datos.fecha_fin)
    setObjetivo(String(datos.objetivo_diario))
    setClase(datos.clase)
    setMotivo(datos.motivo_extraordinaria ?? '')
    setEstadoCampana(datos.estado)
    setElegidos(lista.map((ejemplar) => ({ id: ejemplar.id, codigo: ejemplar.codigo, especie: ejemplar.especie_nombre_comun })))
    setCargada(true)
  }, [campana.datos, cargada])

  function alternar(ejemplar: EjemplarElegido, marcada: boolean) {
    setElegidos((actuales) => (marcada ? [...actuales, ejemplar] : actuales.filter((otro) => otro.id !== ejemplar.id)))
  }

  async function guardar(estado: 'Borrador' | 'Planificada', claseEnvio: ClaseCampana = clase) {
    setError(null)
    setGuardando(true)
    const comunes = {
      nombre: nombre.trim(),
      fecha_inicio: inicio,
      fecha_fin: fin,
      objetivo_diario: Number(objetivo),
      motivo_extraordinaria: claseEnvio === 'Extraordinaria' ? motivo.trim() : null,
      ejemplar_ids: elegidos.map((ejemplar) => ejemplar.id),
    }
    try {
      const guardada = idEdicion === null
        ? await crearCampana({ ...comunes, clase: claseEnvio, estado })
        : await cambiarCampana(idEdicion, comunes)
      navegar(rutaCampanaPoda(guardada.id))
    } catch (causa) {
      if (causa instanceof ErrorApi && causa.codigo === 'campana-anual-existente') {
        setEstadoPedido(estado)
        setPedirMotivo(true)
      } else {
        setError(causa instanceof Error ? causa.message : 'No se pudo guardar la campaña.')
      }
      setGuardando(false)
    }
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    void guardar(idEdicion !== null && estadoCampana === 'Borrador' ? 'Borrador' : 'Planificada')
  }

  if (!puede(sesion, PERMISOS.planificarPoda)) return <EstadoSinAcceso descripcion="Solo el jefe de sección puede planificar la campaña." />
  if (campana.error?.estado === 403) return <EstadoSinAcceso descripcion={campana.error.detalle} />
  if (campana.estado === 'error' && !campana.datos) {
    return <EstadoError titulo="No pudimos cargar la campaña" descripcion={campana.error?.detalle ?? ''} onReintentar={campana.reintentar} />
  }
  if (!cargada) return <EstadoCarga forma="tabla" texto="Cargando campaña…" retrasar />

  const capacidad = calcularCapacidad(inicio, fin, Number(objetivo), elegidos.length)
  const seleccion = new Set(elegidos.map((ejemplar) => ejemplar.id))

  if (pedirMotivo) {
    return (
      <div className={estilos.pagina}>
        {error && <AvisoEnLinea tono="error">{error}</AvisoEnLinea>}
        <AvisoEnLinea tono="info" titulo="Ya existe una campaña anual">Puedes registrar una atención extraordinaria indicando el motivo.</AvisoEnLinea>
        <CampoFormulario id="motivo-extraordinario" etiqueta="Motivo extraordinario" value={motivo} onChange={(evento) => setMotivo(evento.target.value)} maxLength={300} required />
        <div className={estilos.acciones}>
          <Boton variante="secundario" deshabilitado={guardando} onClick={() => { setPedirMotivo(false); setClase('Anual') }}>Volver</Boton>
          <Boton variante="primario" cargando={guardando} deshabilitado={!motivo.trim()} onClick={() => { setClase('Extraordinaria'); void guardar(estadoPedido, 'Extraordinaria') }}>Continuar extraordinaria</Boton>
        </div>
      </div>
    )
  }

  return (
    <form className={estilos.pagina} onSubmit={enviar}>
      {error && <AvisoEnLinea tono="error">{error}</AvisoEnLinea>}
      {ventana.error?.estado === 409 && <AvisoEnLinea tono="advertencia" titulo="Cierre del campus sin registrar">{ventana.error.detalle}</AvisoEnLinea>}

      <Tarjeta titulo="Periodo y objetivo" descripcion="Durante el cierre del campus, con el máximo de días configurado." relleno="amplio">
        <div className={estilos.campos}>
          <CampoFormulario id="nombre-campana" etiqueta="Nombre" value={nombre} onChange={(evento) => setNombre(evento.target.value)} maxLength={100} required />
          <CampoFormulario id="inicio-campana" etiqueta="Inicio" type="date" value={inicio} onChange={(evento) => setInicio(evento.target.value)} required />
          <CampoFormulario id="fin-campana" etiqueta="Fin" type="date" value={fin} onChange={(evento) => setFin(evento.target.value)} required />
          <CampoFormulario id="objetivo-campana" etiqueta="Objetivo diario" type="number" min="1" step="1" value={objetivo} onChange={(evento) => setObjetivo(evento.target.value)} required />
        </div>
      </Tarjeta>

      <Tarjeta titulo="Ejemplares" descripcion={`${elegidos.length} seleccionados.`} relleno="amplio">
        <div className={estilos.busqueda} role="search" aria-label="Buscar ejemplares para la campaña">
          <CampoFormulario id="buscar-ejemplar-campana" etiqueta="Código o especie" type="search" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} />
          <Boton type="button" variante="secundario" onClick={() => setTermino(busqueda.trim())}>Buscar</Boton>
        </div>
        {resultados.estado === 'error' && <EstadoError titulo="No se pudieron cargar los ejemplares" descripcion={resultados.error?.detalle ?? ''} onReintentar={resultados.reintentar} nivel={3} />}
        {resultados.datos?.length === 0 && <EstadoVacio titulo="Sin coincidencias" descripcion="Comprueba el código o la especie." nivel={3} />}
        <ul className={estilos.lista}>
          {resultados.datos?.map((ejemplar) => {
            const elegido = { id: ejemplar.id, codigo: ejemplar.codigo, especie: ejemplar.especie_nombre_comun }
            return <li key={ejemplar.id}><Casilla etiqueta={descripcion(elegido)} ayuda={ejemplar.referencia_catastro ? `Catastro: ${ejemplar.referencia_catastro}` : undefined} marcada={seleccion.has(ejemplar.id)} onCambiar={(marcada) => alternar(elegido, marcada)} /></li>
          })}
        </ul>
      </Tarjeta>

      {elegidos.length > 0 && (
        <Tarjeta titulo="Seleccionados" relleno="amplio">
          <ul className={estilos.lista}>
            {elegidos.map((ejemplar) => <li key={ejemplar.id}><Casilla etiqueta={descripcion(ejemplar)} marcada onCambiar={() => alternar(ejemplar, false)} /></li>)}
          </ul>
        </Tarjeta>
      )}

      <Tarjeta titulo="Capacidad estimada" relleno="amplio">
        {capacidad ? (
          <>
            <p className={estilos.resumen}>{elegidos.length} seleccionados · {capacidad.dias} días · {capacidad.requerido_por_dia} al día · capacidad de {capacidad.estimada}.</p>
            {capacidad.excedida && <AvisoEnLinea tono="advertencia" titulo="Revisar capacidad">La lista supera el objetivo de {objetivo} al día. Prioriza ejemplares o ajusta el periodo.</AvisoEnLinea>}
          </>
        ) : <p className={estilos.descripcion}>Indica un periodo válido y un objetivo diario para calcularla.</p>}
      </Tarjeta>

      <div className={estilos.acciones}>
        <Boton type="submit" variante="primario" cargando={guardando}>{idEdicion === null ? 'Crear campaña' : 'Guardar cambios'}</Boton>
        {idEdicion === null && <Boton type="button" variante="secundario" deshabilitado={guardando} onClick={() => void guardar('Borrador')}>Guardar borrador</Boton>}
      </div>
    </form>
  )
}
