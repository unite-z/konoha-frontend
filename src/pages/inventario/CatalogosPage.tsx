import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton from '@/components/ui/Boton'
import CampoFormulario from '@/components/ui/CampoFormulario'
import Casilla from '@/components/ui/Casilla'
import Estado from '@/components/ui/Estado'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import Selector from '@/components/ui/Selector'
import Tarjeta from '@/components/ui/Tarjeta'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_INVENTARIO } from '@/router/rutasApp'
import { cambiarCuartel, cambiarSector, cambiarTipoUso, crearCuartel, crearSector, crearTipoUso, listarCapataces, listarCuarteles, listarSectores, listarTiposUso, asignarCapataz, listarHistorialCapataz } from '@/services/api/catalogosInventario'
import type { AsignacionCapataz } from '@/types/catalogosInventario'
import { fechaLimaDeInstante } from '@/utils/instanteLima'
import type { InstanteIso } from '@/types/comun'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import { PERMISOS, puede } from '@/config/permisosCore'
import estilos from './Catalogos.module.css'

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
      <p className={estilos.descripcion}>Tipos de uso, sectores de mantenimiento, capataces y cuarteles históricos opcionales.</p>
      {error && <AvisoEnLinea tono="error">{error}</AvisoEnLinea>}
      {aviso && <AvisoEnLinea tono="exito">{aviso}</AvisoEnLinea>}

      <Tarjeta titulo="Tipos de uso" descripcion="Se usan para clasificar y filtrar áreas. Desactivar conserva la referencia histórica." relleno="amplio">
        <form className={estilos.alta} onSubmit={(e) => enviar(e, () => crearTipoUso(tipoNombre.trim()), 'Tipo de uso creado.')}>
          <CampoFormulario id="nuevo-tipo-uso" etiqueta="Añadir tipo de uso" value={tipoNombre} onChange={(e) => setTipoNombre(e.target.value)} maxLength={120} required />
          <Boton type="submit" variante="secundario" deshabilitado={guardando}>Añadir</Boton>
        </form>
        {usos.estado === 'cargando' && <EstadoCarga forma="tabla" filas={2} texto="Cargando tipos de uso…" retrasar />}
        {usos.estado === 'error' && <EstadoError titulo="No se pudieron cargar los tipos de uso" descripcion={usos.error?.detalle ?? ''} onReintentar={usos.reintentar} nivel={3} />}
        <ul className={estilos.lista}>
          {usos.datos?.map((uso) => (
            <li className={estilos.fila} key={uso.id}>
              <span className={estilos.dato}>
                {uso.nombre}
                {!uso.activo && <Estado tono="neutro" texto="Inactivo" />}
              </span>
              <Boton variante="fantasma" compacto deshabilitado={guardando} onClick={() => void ejecutar(() => cambiarTipoUso(uso.id, { activo: !uso.activo }), uso.activo ? 'Tipo de uso desactivado.' : 'Tipo de uso activado.')}>
                {uso.activo ? 'Desactivar' : 'Activar'}
              </Boton>
            </li>
          ))}
        </ul>
      </Tarjeta>

      <Tarjeta titulo="Sectores de mantenimiento" descripcion="La superficie se calcula a partir de las áreas asignadas. Los sectores a demanda permiten atender espacios sin sector fijo." relleno="amplio">
        <form className={estilos.alta} onSubmit={(e) => enviar(e, () => crearSector({ nombre: sectorNombre.trim(), atencion_demanda: sectorDemanda }), 'Sector creado.')}>
          <CampoFormulario id="nuevo-sector" etiqueta="Nombre del sector" value={sectorNombre} onChange={(e) => setSectorNombre(e.target.value)} maxLength={120} required />
          <Casilla id="sector-demanda" etiqueta="Atención a demanda" marcada={sectorDemanda} onCambiar={setSectorDemanda} />
          <Boton type="submit" variante="secundario" deshabilitado={guardando}>Añadir</Boton>
        </form>
        {capataces.estado === 'error' && <EstadoError titulo="No se pudieron cargar los capataces" descripcion={capataces.error?.detalle ?? ''} onReintentar={capataces.reintentar} nivel={3} />}
        <ul className={estilos.lista}>
          {sectores.datos?.map((sector) => (
            <li className={estilos.fila} key={sector.id}>
              <div>
                <span className={estilos.dato}>
                  <strong>{sector.nombre}</strong>
                  {!sector.activo && <Estado tono="neutro" texto="Inactivo" />}
                </span>
                <div className={estilos.detalle}>{sector.superficie_m2} m² · {sector.capataz_nombre ?? 'Sin capataz asignado'}{sector.atencion_demanda ? ' · Atención a demanda' : ''}</div>
              </div>
              <div className={estilos.accionesFila}>
                <Selector
                  id={`capataz-sector-${sector.id}`}
                  etiqueta={`Capataz de ${sector.nombre}`}
                  etiquetaOculta
                  compacto
                  valor={seleccionCapataz[sector.id] ?? ''}
                  onCambiar={(valor) => setSeleccionCapataz((actual) => ({ ...actual, [sector.id]: valor }))}
                  opcionTodos="Sin cambio de asignación"
                  opciones={[{ valor: '0', texto: 'Quitar capataz' }, ...(capataces.datos ?? []).map((persona) => ({ valor: String(persona.id), texto: persona.nombre }))]}
                />
                <Boton variante="secundario" compacto deshabilitado={guardando || !seleccionCapataz[sector.id]} onClick={() => { const value = seleccionCapataz[sector.id]; void ejecutar(() => asignarCapataz(sector.id, value === '0' ? null : Number(value)), 'Asignación de capataz actualizada.') }}>Asignar</Boton>
                <Boton variante="fantasma" compacto deshabilitado={guardando} onClick={() => void ejecutar(() => cambiarSector(sector.id, { activo: !sector.activo }), 'Sector actualizado.')}>{sector.activo ? 'Desactivar' : 'Activar'}</Boton>
                <Boton variante="fantasma" compacto onClick={() => void alternarHistorial(sector.id)}>{Object.hasOwn(historiales, sector.id) ? 'Ocultar historial' : 'Ver historial'}</Boton>
              </div>
              {Object.hasOwn(historiales, sector.id) && (
                <div className={estilos.historial} aria-label={`Historial de capataces de ${sector.nombre}`}>
                  {historiales[sector.id]?.length ? historiales[sector.id]?.map((asignacion) => <p key={asignacion.id}>{asignacion.capataz_nombre} · desde {fechaLimaDeInstante(asignacion.fecha_inicio as InstanteIso) ?? asignacion.fecha_inicio}{asignacion.fecha_fin ? ` · hasta ${fechaLimaDeInstante(asignacion.fecha_fin as InstanteIso) ?? asignacion.fecha_fin}` : ' · vigente'}</p>) : <p>Sin asignaciones anteriores.</p>}
                </div>
              )}
            </li>
          ))}
        </ul>
      </Tarjeta>

      <Tarjeta titulo="Cuarteles históricos" descripcion="La asociación es opcional. Los cuarteles desaparecidos siguen visibles en referencias históricas." relleno="amplio">
        <form className={estilos.alta} onSubmit={(e) => enviar(e, () => crearCuartel({ numero: cuartelNumero.trim(), nombre: cuartelNombre.trim() }), 'Cuartel creado.')}>
          <CampoFormulario id="numero-cuartel" etiqueta="Número" value={cuartelNumero} onChange={(e) => setCuartelNumero(e.target.value)} maxLength={40} required />
          <CampoFormulario id="nombre-cuartel" etiqueta="Nombre" value={cuartelNombre} onChange={(e) => setCuartelNombre(e.target.value)} maxLength={120} required />
          <Boton type="submit" variante="secundario" deshabilitado={guardando}>Añadir</Boton>
        </form>
        <ul className={estilos.lista}>
          {cuarteles.datos?.map((cuartel) => (
            <li className={estilos.fila} key={cuartel.id}>
              <span className={estilos.dato}>
                {cuartel.numero} · {cuartel.nombre}
                <Estado tono={cuartel.estado === 'vigente' ? 'exito' : 'neutro'} texto={cuartel.estado === 'vigente' ? 'Vigente' : 'Desaparecido'} />
              </span>
              <Boton variante="fantasma" compacto deshabilitado={guardando} onClick={() => void ejecutar(() => cambiarCuartel(cuartel.id, cuartel.estado === 'vigente' ? 'desaparecido' : 'vigente'), 'Estado del cuartel actualizado.')}>
                {cuartel.estado === 'vigente' ? 'Marcar desaparecido' : 'Restaurar'}
              </Boton>
            </li>
          ))}
        </ul>
      </Tarjeta>
    </div>
  )
}
