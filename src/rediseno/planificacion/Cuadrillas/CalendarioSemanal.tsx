/**
 * Calendario semanal de Cuadrillas (RD-34): una fila por cuadrilla, siete días y los encargos como tarjetas de vidrio.
 * Se arrastran (puntero) o se mueven con Alt + flechas; ambos caminos llaman a `onMover`. Las filas de proveedores
 * llegan con RD-85 (el listado de atenciones aún no filtra por fecha).
 */
import { useLayoutEffect, useMemo } from 'react'
import Estado from '@/design-system/Estado'
import { tonosEncargo } from '@/pages/operacion-campo/tonosEncargo'
import type { CuadrillaCampo, EncargoCampo } from '@/types/operacionCampo'
import type { FechaIso } from '@/types/comun'
import { puedeReprogramarEncargo } from '@/utils/operacionCampo'
import { estiloTransicion, fila } from '@/rediseno/base/movimiento'
import estilos from './Cuadrillas.module.css'
import {
  asignarCarriles,
  diasDeSemana,
  diferenciaDias,
  etiquetaDia,
  posicionEnSemana,
  type MovimientoEncargo,
  type PosicionSemanal,
} from './semana'
import { useArrastre } from './usarArrastre'

export interface CalendarioSemanalProps {
  lunes: FechaIso
  hoy: FechaIso
  cuadrillas: CuadrillaCampo[]
  encargos: EncargoCampo[]
  puedeMover: boolean
  abierto: number | null
  onAbrir: (id: number) => void
  onMover: (encargo: EncargoCampo, movimiento: MovimientoEncargo) => void
  /** Cambia cuando termina un movimiento sin éxito: devuelve las tarjetas a su sitio con el muelle. */
  versionCancelada: number
}

interface FilaCuadrilla {
  id: number
  nombre: string
  tarjetas: { encargo: EncargoCampo; posicion: PosicionSemanal; carril: number }[]
  carriles: number
}

function construirFilas(cuadrillas: CuadrillaCampo[], encargos: EncargoCampo[], lunes: FechaIso): FilaCuadrilla[] {
  const nombres = new Map<number, string>()
  for (const c of cuadrillas) if (c.activa) nombres.set(c.id, c.nombre)
  for (const e of encargos) if (!nombres.has(e.cuadrilla_id)) nombres.set(e.cuadrilla_id, e.cuadrilla_nombre)
  return [...nombres]
    .sort((a, b) => a[1].localeCompare(b[1], 'es'))
    .map(([id, nombre]) => {
      const propios = encargos
        .filter((e) => e.cuadrilla_id === id)
        .flatMap((encargo) => {
          const posicion = posicionEnSemana(encargo, lunes)
          return posicion ? [{ encargo, posicion }] : []
        })
        .sort((a, b) => a.posicion.columna - b.posicion.columna || a.encargo.id - b.encargo.id)
      const { carriles, total } = asignarCarriles(propios.map((p) => p.posicion))
      return { id, nombre, tarjetas: propios.map((p, i) => ({ ...p, carril: carriles[i] })), carriles: total }
    })
}

export default function CalendarioSemanal(props: CalendarioSemanalProps) {
  const { lunes, hoy, cuadrillas, encargos, puedeMover, abierto, onAbrir, onMover, versionCancelada } = props
  const dias = diasDeSemana(lunes)
  const filas = useMemo(() => construirFilas(cuadrillas, encargos, lunes), [cuadrillas, encargos, lunes])
  const porId = useMemo(() => new Map(encargos.map((e) => [e.id, e])), [encargos])

  const arrastre = useArrastre({
    activo: puedeMover,
    onSoltar: ({ id, dia, cuadrillaId, diaOrigen }) => {
      const encargo = porId.get(id)
      if (encargo) onMover(encargo, { dias: diferenciaDias(diaOrigen, dia), cuadrillaId })
    },
  })
  const { restablecer } = arrastre
  // Con datos nuevos las tarjetas ya están en su sitio: se quita el desplazamiento sin animar.
  useLayoutEffect(() => restablecer(false), [encargos, lunes, restablecer])
  useLayoutEffect(() => {
    if (versionCancelada > 0) restablecer(true)
  }, [versionCancelada, restablecer])

  function teclado(e: React.KeyboardEvent, encargo: EncargoCampo, indiceFila: number) {
    if (!e.altKey || !puedeMover || !puedeReprogramarEncargo(encargo.estado)) return
    const dias = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
    const salto = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
    if (dias === 0 && salto === 0) return
    e.preventDefault()
    const destino = filas[indiceFila + salto]
    if (!destino) return
    onMover(encargo, { dias, cuadrillaId: destino.id })
  }

  return (
    <div className={estilos.calendario} role="group" aria-label={`Encargos de la semana del ${lunes}`}>
      <div className={`${estilos.fila} ${estilos.filaCabecera}`}>
        <span className={estilos.celdaNombre}>Cuadrilla</span>
        {dias.map((d) => (
          <span key={d} className={estilos.celdaDia} data-hoy={d === hoy || undefined}>
            {etiquetaDia(d)}
          </span>
        ))}
      </div>
      {filas.map((f, indiceFila) => (
        <div
          key={f.id}
          className={estilos.fila}
          role="group"
          aria-label={`Cuadrilla ${f.nombre}`}
          style={{ '--carriles': f.carriles } as React.CSSProperties} // estilo-calculado
        >
          <span className={estilos.celdaNombre} aria-hidden="true">
            {f.nombre}
          </span>
          {dias.map((d, i) => (
            <span
              key={d}
              aria-hidden="true"
              className={estilos.celda}
              data-dia={d}
              data-cuadrilla={f.id}
              data-hoy={d === hoy || undefined}
              style={{ gridColumn: i + 2 }} // estilo-calculado
            />
          ))}
          {f.tarjetas.map(({ encargo, posicion, carril }) => {
            const movible = puedeMover && puedeReprogramarEncargo(encargo.estado)
            const esAbierto = abierto === encargo.id
            return (
              <article
                key={encargo.id}
                ref={arrastre.registrar(encargo.id)}
                className={estilos.tarjeta}
                data-movible={movible || undefined}
                data-arrastrando={arrastre.arrastrando === encargo.id || undefined}
                data-vencido={encargo.vencido || undefined}
                data-sale-antes={posicion.seSaleAntes || undefined}
                data-sale-despues={posicion.seSaleDespues || undefined}
                {...(movible ? arrastre.propsDe(encargo.id) : {})}
                style={{
                  gridColumn: `${posicion.columna + 2} / span ${posicion.largo}`,
                  gridRow: carril + 1,
                  ...(esAbierto ? {} : estiloTransicion(fila(encargo.id))),
                }} // estilo-calculado
              >
                {/* Excepción al sistema (AV-351): la tarjeta entera es el botón que abre el panel y se mueve con Alt + flechas. */}
                <button
                  type="button"
                  className={estilos.abrir}
                  aria-keyshortcuts={movible ? 'Alt+ArrowLeft Alt+ArrowRight Alt+ArrowUp Alt+ArrowDown' : undefined}
                  aria-label={`Encargo ${encargo.id}: ${encargo.descripcion}. ${encargo.estado}${movible ? '. Alt y flechas lo mueven' : ''}`}
                  onClick={() => onAbrir(encargo.id)}
                  onKeyDown={(e) => teclado(e, encargo, indiceFila)}
                >
                  <span className={estilos.tarjetaTitulo}>{encargo.descripcion}</span>
                  <span className={estilos.tarjetaDetalle}>
                    {encargo.tipo_actividad_nombre} · {encargo.area_verde_nombre}
                  </span>
                </button>
                {encargo.vencido ? (
                  <Estado tono="error" texto="Vencido" />
                ) : (
                  <Estado tono={tonosEncargo[encargo.estado]} texto={encargo.estado} />
                )}
              </article>
            )
          })}
        </div>
      ))}
    </div>
  )
}
