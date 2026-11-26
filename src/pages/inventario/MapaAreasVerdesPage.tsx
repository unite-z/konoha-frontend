import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton, { BotonEnlace } from '@/components/ui/Boton'
import CampoFormulario from '@/components/ui/CampoFormulario'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoSinAcceso from '@/components/ui/EstadoSinAcceso'
import { PERMISOS, puede } from '@/config/permisosCore'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_INVENTARIO, RUTAS_INVENTARIO } from '@/router/rutasApp'
import { listarTiposUso } from '@/services/api/catalogosInventario'
import { listarPoligonosMapa, listarTodasLasAreasVerdes } from '@/services/api/mapaAsignaciones'
import { cargarAreasVerdesGeoJSON, type AreasVerdesGeoJSON } from '@/services/api/mapaInventario'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import type { AreaVerde } from '@/types/areasVerdes'
import type { PoligonoMapaAsignado } from '@/types/mapaInventario'
import {
  construirIndicePoligonos,
  enriquecerGeoJSON,
  nombrePoligonoMapa,
  nombreUsoMapa,
  type TipoUsoMapa,
} from '@/components/mapa/clasificacionMapa'
import { VistaJardin } from './VistaJardin'
import { formatearSuperficie, idPoligono, normalizar, obtenerUsos, texto, type Poligono } from './mapaAreasVerdesUtils'
import estilos from './MapaAreasVerdesPage.module.css'

export default function MapaAreasVerdesPage() {
  usePaginaActual('Mapa del campus', [MIGAS_INVENTARIO.areasVerdes, MIGAS_INVENTARIO.mapa])
  const sesion = useSesionActiva()
  const mapa = useConsulta('mapa-areas-verdes', cargarAreasVerdesGeoJSON)
  const asignaciones = useConsulta('mapa-poligonos', listarPoligonosMapa)
  const tiposUso = useConsulta('mapa-tipos-uso', (signal) => listarTiposUso(true, signal))
  const areas = useConsulta('mapa-inventario-areas', listarTodasLasAreasVerdes)
  const fallo = [mapa, asignaciones, tiposUso, areas].find((consulta) => consulta.estado === 'error' && !consulta.datos)

  return (
    <div className={estilos.pagina}>
      <BotonEnlace to={RUTAS_INVENTARIO.areasVerdes} className={estilos.volver}>
        Volver al inventario
      </BotonEnlace>
      {fallo?.error?.estado === 403 ? (
        <EstadoSinAcceso />
      ) : fallo ? (
        <EstadoError
          titulo="No pudimos cargar los datos del mapa"
          descripcion={fallo.error?.detalle ?? ''}
          onReintentar={() => {
            mapa.reintentar()
            asignaciones.reintentar()
            tiposUso.reintentar()
            areas.reintentar()
          }}
        />
      ) : mapa.datos && asignaciones.datos && tiposUso.datos && areas.datos ? (
        <MapaInventario
          datos={mapa.datos}
          asignaciones={asignaciones.datos}
          tiposUso={tiposUso.datos}
          areas={areas.datos}
          puedeEditar={puede(sesion, PERMISOS.gestionarCatalogos)}
          alGuardar={asignaciones.reintentar}
        />
      ) : (
        <EstadoCarga forma="tabla" texto="Cargando mapa del campus…" />
      )}
    </div>
  )
}

function MapaInventario({
  datos,
  asignaciones,
  tiposUso,
  areas,
  puedeEditar,
  alGuardar,
}: {
  datos: AreasVerdesGeoJSON
  asignaciones: PoligonoMapaAsignado[]
  tiposUso: TipoUsoMapa[]
  areas: AreaVerde[]
  puedeEditar: boolean
  alGuardar: () => void
}) {
  const [parametros, setParametros] = useSearchParams()
  const [busqueda, setBusqueda] = useState('')
  const [uso, setUso] = useState('')
  const [panelAbierto, setPanelAbierto] = useState(true)
  const mapa = useMemo(() => enriquecerGeoJSON(datos, asignaciones), [datos, asignaciones])
  const indice = useMemo(() => construirIndicePoligonos(asignaciones), [asignaciones])
  const usos = useMemo(() => obtenerUsos(mapa, tiposUso), [mapa, tiposUso])
  const poligonoEnlace = parametros.get('poligono')
  const areaEnlace = parametros.get('area')
  const solicitado = poligonoEnlace
    ? mapa.features.find((poligono) => idPoligono(poligono) === poligonoEnlace)
    : areaEnlace
      ? mapa.features.find((poligono) => String(indice.get(idPoligono(poligono))?.area_verde_id) === areaEnlace)
      : undefined
  const seleccionado = solicitado && (!uso || nombreUsoMapa(solicitado) === uso) ? solicitado : undefined
  const vinculo = seleccionado ? indice.get(idPoligono(seleccionado)) : undefined
  const termino = normalizar(busqueda)
  const resultados = termino
    ? mapa.features.filter((poligono) => {
        const nombreInventario = indice.get(idPoligono(poligono))?.area_verde_nombre ?? ''
        return (
          idPoligono(poligono) &&
          [nombreInventario, texto(poligono.properties.Nombre)].some((nombre) => normalizar(nombre).includes(termino))
        )
      })
    : []
  const totalVisible = uso ? (usos.find((tipo) => tipo.nombre === uso)?.cantidad ?? 0) : mapa.features.length

  function seleccionar(poligono: Poligono) {
    const id = idPoligono(poligono)
    if (!id) return
    if (uso && nombreUsoMapa(poligono) !== uso) setUso('')
    setParametros({ poligono: id }, { replace: true })
  }

  return (
    <>
      <div className={estilos.distribucion}>
        <div className={estilos.herramientas}>
          <CampoFormulario
            id="buscar-jardin-mapa"
            etiqueta="Buscar jardín"
            type="search"
            value={busqueda}
            placeholder="Por ejemplo, Bosque Húmedo"
            onChange={(evento) => setBusqueda(evento.target.value)}
          />
          {termino &&
            (resultados.length ? (
              <ul className={estilos.resultados} aria-label="Jardines encontrados">
                {resultados.map((poligono) => {
                  const id = idPoligono(poligono)
                  const area = indice.get(id)
                  const nombre = nombrePoligonoMapa(poligono)
                  const superficie = area?.superficie_registrada_m2 ?? poligono.properties['Área']
                  return (
                    <li key={id}>
                      <Boton
                        variante="fantasma"
                        aria-pressed={seleccionado === poligono}
                        onClick={() => seleccionar(poligono)}
                      >
                        {nombre} · {nombreUsoMapa(poligono)} · {formatearSuperficie(superficie)}
                      </Boton>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p role="status">No se encontraron jardines con ese nombre.</p>
            ))}
          {(areaEnlace || poligonoEnlace) && !solicitado && (
            <AvisoEnLinea tono="info">No se encontró el área en el mapa del campus.</AvisoEnLinea>
          )}
          <Boton
            className={estilos.volver}
            variante="secundario"
            aria-expanded={panelAbierto}
            aria-controls="leyenda-mapa-campus"
            onClick={() => setPanelAbierto(!panelAbierto)}
          >
            {panelAbierto ? 'Ocultar leyenda' : 'Mostrar leyenda'}
          </Boton>
          <aside
            id="leyenda-mapa-campus"
            className={estilos.leyenda}
            hidden={!panelAbierto}
            aria-label="Filtrar por tipo de uso"
          >
            <h2>Tipos de uso</h2>
            <Boton variante="fantasma" aria-pressed={!uso} onClick={() => setUso('')}>
              Todos los usos
            </Boton>
            {usos.map((tipo) => (
              <Boton
                key={tipo.nombre}
                variante="fantasma"
                aria-pressed={uso === tipo.nombre}
                onClick={() => setUso(uso === tipo.nombre ? '' : tipo.nombre)}
              >
                <svg className={estilos.muestraColor} viewBox="0 0 16 16" aria-hidden="true">
                  <rect width="16" height="16" fill={tipo.color} />
                </svg>
                {tipo.nombre} <span className={estilos.cantidad}>{tipo.cantidad}</span>
              </Boton>
            ))}
            <p className={estilos.resumen} role="status">
              {totalVisible} de {mapa.features.length} áreas del mapa visibles
            </p>
          </aside>
        </div>
        <VistaJardin
          key={seleccionado ? idPoligono(seleccionado) : ''}
          mapa={mapa}
          usos={usos}
          uso={uso}
          seleccionado={seleccionado}
          vinculo={vinculo}
          onSeleccionar={seleccionar}
          areas={areas}
          puedeEditar={puedeEditar}
          alGuardar={alGuardar}
        />
      </div>
      <p className={estilos.fuente}>
        Geometrías del mapa proporcionado por el cliente. Fondo cartográfico local basado en OpenStreetMap ©
        OpenStreetMap contributors.
      </p>
    </>
  )
}
