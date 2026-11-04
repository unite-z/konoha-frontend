/**
 * Calendario de la propuesta (RF-IA-003; mockup, pantalla 5), al estilo del calendario de Teams: vista Semana (por
 * defecto) o Mes, con bloques de día completo. Muestra junto a la propuesta lo que ya está programado:
 * - «Programado»: lo que ya registró Planificación (bloque lleno);
 * - «Propuesta»: lo que sugiere la IA (azul con borde discontinuo), con el estado de la decisión;
 * - las restricciones en la cabecera de cada día, con la insignia de Planificación.
 * Al pulsar una propuesta se abre su ficha en el panel lateral. Las modificadas se ven en sus nuevas fechas.
 */
// Excepción al sistema (AV-351): los bloques del calendario son <button> de datos y la casilla de la leyenda lleva una muestra de color.
import { useState } from 'react'
import Boton from '@/components/ui/Boton'
import { GrupoChips } from '@/components/ui/ChipsFiltro'
import type { FechaIso } from '@/types/comun'
import type { ProgramacionExistente, PropuestaCronograma, RestriccionConsiderada } from '@/types/cronogramaIa'
import {
  colocarEnSemana,
  desplazarMes,
  mesDeFecha,
  nombreMes,
  semanasDelMes,
  tituloSemana,
  type BloqueCalendario,
  type Mes,
} from '@/utils/calendarioCronograma'
import {
  enIntervalo,
  fechasEfectivas,
  lunesDe,
  PRESENTACION_RESTRICCION,
  sumarDias,
  type DecisionEnCursoCronograma,
} from '@/utils/cronogramaIa'
import { formatearFecha } from '@/utils/formato'
import { hoyLima } from '@/utils/instanteLima'
import estilos from './Calendario.module.css'
import Estado from '@/components/ui/Estado'
import { insigniaAEstado } from '@/components/ui/tonos'

const DIAS = ['lun.', 'mar.', 'mié.', 'jue.', 'vie.', 'sáb.', 'dom.']

type Bloque = BloqueCalendario & ({ tipo: 'existente'; existente: ProgramacionExistente } | { tipo: 'propuesta'; propuesta: PropuestaCronograma })

export interface CalendarioCronogramaProps {
  desde: FechaIso
  hasta: FechaIso
  propuestas: PropuestaCronograma[]
  existentes: ProgramacionExistente[]
  /** `false` mientras Planificación no publique la programación actual. */
  existentesDisponibles: boolean
  restricciones: RestriccionConsiderada[]
  decisiones: Record<string, DecisionEnCursoCronograma | { accion?: DecisionEnCursoCronograma['accion']; valores: DecisionEnCursoCronograma['valores'] } | undefined>
  elegida: string | null
  onElegir: (clave: string) => void
}

const ESTADO_DECISION: Record<NonNullable<DecisionEnCursoCronograma['accion']>, string> = {
  aceptar: 'Aceptada',
  corregir: 'Modificada',
  descartar: 'Descartada',
}

function FilaSemana({
  lunes,
  mesVisible,
  bloques,
  restricciones,
  elegida,
  onElegir,
  decisiones,
}: {
  lunes: FechaIso
  /** En la vista Mes, los días de otros meses se atenúan. */
  mesVisible: Mes | null
  bloques: Bloque[]
  restricciones: RestriccionConsiderada[]
  elegida: string | null
  onElegir: (clave: string) => void
  decisiones: CalendarioCronogramaProps['decisiones']
}) {
  const hoy = hoyLima()
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i))
  const colocados = colocarEnSemana(bloques, lunes)
  const carriles = Math.max(1, ...colocados.map((c) => c.carril + 1))

  return (
    <div className={estilos.semana}>
      <div className={estilos.cabeceraDias}>
        {dias.map((dia, i) => {
          const fuera = mesVisible !== null && mesDeFecha(dia).mes !== mesVisible.mes
          const delDia = restricciones.filter((r) => enIntervalo(dia, r.fecha_inicio, r.fecha_fin))
          return (
            <div key={dia} className={`${estilos.cabeceraDia} ${dia === hoy ? estilos.hoy : ''} ${fuera ? estilos.fueraDeMes : ''}`}>
              <span className={estilos.nombreDia}>
                {DIAS[i]} <span className="cifra">{Number(dia.slice(8))}</span>
              </span>
              {delDia.map((r, j) => {
                // La insignia dice solo el tipo; el texto completo sale al pasar el ratón o al enfocarla.
                const idBurbuja = `restriccion-${dia}-${j}`
                return (
                  <span key={r.descripcion} className={estilos.restriccion} tabIndex={0} aria-describedby={idBurbuja}>
                    <Estado {...insigniaAEstado(PRESENTACION_RESTRICCION[r.tipo])} />
                    <span id={idBurbuja} role="tooltip" className={`${estilos.burbuja} ${i >= 4 ? estilos.burbujaIzquierda : ''}`}>
                      <strong>{PRESENTACION_RESTRICCION[r.tipo].texto}:</strong> {r.descripcion}
                      {r.espacio ? ` · ${r.espacio}` : ' · Todo el campus'}
                    </span>
                  </span>
                )
              })}
            </div>
          )
        })}
      </div>
      <div className={estilos.carriles} style={{ gridTemplateRows: `repeat(${carriles}, auto)` }} /* estilo-calculado */>
        {colocados.map(({ bloque, columna, dias: ocupa, carril, sigueAntes, sigueDespues }) => {
          const posicion = { gridColumn: `${columna + 1} / span ${ocupa}`, gridRow: carril + 1 }
          const cortes = `${sigueAntes ? estilos.sigueAntes : ''} ${sigueDespues ? estilos.sigueDespues : ''}`
          if (bloque.tipo === 'existente') {
            const e = bloque.existente
            return (
              <div
                key={bloque.clave}
                className={`${estilos.bloque} ${estilos.existente} ${cortes}`}
                style={posicion} // estilo-calculado
                title={`Programado: ${e.actividad} · ${e.ubicacion}`}
              >
                <span className={estilos.etiquetaBloque}>Programado</span>
                <span className={estilos.textoBloque}>
                  {e.actividad} · {e.ubicacion}
                </span>
              </div>
            )
          }
          const p = bloque.propuesta
          const accion = decisiones[p.clave]?.accion
          return (
            <button
              key={bloque.clave}
              type="button"
              className={`${estilos.bloque} ${estilos.propuesta} ${accion ? estilos[accion] : ''} ${elegida === p.clave ? estilos.elegida : ''} ${cortes}`}
              style={posicion} // estilo-calculado
              aria-pressed={elegida === p.clave}
              title={`Propuesta IA: ${p.actividad} · ${p.ubicacion}${accion ? ` · ${ESTADO_DECISION[accion]}` : ''}`}
              onClick={() => onElegir(p.clave)}
            >
              <span className={estilos.etiquetaBloque}>Propuesta IA{accion ? ` · ${ESTADO_DECISION[accion]}` : ''}</span>
              <span className={estilos.textoBloque}>
                {p.actividad} · {p.ubicacion}
              </span>
              {p.coincidencias.length > 0 && (
                <span className={estilos.avisoBloque}>{p.coincidencias.some((c) => c.tipo === 'Prohibicion') ? 'Coincide con una prohibición' : 'Coincide con una advertencia'}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function CalendarioCronograma({
  desde,
  hasta,
  propuestas,
  existentes,
  existentesDisponibles,
  restricciones,
  decisiones,
  elegida,
  onElegir,
}: CalendarioCronogramaProps) {
  const [vista, setVista] = useState<'semana' | 'mes'>('semana')
  const [lunes, setLunes] = useState(() => lunesDe(desde))
  const [mes, setMes] = useState<Mes>(() => mesDeFecha(desde))
  const [mostrarProgramado, setMostrarProgramado] = useState(true)

  const bloques: Bloque[] = [
    ...(mostrarProgramado
      ? existentes.map((e): Bloque => ({ clave: `e-${e.id}`, desde: e.fecha_inicio, hasta: e.fecha_fin, tipo: 'existente', existente: e }))
      : []),
    ...propuestas.map((p): Bloque => ({ clave: p.clave, ...fechasEfectivas(p, decisiones[p.clave]?.valores), tipo: 'propuesta', propuesta: p })),
  ]

  const primerLunes = lunesDe(desde)
  const ultimoLunes = lunesDe(hasta)
  const titulo = vista === 'semana' ? tituloSemana(lunes) : nombreMes(mes)

  function irAHoy() {
    const hoy = hoyLima()
    setLunes(lunesDe(hoy))
    setMes(mesDeFecha(hoy))
  }

  function mover(delta: number) {
    if (vista === 'semana') setLunes((l) => sumarDias(l, delta * 7))
    else setMes((m) => desplazarMes(m, delta))
  }

  const semanasVisibles = vista === 'semana' ? [lunes] : semanasDelMes(mes).map((semana) => lunesDe(semana.find((d) => d !== null) ?? desde))

  return (
    <div className={estilos.calendario}>
      <div className={estilos.barra}>
        <div className={estilos.navegacion}>
          <Boton variante="secundario" compacto onClick={irAHoy}>
            Hoy
          </Boton>
          <Boton variante="fantasma" compacto aria-label={vista === 'semana' ? 'Semana anterior' : 'Mes anterior'} onClick={() => mover(-1)}>
            ‹
          </Boton>
          <Boton variante="fantasma" compacto aria-label={vista === 'semana' ? 'Semana siguiente' : 'Mes siguiente'} onClick={() => mover(1)}>
            ›
          </Boton>
          <h3 className={estilos.titulo} aria-live="polite">
            {titulo}
          </h3>
        </div>
        <GrupoChips
          etiqueta="Vista del calendario"
          opciones={[
            { valor: 'semana', texto: 'Semana' },
            { valor: 'mes', texto: 'Mes' },
          ]}
          valor={vista}
          onCambiar={(v) => setVista(v === 'mes' ? 'mes' : 'semana')}
        />
      </div>

      <div className={estilos.leyenda}>
        <label className={estilos.casillaLeyenda}>
          <input type="checkbox" checked={mostrarProgramado} disabled={!existentesDisponibles} onChange={(e) => setMostrarProgramado(e.target.checked)} />
          <span className={`${estilos.muestra} ${estilos.existente}`}>Programado</span>
        </label>
        <span className={`${estilos.muestra} ${estilos.propuesta}`}>Propuesta IA</span>
        <span className={estilos.ayudaLeyenda}>Pulsa una propuesta para revisarla</span>
      </div>
      {!existentesDisponibles && (
        <p className={estilos.ayudaLeyenda}>La programación actual de Planificación aún no está disponible: se muestran solo la propuesta y las restricciones.</p>
      )}
      {vista === 'semana' && (lunes < primerLunes || lunes > ultimoLunes) && (
        <p className={estilos.ayudaLeyenda}>Esta semana está fuera del periodo de la propuesta ({formatearFecha(desde)} – {formatearFecha(hasta)}).</p>
      )}

      <div className={vista === 'mes' ? estilos.mes : undefined}>
        {semanasVisibles.map((l) => (
          <FilaSemana
            key={l}
            lunes={l}
            mesVisible={vista === 'mes' ? mes : null}
            bloques={bloques}
            restricciones={restricciones}
            elegida={elegida}
            onElegir={onElegir}
            decisiones={decisiones}
          />
        ))}
      </div>
    </div>
  )
}
