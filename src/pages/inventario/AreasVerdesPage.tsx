import { useState } from 'react'
import Boton, { BotonEnlace } from '../../components/ui/Boton'
import EstadoCarga from '../../components/ui/EstadoCarga'
import EstadoError from '../../components/ui/EstadoError'
import EstadoVacio from '../../components/ui/EstadoVacio'
import TablaDatos, { type ColumnaTabla } from '../../components/ui/TablaDatos'
import { puedeRegistrarAreasVerdes } from '../../config/permisosInventario'
import { useConsulta } from '../../hooks/useConsulta'
import { usePaginaActual } from '../../hooks/usePaginaActual'
import { MIGAS_INVENTARIO, RUTAS_INVENTARIO } from '../../router/rutasApp'
import { useSesionTercerizados } from '../../sesion/ContextoSesionTercerizados'
import { asignarAreaSector, listarAreasVerdes, listarHistorialSectorArea, listarSectores, listarTiposUso, listarCuarteles, modificarAreaVerde } from '../../services/api/inventario'
import Selector from '../../components/ui/Selector'
import type { AreaVerde, AsignacionSectorInventario, SectorInventario } from '../../types/mod02'
import estilos from './Inventario.module.css'

const COLUMNAS: ColumnaTabla<AreaVerde>[] = [
  { clave: 'nombre', titulo: 'Área verde', ordenable: true },
  { clave: 'lugar', titulo: 'Lugar o referente', ordenable: true },
  { clave: 'superficie_m2', titulo: 'Superficie', alineacion: 'derecha', render: (area) => `${area.superficie_m2} m²` },
  { clave: 'tipo_cobertura_nombre', titulo: 'Cobertura', render: (area) => area.tipo_cobertura_nombre ?? 'Sin cobertura' },
  { clave: 'tipo_uso_nombre', titulo: 'Tipo de uso', render: (area) => area.tipo_uso_nombre ?? 'Sin clasificar' },
  { clave: 'sector_nombre', titulo: 'Sector', render: (area) => area.sector_nombre ?? 'Sin sector' },
  { clave: 'cuartel_numero', titulo: 'Cuartel', render: (area) => area.cuartel_numero ?? '—' },
  { clave: 'ubicacion', titulo: 'Ubicación', multilinea: true },
]

export default function AreasVerdesPage() {
  usePaginaActual('Áreas verdes', [MIGAS_INVENTARIO.areasVerdes])
  const { estado: sesion } = useSesionTercerizados()
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const [sectorId, setSectorId] = useState('')
  const [usoId, setUsoId] = useState('')
  const [cuartelId, setCuartelId] = useState('')
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const puedeAsignarSectores = sesion.tipo === 'activa' && puedeRegistrarAreasVerdes(sesion.usuario.rol)
  const sectores = useConsulta('sectores-filtro', (signal) => listarSectores(false, signal))
  const usos = useConsulta('tipos-uso-filtro', (signal) => listarTiposUso(false, signal))
  const cuarteles = useConsulta('cuarteles-filtro', (signal) => listarCuarteles(false, signal))
  const consulta = useConsulta(
    `areas:${busqueda}:${sectorId}:${usoId}:${cuartelId}:${pagina}`,
    (signal) => listarAreasVerdes({ q: busqueda, page: pagina, sector_id: sectorId ? Number(sectorId) : undefined, tipo_uso_id: usoId ? Number(usoId) : undefined, cuartel_id: cuartelId ? Number(cuartelId) : undefined }, signal),
    (resultado) => resultado.results.length === 0,
  )
  const hayCriteriosConsulta = Boolean(busqueda.trim() || sectorId || usoId || cuartelId || pagina > 1)

  function limpiarFiltros() {
    setBusqueda('')
    setSectorId('')
    setUsoId('')
    setCuartelId('')
    setPagina(1)
  }

  if (consulta.estado === 'error' && !consulta.datos) {
    return <EstadoError titulo="No pudimos cargar las áreas verdes" descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} />
  }
  if (consulta.estado === 'vacio' && !hayCriteriosConsulta) {
    return (
      <div className={estilos.pagina}>
        <Acciones puedeRegistrar={sesion.tipo === 'activa' && puedeRegistrarAreasVerdes(sesion.usuario.rol)} />
        <EstadoVacio titulo="Aún no hay áreas verdes" descripcion="Registra un área para iniciar el inventario del campus." />
      </div>
    )
  }
  if (!consulta.datos) return consulta.cargaVisible ? <EstadoCarga forma="tabla" /> : null

  const columnas: ColumnaTabla<AreaVerde>[] = [
    ...COLUMNAS,
    {
      clave: 'sector_asignacion',
      titulo: 'Asignar sector',
      render: (area) => (
        <SectorArea
          area={area}
          sectores={sectores.datos ?? []}
          puedeAsignar={puedeAsignarSectores}
          alActualizar={consulta.reintentar}
        />
      ),
    },
    {
      clave: 'activo',
      titulo: 'Estado',
      render: (area) => area.activo ? (
        <button type="button" className={estilos.botonTabla} onClick={() => {
          setErrorAccion(null)
          void modificarAreaVerde(area.id, { activo: false })
            .then(() => consulta.reintentar())
            .catch((causa: unknown) => setErrorAccion(causa instanceof Error ? causa.message : 'No se pudo dar de baja el área.'))
        }}>Dar de baja</button>
      ) : 'De baja',
    },
  ]

  return (
    <div className={estilos.pagina}>
      <Acciones puedeRegistrar={sesion.tipo === 'activa' && puedeRegistrarAreasVerdes(sesion.usuario.rol)} />
      <label className={estilos.busqueda}>
        <span>Buscar por nombre</span>
        <input
          value={busqueda}
          onChange={(evento) => {
            setBusqueda(evento.target.value)
            setPagina(1)
          }}
          type="search"
        />
      </label>
      <div className={estilos.filtros}>
        {sectores.datos && <Selector id="filtro-sector" etiqueta="Sector" valor={sectorId} onCambiar={(valor) => { setSectorId(valor); setPagina(1) }} opcionTodos="Todos" opciones={sectores.datos.map((sector) => ({ valor: String(sector.id), texto: sector.nombre }))} />}
        {usos.datos && <Selector id="filtro-uso" etiqueta="Tipo de uso" valor={usoId} onCambiar={(valor) => { setUsoId(valor); setPagina(1) }} opcionTodos="Todos" opciones={usos.datos.map((uso) => ({ valor: String(uso.id), texto: uso.nombre }))} />}
        {cuarteles.datos && <Selector id="filtro-cuartel" etiqueta="Cuartel histórico" valor={cuartelId} onCambiar={(valor) => { setCuartelId(valor); setPagina(1) }} opcionTodos="Todos" opciones={cuarteles.datos.map((cuartel) => ({ valor: String(cuartel.id), texto: `${cuartel.numero} · ${cuartel.nombre}` }))} />}
      </div>
      {errorAccion && <p role="alert">{errorAccion}</p>}
      {consulta.estado === 'vacio' ? (
        <EstadoVacio
          nivel={3}
          titulo="No hay áreas verdes con estos criterios"
          descripcion="Prueba con otros criterios o limpia los filtros para volver a ver todo el inventario."
          accion={<Boton variante="secundario" onClick={limpiarFiltros}>Limpiar filtros</Boton>}
        />
      ) : (
        <TablaDatos
          titulo="Inventario de áreas verdes"
          tituloVisible
          columnas={columnas}
          filas={consulta.datos.results}
          claveFila={(area) => String(area.id)}
          estado={consulta.estado === 'cargando' ? 'cargando' : 'exito'}
          compacta
          paginacionServidor={{ pagina, total: consulta.datos.count, porPagina: 25, onCambiarPagina: setPagina }}
        />
      )}
    </div>
  )
}

function SectorArea({
  area,
  sectores,
  puedeAsignar,
  alActualizar,
}: {
  area: AreaVerde
  sectores: SectorInventario[]
  puedeAsignar: boolean
  alActualizar: () => void
}) {
  const [seleccion, setSeleccion] = useState(String(area.sector_id ?? ''))
  const [historial, setHistorial] = useState<AsignacionSectorInventario[] | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guardar() {
    setError(null)
    setCargando(true)
    try {
      await asignarAreaSector(area.id, seleccion ? Number(seleccion) : null)
      alActualizar()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo actualizar el sector del área.')
    } finally {
      setCargando(false)
    }
  }

  async function alternarHistorial() {
    if (historial !== null) {
      setHistorial(null)
      return
    }
    setCargando(true)
    setError(null)
    try {
      setHistorial(await listarHistorialSectorArea(area.id))
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo cargar el historial del área.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div>
      {puedeAsignar && area.activo && (
        <div className={estilos.accionesBotones}>
          <select aria-label={`Sector de ${area.nombre}`} value={seleccion} onChange={(evento) => setSeleccion(evento.target.value)}>
            <option value="">Sin sector</option>
            {sectores.map((sector) => <option key={sector.id} value={String(sector.id)}>{sector.nombre}{sector.atencion_demanda ? ' · a demanda' : ''}</option>)}
          </select>
          <button type="button" className={estilos.guardar} disabled={cargando || seleccion === String(area.sector_id ?? '')} onClick={() => void guardar()}>
            {cargando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      )}
      <button type="button" className={estilos.botonTabla} disabled={cargando} onClick={() => void alternarHistorial()}>
        {historial === null ? 'Ver historial' : 'Ocultar historial'}
      </button>
      {error && <p role="alert">{error}</p>}
      {historial !== null && (
        <div className={estilos.historial} aria-label={`Historial de sectores de ${area.nombre}`}>
          {historial.length ? historial.map((asignacion) => (
            <p key={asignacion.id}>{asignacion.sector_nombre} · desde {asignacion.fecha_inicio}{asignacion.fecha_fin ? ` · hasta ${asignacion.fecha_fin}` : ' · vigente'}</p>
          )) : <p>Sin asignaciones anteriores.</p>}
        </div>
      )}
    </div>
  )
}

function Acciones({ puedeRegistrar }: { puedeRegistrar: boolean }) {
  const { estado: sesion } = useSesionTercerizados()
  const puedeGestionarCoberturas = sesion.tipo === 'activa' && sesion.usuario.rol === 'Jefe de sección'
  return (
    <div className={estilos.acciones}>
      <p>Inventario centralizado de espacios verdes del campus.</p>
      <div className={estilos.accionesBotones}>
        <BotonEnlace to={RUTAS_INVENTARIO.ejemplares}>Ejemplares y especies</BotonEnlace>
        <BotonEnlace to={RUTAS_INVENTARIO.mapa}>Ver mapa del campus</BotonEnlace>
        {puedeGestionarCoberturas && <BotonEnlace to={RUTAS_INVENTARIO.coberturas}>Administrar coberturas</BotonEnlace>}
        {puedeGestionarCoberturas && <BotonEnlace to={RUTAS_INVENTARIO.catalogos}>Catálogos y sectores</BotonEnlace>}
        {puedeRegistrar && <BotonEnlace to={RUTAS_INVENTARIO.nuevaArea} variante="primario">Registrar área</BotonEnlace>}
      </div>
    </div>
  )
}
