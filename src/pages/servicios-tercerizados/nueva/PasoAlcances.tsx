// RF-SER-003 · Paso 2: espacios y ejemplares afectados
/**
 * Búsqueda y paginación en el servidor (nunca solo lo cargado). La selección se guarda en el borrador y se
 * conserva al cambiar de página, de búsqueda o de pestaña. Cada alcance es un área verde o un ejemplar;
 * elegir un área no incluye sus ejemplares. Metrado y unidad son opcionales y van juntos.
 */
import { useState } from 'react'
import AvisoEnLinea from '../../../components/ui/AvisoEnLinea'
import Badge from '../../../components/ui/Badge'
import Boton from '../../../components/ui/Boton'
import CampoFormulario from '../../../components/ui/CampoFormulario'
import EstadoCarga from '../../../components/ui/EstadoCarga'
import EstadoError from '../../../components/ui/EstadoError'
import EstadoVacio from '../../../components/ui/EstadoVacio'
import Icono from '../../../components/ui/Icono'
import Pestanas from '../../../components/ui/Pestanas'
import Selector, { type OpcionSelector } from '../../../components/ui/Selector'
import { useConsulta } from '../../../hooks/useConsulta'
import { useDemora } from '../../../hooks/useDemora'
import { listarAreasVerdes, listarEjemplares } from '../../../services/api/tercerizados'
import type { AreaVerde, UnidadMedida } from '../../../types/tercerizados'
import { formatearNumero } from '../../../utils/formato'
import {
  alternarAlcance,
  claveAlcance,
  type AlcanceSeleccionado,
  type ErroresPaso2,
  type TipoAlcance,
} from '../../../utils/nuevaAtencion'
import { ID_LISTA_SELECCIONADOS } from './idsCampos'
import estilos from './NuevaAtencion.module.css'

/** Tamaño de página de la API. */
const POR_PAGINA = 25

interface Fila {
  tipo: TipoAlcance
  id: number
  etiqueta: string
  detalle?: string
}

export interface PasoAlcancesProps {
  alcances: AlcanceSeleccionado[]
  onCambiar: (alcances: AlcanceSeleccionado[]) => void
  errores: ErroresPaso2
  unidadesMedida: UnidadMedida[]
  areas: AreaVerde[]
}

function Buscador({
  tipo,
  alcances,
  onCambiar,
  areas,
}: {
  tipo: TipoAlcance
  alcances: AlcanceSeleccionado[]
  onCambiar: (alcances: AlcanceSeleccionado[]) => void
  areas: AreaVerde[]
}) {
  const [texto, setTexto] = useState('')
  const [area, setArea] = useState('')
  const [pagina, setPagina] = useState(1)
  const q = useDemora(texto.trim(), 300)
  // Cambiar la búsqueda o el área vuelve a la primera página (ajuste durante el render).
  const filtro = `${q}|${area}`
  const [filtroPrevio, setFiltroPrevio] = useState(filtro)
  if (filtroPrevio !== filtro) {
    setFiltroPrevio(filtro)
    setPagina(1)
  }

  const consulta = useConsulta(
    `${tipo}|${filtro}|${pagina}`,
    async (signal) => {
      if (tipo === 'area') {
        const r = await listarAreasVerdes({ activo: true, q: q || undefined, page: pagina > 1 ? pagina : undefined }, signal)
        return { count: r.count, filas: r.results.map((a): Fila => ({ tipo, id: a.id, etiqueta: a.nombre })) }
      }
      const r = await listarEjemplares(
        { q: q || undefined, area_verde_id: area ? Number(area) : undefined, page: pagina > 1 ? pagina : undefined },
        signal,
      )
      return {
        count: r.count,
        filas: r.results.map((e): Fila => ({ tipo, id: e.id, etiqueta: e.codigo, detalle: e.area_verde_nombre ?? 'Sin área verde' })),
      }
    },
    (datos) => datos.filas.length === 0,
  )

  const elegidos = new Set(alcances.map((a) => a.clave))
  const total = consulta.datos?.count ?? 0
  const desde = total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1
  const hasta = Math.min(total, pagina * POR_PAGINA)
  const nombre = tipo === 'area' ? 'áreas verdes' : 'ejemplares'
  const opcionesArea: OpcionSelector[] = areas.map((a) => ({ valor: String(a.id), texto: a.nombre }))

  let resultados
  if (consulta.estado === 'error') {
    resultados = (
      <EstadoError nivel={3} titulo={`No pudimos cargar los ${nombre}`} descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} />
    )
  } else if (consulta.estado === 'vacio') {
    resultados = <EstadoVacio nivel={3} titulo={q || area ? `Sin ${nombre} con esa búsqueda` : `No hay ${nombre} disponibles`} />
  } else if (!consulta.datos) {
    resultados = consulta.cargaVisible ? <EstadoCarga forma="tabla" filas={5} /> : null
  } else {
    // Mientras carga otra página se mantienen las filas anteriores (sin parpadeo), marcadas como ocupadas.
    resultados = (
      <ul className={estilos.listaOpciones} aria-busy={consulta.estado === 'cargando' || undefined}>
        {consulta.datos.filas.map((fila) => {
          const clave = claveAlcance(fila.tipo, fila.id)
          const id = `opcion-${clave.replace(':', '-')}`
          return (
            <li key={clave} className={estilos.opcionCasilla}>
              <input
                id={id}
                type="checkbox"
                checked={elegidos.has(clave)}
                onChange={() => onCambiar(alternarAlcance(alcances, fila))}
              />
              <label htmlFor={id}>
                <span>{fila.etiqueta}</span>
                {fila.detalle && <span className={estilos.ayuda}>{fila.detalle}</span>}
              </label>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className={estilos.buscador}>
      <div className={estilos.filtrosBuscador}>
        <CampoFormulario
          id={`buscar-${tipo}`}
          etiqueta={tipo === 'area' ? 'Buscar áreas verdes' : 'Buscar ejemplares'}
          type="search"
          ayuda={tipo === 'area' ? 'Por nombre. Solo áreas activas.' : 'Por código o nombre del área'}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            // Enter no avanza el asistente desde la búsqueda.
            if (e.key === 'Enter') e.preventDefault()
          }}
        />
        {tipo === 'ejemplar' && (
          <Selector
            id="filtro-area-ejemplares"
            etiqueta="Área verde"
            valor={area}
            opciones={opcionesArea}
            opcionTodos="Todas"
            onCambiar={setArea}
          />
        )}
      </div>
      <p className={`${estilos.ayuda} cifra`} aria-live="polite">
        {consulta.datos && consulta.estado !== 'error'
          ? total === 0
            ? ''
            : `Mostrando ${formatearNumero(desde)} a ${formatearNumero(hasta)} de ${formatearNumero(total)} ${nombre}`
          : ''}
      </p>
      {resultados}
      {total > POR_PAGINA && consulta.estado !== 'error' && (
        <div className={estilos.paginacion}>
          <Boton variante="secundario" compacto deshabilitado={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
            Anterior
          </Boton>
          <Boton variante="secundario" compacto deshabilitado={hasta >= total} onClick={() => setPagina((p) => p + 1)}>
            Siguiente
          </Boton>
        </div>
      )}
    </div>
  )
}

export default function PasoAlcances({ alcances, onCambiar, errores, unidadesMedida, areas }: PasoAlcancesProps) {
  const [pestana, setPestana] = useState<TipoAlcance>('area')
  const opcionesUnidad: OpcionSelector[] = unidadesMedida.map((u) => ({
    valor: String(u.id),
    texto: u.simbolo ? `${u.nombre} (${u.simbolo})` : u.nombre,
  }))
  const cuenta = (tipo: TipoAlcance) => alcances.filter((a) => a.tipo === tipo).length

  function actualizar(clave: string, cambios: Partial<AlcanceSeleccionado>) {
    onCambiar(alcances.map((a) => (a.clave === clave ? { ...a, ...cambios } : a)))
  }

  return (
    <div className={estilos.columnasAlcances}>
      <section className={estilos.grupo} aria-labelledby="titulo-buscar-alcances">
        <h2 id="titulo-buscar-alcances" className={estilos.tituloGrupo}>
          Buscar y seleccionar
        </h2>
        <Pestanas
          etiqueta="Tipo de alcance"
          valor={pestana}
          onCambiar={(v) => setPestana(v as TipoAlcance)}
          pestanas={[
            { valor: 'area', texto: 'Áreas verdes', extra: cuenta('area') > 0 ? <Badge tono="info" texto={String(cuenta('area'))} /> : undefined },
            { valor: 'ejemplar', texto: 'Ejemplares', extra: cuenta('ejemplar') > 0 ? <Badge tono="info" texto={String(cuenta('ejemplar'))} /> : undefined },
          ]}
        >
          {/* Cada pestaña conserva su búsqueda mientras se monta; la selección vive en el borrador. */}
          <Buscador key={pestana} tipo={pestana} alcances={alcances} onCambiar={onCambiar} areas={areas} />
        </Pestanas>
        <AvisoEnLinea tono="info">
          Elegir un área verde no incluye sus ejemplares. Si el trabajo es sobre ejemplares concretos, selecciónalos en la
          pestaña «Ejemplares».
        </AvisoEnLinea>
      </section>

      <section className={estilos.grupo} aria-labelledby="titulo-seleccionados">
        <h2 id="titulo-seleccionados" className={estilos.tituloGrupo}>
          Seleccionados ({formatearNumero(alcances.length)})
        </h2>
        {errores.general && (
          <p id={ID_LISTA_SELECCIONADOS} tabIndex={-1} className={estilos.error} role="alert">
            <Icono nombre="aspa" tamano="sm" />
            <span>{errores.general}</span>
          </p>
        )}
        {alcances.length === 0 ? (
          <p className={estilos.ayuda}>Aún no seleccionas espacios ni ejemplares. Márcalos en la lista de búsqueda.</p>
        ) : (
          <ul className={estilos.seleccionados}>
            {alcances.map((a) => {
              const errorFila = errores.porAlcance[a.clave] ?? {}
              const base = `alcance-${a.clave.replace(':', '-')}`
              return (
                <li key={a.clave} className={estilos.seleccionado}>
                  <div className={estilos.cabeceraSeleccionado}>
                    <span>
                      <Badge tono="neutral" texto={a.tipo === 'area' ? 'Área verde' : 'Ejemplar'} />{' '}
                      <strong>{a.etiqueta}</strong>
                      {a.detalle && <span className={estilos.ayuda}> · {a.detalle}</span>}
                    </span>
                    <Boton
                      variante="terciario"
                      compacto
                      aria-label={`Quitar ${a.etiqueta}`}
                      onClick={() => onCambiar(alcances.filter((x) => x.clave !== a.clave))}
                    >
                      Quitar
                    </Boton>
                  </div>
                  <div className={estilos.metrado}>
                    <CampoFormulario
                      id={`${base}-metrado`}
                      etiqueta="Metrado (opcional)"
                      inputMode="decimal"
                      placeholder="Ej.: 120,50"
                      value={a.metrado}
                      onChange={(e) => actualizar(a.clave, { metrado: e.target.value })}
                      error={errorFila.metrado}
                    />
                    <Selector
                      id={`${base}-unidad`}
                      etiqueta="Unidad"
                      valor={a.unidad_medida_id}
                      opciones={opcionesUnidad}
                      opcionTodos="Sin unidad"
                      onCambiar={(valor) => actualizar(a.clave, { unidad_medida_id: valor })}
                      error={errorFila.unidad}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
