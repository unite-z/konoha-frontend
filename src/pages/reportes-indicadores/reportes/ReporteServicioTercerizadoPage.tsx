// RF-REP-008 · HU-MOD06-015 · CU-MOD06-002 (tipo «servicio tercerizado») · CP-TR-MOD06-015
/**
 * Reporte por servicio tercerizado: avance, rendimiento, especies o plagas atendidas y conformidad de un servicio
 * en un periodo, con sus registros de origen (las atenciones de MOD-05).
 *
 * - Sin servicio elegido no se consulta. Servicio, proveedor y periodo viven en la URL.
 * - Una sección sin datos se muestra «Sin datos» con su motivo, nunca con ceros (criterio 3).
 * - A1: sin registros, el estado vacío con el motivo. A2: las atenciones sin evidencia se señalan y se pueden
 *   filtrar. E1: «Reintentar» conserva los filtros.
 * - Solo consulta (GET). «Exportar» (RF-REP-009) genera el archivo con los filtros aplicados.
 */
import { useMemo, useState } from 'react'
import AvisoDatosSimulados from '@/components/reportes-indicadores/AvisoDatosSimulados'
import BotonExportar from '@/components/reportes-indicadores/BotonExportar'
import DialogoDetalle from '@/components/ui/DialogoDetalle'
import { AYUDA_CATALOGO_INCOMPLETO, MOTIVO_CATALOGO_NO_DISPONIBLE } from '@/components/reportes-indicadores/useCatalogosFiltros'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton from '@/components/ui/Boton'
import { ChipsFiltrosActivos, GrupoChips } from '@/components/ui/ChipsFiltro'
import EstadoVacio from '@/components/ui/EstadoVacio'
import FiltroPeriodo from '@/components/ui/FiltroPeriodo'
import ListaDescripcion from '@/components/ui/ListaDescripcion'
import Pestanas from '@/components/ui/Pestanas'
import Selector, { OPCION_TODOS } from '@/components/ui/Selector'
import { useConsulta } from '@/hooks/useConsulta'
import { useFiltrosUrl } from '@/hooks/useFiltrosUrl'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS } from '@/router/rutasApp'
import { obtenerCatalogoServicios, obtenerReporteServicio } from '@/services/api/reportesGestion'
import type { FilaAtencionServicio, ResultadoReporteServicio } from '@/types/reportesGestion'
import { formatearFecha, formatearNumero } from '@/utils/formato'
import { claveConsultaServicio, consultaServicio, filtrarSinEvidencia, mesEnCursoHastaHoy } from '@/utils/reporteServicio'
import { erroresDePeriodo } from './erroresPeriodo'
import PlantillaReporte from './PlantillaReporte'
import estilos from './Reportes.module.css'
import AtencionesServicio from './servicio-tercerizado/AtencionesServicio'
import DesgloseConformidad from './servicio-tercerizado/DesgloseConformidad'
import GraficoAvance from './servicio-tercerizado/GraficoAvance'
import GraficoEspecies from './servicio-tercerizado/GraficoEspecies'
import estilosServicio from './servicio-tercerizado/ServicioTercerizado.module.css'
import TarjetasServicio from './servicio-tercerizado/TarjetasServicio'

const TITULO = 'Reporte por servicio tercerizado'

const VISTAS = [
  { valor: 'avance', texto: 'Avance' },
  { valor: 'especies', texto: 'Especies y plagas' },
  { valor: 'conformidad', texto: 'Conformidad' },
  { valor: 'atenciones', texto: 'Atenciones (registros de origen)' },
] as const

type Vista = (typeof VISTAS)[number]['valor']

function leerVista(valor: string): Vista {
  return VISTAS.find((v) => v.valor === valor)?.valor ?? 'avance'
}

function textoVigencia(contrato: NonNullable<ResultadoReporteServicio['servicio']['contrato']>): string {
  const desde = formatearFecha(contrato.vigencia_desde)
  return contrato.vigencia_hasta
    ? `${contrato.codigo} · del ${desde} al ${formatearFecha(contrato.vigencia_hasta)}`
    : `${contrato.codigo} · desde el ${desde}`
}

/** Pestaña de atenciones: aviso y chip de las que no tienen evidencia (A2), y la lista. */
function AtencionesVista({ datos }: { datos: ResultadoReporteServicio }) {
  const [soloSinEvidencia, setSoloSinEvidencia] = useState(false)
  const sinEvidencia = datos.atenciones_sin_evidencia
  return (
    <div className={estilosServicio.columna}>
      {sinEvidencia > 0 && (
        <>
          <AvisoEnLinea tono="advertencia">
            {sinEvidencia === 1 ? '1 atención no tiene' : `${formatearNumero(sinEvidencia)} atenciones no tienen`} evidencia adjunta
          </AvisoEnLinea>
          <GrupoChips
            etiqueta="Atenciones que se muestran"
            opciones={[
              { valor: 'todas', texto: `Todas (${formatearNumero(datos.atenciones.length)})` },
              { valor: 'sin-evidencia', texto: `Solo sin evidencia (${formatearNumero(sinEvidencia)})` },
            ]}
            valor={soloSinEvidencia ? 'sin-evidencia' : 'todas'}
            onCambiar={(valor) => setSoloSinEvidencia(valor === 'sin-evidencia')}
          />
        </>
      )}
      <AtencionesServicio titulo="Atenciones del periodo" filas={filtrarSinEvidencia(datos.atenciones, soloSinEvidencia)} />
    </div>
  )
}

export default function ReporteServicioTercerizadoPage() {
  usePaginaActual(TITULO, [MIGAS.reportesIndicadores, MIGAS.reportes, { texto: 'Servicio tercerizado' }])

  const predeterminado = useMemo(() => mesEnCursoHastaHoy(), [])
  const { filtros, establecer } = useFiltrosUrl({ ...predeterminado, tipo_servicio_id: '', proveedor_id: '', vista: 'avance' })
  const { desde, hasta, tipo_servicio_id: servicio, proveedor_id: proveedor } = filtros
  const vista = leerVista(filtros.vista)
  const consultaApi = consultaServicio(filtros)

  const catalogo = useConsulta('catalogo-servicios-tercerizados', obtenerCatalogoServicios)
  const opcionesServicio = (catalogo.datos?.tipos_servicio ?? []).map((t) => ({ valor: String(t.id), texto: t.nombre }))
  const opcionesProveedor = (catalogo.datos?.proveedores ?? []).map((p) => ({ valor: String(p.id), texto: p.nombre }))
  const bloqueoCatalogo = catalogo.estado === 'error' ? MOTIVO_CATALOGO_NO_DISPONIBLE : undefined
  const ayudaCatalogo = catalogo.datos && !catalogo.datos.completo ? AYUDA_CATALOGO_INCOMPLETO : undefined

  // Borradores de los selectores: se aplican con el botón de la barra. Si la URL cambia, los reflejan.
  const [borrador, setBorrador] = useState({ servicio, proveedor })
  const [origen, setOrigen] = useState(`${servicio}|${proveedor}`)
  if (origen !== `${servicio}|${proveedor}`) {
    setOrigen(`${servicio}|${proveedor}`)
    setBorrador({ servicio, proveedor })
  }
  const [errorServicio, setErrorServicio] = useState<string | undefined>()
  const [detalle, setDetalle] = useState<{ titulo: string; filas: FilaAtencionServicio[] } | null>(null)

  const consulta = useConsulta<ResultadoReporteServicio>(
    claveConsultaServicio(consultaApi),
    (signal) => (consultaApi ? obtenerReporteServicio(consultaApi, signal) : Promise.reject(new Error('Sin servicio'))),
    (datos) => datos.sin_datos,
  )
  const consultaConCatalogo = {
    ...consulta,
    reintentar: () => {
      consulta.reintentar()
      if (catalogo.estado === 'error') catalogo.reintentar()
    },
  }

  const textoDe = (opciones: { valor: string; texto: string }[], valor: string) =>
    opciones.find((o) => o.valor === valor)?.texto ?? `n.º ${valor}`
  const filtrosActivos = [
    servicio && { clave: 'tipo_servicio_id', texto: `Servicio: ${textoDe(opcionesServicio, servicio)}` },
    proveedor && { clave: 'proveedor_id', texto: `Proveedor: ${textoDe(opcionesProveedor, proveedor)}` },
  ].filter((f): f is { clave: string; texto: string } => Boolean(f))

  const periodoTexto = `${formatearFecha(desde)} – ${formatearFecha(hasta)}`

  return (
    <div className={estilos.pagina}>
      <AvisoDatosSimulados />
      <PlantillaReporte
        consulta={consultaConCatalogo}
        filtros={
          <div className={estilosServicio.filtros}>
            <FiltroPeriodo
              idBase="periodo-servicio"
              desde={desde}
              hasta={hasta}
              erroresServidor={erroresDePeriodo(consulta.error)}
              cargando={consulta.estado === 'cargando' && consulta.cargaVisible}
              onAplicar={(periodo) => {
                if (!borrador.servicio) {
                  setErrorServicio('Elige el servicio del reporte')
                  document.getElementById('filtro-servicio')?.focus()
                  return
                }
                setErrorServicio(undefined)
                const sinCambios =
                  periodo.desde === desde && periodo.hasta === hasta && borrador.servicio === servicio && borrador.proveedor === proveedor
                if (sinCambios) consultaConCatalogo.reintentar()
                else establecer({ ...periodo, tipo_servicio_id: borrador.servicio, proveedor_id: borrador.proveedor })
              }}
            >
              <Selector
                id="filtro-servicio"
                etiqueta="Servicio"
                obligatorio
                valor={borrador.servicio}
                opciones={opcionesServicio}
                opcionTodos="Elige un servicio"
                error={errorServicio}
                ayuda={ayudaCatalogo}
                bloqueadoMotivo={bloqueoCatalogo}
                onCambiar={(valor) => {
                  setBorrador((b) => ({ ...b, servicio: valor }))
                  if (valor) setErrorServicio(undefined)
                }}
              />
              <Selector
                id="filtro-proveedor"
                etiqueta="Proveedor"
                valor={borrador.proveedor}
                opciones={opcionesProveedor}
                opcionTodos={OPCION_TODOS}
                ayuda={ayudaCatalogo}
                bloqueadoMotivo={bloqueoCatalogo}
                onCambiar={(valor) => setBorrador((b) => ({ ...b, proveedor: valor }))}
              />
            </FiltroPeriodo>
            <ChipsFiltrosActivos
              filtros={filtrosActivos}
              onQuitar={(clave) => establecer({ [clave]: null })}
              onLimpiar={() => establecer({ tipo_servicio_id: null, proveedor_id: null })}
            />
          </div>
        }
        acciones={(datos) => (
          <BotonExportar
            tipo="ServicioTercerizado"
            parametros={{
              desde,
              hasta,
              tipo_servicio_id: datos.filtros_aplicados.tipo_servicio_id,
              ...(datos.filtros_aplicados.proveedor_id !== null ? { proveedor_id: datos.filtros_aplicados.proveedor_id } : {}),
            }}
            resumen={filtrosActivos.map((f) => f.texto).concat(periodoTexto).join(' · ')}
            sinDatos={datos.sin_datos}
          />
        )}
        vacio={{
          titulo: 'No existen datos para los criterios seleccionados',
          accion: proveedor ? (
            <Boton variante="secundario" onClick={() => establecer({ proveedor_id: null })}>
              Quitar el proveedor
            </Boton>
          ) : undefined,
        }}
      >
        {(datos) => (
          <>
            <section className={estilos.seccion} aria-labelledby="titulo-servicio">
              <h2 id="titulo-servicio" className={estilos.tituloSeccion}>
                Resumen del servicio
              </h2>
              <ListaDescripcion
                elementos={[
                  { etiqueta: 'Servicio', valor: datos.servicio.nombre },
                  { etiqueta: 'Proveedor', valor: datos.servicio.proveedor?.nombre ?? 'Varios proveedores' },
                  { etiqueta: 'Contrato', valor: datos.servicio.contrato ? textoVigencia(datos.servicio.contrato) : 'Varios contratos' },
                  { etiqueta: 'Periodo', valor: periodoTexto },
                ]}
              />
              <TarjetasServicio datos={datos} />
            </section>

            <section className={estilos.seccion} aria-labelledby="titulo-detalle">
              <h2 id="titulo-detalle" className={estilos.tituloSeccion}>
                Detalle del servicio
              </h2>
              <Pestanas
                etiqueta="Detalle del servicio"
                valor={vista}
                onCambiar={(valor) => establecer({ vista: valor })}
                pestanas={VISTAS.map((v) => ({
                  valor: v.valor,
                  texto: v.texto,
                  extra: v.valor === 'atenciones' ? <span className="cifra"> ({formatearNumero(datos.atenciones.length)})</span> : undefined,
                }))}
              >
                {/* Al cambiar los datos, los gráficos olvidan la parte elegida. */}
                {vista === 'avance' && (
                  <GraficoAvance key={datos.generado_en} avance={datos.avance} filas={datos.atenciones} onVerDetalle={(titulo, filas) => setDetalle({ titulo, filas })} />
                )}
                {vista === 'especies' && (
                  <GraficoEspecies key={datos.generado_en} especies={datos.especies_plagas} filas={datos.atenciones} onVerDetalle={(titulo, filas) => setDetalle({ titulo, filas })} />
                )}
                {vista === 'conformidad' && (
                  <DesgloseConformidad conformidad={datos.conformidad} filas={datos.atenciones} onVerDetalle={(titulo, filas) => setDetalle({ titulo, filas })} />
                )}
                {vista === 'atenciones' && <AtencionesVista key={datos.generado_en} datos={datos} />}
              </Pestanas>
            </section>

            {datos.notas.length > 0 && (
              <ul className={`${estilos.listaSimple} ${estilos.ayuda}`} aria-label="Notas del reporte">
                {datos.notas.map((nota) => (
                  <li key={nota}>{nota}</li>
                ))}
              </ul>
            )}

            <DialogoDetalle
              abierto={detalle !== null}
              titulo={detalle?.titulo ?? ''}
              descripcion={`${datos.servicio.nombre} · ${periodoTexto}`}
              onCerrar={() => setDetalle(null)}
            >
              {detalle && <AtencionesServicio titulo={detalle.titulo} filas={detalle.filas} />}
            </DialogoDetalle>
          </>
        )}
      </PlantillaReporte>

      {!consultaApi && (
        <EstadoVacio
          titulo="Elige un servicio para ver su reporte"
          descripcion="Indica el servicio y el periodo, y pulsa «Aplicar filtros»."
        />
      )}
    </div>
  )
}
