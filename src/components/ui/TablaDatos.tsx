/**
 * TablaDatos: Guía de Estilo Web, sección 5.5.
 *
 * - Cabecera de 40px en gris claro con `<th scope="col">`; filas de 48px (compacta: 40px).
 * - Columnas por props: `clave`, `titulo`, `alineacion` (texto a la izquierda, cifras a la derecha),
 *   `ordenable`, `render`.
 * - Ordenación: icono de flechas en las columnas ordenables; la activa muestra la dirección y `aria-sort`.
 * - Paginación en el cliente (25 por defecto; 25, 50 o 100 por página) o en el servidor
 *   (`paginacionServidor`). Texto «Mostrando 1 a 25 de 38».
 * - Con más de 25 filas visibles, la cabecera queda fija al desplazar.
 * - Fila clicable opcional (`onFilaClick`): toda la fila es el área de clic y también responde a Enter.
 * - Estados integrados: vacío, carga y error.
 * - Desplazamiento horizontal propio si no cabe, con la primera columna fija.
 */
import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import { formatearNumero, SIN_VALOR } from '../../utils/formato'
import Boton from './Boton'
import EstadoCarga from './EstadoCarga'
import EstadoError, { type EstadoErrorProps } from './EstadoError'
import EstadoVacio, { type EstadoVacioProps } from './EstadoVacio'
import Icono from './Icono'
import estilos from './TablaDatos.module.css'

export interface ColumnaTabla<F> {
  clave: string
  titulo: string
  /** Segunda línea del encabezado (texto pequeño). */
  subtitulo?: string
  alineacion?: 'izquierda' | 'derecha'
  /** Permite texto en varias líneas (por defecto las celdas no se parten y la tabla se desplaza). */
  multilinea?: boolean
  ordenable?: boolean
  /** Valor con el que se ordena la columna (por defecto, `fila[clave]`). */
  valorOrden?: (fila: F) => string | number | boolean | null | undefined
  /** Contenido de la celda (por defecto, `fila[clave]` como texto). */
  render?: (fila: F) => ReactNode
}

export type EstadoTabla = 'exito' | 'vacio' | 'cargando' | 'error'

export type DireccionOrden = 'asc' | 'desc'

export interface PaginacionServidor {
  /** Página actual, desde 1. */
  pagina: number
  /** Total de elementos en el servidor. */
  total: number
  porPagina: number
  onCambiarPagina: (pagina: number) => void
}

export interface TablaDatosProps<F> {
  /** Título de la tabla (`<caption>`, oculto visualmente salvo `tituloVisible`). */
  titulo: string
  tituloVisible?: boolean
  columnas: ColumnaTabla<F>[]
  filas: F[]
  claveFila: (fila: F, indice: number) => string
  estado?: EstadoTabla
  vacio?: EstadoVacioProps
  error?: EstadoErrorProps
  onFilaClick?: (fila: F) => void
  /** Filas de 40px. */
  compacta?: boolean
  ordenInicial?: { clave: string; direccion: DireccionOrden }
  /** Paginación del servidor. Sin ella, la tabla pagina en el cliente. */
  paginacionServidor?: PaginacionServidor
}

/** Filas por página (Guía Web 5.5). */
const OPCIONES_POR_PAGINA = [25, 50, 100]

/** Más filas visibles que este número fijan la cabecera (Guía Web 5.5). */
const FILAS_CABECERA_FIJA = 25

function valorPorDefecto<F>(fila: F, clave: string): unknown {
  return (fila as Record<string, unknown>)[clave]
}

function comparar(a: unknown, b: unknown): number {
  const vacioA = a === null || a === undefined || a === ''
  const vacioB = b === null || b === undefined || b === ''
  if (vacioA && vacioB) return 0
  if (vacioA) return 1 // los vacíos siempre al final
  if (vacioB) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'es', { numeric: true, sensitivity: 'base' })
}


export default function TablaDatos<F>({
  titulo,
  tituloVisible = false,
  columnas,
  filas,
  claveFila,
  estado = 'exito',
  vacio,
  error,
  onFilaClick,
  compacta = false,
  ordenInicial,
  paginacionServidor,
}: TablaDatosProps<F>) {
  const [orden, setOrden] = useState(ordenInicial ?? null)
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(OPCIONES_POR_PAGINA[0])

  // Al cambiar las filas (nueva consulta), se vuelve a la primera página (ajuste durante el render).
  // Se compara por las claves de las filas, no por referencia (las páginas pueden construir el arreglo).
  const firmaFilas = filas.map(claveFila).join('|')
  const [firmaPrevia, setFirmaPrevia] = useState(firmaFilas)
  if (firmaPrevia !== firmaFilas) {
    setFirmaPrevia(firmaFilas)
    setPagina(1)
  }

  const ordenadas = useMemo(() => {
    if (!orden) return filas
    const columna = columnas.find((c) => c.clave === orden.clave)
    if (!columna) return filas
    const valor = columna.valorOrden ?? ((fila: F) => valorPorDefecto(fila, columna.clave))
    const copia = [...filas]
    copia.sort((a, b) => {
      const va = valor(a)
      const vb = valor(b)
      const base = comparar(va, vb)
      // Los vacíos quedan al final en ambas direcciones.
      if (va === null || va === undefined || vb === null || vb === undefined) return base
      return orden.direccion === 'asc' ? base : -base
    })
    return copia
  }, [filas, orden, columnas])

  const enCliente = !paginacionServidor
  const total = paginacionServidor ? paginacionServidor.total : ordenadas.length
  const tamanoPagina = paginacionServidor ? paginacionServidor.porPagina : porPagina
  const paginaActual = paginacionServidor ? paginacionServidor.pagina : pagina
  const totalPaginas = Math.max(1, Math.ceil(total / tamanoPagina))
  const visibles = enCliente ? ordenadas.slice((pagina - 1) * porPagina, pagina * porPagina) : ordenadas
  const mostrarPaginacion = total > OPCIONES_POR_PAGINA[0]
  const cabeceraFija = visibles.length > FILAS_CABECERA_FIJA

  function cambiarPagina(nueva: number) {
    if (paginacionServidor) paginacionServidor.onCambiarPagina(nueva)
    else setPagina(nueva)
  }

  function alternarOrden(clave: string) {
    setOrden((actual) =>
      actual?.clave === clave
        ? { clave, direccion: actual.direccion === 'asc' ? 'desc' : 'asc' }
        : { clave, direccion: 'asc' },
    )
  }

  if (estado !== 'exito') {
    return (
      <div className={estilos.estado}>
        {tituloVisible && <p className={estilos.tituloVisible}>{titulo}</p>}
        {estado === 'cargando' && <EstadoCarga forma="tabla" />}
        {estado === 'vacio' && vacio && <EstadoVacio nivel={3} {...vacio} />}
        {estado === 'error' && error && <EstadoError nivel={3} {...error} />}
      </div>
    )
  }

  const primero = total === 0 ? 0 : (paginaActual - 1) * tamanoPagina + 1
  const ultimo = Math.min(total, paginaActual * tamanoPagina)

  return (
    <div className={estilos.contenedor}>
      <div
        className={`${estilos.desplazable} ${cabeceraFija ? estilos.cabeceraFija : ''}`}
        // Desplazamiento horizontal propio accesible con teclado.
        tabIndex={0}
        role="region"
        aria-label={titulo}
      >
        <table className={`${estilos.tabla} ${compacta ? estilos.compacta : ''}`}>
          <caption className={tituloVisible ? estilos.caption : 'sr-only'}>{titulo}</caption>
          <thead>
            <tr>
              {columnas.map((columna) => {
                const activa = orden?.clave === columna.clave
                const alineacion = columna.alineacion === 'derecha' ? estilos.derecha : ''
                return (
                  <th
                    key={columna.clave}
                    scope="col"
                    className={alineacion}
                    aria-sort={activa ? (orden.direccion === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    {columna.ordenable ? (
                      <button type="button" className={estilos.ordenar} onClick={() => alternarOrden(columna.clave)}>
                        <span>
                          {columna.titulo}
                          {columna.subtitulo && <span className={estilos.subtitulo}>{columna.subtitulo}</span>}
                        </span>
                        <Icono
                          nombre={activa ? 'chevronDerecha' : 'flechaOrden'}
                          tamano="sm"
                          className={
                            activa ? (orden.direccion === 'asc' ? estilos.flechaArriba : estilos.flechaAbajo) : undefined
                          }
                        />
                      </button>
                    ) : (
                      <>
                        {columna.titulo}
                        {columna.subtitulo && <span className={estilos.subtitulo}>{columna.subtitulo}</span>}
                      </>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {visibles.map((fila, indice) => {
              const clicable = Boolean(onFilaClick)
              return (
                <tr
                  key={claveFila(fila, indice)}
                  className={clicable ? estilos.clicable : undefined}
                  tabIndex={clicable ? 0 : undefined}
                  onClick={clicable ? () => onFilaClick?.(fila) : undefined}
                  onKeyDown={
                    clicable
                      ? (evento: KeyboardEvent<HTMLTableRowElement>) => {
                          if (evento.key === 'Enter') onFilaClick?.(fila)
                        }
                      : undefined
                  }
                >
                  {columnas.map((columna) => (
                    <td
                      key={columna.clave}
                      className={
                        [
                          columna.alineacion === 'derecha' && `${estilos.derecha} cifra`,
                          columna.multilinea && estilos.multilinea,
                        ]
                          .filter(Boolean)
                          .join(' ') || undefined
                      }
                    >
                      {columna.render
                        ? columna.render(fila)
                        : String(valorPorDefecto(fila, columna.clave) ?? SIN_VALOR)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {mostrarPaginacion && (
        <div className={estilos.paginacion}>
          <p className="cifra">
            Mostrando {formatearNumero(primero)} a {formatearNumero(ultimo)} de {formatearNumero(total)}
          </p>
          <div className={estilos.controlesPaginacion}>
            {enCliente && (
              <label className={estilos.porPagina}>
                Filas por página
                <select
                  value={porPagina}
                  onChange={(evento) => {
                    setPorPagina(Number(evento.target.value))
                    setPagina(1)
                  }}
                >
                  {OPCIONES_POR_PAGINA.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Boton
              variante="secundario"
              compacto
              deshabilitado={paginaActual <= 1}
              onClick={() => cambiarPagina(paginaActual - 1)}
            >
              Anterior
            </Boton>
            <Boton
              variante="secundario"
              compacto
              deshabilitado={paginaActual >= totalPaginas}
              onClick={() => cambiarPagina(paginaActual + 1)}
            >
              Siguiente
            </Boton>
          </div>
        </div>
      )}
    </div>
  )
}
