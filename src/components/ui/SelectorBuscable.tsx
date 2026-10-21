/**
 * SelectorBuscable: combobox con búsqueda en el servidor (Guía Web 5.4: selector con búsqueda).
 *
 * - Busca mientras se escribe (300 ms después de la última tecla) en el servidor, nunca solo en lo cargado.
 * - La lista se abre al escribir, al hacer clic o con la flecha abajo (no al recibir el foco: así no tapa el
 *   mensaje de error cuando el resumen de errores lleva el foco al campo).
 * - Teclado: flechas para moverse, Enter para elegir, Esc para cerrar (patrón combobox de WAI-ARIA).
 * - Con un valor elegido muestra su texto y «Cambiar»; así queda claro qué se eligió.
 * - Estados: buscando, sin resultados, error con «Reintentar» y aviso si hay más resultados que los mostrados.
 */
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useConsulta } from '../../hooks/useConsulta'
import { useDemora } from '../../hooks/useDemora'
import { formatearNumero } from '../../utils/formato'
import Boton from './Boton'
import { MarcoCampo } from './CampoFormulario'
import { clasesDeControl, idsDescripcion, type PropsMarcoCampo } from './campoFormularioUtil'
import estilos from './SelectorBuscable.module.css'

/** Página de resultados del servidor (`count` es el total de coincidencias). */
export interface PaginaResultados<T> {
  count: number
  results: T[]
}

export interface SelectorBuscableProps<T> extends PropsMarcoCampo {
  valor: T | null
  claveDe: (elemento: T) => string | number
  textoDe: (elemento: T) => string
  /** Segunda línea de cada opción (por ejemplo, el proveedor de un contrato). */
  detalleDe?: (elemento: T) => ReactNode
  buscar: (texto: string, signal: AbortSignal) => Promise<PaginaResultados<T>>
  onCambiar: (elemento: T | null) => void
  placeholder?: string
  /** Clave de caché: cambia si cambian los filtros de `buscar` (por ejemplo, el área elegida). */
  claveBusqueda?: string
}

export default function SelectorBuscable<T>(props: SelectorBuscableProps<T>) {
  const { valor, claveDe, textoDe, detalleDe, buscar, onCambiar, placeholder, claveBusqueda = '', ...marco } = props
  const idLista = useId()
  const entrada = useRef<HTMLInputElement>(null)
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(-1)
  const busqueda = useDemora(texto.trim(), 300)

  const consulta = useConsulta(abierto && !valor ? `${claveBusqueda}|${busqueda}` : null, (signal) => buscar(busqueda, signal))
  // Mientras busca de nuevo se mantienen los resultados anteriores (sin parpadeo de la lista).
  const resultados = consulta.estado === 'error' ? [] : (consulta.datos?.results ?? [])
  const total = consulta.datos?.count ?? 0

  function elegir(elemento: T) {
    onCambiar(elemento)
    setAbierto(false)
    setTexto('')
    setActivo(-1)
  }

  function cambiar() {
    onCambiar(null)
    setAbierto(true)
    // Tras el render, el campo de búsqueda vuelve a existir.
    window.setTimeout(() => entrada.current?.focus(), 0)
  }

  function teclado(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault()
      setAbierto(true)
      if (resultados.length === 0) return
      const paso = evento.key === 'ArrowDown' ? 1 : -1
      setActivo((a) => (a + paso + resultados.length) % resultados.length)
    } else if (evento.key === 'Enter') {
      // Nunca envía el formulario desde el buscador.
      evento.preventDefault()
      if (abierto && activo >= 0 && resultados[activo]) elegir(resultados[activo])
    } else if (evento.key === 'Escape' && abierto) {
      // Cierra la lista sin cerrar un diálogo que contenga el selector.
      evento.preventDefault()
      evento.stopPropagation()
      setAbierto(false)
      setActivo(-1)
    }
  }

  if (valor) {
    return (
      <MarcoCampo {...marco}>
        <div className={`${estilos.elegido} ${marco.error ? estilos.elegidoError : ''}`}>
          <span className={estilos.textoElegido}>
            <span id={marco.id} tabIndex={-1}>
              {textoDe(valor)}
            </span>
            {detalleDe && <span className={estilos.detalle}>{detalleDe(valor)}</span>}
          </span>
          <Boton variante="terciario" compacto onClick={cambiar} aria-label={`Cambiar ${marco.etiqueta.toLowerCase()}`}>
            Cambiar
          </Boton>
        </div>
      </MarcoCampo>
    )
  }

  const idActivo = activo >= 0 && resultados[activo] ? `${idLista}-${String(claveDe(resultados[activo]))}` : undefined
  const textoEstado =
    consulta.estado === 'cargando'
      ? consulta.cargaVisible
        ? 'Buscando…'
        : ''
      : consulta.estado === 'error' || consulta.estado === 'inactivo'
        ? ''
        : resultados.length === 0
          ? busqueda
            ? `Sin resultados para «${busqueda}»`
            : 'No hay opciones disponibles'
          : total > resultados.length
            ? `Se muestran ${formatearNumero(resultados.length)} de ${formatearNumero(total)}. Escribe para afinar la búsqueda`
            : `${formatearNumero(total)} ${total === 1 ? 'resultado' : 'resultados'}`
  // El panel solo aparece cuando tiene algo que mostrar (nunca una caja vacía).
  const listaVisible = abierto && (resultados.length > 0 || textoEstado !== '' || consulta.estado === 'error')

  return (
    <MarcoCampo {...marco}>
      <div className={estilos.contenedor}>
        <input
          ref={entrada}
          id={marco.id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={listaVisible}
          aria-controls={idLista}
          aria-activedescendant={idActivo}
          aria-invalid={marco.error ? true : undefined}
          aria-required={marco.obligatorio || undefined}
          aria-describedby={idsDescripcion(marco)}
          className={clasesDeControl(marco.error, false)}
          placeholder={placeholder ?? 'Escribe para buscar'}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value)
            setAbierto(true)
            setActivo(-1)
          }}
          onClick={() => setAbierto(true)}
          onBlur={() => setAbierto(false)}
          onKeyDown={teclado}
        />
        {listaVisible && (
          <div className={estilos.panel}>
            <ul id={idLista} role="listbox" aria-label={marco.etiqueta} aria-busy={consulta.estado === 'cargando' || undefined} className={estilos.lista}>
              {resultados.map((elemento, indice) => (
                <li
                  key={String(claveDe(elemento))}
                  id={`${idLista}-${String(claveDe(elemento))}`}
                  role="option"
                  aria-selected={indice === activo}
                  className={`${estilos.opcion} ${indice === activo ? estilos.activa : ''}`}
                  // mousedown: elige antes de que el campo pierda el foco y cierre la lista.
                  onMouseDown={(e) => {
                    e.preventDefault()
                    elegir(elemento)
                  }}
                >
                  <span>{textoDe(elemento)}</span>
                  {detalleDe && <span className={estilos.detalle}>{detalleDe(elemento)}</span>}
                </li>
              ))}
            </ul>
            <p className={estilos.estado} role="status">
              {textoEstado}
            </p>
            {consulta.estado === 'error' && (
              <div className={estilos.error} role="alert">
                <span>{consulta.error?.detalle}</span>
                <button
                  type="button"
                  className={estilos.reintentar}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    consulta.reintentar()
                  }}
                >
                  Reintentar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </MarcoCampo>
  )
}
