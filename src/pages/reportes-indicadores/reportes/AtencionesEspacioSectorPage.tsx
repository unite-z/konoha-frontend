// RF-REP-006 · HU-MOD06-014 · CU-MOD06-014 · CP-TR-MOD06-014
/**
 * Atenciones por espacio y sector, para ayudar a priorizar espacios. El agrupador principal es el sector.
 *
 * HU-MOD06-014: los espacios sin sector se conservan en un grupo identificado («Sin sector», siempre al
 * final, en el orden del back-end). El cuartel solo se muestra cuando está registrado y no sustituye al
 * sector. Sin datos, se informa del estado vacío.
 *
 * Las tarjetas «Personal propio» y «Tercerizado» también filtran por modalidad (el mismo filtro de la barra).
 *
 * Supuesto: periodo predeterminado a confirmar con la contraparte (CU-MOD06-001). Aquí, la semana actual.
 */
import { useMemo, useState } from 'react'
import AyudaEmergente from '../../../components/reportes-indicadores/AyudaEmergente'
import TarjetaFiltro from '../../../components/reportes-indicadores/TarjetaFiltro'
import AvisoEnLinea from '../../../components/ui/AvisoEnLinea'
import Boton from '../../../components/ui/Boton'
import { ChipsFiltrosActivos } from '../../../components/ui/ChipsFiltro'
import FiltroPeriodo from '../../../components/ui/FiltroPeriodo'
import Selector, { OPCION_TODOS, type OpcionSelector } from '../../../components/ui/Selector'
import TablaDatos, { type ColumnaTabla } from '../../../components/ui/TablaDatos'
import TarjetaIndicador from '../../../components/ui/TarjetaIndicador'
import { useConsulta } from '../../../hooks/useConsulta'
import { useFiltrosUrl } from '../../../hooks/useFiltrosUrl'
import { usePaginaActual } from '../../../hooks/usePaginaActual'
import { MIGAS } from '../../../router/rutasApp'
import { obtenerAtencionesEspacioSector } from '../../../services/api/reportes'
import {
  SIN_SECTOR,
  type CuartelAtenciones,
  type FiltrosAtenciones,
  type Modalidad,
  type OrdenAtenciones,
  type ResultadoAtencionesEspacioSector,
} from '../../../types/reportes'
import { OPCIONES_MODALIDAD, textoModalidad } from '../../../utils/estados'
import { formatearNumero, semanaActual, SIN_VALOR } from '../../../utils/formato'
import BloqueSector from './atenciones-espacio-sector/BloqueSector'
import {
  AtencionesFrenteAlMaximo,
  BarraModalidad,
  LeyendaModalidad,
  TiposAtencion,
} from './atenciones-espacio-sector/PiezasAtenciones'
import estilosPagina from './AtencionesEspacioSector.module.css'
import { erroresDePeriodo } from './erroresPeriodo'
import PlantillaReporte from './PlantillaReporte'
import estilos from './Reportes.module.css'

const TITULO = 'Atenciones por espacio y sector'

/** Texto del grupo y de la opción sin sector. */
const TEXTO_SIN_SECTOR = 'Sin sector'

const AYUDA_ORDEN = 'Para priorizar, revisa primero los espacios menos atendidos'

const OPCIONES_ORDEN: { valor: OrdenAtenciones; texto: string }[] = [
  { valor: 'desc', texto: 'Más atendidos primero' },
  { valor: 'asc', texto: 'Menos atendidos primero' },
]

interface Borrador {
  sector_id: string
  modalidad: string
  orden: string
}

function textoAtenciones(n: number): string {
  return `${formatearNumero(n)} ${n === 1 ? 'atención' : 'atenciones'}`
}

function plural(n: number, singular: string, varios: string): string {
  return `${formatearNumero(n)} ${n === 1 ? singular : varios}`
}

function porcentaje(parte: number, total: number): string {
  return `${formatearNumero(total > 0 ? Math.round((parte / total) * 100) : 0)} %`
}

function columnasCuarteles(maximo: number): ColumnaTabla<CuartelAtenciones>[] {
  return [
    {
      clave: 'cuartel',
      titulo: 'Cuartel',
      render: (c) => `N.º ${c.numero ?? SIN_VALOR} · ${c.nombre ?? SIN_VALOR}`,
    },
    {
      clave: 'total',
      titulo: 'Atenciones',
      subtitulo: 'frente al más atendido',
      ordenable: true,
      render: (c) => <AtencionesFrenteAlMaximo total={c.total} maximo={maximo} nombre={c.nombre ?? ''} />,
    },
    {
      clave: 'modalidad',
      titulo: 'Modalidad',
      subtitulo: 'propio · tercerizado',
      ordenable: true,
      valorOrden: (c) => c.personal_propio,
      render: (c) => <BarraModalidad propio={c.personal_propio} tercerizado={c.tercerizado} />,
    },
  ]
}

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

  /** Tarjeta de modalidad: filtra por ella o, si ya está aplicada, quita el filtro. */
  function alternarModalidad(modalidad: Modalidad) {
    establecer({ modalidad: aplicados.modalidad === modalidad ? null : modalidad })
  }

  function contextoModalidad(modalidad: Modalidad, valor: number, total: number): string {
    if (aplicados.modalidad === modalidad) return 'Filtro aplicado. Pulsa para quitarlo.'
    return `${porcentaje(valor, total)} del total · Pulsa para filtrar`
  }

  return (
    <PlantillaReporte
      consulta={consulta}
      filtros={
        <div className={estilosPagina.filtros}>
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
            <div className={estilosPagina.campoConAyuda}>
              <Selector
                id="filtro-orden"
                etiqueta="Orden"
                valor={borrador.orden}
                opciones={OPCIONES_ORDEN}
                onCambiar={(valor) => setBorrador((b) => ({ ...b, orden: valor }))}
              />
              <span className={estilosPagina.iconoAyuda}>
                <AyudaEmergente id="ayuda-orden" tema="el orden" texto={AYUDA_ORDEN} />
              </span>
            </div>
          </FiltroPeriodo>
          <ChipsFiltrosActivos
            filtros={filtrosActivos}
            onQuitar={(clave) => establecer({ [clave]: null } as Partial<Record<keyof Borrador, null>>)}
            onLimpiar={limpiarFiltros}
          />
        </div>
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
      {(datos) => {
        const resumen = datos.resumen
        const maximoCuartel = Math.max(0, ...datos.por_cuartel.map((c) => c.total))
        return (
          <>
            {resumen && (
              <div className={estilosPagina.tarjetas}>
                <div>
                  <TarjetaIndicador
                    etiqueta="Atenciones en el periodo"
                    valor={formatearNumero(resumen.total_atenciones)}
                    contexto={`En ${plural(resumen.espacios_con_atenciones, 'espacio', 'espacios')} de ${plural(
                      resumen.sectores_con_atenciones,
                      'sector',
                      'sectores',
                    )}`}
                  />
                </div>
                <TarjetaFiltro
                  activo={aplicados.modalidad === 'PersonalPropio'}
                  etiqueta={
                    aplicados.modalidad === 'PersonalPropio'
                      ? 'Quitar el filtro de personal propio'
                      : 'Filtrar por atenciones de personal propio'
                  }
                  onAlternar={() => alternarModalidad('PersonalPropio')}
                >
                  <TarjetaIndicador
                    etiqueta="Personal propio"
                    valor={formatearNumero(resumen.personal_propio)}
                    contexto={contextoModalidad('PersonalPropio', resumen.personal_propio, resumen.total_atenciones)}
                  />
                </TarjetaFiltro>
                <TarjetaFiltro
                  activo={aplicados.modalidad === 'Tercerizado'}
                  etiqueta={
                    aplicados.modalidad === 'Tercerizado'
                      ? 'Quitar el filtro de tercerizado'
                      : 'Filtrar por atenciones tercerizadas'
                  }
                  onAlternar={() => alternarModalidad('Tercerizado')}
                >
                  <TarjetaIndicador
                    etiqueta="Tercerizado"
                    valor={formatearNumero(resumen.tercerizado)}
                    contexto={contextoModalidad('Tercerizado', resumen.tercerizado, resumen.total_atenciones)}
                  />
                </TarjetaFiltro>
                <div>
                  <TarjetaIndicador
                    etiqueta="Espacios atendidos"
                    valor={formatearNumero(resumen.espacios_con_atenciones)}
                    contexto={
                      resumen.espacios_con_atenciones > 0
                        ? `${formatearNumero(
                            resumen.total_atenciones / resumen.espacios_con_atenciones,
                            1,
                          )} atenciones por espacio en promedio`
                        : 'Con al menos una atención en el periodo'
                    }
                  />
                </div>
              </div>
            )}

            <div className={estilosPagina.cabeceraSectores}>
              <p className={estilos.ayuda}>
                Las barras de atenciones comparan cada espacio con el más atendido de su sector.
              </p>
              <LeyendaModalidad />
            </div>

            {datos.por_sector.map((sector) => (
              <BloqueSector key={sector.sector_id ?? SIN_SECTOR} sector={sector} />
            ))}

            {datos.sin_espacio && datos.sin_espacio.total > 0 && (
              <AvisoEnLinea tono="info" titulo="Atenciones sin espacio asociado">
                <p>{textoAtenciones(datos.sin_espacio.total)} sobre ejemplares sin área verde registrada</p>
                <BarraModalidad propio={datos.sin_espacio.personal_propio} tercerizado={datos.sin_espacio.tercerizado} />
                <TiposAtencion porTipo={datos.sin_espacio.por_tipo} />
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
                  columnas={columnasCuarteles(maximoCuartel)}
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
        )
      }}
    </PlantillaReporte>
  )
}
