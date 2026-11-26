import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { PERMISOS } from '@/config/permisosCore'
import { tiene } from '@/config/permisosSesion'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import Boton from '@/design-system/Boton'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import { useConsulta } from '@/hooks/useConsulta'
import { obtenerAreaVerde } from '@/services/api/areasVerdes'
import { listarCuarteles, listarSectores, listarTiposUso } from '@/services/api/catalogosInventario'
import { listarEjemplares } from '@/services/api/ejemplares'
import { listarPoligonosMapa } from '@/services/api/mapaAsignaciones'
import { usePermisos } from '@/sesion/ContextoSesion'
import type { AreaCampus } from '@/types/campus3d'
import type { AreaVerde } from '@/types/areasVerdes'
import type { EjemplarInventario } from '@/types/ejemplares'
import { useVistaDeMapa } from '../base/Escenario'
import CapaColores from '../base/MapaCampus/CapaColores'
import CapaGeometrias from '../base/MapaCampus/CapaGeometrias'
import CapaMarcadores from '../base/MapaCampus/CapaMarcadores'
import type { MarcadorMapa } from '../base/MapaCampus/marcadores'
import PanelLateral from '../base/PanelLateral/PanelLateral'
import { useEsMovil } from '../base/PanelLateral/useEsMovil'
import { useFocoConLaVista } from '../base/movimiento'
import BuscadorMapa, { MINIMO_BUSQUEDA } from './BuscadorMapa'
import FiltrosMapaCampos, { type OpcionesFiltros } from './FiltrosMapa'
import LeyendaUsos from './LeyendaUsos'
import ListaAreas from './ListaAreas'
import RegistroAreaInterino from './RegistroAreaInterino'
import { AREAS_POR_PAGINA, clavesDeFiltros, filtrosDeUrl, hayFiltros, listarAreasDelMapa } from './areasMapa'
import { PARAMETROS_MAPA } from './enlaces'
import { coloresPorUso, indicarPoligonos, paginaDe } from './seleccion'
import estilos from './Mapa.module.css'

const opcionesDe = <T extends { id: number }>(lista: T[] | null, texto: (e: T) => string) =>
  (lista ?? []).map((e) => ({ valor: String(e.id), texto: texto(e) }))

/** Mapa (RD-17): el campus 3D con búsqueda, filtros y la lista de áreas. Sin permiso de inventario no monta el mapa. */
export default function MapaPage() {
  const permisos = usePermisos()
  if (!tiene(permisos, PERMISOS.consultarInventario)) {
    return (
      <div className={estilos.sinMapa}>
        <EstadoSinAcceso
          titulo="No tienes acceso al mapa"
          descripcion="Solicita el permiso de consulta del inventario a una persona administradora."
        />
      </div>
    )
  }
  return (
    <VistaMapa
      puedeRegistrar={tiene(permisos, PERMISOS.registrarInventario)}
      puedeVincularMapa={tiene(permisos, PERMISOS.gestionarCatalogos)}
    />
  )
}

function VistaMapa({ puedeRegistrar, puedeVincularMapa }: { puedeRegistrar: boolean; puedeVincularMapa: boolean }) {
  const [parametros, setParametros] = useSearchParams()
  const esMovil = useEsMovil()
  const foco = useFocoConLaVista<HTMLHeadingElement>()
  const [listaAbierta, setListaAbierta] = useState(!esMovil)
  const [filtrosVisibles, setFiltrosVisibles] = useState(!esMovil)
  const [reinicio, setReinicio] = useState(0)

  const filtros = filtrosDeUrl(parametros)
  // Alta de área (`?registrar=1`, también desde la redirección de `/areas-verdes/nueva`): solo con permiso de registro.
  const registrando = puedeRegistrar && parametros.get(PARAMETROS_MAPA.registrar) === '1'
  const claveFiltros = clavesDeFiltros(filtros)
  const poligonos = useConsulta('rd-mapa-poligonos', listarPoligonosMapa)
  const areas = useConsulta(`rd-mapa-areas:${claveFiltros}`, (signal) => listarAreasDelMapa(filtros, signal))
  const buscando = filtros.q.length >= MINIMO_BUSQUEDA
  const ejemplares = useConsulta(buscando ? `rd-mapa-ejemplares:${filtros.q}` : null, (signal) =>
    listarEjemplares(filtros.q, 1, signal),
  )
  const sectores = useConsulta('rd-mapa-sectores', (signal) => listarSectores(false, signal))
  const usos = useConsulta('rd-mapa-usos', (signal) => listarTiposUso(false, signal))
  // Como el inventario actual: también los cuarteles históricos desaparecidos.
  const cuarteles = useConsulta('rd-mapa-cuarteles', (signal) => listarCuarteles(true, signal))

  const indice = useMemo(() => indicarPoligonos(poligonos.datos ?? []), [poligonos.datos])
  const resultado = useMemo(() => areas.datos ?? [], [areas.datos])
  const ordenUsos = useMemo(() => (usos.datos ?? []).map((u) => u.id), [usos.datos])
  const { clases, colores, leyenda } = useMemo(
    () => coloresPorUso(resultado, indice, ordenUsos),
    [resultado, indice, ordenUsos],
  )

  const areaParam = Number(parametros.get(PARAMETROS_MAPA.area)) || null
  const poligonoParam = parametros.get(PARAMETROS_MAPA.poligono)
  const mapaIdPedido = areaParam !== null ? indice.mapaIdDeArea.get(areaParam) : (poligonoParam ?? undefined)
  const poligonoExiste = mapaIdPedido !== undefined && indice.porMapaId.has(mapaIdPedido)
  const mapaId = poligonoExiste ? mapaIdPedido : undefined
  const areaDelContorno = poligonoParam ? (indice.porMapaId.get(poligonoParam)?.area_verde_id ?? null) : null
  const areaAbierta = areaParam ?? areaDelContorno
  const enLista = resultado.find((a) => a.id === areaAbierta)
  const areaPedida = useConsulta(areaParam !== null && !enLista ? `rd-mapa-area:${areaParam}` : null, (signal) =>
    obtenerAreaVerde(areaParam ?? 0, signal),
  )
  const nombreAbierta = enLista?.nombre ?? areaPedida.datos?.nombre ?? null
  const cargandoBase = poligonos.datos === null && poligonos.estado !== 'error'
  const noEncontrada =
    !cargandoBase &&
    ((poligonoParam !== null && !poligonoExiste) || (areaParam !== null && areaPedida.error?.estado === 404))

  const cambiar = useCallback(
    (cambios: Record<string, string | null>, reemplazar = true) =>
      setParametros(
        (previos) => {
          const nuevos = new URLSearchParams(previos)
          for (const [clave, valor] of Object.entries(cambios)) {
            if (valor) nuevos.set(clave, valor)
            else nuevos.delete(clave)
          }
          return nuevos
        },
        { replace: reemplazar },
      ),
    [setParametros],
  )

  // Abrir un área desde nada añade una entrada al historial para que «Atrás» deshaga el vuelo; cambiar de área la reemplaza.
  const hayAbierta = areaParam !== null || poligonoParam !== null
  const seleccionarArea = useCallback(
    (areaId: number) =>
      cambiar(
        {
          [PARAMETROS_MAPA.area]: String(areaId),
          [PARAMETROS_MAPA.poligono]: null,
        },
        hayAbierta,
      ),
    [cambiar, hayAbierta],
  )
  const quitarSeleccion = useCallback(
    () =>
      cambiar({
        [PARAMETROS_MAPA.area]: null,
        [PARAMETROS_MAPA.poligono]: null,
      }),
    [cambiar],
  )

  // Clic en el mapa: un contorno vinculado abre su área; uno sin vincular, el propio contorno.
  const alSeleccionarEnMapa = useCallback(
    (area: AreaCampus | null) => {
      if (!area) return quitarSeleccion()
      const areaId = indice.porMapaId.get(area.id)?.area_verde_id
      if (areaId != null) return seleccionarArea(areaId)
      cambiar(
        {
          [PARAMETROS_MAPA.poligono]: area.id,
          [PARAMETROS_MAPA.area]: null,
        },
        hayAbierta,
      )
    },
    [cambiar, hayAbierta, indice, quitarSeleccion, seleccionarArea],
  )
  useVistaDeMapa({
    areaSeleccionada: mapaId,
    onSeleccionarArea: alSeleccionarEnMapa,
  })

  const marcadores = useMemo<MarcadorMapa[]>(
    () =>
      (ejemplares.datos ?? [])
        .filter((e) => e.latitud !== null && e.longitud !== null)
        .map((e) => ({
          id: `ejemplar-${e.id}`,
          etiqueta: `Ejemplar ${e.codigo}`,
          lat: e.latitud ?? undefined,
          lon: e.longitud ?? undefined,
          tono: 'info' as const,
        })),
    [ejemplares.datos],
  )
  const alActivarMarcador = useCallback(
    (marcador: MarcadorMapa) => {
      const ejemplar = ejemplares.datos?.find((e) => `ejemplar-${e.id}` === marcador.id)
      if (ejemplar?.area_verde_id != null) seleccionarArea(ejemplar.area_verde_id)
    },
    [ejemplares.datos, seleccionarArea],
  )

  function elegirArea(area: AreaVerde) {
    seleccionarArea(area.id)
    if (esMovil) setListaAbierta(false)
  }
  function elegirEjemplar(ejemplar: EjemplarInventario) {
    if (ejemplar.area_verde_id === null) return
    seleccionarArea(ejemplar.area_verde_id)
    if (esMovil) setListaAbierta(false)
  }
  const cambiarFiltro = (filtro: string, valor: string) =>
    cambiar({ [filtro]: valor || null, [PARAMETROS_MAPA.pagina]: null })
  const buscar = useCallback(
    (texto: string) =>
      cambiar({
        [PARAMETROS_MAPA.busqueda]: texto || null,
        [PARAMETROS_MAPA.pagina]: null,
      }),
    [cambiar],
  )
  function limpiar() {
    cambiar({
      [PARAMETROS_MAPA.busqueda]: null,
      [PARAMETROS_MAPA.sector]: null,
      [PARAMETROS_MAPA.uso]: null,
      [PARAMETROS_MAPA.cuartel]: null,
      [PARAMETROS_MAPA.pagina]: null,
    })
    setReinicio((n) => n + 1)
  }

  const opciones: OpcionesFiltros = {
    sectores: opcionesDe(sectores.datos, (s) => s.nombre),
    usos: opcionesDe(usos.datos, (u) => u.nombre),
    cuarteles: opcionesDe(
      cuarteles.datos,
      (c) => `${c.numero} · ${c.nombre}${c.estado === 'desaparecido' ? ' (desaparecido)' : ''}`,
    ),
  }
  const activos = [filtros.sector, filtros.uso, filtros.cuartel].filter(Boolean).length
  const catalogosCaidos = [sectores, usos, cuarteles].filter((c) => c.estado === 'error' && !c.datos)
  const { pagina, filas } = paginaDe(resultado, Number(parametros.get(PARAMETROS_MAPA.pagina)) || 1, AREAS_POR_PAGINA)
  const sinAcceso = [poligonos, areas].some((c) => c.error?.estado === 403 && !c.datos)
  const fallo = [poligonos, areas].find((c) => c.estado === 'error' && !c.datos)

  if (sinAcceso) {
    return (
      <div className={estilos.sinMapa}>
        <EstadoSinAcceso
          titulo="No tienes acceso al mapa"
          descripcion="El servidor no te permite consultar el inventario. Solicita el permiso a una persona administradora."
        />
      </div>
    )
  }

  return (
    <div className={estilos.escena} data-mapa-libre>
      <h1 ref={foco} tabIndex={-1} className="sr-only">
        Mapa del campus
      </h1>
      <CapaColores clases={clases} colores={colores} />
      <CapaMarcadores marcadores={marcadores} onActivar={alActivarMarcador} />
      <CapaGeometrias onSeleccionarArea={alSeleccionarEnMapa} />

      <section className={estilos.herramientas} aria-label="Buscar y filtrar áreas">
        <BuscadorMapa
          key={reinicio}
          inicial={filtros.q}
          onBuscar={buscar}
          ejemplares={ejemplares}
          buscando={buscando}
          onElegirEjemplar={elegirEjemplar}
        />
        <div className={estilos.acciones}>
          <Boton
            variante="secundario"
            compacto
            icono="filter"
            aria-expanded={filtrosVisibles}
            aria-controls="filtros-mapa"
            onClick={() => setFiltrosVisibles(!filtrosVisibles)}
          >
            {activos > 0 ? `Filtros (${activos})` : 'Filtros'}
          </Boton>
          <Boton
            variante="secundario"
            compacto
            icono="list"
            aria-expanded={listaAbierta}
            onClick={() => setListaAbierta(!listaAbierta)}
          >
            Lista de áreas
          </Boton>
          {puedeRegistrar && (
            <Boton
              variante="primario"
              compacto
              icono="plus"
              aria-expanded={registrando}
              onClick={() => cambiar({ [PARAMETROS_MAPA.registrar]: '1' }, registrando)}
            >
              Registrar área
            </Boton>
          )}
        </div>
        <div id="filtros-mapa" className={estilos.filtros} hidden={!filtrosVisibles}>
          <FiltrosMapaCampos valores={filtros} opciones={opciones} onCambiar={cambiarFiltro} />
          {catalogosCaidos.length > 0 && (
            <AvisoEnLinea
              tono="advertencia"
              compacto
              accion={{
                texto: 'Reintentar',
                onClick: () => catalogosCaidos.forEach((c) => c.reintentar()),
              }}
            >
              No pudimos cargar todas las opciones de los filtros.
            </AvisoEnLinea>
          )}
        </div>
        <LeyendaUsos usos={leyenda} />
        {noEncontrada && <AvisoEnLinea tono="info">No se encontró el área en el mapa del campus.</AvisoEnLinea>}
      </section>

      {registrando && (
        <RegistroAreaInterino
          puedeVincularMapa={puedeVincularMapa}
          onCerrar={() => cambiar({ [PARAMETROS_MAPA.registrar]: null })}
          onGuardada={(areaId) => {
            areas.reintentar()
            poligonos.reintentar()
            cambiar({ [PARAMETROS_MAPA.registrar]: null, [PARAMETROS_MAPA.area]: String(areaId) })
          }}
        />
      )}
      <PanelLateral
        abierto={listaAbierta && !registrando}
        onCerrar={() => setListaAbierta(false)}
        titulo="Lista de áreas"
        subtitulo={
          areas.datos ? `${resultado.length} ${resultado.length === 1 ? 'resultado' : 'resultados'}` : undefined
        }
      >
        {areaAbierta !== null && (
          <div className={estilos.seleccion}>
            <p>
              Seleccionada: <strong>{nombreAbierta ?? `Área ${areaAbierta}`}</strong>
              {areaParam !== null && !mapaId && !cargandoBase && (
                <span className={estilos.secundario}> · sin contorno en el mapa</span>
              )}
            </p>
            <Boton variante="fantasma" compacto onClick={quitarSeleccion}>
              Quitar selección
            </Boton>
          </div>
        )}
        {fallo ? (
          <EstadoError
            nivel={3}
            titulo="No pudimos cargar las áreas"
            descripcion={fallo.error?.detalle ?? 'Revisa tu conexión e inténtalo de nuevo.'}
            onReintentar={() => {
              poligonos.reintentar()
              areas.reintentar()
            }}
          />
        ) : !areas.datos ? (
          <EstadoCarga forma="tabla" texto="Cargando áreas…" />
        ) : resultado.length === 0 ? (
          <EstadoVacio
            nivel={3}
            titulo={hayFiltros(filtros) ? 'Ninguna área coincide' : 'Aún no hay áreas registradas'}
            descripcion={
              hayFiltros(filtros)
                ? 'Prueba con otro nombre o quita algún filtro.'
                : 'Cuando se registren áreas verdes aparecerán aquí y en el mapa.'
            }
            accion={
              hayFiltros(filtros) ? (
                <Boton variante="secundario" onClick={limpiar}>
                  Limpiar filtros
                </Boton>
              ) : undefined
            }
          />
        ) : (
          <ListaAreas
            filas={filas}
            pagina={pagina}
            total={resultado.length}
            porPagina={AREAS_POR_PAGINA}
            onPagina={(n) => cambiar({ [PARAMETROS_MAPA.pagina]: n > 1 ? String(n) : null })}
            seleccionada={areaAbierta}
            tieneContorno={(id) => indice.mapaIdDeArea.has(id)}
            onElegir={elegirArea}
          />
        )}
      </PanelLateral>
    </div>
  )
}
