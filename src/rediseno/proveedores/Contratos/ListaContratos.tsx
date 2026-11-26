/**
 * Lista de contratos (RD-49): filas de vidrio con su avance; cada fila crece hasta ser su panel (transición `fila(id)`).
 * Filtros y página en la URL. Estados de carga, error, vacío y sin acceso (403).
 */
import { useState, type FormEvent, type MouseEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import Boton from '@/design-system/Boton'
import BarraAvance from '@/design-system/BarraAvance'
import CampoFormulario from '@/design-system/CampoFormulario'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import Estado from '@/design-system/Estado'
import Paginacion from '@/design-system/Paginacion'
import Selector, { OPCION_TODOS } from '@/design-system/Selector'
import { useConsulta } from '@/hooks/useConsulta'
import { listarContratosMaestro } from '@/services/api/maestrosTercerizados'
import { formatearFecha, formatearNumero, SIN_VALOR } from '@/utils/formato'
import { textoMonto } from '@/utils/validacionMaestros'
import { estiloTransicion, fila } from '@/rediseno/base/movimiento'
import { rutaContrato } from '../enlaces'
import { avanceDelContrato, type ContratoConAvance } from './avance'
import { conCambios, filtrosDeApi, filtrosDeUrl, POR_PAGINA } from './filtros'
import estilos from './Contratos.module.css'
import { nombreAvance } from './nombres'

const OPCIONES_VIGENCIA = [
  { valor: 'vigente', texto: 'Vigente' },
  { valor: 'vencido', texto: 'Vencido (histórico)' },
]

export interface ListaContratosProps {
  /** Id del contrato con el panel abierto (su fila ya no lleva nombre de transición: lo lleva el panel). */
  abierto: string | null
  onAbrir: (id: number) => void
  verMontos: boolean
  /** Cambia al guardar un contrato: repite la consulta. */
  version: number
  puedeCrear: boolean
  onCrear: () => void
}

export default function ListaContratos({
  abierto,
  onAbrir,
  verMontos,
  version,
  puedeCrear,
  onCrear,
}: ListaContratosProps) {
  const [parametros, setParametros] = useSearchParams()
  const filtros = filtrosDeUrl(parametros)
  const hayFiltros = filtros.q !== '' || filtros.vigencia !== ''
  const [borrador, setBorrador] = useState(filtros.q)
  const [qPrevia, setQPrevia] = useState(filtros.q)
  if (filtros.q !== qPrevia) {
    setQPrevia(filtros.q)
    setBorrador(filtros.q)
  }

  const consulta = useConsulta(
    JSON.stringify([filtros, version]),
    (signal) => listarContratosMaestro(filtrosDeApi(filtros), filtros.pagina, signal),
    (datos) => datos.results.length === 0,
  )
  const contratos = (consulta.datos?.results ?? []) as ContratoConAvance[]
  const total = consulta.datos?.count ?? 0

  function establecer(cambios: Record<string, string | null>) {
    setParametros(conCambios(parametros, { pagina: null, ...cambios }), {
      replace: true,
    })
  }

  function buscar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    establecer({ q: borrador.trim() || null })
  }

  function limpiar() {
    establecer({ q: null, vigencia: null })
  }

  function abrir(evento: MouseEvent<HTMLAnchorElement>, id: number) {
    // Con Ctrl, Mayús, rueda o Cmd se deja al navegador abrir el enlace aparte.
    if (evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return
    evento.preventDefault()
    onAbrir(id)
  }

  let cuerpo
  if (consulta.estado === 'error' && consulta.error?.estado === 403) {
    cuerpo = (
      <EstadoSinAcceso
        titulo="No puedes ver los contratos"
        descripcion="Tu cuenta no tiene permiso para consultar contratos."
      />
    )
  } else if (consulta.estado === 'error' && consulta.error?.estado === 404 && filtros.pagina > 1) {
    cuerpo = (
      <EstadoVacio
        titulo="Esta página ya no tiene contratos"
        descripcion="Los resultados cambiaron desde que se abrió la lista."
        accion={
          <Boton variante="secundario" onClick={() => establecer({})}>
            Ir a la primera página
          </Boton>
        }
      />
    )
  } else if (consulta.estado === 'error') {
    cuerpo = (
      <EstadoError
        titulo="No pudimos cargar los contratos"
        descripcion={consulta.error?.detalle ?? ''}
        onReintentar={consulta.reintentar}
      />
    )
  } else if (consulta.estado === 'vacio') {
    cuerpo = hayFiltros ? (
      <EstadoVacio
        titulo="Sin contratos con estos filtros"
        descripcion="Prueba con otra búsqueda o quita algún filtro."
        accion={
          <Boton variante="secundario" onClick={limpiar}>
            Limpiar filtros
          </Boton>
        }
      />
    ) : (
      <EstadoVacio
        titulo="Aún no hay contratos registrados"
        descripcion="Aparecerán aquí cuando el jefe de sección registre el primero."
        accion={
          puedeCrear ? (
            <Boton variante="secundario" onClick={onCrear}>
              Nuevo contrato
            </Boton>
          ) : undefined
        }
      />
    )
  } else if (contratos.length === 0) {
    cuerpo = <EstadoCarga forma="tarjetas" />
  } else {
    cuerpo = (
      <>
        <ul className={estilos.lista} aria-label="Contratos">
          {contratos.map((c) => {
            const avance = avanceDelContrato(c)
            const esAbierto = abierto === String(c.id)
            return (
              <li
                key={c.id}
                className={estilos.fila}
                data-abierto={esAbierto || undefined}
                style={esAbierto ? undefined : estiloTransicion(fila(c.id))} // estilo-calculado
              >
                <Link to={rutaContrato(c.id)} className={estilos.enlaceFila} onClick={(e) => abrir(e, c.id)}>
                  <span className={estilos.principal}>
                    <span className={`${estilos.numero} cifra`}>{c.numero}</span>
                    <span className={estilos.proveedor}>{c.proveedor_nombre ?? SIN_VALOR}</span>
                    <span className={estilos.secundario}>{c.tipo_servicio_nombre ?? SIN_VALOR}</span>
                  </span>
                  <span className={estilos.vigencia}>
                    <span className="cifra">
                      {formatearFecha(c.vigencia_inicio)} – {formatearFecha(c.vigencia_fin)}
                    </span>
                    {c.vigente ? (
                      <Estado tono="exito" texto="Vigente" />
                    ) : (
                      <Estado tono="aviso" texto="Vencido · histórico" ayuda="No se puede usar en nuevas atenciones" />
                    )}
                    {verMontos && c.monto_fijo !== null && <span className="cifra">{textoMonto(c.monto_fijo)}</span>}
                  </span>
                  <span
                    className={estilos.avance}
                    style={esAbierto ? undefined : estiloTransicion(nombreAvance(c.id))} /* estilo-calculado */
                  >
                    {avance ? (
                      <>
                        <span className={`${estilos.cifraAvance} cifra`}>
                          {formatearNumero(avance.conformes)} de {formatearNumero(avance.total)} conformes
                        </span>
                        <BarraAvance
                          valor={avance.conformes}
                          maximo={avance.total}
                          etiqueta={`Avance del contrato ${c.numero}`}
                          textoValor={`${avance.conformes} de ${avance.total} atenciones conformes`}
                        />
                        <span className={estilos.secundario}>
                          {avance.observadas} observadas · {avance.pendientes} por verificar
                        </span>
                      </>
                    ) : (
                      <>
                        <span className={`${estilos.cifraAvance} cifra`}>
                          {formatearNumero(c.atenciones)} atenciones
                        </span>
                        <span className={estilos.secundario}>El avance se calcula al abrir el contrato</span>
                      </>
                    )}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
        <Paginacion
          pagina={filtros.pagina}
          porPagina={POR_PAGINA}
          total={total}
          onCambiar={(pagina) =>
            setParametros(
              conCambios(parametros, {
                pagina: pagina > 1 ? String(pagina) : null,
              }),
              { replace: true },
            )
          }
        />
      </>
    )
  }

  return (
    <section className={estilos.seccion} aria-label="Contratos">
      <form role="search" aria-label="Filtrar contratos" className={estilos.filtros} onSubmit={buscar}>
        <CampoFormulario
          id="contratos-busqueda"
          etiqueta="Buscar contratos"
          type="search"
          ayuda="Número, proveedor o servicio"
          maxLength={100}
          value={borrador}
          onChange={(e) => setBorrador(e.target.value)}
        />
        <Selector
          id="contratos-vigencia"
          etiqueta="Vigencia"
          valor={filtros.vigencia}
          opciones={OPCIONES_VIGENCIA}
          opcionTodos={OPCION_TODOS}
          onCambiar={(valor) => establecer({ vigencia: valor || null })}
        />
        <div className={estilos.accionesFiltro}>
          <Boton type="submit" variante="secundario">
            Buscar
          </Boton>
          {hayFiltros && (
            <Boton variante="fantasma" onClick={limpiar}>
              Limpiar filtros
            </Boton>
          )}
        </div>
      </form>

      <p className={`${estilos.resumen} cifra`} aria-live="polite">
        {consulta.estado === 'exito'
          ? `${formatearNumero(total)} ${total === 1 ? 'contrato' : 'contratos'}${hayFiltros ? ' con estos filtros' : ''}`
          : ''}
      </p>
      {cuerpo}
    </section>
  )
}
