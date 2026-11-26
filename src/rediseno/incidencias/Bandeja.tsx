/**
 * Bandeja de incidencias (RD-42, M3-26): Todas, Abiertas, En proceso y Cerradas con contador, búsqueda, grupo y página
 * en la URL y el aviso de 24 h en la fila. Enseña lo que devuelve el servidor (con `PLA.INCIDENCIA.CONSULTAR_TODAS` todas;
 * sin él, las del capataz y su cuadrilla) sin filtrar por alcance en el cliente. Estados de carga, error, vacío y sin acceso.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react'
import Boton from '@/design-system/Boton'
import CampoFormulario from '@/design-system/CampoFormulario'
import Estado from '@/design-system/Estado'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import Paginacion from '@/design-system/Paginacion'
import Pestanas from '@/design-system/Pestanas'
import type { ResultadoConsulta } from '@/hooks/useConsulta'
import {
  contadoresBandeja,
  ESTADO_INCIDENCIA,
  horasAbierta,
  PESTANAS_BANDEJA,
  SEVERIDAD_INCIDENCIA,
  superaObjetivo,
  textoTiempoAbierta,
  VIA_INCIDENCIA,
  type PestanaBandeja,
} from '@/pages/incidencias/bandeja'
import type { IncidenciaResumen } from '@/types/incidencias'
import { estiloTransicion, reducirMovimiento } from '../base/movimiento'
import {
  LARGO_MAXIMO_BUSQUEDA,
  nombreFilaIncidencia,
  paginaDeIncidencias,
  POR_PAGINA,
  type FiltrosIncidencias,
} from './filtros'
import estilos from './Incidencias.module.css'

export interface BandejaProps {
  consulta: ResultadoConsulta<IncidenciaResumen[]>
  filtros: FiltrosIncidencias
  ahora: number
  /** `true` con `PLA.INCIDENCIA.CONSULTAR_TODAS`: cambia el texto del vacío (el capataz ve su cuadrilla). */
  veTodas: boolean
  seleccionada: number | null
  onSeleccionar: (id: number) => void
  /** Cambia filtros en la URL (`null` quita el parámetro); cambiar el grupo o la búsqueda vuelve a la página 1. */
  onFiltros: (cambios: Record<string, string | null>) => void
}

function FilaIncidencia({
  incidencia: i,
  ahora,
  seleccionada,
  onSeleccionar,
}: {
  incidencia: IncidenciaResumen
  ahora: number
  seleccionada: boolean
  onSeleccionar: (id: number) => void
}) {
  const horas = horasAbierta(i, ahora)
  const estado = ESTADO_INCIDENCIA[i.estado]
  const aviso = superaObjetivo(i, horas)
  const elemento = useRef<HTMLLIElement>(null)
  // Elegida desde el mapa o un aviso, la fila puede quedar fuera de la columna: se desplaza hasta ella.
  useEffect(() => {
    if (seleccionada)
      elemento.current?.scrollIntoView?.({ block: 'nearest', behavior: reducirMovimiento() ? 'auto' : 'smooth' })
  }, [seleccionada])
  return (
    <li
      ref={elemento}
      className={estilos.fila}
      data-seleccionada={seleccionada || undefined}
      style={estiloTransicion(nombreFilaIncidencia(i.id))} /* estilo-calculado */
    >
      {/* Excepción al sistema (AV-351): la fila entera es el botón que la selecciona; no encaja en `Boton`. */}
      <button
        type="button"
        className={estilos.botonFila}
        aria-pressed={seleccionada}
        onClick={() => onSeleccionar(i.id)}
      >
        <span className={estilos.principal}>
          <span>{i.tipo}</span>
          <span className={`${estilos.secundario} cifra`}>{i.codigo}</span>
          <span className={estilos.secundario}>{i.espacio}</span>
        </span>
        <span className={estilos.etiquetas}>
          <Estado tono={estado.tono} texto={estado.texto} />
          {i.severidad ? (
            <Estado tono={SEVERIDAD_INCIDENCIA[i.severidad].tono} texto={SEVERIDAD_INCIDENCIA[i.severidad].texto} />
          ) : (
            <span className={estilos.secundario}>Sin clasificar</span>
          )}
          <span className={estilos.secundario}>{i.via ? VIA_INCIDENCIA[i.via] : 'Sin vía'}</span>
          <span className={`${aviso ? estilos.avisoPlazo : estilos.secundario} cifra`}>
            {aviso ? `Más de 24 h abierta · ${textoTiempoAbierta(horas)}` : `Abierta ${textoTiempoAbierta(horas)}`}
          </span>
        </span>
      </button>
    </li>
  )
}

export default function Bandeja({
  consulta,
  filtros,
  ahora,
  veTodas,
  seleccionada,
  onSeleccionar,
  onFiltros,
}: BandejaProps) {
  const [borrador, setBorrador] = useState(filtros.q)
  const [qPrevia, setQPrevia] = useState(filtros.q)
  if (filtros.q !== qPrevia) {
    setQPrevia(filtros.q)
    setBorrador(filtros.q)
  }

  function buscar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const texto = borrador.trim()
    if (texto === filtros.q) consulta.reintentar()
    else onFiltros({ q: texto || null, pagina: null })
  }

  const incidencias = consulta.datos ?? []
  const contadores = contadoresBandeja(incidencias)
  const { delGrupo, filas } = paginaDeIncidencias(incidencias, filtros)

  let cuerpo
  if (consulta.estado === 'error' && consulta.error?.estado === 403) {
    cuerpo = (
      <EstadoSinAcceso
        titulo="No puedes ver las incidencias"
        descripcion="Tu cuenta no tiene permiso para consultar incidencias."
      />
    )
  } else if (consulta.estado === 'error' && !consulta.datos) {
    cuerpo = (
      <EstadoError
        titulo="No pudimos cargar las incidencias"
        descripcion={consulta.error?.detalle ?? ''}
        onReintentar={consulta.reintentar}
      />
    )
  } else if (!consulta.datos) {
    cuerpo = <EstadoCarga forma="tarjetas" />
  } else if (filas.length === 0 && filtros.pagina > 1 && delGrupo.length > 0) {
    cuerpo = (
      <EstadoVacio
        titulo="Esta página ya no tiene incidencias"
        descripcion="Los resultados cambiaron desde que se abrió la bandeja."
        accion={
          <Boton variante="secundario" onClick={() => onFiltros({ pagina: null })}>
            Ir a la primera página
          </Boton>
        }
      />
    )
  } else if (delGrupo.length === 0) {
    cuerpo = filtros.q ? (
      <EstadoVacio
        titulo="Sin coincidencias"
        descripcion="Prueba con otro código, tipo, espacio o descripción."
        accion={
          <Boton variante="secundario" onClick={() => onFiltros({ q: null, pagina: null })}>
            Limpiar búsqueda
          </Boton>
        }
      />
    ) : (
      <EstadoVacio
        titulo="Sin incidencias en esta pestaña"
        descripcion={
          veTodas
            ? 'Las incidencias reportadas aparecerán aquí.'
            : 'Aquí aparecerán las incidencias tuyas y de tu cuadrilla.'
        }
      />
    )
  } else {
    cuerpo = (
      <>
        <ul className={estilos.lista} aria-label="Incidencias">
          {filas.map((i) => (
            <FilaIncidencia
              key={i.id}
              incidencia={i}
              ahora={ahora}
              seleccionada={seleccionada === i.id}
              onSeleccionar={onSeleccionar}
            />
          ))}
        </ul>
        <Paginacion
          pagina={filtros.pagina}
          porPagina={POR_PAGINA}
          total={delGrupo.length}
          onCambiar={(nueva) => onFiltros({ pagina: nueva > 1 ? String(nueva) : null })}
        />
      </>
    )
  }

  return (
    <section className={estilos.bandeja} aria-label="Bandeja de incidencias">
      <form role="search" aria-label="Buscar incidencias" className={estilos.busqueda} onSubmit={buscar}>
        <CampoFormulario
          id="incidencias-busqueda"
          etiqueta="Buscar incidencias"
          type="search"
          ayuda="Código, tipo, espacio o descripción"
          maxLength={LARGO_MAXIMO_BUSQUEDA}
          value={borrador}
          onChange={(e) => setBorrador(e.target.value)}
        />
        <Boton type="submit" variante="secundario">
          Buscar
        </Boton>
      </form>
      <Pestanas
        etiqueta="Estado de las incidencias"
        pestanas={PESTANAS_BANDEJA.map((p) => ({ ...p, contador: consulta.datos ? contadores[p.valor] : undefined }))}
        valor={filtros.grupo}
        onCambiar={(valor) => onFiltros({ grupo: (valor as PestanaBandeja) === 'todas' ? null : valor, pagina: null })}
      >
        {cuerpo}
      </Pestanas>
    </section>
  )
}
