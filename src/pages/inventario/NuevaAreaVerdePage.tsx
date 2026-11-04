import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton, { BotonEnlace } from '@/components/ui/Boton'
import CampoFormulario from '@/components/ui/CampoFormulario'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import Selector from '@/components/ui/Selector'
import Tarjeta from '@/components/ui/Tarjeta'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_INVENTARIO, RUTAS_INVENTARIO } from '@/router/rutasApp'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import { PERMISOS, puede } from '@/config/permisosCore'
import { listarCoberturas } from '@/services/api/coberturas'
import { registrarAreaVerde } from '@/services/api/areasVerdes'
import { listarCuarteles, listarSectores, listarTiposUso } from '@/services/api/catalogosInventario'
import estilos from './AreasVerdes.module.css'

export default function NuevaAreaVerdePage() {
  usePaginaActual('Registrar área verde', [MIGAS_INVENTARIO.areasVerdes, { texto: 'Registrar área' }])
  const navegar = useNavigate()
  const sesion = useSesionActiva()
  const coberturas = useConsulta('coberturas-activas', (signal) => listarCoberturas(false, signal))
  const usos = useConsulta('areas-alta-tipos-uso', (signal) => listarTiposUso(false, signal))
  const sectores = useConsulta('areas-alta-sectores', (signal) => listarSectores(false, signal))
  const cuarteles = useConsulta('areas-alta-cuarteles', (signal) => listarCuarteles(true, signal))
  const [valores, setValores] = useState({ nombre: '', lugar: '', ubicacion: '', superficie: '', cobertura: '', uso: '', sector: '', cuartel: '' })
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setError(null)
    setGuardando(true)
    try {
      await registrarAreaVerde({
        nombre: valores.nombre.trim(), lugar: valores.lugar.trim(), ubicacion: valores.ubicacion.trim(),
        superficie_m2: valores.superficie, tipo_cobertura_id: valores.cobertura ? Number(valores.cobertura) : null,
        tipo_uso_id: valores.uso ? Number(valores.uso) : null,
        sector_id: valores.sector ? Number(valores.sector) : null,
        cuartel_id: valores.cuartel ? Number(valores.cuartel) : null,
      })
      navegar(RUTAS_INVENTARIO.areasVerdes)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No pudimos guardar el área.')
    } finally {
      setGuardando(false)
    }
  }

  if (!puede(sesion, PERMISOS.registrarInventario)) {
    return <EstadoError titulo="No tienes permiso para registrar áreas" descripcion="El alta requiere permiso de inventario." onReintentar={() => navegar(RUTAS_INVENTARIO.areasVerdes)} />
  }

  return (
    <div className={estilos.pagina}>
      <BotonEnlace to={RUTAS_INVENTARIO.areasVerdes} className={estilos.volver}>Volver al inventario</BotonEnlace>
      <Tarjeta titulo="Registrar área verde" relleno="amplio" className={estilos.formulario}>
        <form className={estilos.campos} onSubmit={guardar}>
          <CampoFormulario id="nombre-area" etiqueta="Nombre" obligatorio value={valores.nombre} onChange={(e) => setValores({ ...valores, nombre: e.target.value })} required maxLength={150} />
          <CampoFormulario id="lugar-area" etiqueta="Lugar o referente" obligatorio value={valores.lugar} onChange={(e) => setValores({ ...valores, lugar: e.target.value })} required maxLength={150} />
          <CampoFormulario id="ubicacion-area" etiqueta="Ubicación" obligatorio value={valores.ubicacion} onChange={(e) => setValores({ ...valores, ubicacion: e.target.value })} required maxLength={250} />
          <CampoFormulario id="superficie-area" etiqueta="Superficie (m²)" obligatorio type="number" min="0.01" step="0.01" value={valores.superficie} onChange={(e) => setValores({ ...valores, superficie: e.target.value })} required />
          {sectores.datos && <Selector id="sector-area" etiqueta="Sector de mantenimiento" valor={valores.sector} onCambiar={(sector) => setValores({ ...valores, sector })} opcionTodos="Sin sector asignado" opciones={sectores.datos.map((sector) => ({ valor: String(sector.id), texto: sector.nombre }))} />}
          {usos.datos && <Selector id="uso-area" etiqueta="Tipo de uso" valor={valores.uso} onCambiar={(uso) => setValores({ ...valores, uso })} opcionTodos="Sin tipo de uso" opciones={usos.datos.map((uso) => ({ valor: String(uso.id), texto: uso.nombre }))} />}
          {coberturas.datos && <Selector id="cobertura-area" etiqueta="Cobertura" valor={valores.cobertura} onCambiar={(cobertura) => setValores({ ...valores, cobertura })} opcionTodos="Sin cobertura" opciones={coberturas.datos.map((c) => ({ valor: String(c.id), texto: c.nombre }))} />}
          {cuarteles.datos && <Selector id="cuartel-area" etiqueta="Cuartel histórico (opcional)" valor={valores.cuartel} onCambiar={(cuartel) => setValores({ ...valores, cuartel })} opcionTodos="Sin cuartel asociado" opciones={cuarteles.datos.map((cuartel) => ({ valor: String(cuartel.id), texto: `${cuartel.numero} · ${cuartel.nombre}${cuartel.estado === 'desaparecido' ? ' (desaparecido)' : ''}` }))} />}
          {coberturas.estado === 'error' && <EstadoError titulo="No pudimos cargar las coberturas" descripcion={coberturas.error?.detalle ?? ''} onReintentar={coberturas.reintentar} nivel={3} />}
          {!coberturas.datos && coberturas.estado !== 'error' && <EstadoCarga forma="tabla" filas={1} texto="Cargando coberturas…" />}
          {usos.estado === 'error' && <EstadoError titulo="No pudimos cargar los tipos de uso" descripcion={usos.error?.detalle ?? ''} onReintentar={usos.reintentar} nivel={3} />}
          {!usos.datos && usos.estado !== 'error' && <EstadoCarga forma="tabla" filas={1} texto="Cargando tipos de uso…" />}
          {sectores.estado === 'error' && <EstadoError titulo="No pudimos cargar los sectores" descripcion={sectores.error?.detalle ?? ''} onReintentar={sectores.reintentar} nivel={3} />}
          {!sectores.datos && sectores.estado !== 'error' && <EstadoCarga forma="tabla" filas={1} texto="Cargando sectores…" />}
          {cuarteles.estado === 'error' && <EstadoError titulo="No pudimos cargar los cuarteles" descripcion={cuarteles.error?.detalle ?? ''} onReintentar={cuarteles.reintentar} nivel={3} />}
          {!cuarteles.datos && cuarteles.estado !== 'error' && <EstadoCarga forma="tabla" filas={1} texto="Cargando cuarteles…" />}
          {error && <AvisoEnLinea tono="error">{error}</AvisoEnLinea>}
          <div className={estilos.acciones}>
            <BotonEnlace to={RUTAS_INVENTARIO.areasVerdes}>Cancelar</BotonEnlace>
            <Boton type="submit" variante="primario" cargando={guardando}>Guardar área</Boton>
          </div>
        </form>
      </Tarjeta>
    </div>
  )
}
