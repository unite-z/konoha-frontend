import { useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
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
import { asignarPoligonoMapa, listarPoligonosMapa } from '@/services/api/mapaAsignaciones'
import { registrarAreaVerde } from '@/services/api/areasVerdes'
import { cargarAreasVerdesGeoJSON } from '@/services/api/mapaInventario'
import { listarCuarteles, listarSectores, listarTiposUso } from '@/services/api/catalogosInventario'
import type { AreaVerde } from '@/types/areasVerdes'
import estilos from './AreasVerdes.module.css'

interface ValoresFormulario {
  nombre: string
  lugar: string
  ubicacion: string
  superficie: string
  cobertura: string
  uso: string
  sector: string
  cuartel: string
}

const VALORES_VACIOS: ValoresFormulario = {
  nombre: '', lugar: '', ubicacion: '', superficie: '', cobertura: '', uso: '', sector: '', cuartel: '',
}

export default function NuevaAreaVerdePage() {
  usePaginaActual('Registrar área verde', [MIGAS_INVENTARIO.areasVerdes, { texto: 'Registrar área' }])
  const navegar = useNavigate()
  const [parametros] = useSearchParams()
  const idPoligono = parametros.get('poligono')
  const sesion = useSesionActiva()
  const coberturas = useConsulta('coberturas-activas', (signal) => listarCoberturas(false, signal))
  const usos = useConsulta('areas-alta-tipos-uso', (signal) => listarTiposUso(false, signal))
  const sectores = useConsulta('areas-alta-sectores', (signal) => listarSectores(false, signal))
  const cuarteles = useConsulta('areas-alta-cuarteles', (signal) => listarCuarteles(true, signal))
  const mapa = useConsulta(idPoligono ? `alta-mapa:${idPoligono}` : null, cargarAreasVerdesGeoJSON)
  const asignaciones = useConsulta(idPoligono ? 'alta-mapa-vinculos' : null, listarPoligonosMapa)
  const [cambios, setCambios] = useState<Partial<ValoresFormulario>>({})
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [fichaCreada, setFichaCreada] = useState<AreaVerde | null>(null)
  const solicitudActiva = useRef(false)

  const feature = useMemo(
    () => mapa.datos?.features.find((item) => item.properties.mapa_id === idPoligono) ?? null,
    [idPoligono, mapa.datos],
  )
  const valoresFuente: ValoresFormulario = {
    ...VALORES_VACIOS,
    nombre: texto(feature?.properties.Nombre),
    lugar: texto(feature?.properties.Referenc_1),
    superficie: numeroComoTexto(feature?.properties['Área']),
  }
  const valores = { ...valoresFuente, ...cambios }
  const vinculoExistente = asignaciones.datos?.find((item) => item.id_fuente === idPoligono && item.area_verde_id !== null)
  const puedeRegistrar = puede(sesion, PERMISOS.registrarInventario)

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (solicitudActiva.current) return
    solicitudActiva.current = true
    setError(null)
    setGuardando(true)
    try {
      let area = fichaCreada
      if (!area) {
        area = await registrarAreaVerde({
          nombre: valores.nombre.trim(), lugar: valores.lugar.trim(), ubicacion: valores.ubicacion.trim(),
          superficie_m2: valores.superficie, tipo_cobertura_id: valores.cobertura ? Number(valores.cobertura) : null,
          tipo_uso_id: valores.uso ? Number(valores.uso) : null,
          sector_id: valores.sector ? Number(valores.sector) : null,
          cuartel_id: valores.cuartel ? Number(valores.cuartel) : null,
        })
        setFichaCreada(area)
      }

      if (idPoligono) {
        try {
          await asignarPoligonoMapa(idPoligono, area.id)
        } catch (causa) {
          setError(`La ficha «${area.nombre}» se creó con el código ${area.id}, pero no se pudo vincular al polígono. Puedes reintentar el vínculo sin crear otra ficha. ${causa instanceof Error ? causa.message : ''}`.trim())
          return
        }
        navegar(`${RUTAS_INVENTARIO.mapa}?poligono=${encodeURIComponent(idPoligono)}&centrar=1&registrada=1`, { replace: true })
      } else {
        navegar(RUTAS_INVENTARIO.areasVerdes)
      }
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No pudimos guardar el área.')
    } finally {
      solicitudActiva.current = false
      setGuardando(false)
    }
  }

  if (!puedeRegistrar) {
    return <EstadoError titulo="No tienes permiso para registrar áreas" descripcion="El alta requiere permiso de inventario." onReintentar={() => navegar(RUTAS_INVENTARIO.areasVerdes)} />
  }

  if (idPoligono && (mapa.estado === 'error' || asignaciones.estado === 'error')) {
    const consulta = mapa.estado === 'error' ? mapa : asignaciones
    return <EstadoError titulo="No pudimos preparar el registro desde el mapa" descripcion={consulta.error?.detalle ?? ''} onReintentar={() => { mapa.reintentar(); asignaciones.reintentar() }} />
  }

  if (idPoligono && (!mapa.datos || !asignaciones.datos)) {
    return <EstadoCarga forma="tabla" texto="Preparando el jardín seleccionado…" />
  }

  if (idPoligono && !feature) {
    return <EstadoError titulo="No encontramos ese jardín en el GeoJSON" descripcion="Vuelve al mapa y selecciona uno de sus polígonos existentes." onReintentar={() => navegar(`${RUTAS_INVENTARIO.mapa}?modo=registrar`)} />
  }

  if (vinculoExistente) {
    return (
      <div className={estilos.pagina}>
        <BotonEnlace to={`${RUTAS_INVENTARIO.mapa}?poligono=${encodeURIComponent(idPoligono ?? '')}&centrar=1`} className={estilos.volver}>Volver al jardín seleccionado</BotonEnlace>
        <Tarjeta titulo="Este jardín ya tiene una ficha vinculada" relleno="amplio">
          <AvisoEnLinea tono="advertencia">Está vinculado con «{vinculoExistente.area_verde_nombre ?? `área ${vinculoExistente.area_verde_id}`}». Abre esa ficha desde el inventario para evitar duplicar el registro.</AvisoEnLinea>
          <BotonEnlace to={`${RUTAS_INVENTARIO.areasVerdes}?buscar=${encodeURIComponent(vinculoExistente.area_verde_nombre ?? '')}`}>Ver ficha en el inventario</BotonEnlace>
        </Tarjeta>
      </div>
    )
  }

  const volver = idPoligono
    ? `${RUTAS_INVENTARIO.mapa}?modo=registrar&poligono=${encodeURIComponent(idPoligono)}&centrar=1`
    : RUTAS_INVENTARIO.areasVerdes

  return (
    <div className={estilos.pagina}>
      <BotonEnlace to={volver} className={estilos.volver}>{idPoligono ? 'Cancelar y volver al mapa' : 'Volver al inventario'}</BotonEnlace>
      <Tarjeta
        titulo={idPoligono ? `Registrar jardín${valoresFuente.nombre ? `: ${valoresFuente.nombre}` : ''}` : 'Registrar área verde'}
        descripcion={idPoligono ? 'Revisa los datos de origen y completa la ficha del inventario. Al guardar, se vinculará con el contorno seleccionado.' : 'Registra la ficha del área verde en el inventario.'}
        relleno="amplio"
        className={estilos.formulario}
      >
        {idPoligono && <AvisoEnLinea tono="info">La superficie y los datos de referencia se precargan desde el GeoJSON; revísalos antes de guardar.</AvisoEnLinea>}
        {fichaCreada && <AvisoEnLinea tono="info">La ficha {fichaCreada.id} ya está creada. El siguiente intento volverá a intentar solo el vínculo.</AvisoEnLinea>}
        <form className={estilos.campos} onSubmit={(evento) => void guardar(evento)}>
          <CampoFormulario id="nombre-area" etiqueta="Nombre" obligatorio value={valores.nombre} onChange={(e) => setCambios({ ...cambios, nombre: e.target.value })} required maxLength={150} disabled={Boolean(fichaCreada)} />
          <CampoFormulario id="lugar-area" etiqueta="Lugar o referente" obligatorio value={valores.lugar} onChange={(e) => setCambios({ ...cambios, lugar: e.target.value })} required maxLength={150} disabled={Boolean(fichaCreada)} />
          <CampoFormulario id="ubicacion-area" etiqueta="Ubicación" obligatorio value={valores.ubicacion} onChange={(e) => setCambios({ ...cambios, ubicacion: e.target.value })} required maxLength={250} disabled={Boolean(fichaCreada)} />
          <CampoFormulario id="superficie-area" etiqueta="Superficie (m²)" obligatorio type="number" min="0.01" step="0.01" value={valores.superficie} onChange={(e) => setCambios({ ...cambios, superficie: e.target.value })} required disabled={Boolean(fichaCreada)} />
          {sectores.datos && <Selector id="sector-area" etiqueta="Sector de mantenimiento" valor={valores.sector} onCambiar={(sector) => setCambios({ ...cambios, sector })} opcionTodos="Sin sector asignado" opciones={sectores.datos.map((sector) => ({ valor: String(sector.id), texto: sector.nombre }))} disabled={Boolean(fichaCreada)} />}
          {usos.datos && <Selector id="uso-area" etiqueta="Tipo de uso" valor={valores.uso} onCambiar={(uso) => setCambios({ ...cambios, uso })} opcionTodos="Sin tipo de uso" opciones={usos.datos.map((uso) => ({ valor: String(uso.id), texto: uso.nombre }))} disabled={Boolean(fichaCreada)} />}
          {coberturas.datos && <Selector id="cobertura-area" etiqueta="Cobertura" valor={valores.cobertura} onCambiar={(cobertura) => setCambios({ ...cambios, cobertura })} opcionTodos="Sin cobertura" opciones={coberturas.datos.map((c) => ({ valor: String(c.id), texto: c.nombre }))} disabled={Boolean(fichaCreada)} />}
          {cuarteles.datos && <Selector id="cuartel-area" etiqueta="Cuartel histórico (opcional)" valor={valores.cuartel} onCambiar={(cuartel) => setCambios({ ...cambios, cuartel })} opcionTodos="Sin cuartel asociado" opciones={cuarteles.datos.map((cuartel) => ({ valor: String(cuartel.id), texto: `${cuartel.numero} · ${cuartel.nombre}${cuartel.estado === 'desaparecido' ? ' (desaparecido)' : ''}` }))} disabled={Boolean(fichaCreada)} />}
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
            <BotonEnlace to={volver}>Cancelar</BotonEnlace>
            <Boton type="submit" variante="primario" cargando={guardando} deshabilitado={Boolean(vinculoExistente)}>
              {fichaCreada && idPoligono ? 'Reintentar vínculo' : 'Guardar área'}
            </Boton>
          </div>
        </form>
      </Tarjeta>
    </div>
  )
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : typeof valor === 'number' ? String(valor) : ''
}

function numeroComoTexto(valor: unknown): string {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) return ''
  return String(Number(valor.toFixed(2)))
}
