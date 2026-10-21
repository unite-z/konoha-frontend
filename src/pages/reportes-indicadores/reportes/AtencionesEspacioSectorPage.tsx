// RF-REP-006 · HU-MOD06-014 · CU-MOD06-014 · CP-TR-MOD06-014
/**
 * Atenciones por espacio y sector, para ayudar a priorizar espacios. El agrupador principal es el sector.
 *
 * HU-MOD06-014: los espacios sin sector se conservan en un grupo identificado («Sin sector», siempre al
 * final, en el orden del back-end). El cuartel solo se muestra cuando está registrado y no sustituye al
 * sector. Sin datos, se informa del estado vacío.
 *
 * Supuesto: periodo predeterminado a confirmar con la contraparte (CU-MOD06-001). Aquí, la semana actual.
 */
import { useMemo, useState } from 'react'
import AvisoEnLinea from '../../../components/ui/AvisoEnLinea'
import Badge from '../../../components/ui/Badge'
import Boton from '../../../components/ui/Boton'
import { ChipsFiltrosActivos } from '../../../components/ui/ChipsFiltro'
import FiltroPeriodo from '../../../components/ui/FiltroPeriodo'
import Selector, { OPCION_TODOS, type OpcionSelector } from '../../../components/ui/Selector'
import TablaDatos, { type ColumnaTabla } from '../../../components/ui/TablaDatos'
import TarjetaIndicador, { FilaTarjetas } from '../../../components/ui/TarjetaIndicador'
import { useConsulta } from '../../../hooks/useConsulta'
import { useFiltrosUrl } from '../../../hooks/useFiltrosUrl'
import { usePaginaActual } from '../../../hooks/usePaginaActual'
import { MIGAS } from '../../../router/rutasApp'
import { obtenerAtencionesEspacioSector } from '../../../services/api/reportes'
import {
  SIN_SECTOR,
  type CuartelAtenciones,
  type EspacioAtenciones,
  type FiltrosAtenciones,
  type Medidas,
  type Modalidad,
  type OrdenAtenciones,
  type ResultadoAtencionesEspacioSector,
  type SectorAtenciones,
} from '../../../types/reportes'
import { OPCIONES_MODALIDAD, textoModalidad } from '../../../utils/estados'
import { formatearNumero, semanaActual, SIN_VALOR } from '../../../utils/formato'
import { erroresDePeriodo } from './erroresPeriodo'
import PlantillaReporte from './PlantillaReporte'
import estilos from './Reportes.module.css'

const TITULO = 'Atenciones por espacio y sector'

/** Texto del grupo y de la opción sin sector. */
const TEXTO_SIN_SECTOR = 'Sin sector'

const OPCIONES_ORDEN: { valor: OrdenAtenciones; texto: string }[] = [
  { valor: 'desc', texto: 'Más atendidos primero' },
  { valor: 'asc', texto: 'Menos atendidos primero' },
]

interface Borrador {
  sector_id: string
  modalidad: string
  orden: string
}

/** «Mantenimiento de jardines: 3 · Poda (Menor): 1». */
function textoPorTipo(porTipo: Record<string, number>): string {
  const partes = Object.entries(porTipo).map(([tipo, n]) => `${tipo}: ${formatearNumero(n)}`)
  return partes.length > 0 ? partes.join(' · ') : SIN_VALOR
}

function textoAtenciones(n: number): string {
  return `${formatearNumero(n)} ${n === 1 ? 'atención' : 'atenciones'}`
}

/** «{total} atenciones · {personal_propio} personal propio · {tercerizado} tercerizado». */
function textoTotales(m: Medidas): string {
  return `${textoAtenciones(m.total)} · ${formatearNumero(m.personal_propio)} personal propio · ${formatearNumero(
    m.tercerizado,
  )} tercerizado`
}

const COLUMNAS_ESPACIOS: ColumnaTabla<EspacioAtenciones>[] = [
  { clave: 'area_verde_nombre', titulo: 'Espacio', ordenable: true },
  { clave: 'total', titulo: 'Total', alineacion: 'derecha', ordenable: true, render: (e) => formatearNumero(e.total) },
  {
    clave: 'personal_propio',
    titulo: 'Personal propio',
    alineacion: 'derecha',
    ordenable: true,
    render: (e) => formatearNumero(e.personal_propio),
  },
  {
    clave: 'tercerizado',
    titulo: 'Tercerizado',
    alineacion: 'derecha',
    ordenable: true,
    render: (e) => formatearNumero(e.tercerizado),
  },
  { clave: 'por_tipo', titulo: 'Por tipo', multilinea: true, render: (e) => textoPorTipo(e.por_tipo) },
]

const COLUMNAS_CUARTELES: ColumnaTabla<CuartelAtenciones>[] = [
  {
    clave: 'cuartel',
    titulo: 'Cuartel',
    render: (c) => `N.º ${c.numero ?? SIN_VALOR} · ${c.nombre ?? SIN_VALOR}`,
  },
  { clave: 'total', titulo: 'Total', alineacion: 'derecha', ordenable: true, render: (c) => formatearNumero(c.total) },
  {
    clave: 'personal_propio',
    titulo: 'Personal propio',
    alineacion: 'derecha',
    ordenable: true,
    render: (c) => formatearNumero(c.personal_propio),
  },
  {
    clave: 'tercerizado',
    titulo: 'Tercerizado',
    alineacion: 'derecha',
    ordenable: true,
    render: (c) => formatearNumero(c.tercerizado),
  },
]

function construirOpcionesSector(datos: ResultadoAtencionesEspacioSector | null): OpcionSelector[] {
  const sectores = (datos?.por_sector ?? [])
    .filter((s) => s.sector_id !== null)
    .map((s) => ({ valor: String(s.sector_id), texto: s.sector_nombre ?? `n.º ${s.sector_id}` }))
  return [...sectores, { valor: SIN_SECTOR, texto: TEXTO_SIN_SECTOR }]
}

function aFiltrosApi(b: Borrador): FiltrosAtenciones {
  const filtros: FiltrosAtenciones = {}
  if (b.sector_id) filtros.sector_id = b.sector_id === SIN_SECTOR ? SIN_SECTOR : Number(b.sector_id)
  if (b.modalidad) filtros.modalidad = b.modalidad as Modalidad
  if (b.orden) filtros.orden = b.orden as OrdenAtenciones
  return filtros
}

function BloqueSector({ sector }: { sector: SectorAtenciones }) {
  const esSinSector = sector.sector_id === null
  const nombre = sector.sector_nombre ?? TEXTO_SIN_SECTOR
  const idTitulo = `sector-${sector.sector_id ?? SIN_SECTOR}`
  return (
    <section className={estilos.superficie} aria-labelledby={idTitulo}>
      <div className={estilos.cabeceraGrupo}>
        <div>
          <h2 id={idTitulo} className={estilos.tituloGrupo}>
            {nombre}
          </h2>
          {sector.capataz_vigente?.nombre && <p className={estilos.ayuda}>Capataz: {sector.capataz_vigente.nombre}</p>}
          {esSinSector && <p className={estilos.ayuda}>Espacios sin sector asignado; se atienden a demanda</p>}
        </div>
        <div className={estilos.enLinea}>
          {sector.atencion_a_demanda && <Badge tono="neutral" texto="Atención a demanda" />}
          <span className={`${estilos.totalesGrupo} cifra`}>{textoTotales(sector)}</span>
        </div>
      </div>
      <TablaDatos
        titulo={`Espacios de ${nombre}`}
        columnas={COLUMNAS_ESPACIOS}
        filas={sector.espacios}
        claveFila={(e) => String(e.area_verde_id)}
      />
    </section>
  )
}

export default function AtencionesEspacioSectorPage() {
  usePaginaActual(TITULO, [MIGAS.reportesIndicadores, MIGAS.reportes, { texto: TITULO }])

  const predeterminado = useMemo(() => semanaActual(), [])
  const { filtros, establecer } = useFiltrosUrl({ ...predeterminado, sector_id: '', modalidad: '', orden: 'desc' })
  const { desde, hasta } = filtros
  const aplicados: Borrador = { sector_id: filtros.sector_id, modalidad: filtros.modalidad, orden: filtros.orden }
  const claveAplicados = JSON.stringify(aplicados)
  const hayFiltrosOpciones = Boolean(aplicados.sector_id || aplicados.modalidad)

  // Si los filtros de la URL cambian (por ejemplo, al quitar un chip), el borrador los refleja.
  const [borrador, setBorrador] = useState<Borrador>(aplicados)
  const [origenBorrador, setOrigenBorrador] = useState(claveAplicados)
  if (origenBorrador !== claveAplicados) {
    setOrigenBorrador(claveAplicados)
    setBorrador(aplicados)
  }

  const consulta = useConsulta<ResultadoAtencionesEspacioSector>(
    `${desde}|${hasta}|${claveAplicados}`,
    (signal) => obtenerAtencionesEspacioSector({ desde, hasta }, aFiltrosApi(aplicados), signal),
    (datos) => datos.sin_datos,
  )

  // Opciones de sector: respuesta del periodo sin filtros opcionales.
  const consultaOpciones = useConsulta<ResultadoAtencionesEspacioSector>(
    hayFiltrosOpciones ? `opciones|${desde}|${hasta}` : null,
    (signal) => obtenerAtencionesEspacioSector({ desde, hasta }, {}, signal),
  )
  const fuenteOpciones = hayFiltrosOpciones ? consultaOpciones.datos : consulta.datos
  const opcionesSector = useMemo(() => construirOpcionesSector(fuenteOpciones), [fuenteOpciones])

  const filtrosActivos = [
    aplicados.sector_id && {
      clave: 'sector_id',
      texto: `Sector: ${opcionesSector.find((o) => o.valor === aplicados.sector_id)?.texto ?? aplicados.sector_id}`,
    },
    aplicados.modalidad && {
      clave: 'modalidad',
      texto: `Modalidad: ${textoModalidad(aplicados.modalidad as Modalidad)}`,
    },
  ].filter((f): f is { clave: string; texto: string } => Boolean(f))

  function limpiarFiltros() {
    establecer({ sector_id: null, modalidad: null })
  }

  return (
    <PlantillaReporte
      consulta={consulta}
      filtros={
        <>
          <FiltroPeriodo
            idBase="periodo-atenciones"
            desde={desde}
            hasta={hasta}
            erroresServidor={erroresDePeriodo(consulta.error)}
            cargando={consulta.estado === 'cargando' && consulta.cargaVisible}
            onAplicar={(periodo) => {
              const sinCambios =
                periodo.desde === desde && periodo.hasta === hasta && JSON.stringify(borrador) === claveAplicados
              if (sinCambios) consulta.reintentar()
              else establecer({ ...periodo, ...borrador })
            }}
          >
            <Selector
              id="filtro-sector"
              etiqueta="Sector"
              valor={borrador.sector_id}
              opciones={opcionesSector}
              opcionTodos={OPCION_TODOS}
              onCambiar={(valor) => setBorrador((b) => ({ ...b, sector_id: valor }))}
            />
            <Selector
              id="filtro-modalidad"
              etiqueta="Modalidad"
              valor={borrador.modalidad}
              opciones={OPCIONES_MODALIDAD}
              opcionTodos={OPCION_TODOS}
              onCambiar={(valor) => setBorrador((b) => ({ ...b, modalidad: valor }))}
            />
            <Selector
              id="filtro-orden"
              etiqueta="Orden"
              ayuda="Para priorizar, revisa primero los espacios menos atendidos"
              valor={borrador.orden}
              opciones={OPCIONES_ORDEN}
              onCambiar={(valor) => setBorrador((b) => ({ ...b, orden: valor }))}
            />
          </FiltroPeriodo>
          <ChipsFiltrosActivos
            filtros={filtrosActivos}
            onQuitar={(clave) => establecer({ [clave]: null } as Partial<Record<keyof Borrador, null>>)}
            onLimpiar={limpiarFiltros}
          />
        </>
      }
      vacio={{
        titulo: 'Sin atenciones en el periodo',
        accion: hayFiltrosOpciones ? (
          <Boton variante="secundario" onClick={limpiarFiltros}>
            Limpiar filtros
          </Boton>
        ) : undefined,
      }}
    >
      {(datos) => (
        <>
          {datos.resumen && (
            <FilaTarjetas>
              <TarjetaIndicador etiqueta="Atenciones en el periodo" valor={formatearNumero(datos.resumen.total_atenciones)} />
              <TarjetaIndicador etiqueta="Personal propio" valor={formatearNumero(datos.resumen.personal_propio)} />
              <TarjetaIndicador etiqueta="Tercerizado" valor={formatearNumero(datos.resumen.tercerizado)} />
              <TarjetaIndicador
                etiqueta="Espacios atendidos"
                valor={formatearNumero(datos.resumen.espacios_con_atenciones)}
              />
            </FilaTarjetas>
          )}

          {datos.por_sector.map((sector) => (
            <BloqueSector key={sector.sector_id ?? SIN_SECTOR} sector={sector} />
          ))}

          {datos.sin_espacio && datos.sin_espacio.total > 0 && (
            <AvisoEnLinea tono="info" titulo="Atenciones sin espacio asociado">
              <p>{textoAtenciones(datos.sin_espacio.total)} sobre ejemplares sin área verde registrada</p>
              <p className="cifra">
                {formatearNumero(datos.sin_espacio.personal_propio)} personal propio ·{' '}
                {formatearNumero(datos.sin_espacio.tercerizado)} tercerizado · {textoPorTipo(datos.sin_espacio.por_tipo)}
              </p>
            </AvisoEnLinea>
          )}

          {datos.por_cuartel.length > 0 && (
            <section className={estilos.seccion} aria-labelledby="titulo-cuarteles">
              <h2 id="titulo-cuarteles" className={estilos.tituloSeccion}>
                Por cuartel (referencia histórica)
              </h2>
              <p className={estilos.ayuda}>El cuartel es una capa histórica opcional y no sustituye al sector</p>
              <TablaDatos
                titulo="Por cuartel (referencia histórica)"
                columnas={COLUMNAS_CUARTELES}
                filas={datos.por_cuartel}
                claveFila={(c) => String(c.cuartel_id)}
              />
            </section>
          )}

          {datos.notas.map((nota) => (
            <AvisoEnLinea key={nota} tono="info">
              {nota}
            </AvisoEnLinea>
          ))}
        </>
      )}
    </PlantillaReporte>
  )
}
