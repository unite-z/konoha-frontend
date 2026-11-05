import { useState } from 'react'
import Boton, { BotonEnlace } from '@/components/ui/Boton'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import CampoFormulario from '@/components/ui/CampoFormulario'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import Selector from '@/components/ui/Selector'
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
import Tarjeta from '@/components/ui/Tarjeta'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import AccionesPagina from '@/layouts/LayoutOficina/AccionesPagina'
import { MIGAS_INVENTARIO, RUTAS_INVENTARIO } from '@/router/rutasApp'
import { asignarSectorArea, listarAreasVerdes, listarHistorialSectorArea, type HistorialSectorArea } from '@/services/api/areasVerdes'
import { listarCuarteles, listarSectores, listarTiposUso } from '@/services/api/catalogosInventario'
import type { SectorInventario } from '@/types/catalogosInventario'
import type { AreaVerde } from '@/types/areasVerdes'
import { PERMISOS, puede } from '@/config/permisosCore'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import estilos from './AreasVerdes.module.css'

const COLUMNAS: ColumnaTabla<AreaVerde>[] = [
  { clave: 'nombre', titulo: 'Nombre', multilinea: true, render: (area) => area.nombre },
  { clave: 'lugar', titulo: 'Lugar', multilinea: true, render: (area) => area.lugar },
  { clave: 'superficie', titulo: 'Superficie', alineacion: 'derecha', render: (area) => `${area.superficie_m2} m²` },
  { clave: 'sector', titulo: 'Sector', render: (area) => area.sector_nombre ?? 'Sin sector' },
  { clave: 'cuartel', titulo: 'Cuartel histórico', render: (area) => area.cuartel_numero ?? '—' },
  { clave: 'cobertura', titulo: 'Cobertura', render: (area) => area.tipo_cobertura_nombre ?? 'Sin cobertura' },
  { clave: 'tipo-uso', titulo: 'Tipo de uso', render: (area) => area.tipo_uso_nombre ?? 'Sin tipo de uso' },
  { clave: 'ubicacion', titulo: 'Ubicación', multilinea: true, render: (area) => area.ubicacion },
]

function GestionSectorArea({ area, sectores, editable, alGuardar }: {
  area: AreaVerde
  sectores: SectorInventario[]
  editable: boolean
  alGuardar: () => void
}) {
  const [sectorId, setSectorId] = useState(area.sector_id ? String(area.sector_id) : '')
  const [historial, setHistorial] = useState<HistorialSectorArea[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function guardarSector() {
    setError(null)
    setGuardando(true)
    try {
      await asignarSectorArea(area.id, sectorId ? Number(sectorId) : null)
      alGuardar()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo cambiar el sector.')
    } finally {
      setGuardando(false)
    }
  }

  async function mostrarHistorial() {
    setError(null)
    try {
      setHistorial(await listarHistorialSectorArea(area.id))
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo cargar el historial del sector.')
    }
  }

  return (
    <div className={estilos.gestionSector}>
      {editable ? <>
        <Selector id={`sector-actual-${area.id}`} etiqueta={`Sector de ${area.nombre}`} etiquetaOculta compacto valor={sectorId} onCambiar={setSectorId} opcionTodos="Sin sector" opciones={sectores.map((sector) => ({ valor: String(sector.id), texto: sector.nombre }))} />
        <Boton variante="secundario" compacto deshabilitado={guardando || sectorId === (area.sector_id ? String(area.sector_id) : '')} onClick={() => void guardarSector()}>Guardar</Boton>
      </> : <span>{area.sector_nombre ?? 'Sin sector'}</span>}
      <Boton variante="fantasma" compacto onClick={() => void mostrarHistorial()}>Historial</Boton>
      {error && <AvisoEnLinea tono="error">{error}</AvisoEnLinea>}
      {historial && <ul className={estilos.historialSector}>{historial.length ? historial.map((registro) => (
        <li key={registro.id}>{registro.sector_nombre} · {registro.fecha_inicio}{registro.fecha_fin ? ` – ${registro.fecha_fin}` : ' · vigente'}</li>
      )) : <li>Sin asignaciones anteriores.</li>}</ul>}
    </div>
  )
}

export default function AreasVerdesPage() {
  usePaginaActual('Áreas verdes', [MIGAS_INVENTARIO.areasVerdes])
  const sesion = useSesionActiva()
  const puedeGestionar = puede(sesion, PERMISOS.gestionarCatalogos)
  const [busqueda, setBusqueda] = useState('')
  const [sectorId, setSectorId] = useState('')
  const [cuartelId, setCuartelId] = useState('')
  const [tipoUsoId, setTipoUsoId] = useState('')
  const sectores = useConsulta('areas-filtro-sectores', (signal) => listarSectores(false, signal))
  const cuarteles = useConsulta('areas-filtro-cuarteles', (signal) => listarCuarteles(true, signal))
  const tiposUso = useConsulta('areas-filtro-tipos-uso', (signal) => listarTiposUso(false, signal))
  const filtros = { sector_id: sectorId ? Number(sectorId) : undefined, cuartel_id: cuartelId ? Number(cuartelId) : undefined, tipo_uso_id: tipoUsoId ? Number(tipoUsoId) : undefined }
  const consulta = useConsulta(`areas:${busqueda}:${sectorId}:${cuartelId}:${tipoUsoId}`, (signal) => listarAreasVerdes(busqueda, signal, filtros))

  if (consulta.estado === 'error' && !consulta.datos) {
    return <EstadoError titulo="No pudimos cargar las áreas verdes" descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} />
  }
  if (!consulta.datos) return <EstadoCarga forma="tabla" />

  return (
    <>
      <AccionesPagina>
        <BotonEnlace to={RUTAS_INVENTARIO.mapa}>Ver mapa</BotonEnlace>
        <BotonEnlace to={RUTAS_INVENTARIO.nuevaArea} variante="primario">Registrar área</BotonEnlace>
      </AccionesPagina>
      <Tarjeta titulo="Inventario de áreas verdes" descripcion="Consulta y registra los espacios verdes del campus." relleno="amplio">
        <div className={estilos.busqueda}>
          <CampoFormulario id="busqueda-areas" etiqueta="Buscar por nombre" type="search" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} />
        </div>
        <div className={estilos.filtros}>
          {sectores.datos && <Selector
            id="filtro-sector-area"
            etiqueta="Sector"
            valor={sectorId}
            onCambiar={setSectorId}
            opcionTodos="Todos los sectores"
            opciones={sectores.datos.map((sector) => ({ valor: String(sector.id), texto: sector.nombre }))}
          />}
          {cuarteles.datos && <Selector id="filtro-cuartel-area" etiqueta="Cuartel histórico" valor={cuartelId} onCambiar={setCuartelId} opcionTodos="Todos los cuarteles" opciones={cuarteles.datos.map((cuartel) => ({ valor: String(cuartel.id), texto: `${cuartel.numero} · ${cuartel.nombre}${cuartel.estado === 'desaparecido' ? ' (desaparecido)' : ''}` }))} />}
          {tiposUso.datos && <Selector
            id="filtro-uso-area"
            etiqueta="Tipo de uso"
            valor={tipoUsoId}
            onCambiar={setTipoUsoId}
            opcionTodos="Todos los tipos de uso"
            opciones={tiposUso.datos.map((uso) => ({ valor: String(uso.id), texto: uso.nombre }))}
          />}
          {sectores.estado === 'error' && <EstadoError titulo="No se pudieron cargar los sectores" descripcion={sectores.error?.detalle ?? ''} onReintentar={sectores.reintentar} nivel={3} />}
          {cuarteles.estado === 'error' && <EstadoError titulo="No se pudieron cargar los cuarteles" descripcion={cuarteles.error?.detalle ?? ''} onReintentar={cuarteles.reintentar} nivel={3} />}
          {tiposUso.estado === 'error' && <EstadoError titulo="No se pudieron cargar los tipos de uso" descripcion={tiposUso.error?.detalle ?? ''} onReintentar={tiposUso.reintentar} nivel={3} />}
        </div>
        <div className={estilos.tablaAreas}>
          <TablaDatos
            titulo="Áreas verdes"
            columnas={puedeGestionar ? [
              ...COLUMNAS.filter((columna) => columna.clave !== 'sector'),
              {
                clave: 'sector',
                titulo: 'Sector y cambios',
                render: (area) => <GestionSectorArea
                  area={area}
                  sectores={sectores.datos ?? []}
                  editable={puedeGestionar}
                  alGuardar={() => void consulta.reintentar()}
                />,
              },
            ] : COLUMNAS}
            filas={consulta.datos.results}
            claveFila={(area) => String(area.id)}
            vacio={{ titulo: 'Aún no hay áreas verdes', descripcion: 'Registra un área para iniciar el inventario del campus.' }}
          />
        </div>
      </Tarjeta>
    </>
  )
}
