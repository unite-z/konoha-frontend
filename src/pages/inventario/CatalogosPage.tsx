import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import AvisoEnLinea from '../../components/ui/AvisoEnLinea'
import CampoFormulario from '../../components/ui/CampoFormulario'
import EstadoCarga from '../../components/ui/EstadoCarga'
import EstadoError from '../../components/ui/EstadoError'
import { useConsulta } from '../../hooks/useConsulta'
import { usePaginaActual } from '../../hooks/usePaginaActual'
import { MIGAS_INVENTARIO } from '../../router/rutasApp'
import { cambiarCuartel, cambiarSector, cambiarTipoUso, crearCuartel, crearSector, crearTipoUso, listarCapataces, listarCuarteles, listarSectores, listarTiposUso, asignarCapataz, listarHistorialCapataz } from '../../services/api/inventario'
import type { AsignacionCapataz } from '../../types/mod02'
import { fechaLimaDeInstante } from '../../utils/instanteLima'
import type { InstanteIso } from '../../types/comun'
import { useSesionActiva } from '../../sesion/ContextoSesion'
import { PERMISOS, puede } from '../../config/permisosCore'
import estilos from './Inventario.module.css'

export default function CatalogosPage() {
  usePaginaActual('Catálogos y sectores', [MIGAS_INVENTARIO.areasVerdes, MIGAS_INVENTARIO.catalogos])
  const navegar = useNavigate()
  const sesion = useSesionActiva()
  const puedeEditar = puede(sesion, PERMISOS.gestionarCatalogos)
  const usos = useConsulta('tipos-uso-todos', (signal) => listarTiposUso(true, signal))
  const sectores = useConsulta('sectores-todos', (signal) => listarSectores(true, signal))
  const cuarteles = useConsulta('cuarteles-todos', (signal) => listarCuarteles(true, signal))
  const capataces = useConsulta('capataces', listarCapataces)
  const [tipoNombre, setTipoNombre] = useState('')
  const [sectorNombre, setSectorNombre] = useState('')
  const [sectorDemanda, setSectorDemanda] = useState(false)
  const [cuartelNumero, setCuartelNumero] = useState('')
  const [cuartelNombre, setCuartelNombre] = useState('')
  const [seleccionCapataz, setSeleccionCapataz] = useState<Record<number, string>>({})
  const [historiales, setHistoriales] = useState<Record<number, AsignacionCapataz[]>>({})
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function ejecutar(accion: () => Promise<unknown>, mensaje: string) {
    setError(null)
    setAviso(null)
    setGuardando(true)
    try {
      await accion()
      setAviso(mensaje)
      await Promise.all([usos.reintentar(), sectores.reintentar(), cuarteles.reintentar(), capataces.reintentar()])
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo guardar el cambio.')
    } finally {
      setGuardando(false)
    }
  }

  function enviar(evento: FormEvent<HTMLFormElement>, accion: () => Promise<unknown>, mensaje: string) {
    evento.preventDefault()
    void ejecutar(accion, mensaje)
  }

  async function alternarHistorial(sectorId: number) {
    if (Object.hasOwn(historiales, sectorId)) {
      setHistoriales((actual) => {
        const copia = { ...actual }
        delete copia[sectorId]
        return copia
      })
      return
    }
    try {
      const historial = await listarHistorialCapataz(sectorId)
      setHistoriales((actual) => ({ ...actual, [sectorId]: historial }))
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo cargar el historial de asignaciones.')
    }
  }

  if (!puedeEditar) return <EstadoError titulo="No tienes permiso para editar catálogos" descripcion="La administración está disponible para jefes de sección." onReintentar={() => navegar(MIGAS_INVENTARIO.areasVerdes.ruta)} />

  return (
    <div className={estilos.pagina}>
      <p>Tipos de uso, sectores de mantenimiento, capataces y cuarteles históricos opcionales.</p>
      {error && <AvisoEnLinea tono="error">{error}</AvisoEnLinea>}
      {aviso && <AvisoEnLinea tono="exito">{aviso}</AvisoEnLinea>}
      <section className={estilos.superficie} aria-labelledby="titulo-usos">
        <h2 id="titulo-usos">Tipos de uso</h2>
        <p>Se usan para clasificar y filtrar áreas. Desactivar conserva la referencia histórica.</p>
        <form className={estilos.filaCobertura} onSubmit={(e) => enviar(e, () => crearTipoUso(tipoNombre.trim()), 'Tipo de uso creado.') }>
          <CampoFormulario id="nuevo-tipo-uso" etiqueta="Añadir tipo de uso" value={tipoNombre} onChange={(e) => setTipoNombre(e.target.value)} maxLength={120} required />
          <button className={estilos.guardar} type="submit" disabled={guardando}>Añadir</button>
        </form>
        {usos.estado === 'cargando' && <EstadoCarga forma="tabla" filas={2} texto="Cargando tipos de uso…" retrasar />}
        {usos.estado === 'error' && <EstadoError titulo="No se pudieron cargar los tipos de uso" descripcion={usos.error?.detalle ?? ''} onReintentar={usos.reintentar} />}
        <ul className={estilos.listaCoberturas}>{usos.datos?.map((uso) => <li className={estilos.filaCobertura} key={uso.id}><span>{uso.nombre}{uso.activo ? '' : ' · inactivo'}</span><button type="button" className={estilos.guardar} disabled={guardando} onClick={() => void ejecutar(() => cambiarTipoUso(uso.id, { activo: !uso.activo }), uso.activo ? 'Tipo de uso desactivado.' : 'Tipo de uso activado.')}>{uso.activo ? 'Desactivar' : 'Activar'}</button></li>)}</ul>
      </section>
      <section className={estilos.superficie} aria-labelledby="titulo-sectores">
        <h2 id="titulo-sectores">Sectores de mantenimiento</h2>
        <p>La superficie se calcula a partir de las áreas asignadas. Los sectores a demanda permiten atender espacios sin sector fijo.</p>
        <form className={estilos.filaCobertura} onSubmit={(e) => enviar(e, () => crearSector({ nombre: sectorNombre.trim(), atencion_demanda: sectorDemanda }), 'Sector creado.') }>
          <CampoFormulario id="nuevo-sector" etiqueta="Nombre del sector" value={sectorNombre} onChange={(e) => setSectorNombre(e.target.value)} maxLength={120} required />
          <label className={estilos.check}><input type="checkbox" checked={sectorDemanda} onChange={(e) => setSectorDemanda(e.target.checked)} /> Atención a demanda</label>
          <button className={estilos.guardar} type="submit" disabled={guardando}>Añadir</button>
        </form>
        {capataces.estado === 'error' && <EstadoError titulo="No se pudieron cargar los capataces" descripcion={capataces.error?.detalle ?? ''} onReintentar={capataces.reintentar} />}
        <ul className={estilos.listaCoberturas}>{sectores.datos?.map((sector) => <li className={estilos.filaCobertura} key={sector.id}>
          <div><strong>{sector.nombre}</strong><div>{sector.superficie_m2} m² · {sector.capataz_nombre ?? 'Sin capataz asignado'}{sector.atencion_demanda ? ' · Atención a demanda' : ''}{sector.activo ? '' : ' · inactivo'}</div></div>
          <div className={estilos.accionesBotones}>
            <select aria-label={`Capataz de ${sector.nombre}`} value={seleccionCapataz[sector.id] ?? ''} onChange={(e) => setSeleccionCapataz((actual) => ({ ...actual, [sector.id]: e.target.value }))}>
              <option value="">Sin cambio de asignación</option><option value="0">Quitar capataz</option>
              {capataces.datos?.map((persona) => <option key={persona.id} value={persona.id}>{persona.nombre}</option>)}
            </select>
            <button type="button" className={estilos.guardar} disabled={guardando || !seleccionCapataz[sector.id]} onClick={() => { const value = seleccionCapataz[sector.id]; void ejecutar(() => asignarCapataz(sector.id, value === '0' ? null : Number(value)), 'Asignación de capataz actualizada.') }}>Asignar</button>
            <button type="button" className={estilos.guardar} disabled={guardando} onClick={() => void ejecutar(() => cambiarSector(sector.id, { activo: !sector.activo }), 'Sector actualizado.')}>{sector.activo ? 'Desactivar' : 'Activar'}</button>
            <button type="button" className={estilos.botonTabla} onClick={() => void alternarHistorial(sector.id)}>{Object.hasOwn(historiales, sector.id) ? 'Ocultar historial' : 'Ver historial'}</button>
          </div>
          {Object.hasOwn(historiales, sector.id) && <div className={estilos.historial} aria-label={`Historial de capataces de ${sector.nombre}`}>
            {historiales[sector.id]?.length ? historiales[sector.id]?.map((asignacion) => <p key={asignacion.id}>{asignacion.capataz_nombre} · desde {fechaLimaDeInstante(asignacion.fecha_inicio as InstanteIso) ?? asignacion.fecha_inicio}{asignacion.fecha_fin ? ` · hasta ${fechaLimaDeInstante(asignacion.fecha_fin as InstanteIso) ?? asignacion.fecha_fin}` : ' · vigente'}</p>) : <p>Sin asignaciones anteriores.</p>}
          </div>}
        </li>)}</ul>
      </section>
      <section className={estilos.superficie} aria-labelledby="titulo-cuarteles">
        <h2 id="titulo-cuarteles">Cuarteles históricos</h2>
        <p>La asociación es opcional. Los cuarteles desaparecidos siguen visibles en referencias históricas.</p>
        <form className={estilos.filaCobertura} onSubmit={(e) => enviar(e, () => crearCuartel({ numero: cuartelNumero.trim(), nombre: cuartelNombre.trim() }), 'Cuartel creado.') }>
          <CampoFormulario id="numero-cuartel" etiqueta="Número" value={cuartelNumero} onChange={(e) => setCuartelNumero(e.target.value)} maxLength={40} required />
          <CampoFormulario id="nombre-cuartel" etiqueta="Nombre" value={cuartelNombre} onChange={(e) => setCuartelNombre(e.target.value)} maxLength={120} required />
          <button className={estilos.guardar} type="submit" disabled={guardando}>Añadir</button>
        </form>
        <ul className={estilos.listaCoberturas}>{cuarteles.datos?.map((cuartel) => <li className={estilos.filaCobertura} key={cuartel.id}><span>{cuartel.numero} · {cuartel.nombre} · {cuartel.estado}</span><button type="button" className={estilos.guardar} disabled={guardando} onClick={() => void ejecutar(() => cambiarCuartel(cuartel.id, cuartel.estado === 'vigente' ? 'desaparecido' : 'vigente'), 'Estado del cuartel actualizado.')}>{cuartel.estado === 'vigente' ? 'Marcar desaparecido' : 'Restaurar'}</button></li>)}</ul>
      </section>
    </div>
  )
}
