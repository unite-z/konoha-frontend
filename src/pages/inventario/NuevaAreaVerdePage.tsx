import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import AvisoEnLinea from '../../components/ui/AvisoEnLinea'
import { BotonEnlace } from '../../components/ui/Boton'
import EstadoCarga from '../../components/ui/EstadoCarga'
import EstadoError from '../../components/ui/EstadoError'
import CampoFormulario from '../../components/ui/CampoFormulario'
import Selector from '../../components/ui/Selector'
import { useConsulta } from '../../hooks/useConsulta'
import { usePaginaActual } from '../../hooks/usePaginaActual'
import { MIGAS_INVENTARIO, RUTAS_INVENTARIO } from '../../router/rutasApp'
import { useSesionActiva } from '../../sesion/ContextoSesion'
import { PERMISOS, puede } from '../../config/permisosCore'
import { listarCoberturasActivas, listarCuarteles, listarSectores, listarTiposUso, registrarAreaVerde } from '../../services/api/inventario'
import estilos from './Inventario.module.css'

export default function NuevaAreaVerdePage() {
  usePaginaActual('Registrar área verde', [MIGAS_INVENTARIO.areasVerdes, { texto: 'Registrar área' }])
  const navegar = useNavigate()
  const sesion = useSesionActiva()
  const consulta = useConsulta('coberturas-activas', listarCoberturasActivas)
  const usos = useConsulta('tipos-uso-activos', (signal) => listarTiposUso(false, signal))
  const sectores = useConsulta('sectores-activos', (signal) => listarSectores(false, signal))
  const cuarteles = useConsulta('cuarteles-vigentes', (signal) => listarCuarteles(false, signal))
  const [nombre, setNombre] = useState('')
  const [lugar, setLugar] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [superficie, setSuperficie] = useState('')
  const [coberturaId, setCoberturaId] = useState('')
  const [usoId, setUsoId] = useState('')
  const [sectorId, setSectorId] = useState('')
  const [cuartelId, setCuartelId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const puedeRegistrar = puede(sesion, PERMISOS.registrarInventario)

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setError(null)
    setGuardando(true)
    try {
      await registrarAreaVerde({
        nombre: nombre.trim(),
        lugar: lugar.trim(),
        ubicacion: ubicacion.trim(),
        superficie_m2: superficie,
        tipo_cobertura_id: coberturaId ? Number(coberturaId) : null,
        tipo_uso_id: usoId ? Number(usoId) : null,
        sector_id: sectorId ? Number(sectorId) : null,
        cuartel_id: cuartelId ? Number(cuartelId) : null,
      })
      navegar(RUTAS_INVENTARIO.areasVerdes, { replace: true })
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No pudimos guardar el área. Revisa los datos e inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  if (!puedeRegistrar) {
    return <EstadoError titulo="No tienes permiso para registrar áreas" descripcion="El alta está disponible para jefes de sección, ingenieros de campo y practicantes autorizados." onReintentar={() => navegar(RUTAS_INVENTARIO.areasVerdes)} />
  }

  return (
    <div className={estilos.pagina}>
      <BotonEnlace to={RUTAS_INVENTARIO.areasVerdes}>Volver al inventario</BotonEnlace>
      <form className={estilos.formulario} onSubmit={guardar}>
        <p>Registra el espacio y sus referencias de mantenimiento. El sector, el tipo de uso, el cuartel y la cobertura son opcionales.</p>
        <CampoFormulario id="nombre-area" etiqueta="Nombre" obligatorio value={nombre} onChange={(evento) => setNombre(evento.target.value)} maxLength={150} required />
        <CampoFormulario id="lugar-area" etiqueta="Lugar o referente" obligatorio value={lugar} onChange={(evento) => setLugar(evento.target.value)} maxLength={150} required />
        <CampoFormulario id="superficie-area" etiqueta="Superficie (m²)" obligatorio type="number" min="0.01" step="0.01" value={superficie} onChange={(evento) => setSuperficie(evento.target.value)} required />
        <CampoFormulario id="ubicacion-area" etiqueta="Ubicación" obligatorio value={ubicacion} onChange={(evento) => setUbicacion(evento.target.value)} maxLength={250} required />
        {sectores.datos && <Selector id="sector-area" etiqueta="Sector de mantenimiento" valor={sectorId} onCambiar={setSectorId} opcionTodos="Sin sector" opciones={sectores.datos.map((sector) => ({ valor: String(sector.id), texto: `${sector.nombre}${sector.atencion_demanda ? ' · atención a demanda' : ''}` }))} />}
        {usos.datos && <Selector id="uso-area" etiqueta="Tipo de uso" valor={usoId} onCambiar={setUsoId} opcionTodos="Sin clasificar" opciones={usos.datos.map((uso) => ({ valor: String(uso.id), texto: uso.nombre }))} />}
        {cuarteles.datos && <Selector id="cuartel-area" etiqueta="Cuartel histórico (opcional)" valor={cuartelId} onCambiar={setCuartelId} opcionTodos="Sin cuartel" opciones={cuarteles.datos.map((cuartel) => ({ valor: String(cuartel.id), texto: `${cuartel.numero} · ${cuartel.nombre}` }))} />}
        {consulta.estado === 'error' && !consulta.datos ? (
          <EstadoError titulo="No pudimos cargar las coberturas" descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} nivel={3} />
        ) : consulta.datos ? (
          <Selector
            id="cobertura-area"
            etiqueta="Tipo de cobertura"
            valor={coberturaId}
            onCambiar={setCoberturaId}
            opcionTodos="Sin cobertura"
            opciones={consulta.datos.map((cobertura) => ({ valor: String(cobertura.id), texto: cobertura.nombre }))}
          />
        ) : (
          <EstadoCarga forma="tabla" filas={1} texto="Cargando coberturas…" retrasar />
        )}
        {error && <AvisoEnLinea tono="error">{error}</AvisoEnLinea>}
        <div className={estilos.accionesFormulario}>
          <BotonEnlace to={RUTAS_INVENTARIO.areasVerdes}>Cancelar</BotonEnlace>
          <button className={estilos.guardar} type="submit" disabled={guardando || consulta.estado === 'cargando'}>
            {guardando ? 'Guardando…' : 'Guardar área'}
          </button>
        </div>
      </form>
    </div>
  )
}
