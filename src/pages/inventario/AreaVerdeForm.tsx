import { useState, type FormEvent } from 'react'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton, { BotonEnlace } from '@/components/ui/Boton'
import CampoFormulario from '@/components/ui/CampoFormulario'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import Selector from '@/components/ui/Selector'
import Tarjeta from '@/components/ui/Tarjeta'
import { useConsulta } from '@/hooks/useConsulta'
import { RUTAS_INVENTARIO } from '@/router/rutasApp'
import { listarCoberturas } from '@/services/api/coberturas'
import { modificarAreaVerde, registrarAreaVerde } from '@/services/api/areasVerdes'
import { listarCuarteles, listarSectores, listarTiposUso } from '@/services/api/catalogosInventario'
import { listarPoligonosMapa } from '@/services/api/mapaAsignaciones'
import { cargarAreasVerdesGeoJSON, type PropiedadesAreaMapa } from '@/services/api/mapaInventario'
import type { AreaVerde } from '@/types/areasVerdes'
import MapaVectorialLocal from './MapaVectorialLocal'
import estilos from './AreasVerdes.module.css'
import estilosMapa from './MapaAreasVerdesPage.module.css'

type ModoFormulario = 'crear' | 'editar'

interface ValoresArea {
  nombre: string
  lugar: string
  ubicacion: string
  superficie: string
  cobertura: string
  uso: string
  sector: string
  cuartel: string
  activo: string
}

interface Props {
  modo: ModoFormulario
  area?: AreaVerde
  puedeVincularMapa?: boolean
  alGuardar: (area: AreaVerde) => void
  alCancelar: () => void
}

function valoresIniciales(area?: AreaVerde): ValoresArea {
  return {
    nombre: area?.nombre ?? '',
    lugar: area?.lugar ?? '',
    ubicacion: area?.ubicacion ?? '',
    superficie: area?.superficie_m2 ?? '',
    cobertura: area?.tipo_cobertura_id ? String(area.tipo_cobertura_id) : '',
    uso: area?.tipo_uso_id ? String(area.tipo_uso_id) : '',
    sector: area?.sector_id ? String(area.sector_id) : '',
    cuartel: area?.cuartel_id ? String(area.cuartel_id) : '',
    activo: area?.activo === false ? 'false' : 'true',
  }
}

function textoDelMapa(valor: PropiedadesAreaMapa[string] | undefined) {
  return typeof valor === 'string' ? valor.trim() : ''
}

function sugerenciasDelMapa(
  propiedades: PropiedadesAreaMapa | undefined,
  tiposUso: { id: number; nombre: string }[],
): Partial<ValoresArea> {
  if (!propiedades) return {}
  const superficie = Number(propiedades['Área'])
  const usoFuente = textoDelMapa(propiedades.Uso).toLocaleLowerCase('es')
  const uso = tiposUso.find((tipo) => tipo.nombre.trim().toLocaleLowerCase('es') === usoFuente)
  return {
    nombre: textoDelMapa(propiedades.Nombre).slice(0, 150),
    lugar: textoDelMapa(propiedades.Referenc_1).slice(0, 150),
    superficie: Number.isFinite(superficie) && superficie >= 0.01 ? superficie.toFixed(2) : '',
    uso: uso ? String(uso.id) : '',
  }
}

export default function AreaVerdeForm({ modo, area, puedeVincularMapa = false, alGuardar, alCancelar }: Props) {
  const coberturas = useConsulta(`areas-${modo}-coberturas`, (signal) => listarCoberturas(false, signal))
  const usos = useConsulta(`areas-${modo}-tipos-uso`, (signal) => listarTiposUso(false, signal))
  const sectores = useConsulta(`areas-${modo}-sectores`, (signal) => listarSectores(false, signal))
  const cuarteles = useConsulta(`areas-${modo}-cuarteles`, (signal) => listarCuarteles(true, signal))
  const [valoresManuales, setValoresManuales] = useState<Partial<ValoresArea>>({})
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [poligonoId, setPoligonoId] = useState('')
  const [mapaAbierto, setMapaAbierto] = useState(false)
  const vincularMapa = modo === 'crear' && puedeVincularMapa
  const poligonos = useConsulta(vincularMapa ? 'alta-area-geometria' : null, cargarAreasVerdesGeoJSON)
  const vinculos = useConsulta(vincularMapa ? 'alta-area-vinculos' : null, listarPoligonosMapa)
  const poligonoSeleccionado = poligonoId
    ? poligonos.datos?.features.find(({ properties }) => properties.mapa_id === poligonoId)
    : undefined
  const valores = {
    ...valoresIniciales(area),
    ...sugerenciasDelMapa(poligonoSeleccionado?.properties, usos.datos ?? []),
    ...valoresManuales,
  }

  const pendiente = [coberturas, usos, sectores, cuarteles].some((consulta) => !consulta.datos)
  const consultaConError = [coberturas, usos, sectores, cuarteles].find((consulta) => consulta.estado === 'error' && !consulta.datos)

  function cambiar(campo: keyof ValoresArea, valor: string) {
    setValoresManuales((actual) => ({ ...actual, [campo]: valor }))
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setError(null)
    const nombre = valores.nombre.trim()
    const lugar = valores.lugar.trim()
    const ubicacion = valores.ubicacion.trim()
    const superficie = valores.superficie.trim()
    const superficieNumero = Number(superficie)
    if (!nombre || !lugar || !ubicacion || !superficie || !Number.isFinite(superficieNumero) || superficieNumero <= 0) {
      setError('Completa nombre, lugar, ubicación y una superficie mayor que cero.')
      return
    }
    if (modo === 'editar' && area?.activo && valores.activo === 'false' && !window.confirm('¿Confirmas dar de baja esta área verde? Se conservarán sus referencias e historial.')) return

    setGuardando(true)
    try {
      let respuesta: AreaVerde
      if (modo === 'crear') {
        respuesta = await registrarAreaVerde({
          nombre, lugar, ubicacion, superficie_m2: superficie,
          tipo_cobertura_id: valores.cobertura ? Number(valores.cobertura) : null,
          tipo_uso_id: valores.uso ? Number(valores.uso) : null,
          sector_id: valores.sector ? Number(valores.sector) : null,
          cuartel_id: valores.cuartel ? Number(valores.cuartel) : null,
          ...(poligonoId ? { poligono_mapa_id: poligonoId } : {}),
        })
      } else {
        if (!area) throw new Error('No se encontró el área que quieres editar.')
        respuesta = await modificarAreaVerde(area.id, {
          nombre, lugar, ubicacion, superficie_m2: superficie,
          activo: valores.activo === 'true',
          ...(valores.cobertura ? { tipo_cobertura_id: Number(valores.cobertura) } : {}),
          ...(valores.uso ? { tipo_uso_id: Number(valores.uso) } : {}),
          ...(valores.cuartel ? { cuartel_id: Number(valores.cuartel) } : {}),
        })
      }
      alGuardar(respuesta)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No pudimos guardar el área.')
    } finally {
      setGuardando(false)
    }
  }

  if (consultaConError) {
    return <EstadoError titulo="No pudimos cargar los catálogos" descripcion={consultaConError.error?.detalle ?? ''} onReintentar={() => { coberturas.reintentar(); usos.reintentar(); sectores.reintentar(); cuarteles.reintentar() }} />
  }
  if (pendiente || !coberturas.datos || !usos.datos || !sectores.datos || !cuarteles.datos) return <EstadoCarga forma="tabla" texto="Cargando campos del área…" />

  const ocupados = new Set(vinculos.datos?.filter((vinculo) => vinculo.area_verde_id !== null).map((vinculo) => vinculo.id_fuente))
  const opcionesPoligonos = vincularMapa && vinculos.datos ? (poligonos.datos?.features ?? []).flatMap(({ properties }, indice) => {
    const valor = typeof properties.mapa_id === 'string' ? properties.mapa_id : ''
    if (!valor || ocupados.has(valor)) return []
    const nombre = properties.Nombre || `Polígono ${indice + 1}`
    return [{ valor, texto: `${nombre} · ${properties.Uso ?? 'Sin tipo de uso'}${properties['Área'] ? ` · ${Math.round(Number(properties['Área']))} m²` : ''}` }]
  }).sort((a, b) => a.texto.localeCompare(b.texto, 'es')) : []
  const opcionSeleccionada = opcionesPoligonos.find(({ valor }) => valor === poligonoId)

  return (
    <Tarjeta titulo={modo === 'crear' ? 'Registrar área verde' : 'Editar área verde'} relleno="amplio" className={estilos.formulario}>
      <form className={estilosMapa.formularioConMapa} onSubmit={guardar}>
        <div className={estilosMapa.distribucionFormulario}>
          <div className={estilos.campos}>
            <CampoFormulario id="nombre-area" etiqueta="Nombre" obligatorio value={valores.nombre} onChange={(e) => cambiar('nombre', e.target.value)} required maxLength={150} />
            <CampoFormulario id="lugar-area" etiqueta="Lugar o referente" obligatorio value={valores.lugar} onChange={(e) => cambiar('lugar', e.target.value)} required maxLength={150} />
            <CampoFormulario id="ubicacion-area" etiqueta="Ubicación" obligatorio value={valores.ubicacion} onChange={(e) => cambiar('ubicacion', e.target.value)} required maxLength={250} />
            <CampoFormulario id="superficie-area" etiqueta="Superficie (m²)" obligatorio type="number" min="0.01" step="0.01" formato="decimal" value={valores.superficie} onChange={(e) => cambiar('superficie', e.target.value)} required />
            {modo === 'crear' && <Selector id="sector-area" etiqueta="Sector de mantenimiento" valor={valores.sector} onCambiar={(valor) => cambiar('sector', valor)} opcionTodos="Sin sector asignado" opciones={sectores.datos.map((sector) => ({ valor: String(sector.id), texto: sector.nombre }))} />}
            <Selector id="uso-area" etiqueta="Tipo de uso" valor={valores.uso} onCambiar={(valor) => cambiar('uso', valor)} opcionTodos="Sin tipo de uso" opciones={usos.datos.map((uso) => ({ valor: String(uso.id), texto: uso.nombre }))} />
            <Selector id="cobertura-area" etiqueta="Cobertura" valor={valores.cobertura} onCambiar={(valor) => cambiar('cobertura', valor)} opcionTodos="Sin cobertura" opciones={coberturas.datos.map((cobertura) => ({ valor: String(cobertura.id), texto: cobertura.nombre }))} />
            <Selector id="cuartel-area" etiqueta="Cuartel histórico (opcional)" valor={valores.cuartel} onCambiar={(valor) => cambiar('cuartel', valor)} opcionTodos="Sin cuartel asociado" opciones={cuarteles.datos.map((cuartel) => ({ valor: String(cuartel.id), texto: `${cuartel.numero} · ${cuartel.nombre}${cuartel.estado === 'desaparecido' ? ' (desaparecido)' : ''}` }))} />
            {vincularMapa && (
              <div className={estilos.selectorPoligono}>
                <Boton variante="secundario" aria-expanded={mapaAbierto} aria-controls="mapa-alta-area"
                  deshabilitado={!poligonos.datos || !vinculos.datos} onClick={() => setMapaAbierto(!mapaAbierto)}>
                  {mapaAbierto ? 'Ocultar mapa' : 'Elegir polígono en el mapa'}
                </Boton>
                {opcionSeleccionada && (
                  <>
                    <p role="status">Polígono elegido · {opcionSeleccionada.texto}. Revisa los datos completados a partir del mapa.</p>
                    <Boton variante="fantasma" deshabilitado={guardando} onClick={() => setPoligonoId('')}>Quitar selección</Boton>
                  </>
                )}
                <Selector id="poligono-area" etiqueta="Polígono del mapa (opcional)" valor={poligonoId} onCambiar={setPoligonoId}
                  disabled={guardando || !poligonos.datos || !vinculos.datos} opcionTodos="Sin polígono vinculado"
                  opciones={opcionesPoligonos} />
              </div>
            )}
            {vincularMapa && (poligonos.estado === 'error' || vinculos.estado === 'error') && (
              <EstadoError titulo="No pudimos cargar los polígonos disponibles" nivel={3}
                descripcion={poligonos.error?.detalle ?? vinculos.error?.detalle ?? ''}
                onReintentar={() => { poligonos.reintentar(); vinculos.reintentar() }} />
            )}
            {error && <div className={estilos.errorFormulario}><AvisoEnLinea tono="error">{error}</AvisoEnLinea></div>}
          </div>
          <div id="mapa-alta-area" className={estilosMapa.mapaFormulario} hidden={!mapaAbierto}>
            {mapaAbierto && poligonos.datos && vinculos.datos && (
              <>
                <p>Selecciona un polígono disponible. Los polígonos atenuados ya están vinculados.</p>
                <div className={estilosMapa.panelMapa}>
                  <MapaVectorialLocal datos={poligonos.datos} usos={[]} usoSeleccionado=""
                    seleccionado={poligonoSeleccionado} poligonosBloqueados={ocupados}
                    onSeleccionar={({ properties }) => {
                      if (!guardando && typeof properties.mapa_id === 'string') setPoligonoId(properties.mapa_id)
                    }} />
                </div>
              </>
            )}
          </div>
        </div>
        {modo === 'editar' ? (
          <div className={estilos.pieEdicion}>
            <Selector id="estado-area" etiqueta="Estado" valor={valores.activo} onCambiar={(valor) => cambiar('activo', valor)} opciones={[{ valor: 'true', texto: 'Activa' }, { valor: 'false', texto: 'De baja' }]} />
            <div className={estilos.acciones}>
              <Boton type="button" variante="fantasma" onClick={alCancelar}>Cancelar</Boton>
              <Boton type="submit" variante="primario" cargando={guardando}>Guardar cambios</Boton>
            </div>
          </div>
        ) : (
          <div className={estilos.acciones}>
            <Boton type="button" variante="fantasma" onClick={alCancelar}>Cancelar</Boton>
            <Boton type="submit" variante="primario" cargando={guardando}>Guardar área</Boton>
          </div>
        )}
      </form>
    </Tarjeta>
  )
}

export function EnlaceCancelarArea() {
  return <BotonEnlace to={RUTAS_INVENTARIO.areasVerdes}>Cancelar</BotonEnlace>
}
