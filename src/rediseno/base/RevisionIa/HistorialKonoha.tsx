/**
 * «Historial de Konoha» (RD-10, IA-16): lista paginada de propuestas de un asistente por estado, con los filtros del
 * adaptador y los parámetros de entrada de la URL (`?incidencia_id=`, `?ejemplar_id=`, `?atencion_id=`,
 * `?actividad_id=`). El estado, los filtros y la página (`?page=`) viven en la URL, con los mismos nombres que las
 * bandejas de hoy. Al abrir una fila se ve su detalle.
 *
 * Excepción al sistema (AV-351): la cabecera de cada fila es un `<button>` de ancho completo con varios datos; `Boton` no lo admite.
 */
import { useId, useState } from 'react'
import { useSearchParams } from 'react-router'
import { GrupoChips } from '@/design-system/ChipsFiltro'
import Estado from '@/design-system/Estado'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import Boton from '@/design-system/Boton'
import Paginacion from '@/design-system/Paginacion'
import Selector, { OPCION_TODOS } from '@/design-system/Selector'
import { insigniaAEstado } from '@/design-system/tonos'
import { PERMISO_CONSULTA_REPORTES } from '@/config/permisos'
import { useConsulta } from '@/hooks/useConsulta'
import { usePermisos } from '@/sesion/ContextoSesion'
import type { EstadoSugerencia } from '@/types/ia'
import { insigniaSugerencia } from '@/utils/estados'
import { formatearFechaHora, formatearNumero } from '@/utils/formato'
import { estiloTransicion, fila, transicionar } from '../movimiento'
import {
  PARAMETROS_ENTRADA_HISTORIAL,
  POR_PAGINA_HISTORIAL,
  type AdaptadorHistorial,
  type EntradaHistorial,
  type ParametrosEntradaHistorial,
} from './contrato'
import estilos from './HistorialKonoha.module.css'

export interface HistorialKonohaProps {
  adaptador: AdaptadorHistorial
  /** Permiso para entrar; por defecto el de hoy. */
  permisoEntrada?: string
}

const ESTADOS: EstadoSugerencia[] = ['Propuesta', 'Validada', 'Rechazada']
const TEXTO_ESTADO: Record<EstadoSugerencia, string> = {
  Propuesta: 'Pendientes de revisión',
  Validada: 'Validadas',
  Rechazada: 'Rechazadas',
}
/** «Todas» va explícito en la URL cuando sin parámetro se ve otro estado (`estadoInicial`). */
const TODAS = 'todas'
const PAGINA = 'page'
const esIdentificador = (valor: string) => /^[1-9]\d*$/.test(valor)

export default function HistorialKonoha({
  adaptador,
  permisoEntrada = PERMISO_CONSULTA_REPORTES,
}: HistorialKonohaProps) {
  const id = useId()
  const permisos = usePermisos() ?? []
  const entra = permisos.includes(permisoEntrada)
  const [params, setParams] = useSearchParams()
  const [abierta, setAbierta] = useState<number | null>(null)
  const inicial = adaptador.estadoInicial ?? null
  const porPagina = adaptador.porPagina ?? POR_PAGINA_HISTORIAL

  const estadoParam = params.get('estado')
  const estado = estadoParam === TODAS ? null : (ESTADOS.find((e) => e === estadoParam) ?? inicial)
  const filtros: Record<string, string> = {}
  for (const f of adaptador.filtros ?? []) {
    const valor = params.get(f.clave)
    if (valor && f.opciones.some((o) => o.valor === valor)) filtros[f.clave] = valor
  }
  const entrada: ParametrosEntradaHistorial = {}
  for (const nombre of PARAMETROS_ENTRADA_HISTORIAL) {
    const valor = params.get(nombre)
    if (valor && esIdentificador(valor)) entrada[nombre] = valor
  }
  const pagina = Math.max(1, Math.floor(Number(params.get(PAGINA))) || 1)

  const base = `historial|${adaptador.clave}|${JSON.stringify([filtros, entrada])}`
  const consulta = useConsulta(
    entra ? `${base}|${estado ?? ''}|${pagina}` : null,
    (signal) => adaptador.cargar({ estado, filtros, entrada, pagina }, signal),
    (p) => p.entradas.length === 0,
  )
  const { contar } = adaptador
  const recuentos = useConsulta<Partial<Record<EstadoSugerencia, number>>>(
    entra && contar ? `${base}|recuentos` : null,
    (signal) => (contar ? contar({ filtros, entrada }, signal) : Promise.resolve({})),
  )

  /** Cambia la URL con transición; cualquier cambio de estado o filtro vuelve a la primera página. */
  const cambiarUrl = (cambios: Record<string, string | null>) => {
    transicionar(() => {
      setAbierta(null)
      setParams(
        (previo) => {
          const siguiente = new URLSearchParams(previo)
          if (!(PAGINA in cambios)) siguiente.delete(PAGINA)
          for (const [nombre, valor] of Object.entries(cambios)) {
            if (valor) siguiente.set(nombre, valor)
            else siguiente.delete(nombre)
          }
          return siguiente
        },
        { replace: true },
      )
    })
  }
  const elegirEstado = (valor: string) => cambiarUrl({ estado: valor || (inicial ? TODAS : null) })
  const limpiar = () => {
    const nombres = ['estado', ...(adaptador.filtros ?? []).map((f) => f.clave), ...PARAMETROS_ENTRADA_HISTORIAL]
    cambiarUrl(Object.fromEntries(nombres.map((n) => [n, null])))
  }
  const alternar = (entradaFila: EntradaHistorial) =>
    transicionar(() => setAbierta((actual) => (actual === entradaFila.id ? null : entradaFila.id)))

  const { error, datos } = consulta
  if (!entra || error?.estado === 403) return <EstadoSinAcceso descripcion={error?.detalle} />
  const hayFiltros =
    estado !== inicial || Object.keys(filtros).length > 0 || Object.keys(entrada).length > 0 || pagina > 1

  const textoEstado = (e: EstadoSugerencia) => {
    const texto = adaptador.textosEstado?.[e] ?? TEXTO_ESTADO[e]
    const n = recuentos.datos?.[e]
    return n === undefined ? texto : `${texto} (${formatearNumero(n)})`
  }
  const opcionesEstado = [{ valor: '', texto: 'Todas' }, ...ESTADOS.map((e) => ({ valor: e, texto: textoEstado(e) }))]

  const lista = () => {
    if (error && error.estado !== 404)
      return (
        <EstadoError
          titulo="No se pudo cargar el historial"
          descripcion={error.detalle}
          onReintentar={consulta.reintentar}
        />
      )
    if (consulta.estado === 'vacio' || error?.estado === 404)
      return (
        <EstadoVacio
          titulo={hayFiltros ? 'Ninguna propuesta coincide' : 'Aún no hay propuestas'}
          descripcion={hayFiltros ? 'Prueba con otros filtros.' : 'Cuando Konoha proponga algo, aparecerá aquí.'}
          accion={
            hayFiltros && (
              <Boton variante="secundario" onClick={limpiar}>
                Limpiar filtros
              </Boton>
            )
          }
        />
      )
    // Mientras llega otra página o filtro se ven los datos anteriores; pasados 300 ms, el estado de carga.
    if (!datos || consulta.cargaVisible) return consulta.cargaVisible ? <EstadoCarga forma="tarjetas" /> : null
    return (
      <>
        <ul className={estilos.lista} aria-label="Propuestas de Konoha">
          {datos.entradas.map((e) => {
            const abierto = abierta === e.id
            const idDetalle = `${id}-detalle-${e.id}`
            return (
              <li
                key={e.id}
                className={estilos.fila}
                style={estiloTransicion(fila(`${adaptador.clave}-${e.id}`))} /* estilo-calculado */
              >
                <button
                  type="button"
                  className={estilos.cabecera}
                  aria-expanded={abierto}
                  aria-controls={abierto ? idDetalle : undefined}
                  onClick={() => alternar(e)}
                >
                  <span className={estilos.titulo}>{e.titulo}</span>
                  <Estado {...insigniaAEstado(insigniaSugerencia(e.estado, e.etiquetaEstado ?? null))} />
                  {e.resumen && <span className={estilos.resumen}>{e.resumen}</span>}
                  <span className={estilos.traza}>{`Pedida el ${formatearFechaHora(e.solicitadaEn)}`}</span>
                  {e.decididaPor && (
                    <span className={estilos.traza}>
                      {`Decidida por ${e.decididaPor} · ${formatearFechaHora(e.decididaEn)}`}
                    </span>
                  )}
                </button>
                {abierto && (
                  <div id={idDetalle} className={estilos.detalle}>
                    {adaptador.renderDetalle(e)}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
        {datos.total > porPagina && (
          <Paginacion
            pagina={pagina}
            porPagina={porPagina}
            total={datos.total}
            onCambiar={(n) => cambiarUrl({ [PAGINA]: n > 1 ? String(n) : null })}
          />
        )}
      </>
    )
  }

  return (
    <section className={estilos.historial} aria-labelledby={`${id}-titulo`} aria-busy={consulta.estado === 'cargando'}>
      <h2 id={`${id}-titulo`} className={estilos.encabezado}>
        Historial de Konoha
      </h2>
      <div className={estilos.filtros}>
        <GrupoChips etiqueta="Estado" opciones={opcionesEstado} valor={estado ?? ''} onCambiar={elegirEstado} />
        {(adaptador.filtros ?? []).map((f) => (
          <Selector
            key={f.clave}
            id={`${id}-${f.clave}`}
            etiqueta={f.etiqueta}
            compacto
            valor={filtros[f.clave] ?? ''}
            opciones={f.opciones}
            opcionTodos={OPCION_TODOS}
            onCambiar={(v) => cambiarUrl({ [f.clave]: v })}
          />
        ))}
      </div>
      {lista()}
    </section>
  )
}
