/**
 * Comparación con meses anteriores (RF-REP-005, paso 4): una columna por mes (los 3 anteriores y el elegido),
 * con el total del movimiento y la unidad elegidos, de todos los materiales o de uno. Un mes sin movimientos
 * muestra «Sin movimientos» (nunca un cero). Al elegir un mes, «Ver detalles» abre sus totales por material.
 */
import { useMemo, useState } from 'react'
import ColumnasFecha from '../../../../components/reportes-indicadores/graficos/ColumnasFecha'
import { escalaRedonda, marcasEje } from '../../../../components/reportes-indicadores/graficos/escala'
import comunes from '../../../../components/reportes-indicadores/graficos/Graficos.module.css'
import { BarraSeleccion, CabeceraGrafico } from '../../../../components/reportes-indicadores/graficos/PartesGrafico'
import { GrupoChips } from '../../../../components/ui/ChipsFiltro'
import EstadoVacio from '../../../../components/ui/EstadoVacio'
import Selector, { OPCION_TODOS } from '../../../../components/ui/Selector'
import type { TotalMes } from '../../../../types/reportesGestion'
import { formatearNumero } from '../../../../utils/formato'
import {
  materialesComparacion,
  MOVIMIENTOS,
  serieComparacion,
  unidadesComparacion,
  type MesComparacion,
  type Movimiento,
} from './materialVegetal'

const SIN_MOVIMIENTOS = 'Sin movimientos'

export interface GraficoComparacionProps {
  meses: MesComparacion[]
  onVerDetalle: (titulo: string, filas: TotalMes[]) => void
}

export default function GraficoComparacion({ meses, onVerDetalle }: GraficoComparacionProps) {
  const [movimiento, setMovimiento] = useState<Movimiento>('consumido')
  const [unidadElegida, setUnidadElegida] = useState<string | null>(null)
  const [material, setMaterial] = useState('')
  const [elegido, setElegido] = useState<string | null>(null)

  const unidades = useMemo(() => unidadesComparacion(meses, movimiento), [meses, movimiento])
  const unidad = unidadElegida !== null && unidades.includes(unidadElegida) ? unidadElegida : (unidades[0] ?? '')
  const materiales = useMemo(() => materialesComparacion(meses, movimiento, unidad), [meses, movimiento, unidad])
  const materialValido = materiales.includes(material) ? material : ''
  const serie = useMemo(
    () => serieComparacion(meses, movimiento, unidad, materialValido || null),
    [meses, movimiento, unidad, materialValido],
  )

  const textoMovimiento = MOVIMIENTOS.find((m) => m.valor === movimiento)?.texto ?? ''
  const conUnidad = (v: number) => `${formatearNumero(v)} ${unidad}`.trim()
  const escala = escalaRedonda(Math.max(0, ...serie.map((p) => p.valor ?? 0)))
  const punto = serie.find((p) => p.mes === elegido && p.valor !== null)

  function reiniciar() {
    setElegido(null)
  }

  return (
    <section className={comunes.superficie} aria-label="Comparación con meses anteriores">
      <CabeceraGrafico titulo={`${textoMovimiento}${unidad ? ` (${unidad})` : ''} por mes`} />
      <div className={comunes.controles}>
        <div className={comunes.control}>
          <span className={comunes.etiquetaControl}>Movimiento</span>
          <GrupoChips
            etiqueta="Movimiento"
            opciones={MOVIMIENTOS}
            valor={movimiento}
            onCambiar={(v) => {
              setMovimiento(v as Movimiento)
              setMaterial('')
              reiniciar()
            }}
          />
        </div>
        {unidades.length > 1 && (
          <div className={comunes.control}>
            <span className={comunes.etiquetaControl}>Unidad</span>
            <GrupoChips
              etiqueta="Unidad"
              opciones={unidades.map((u) => ({ valor: u, texto: u || 'Sin unidad' }))}
              valor={unidad}
              onCambiar={(v) => {
                setUnidadElegida(v)
                setMaterial('')
                reiniciar()
              }}
            />
          </div>
        )}
        {materiales.length > 1 && (
          <Selector
            id="comparacion-material"
            etiqueta="Material"
            valor={materialValido}
            opciones={materiales.map((m) => ({ valor: m, texto: m }))}
            opcionTodos={`${OPCION_TODOS} los materiales`}
            onCambiar={(v) => {
              setMaterial(v)
              reiniciar()
            }}
          />
        )}
      </div>

      {unidades.length === 0 ? (
        <EstadoVacio
          nivel={3}
          titulo={`Sin material ${textoMovimiento.toLowerCase()} en estos meses`}
          descripcion="Elige otro movimiento."
        />
      ) : (
        <>
          <BarraSeleccion
            seleccionado={punto?.texto ?? null}
            indicacion="Haz clic en un mes para ver sus totales por material."
            onVerDetalle={() => punto && onVerDetalle(`${textoMovimiento} · ${punto.texto}`, punto.filas)}
          />
          <ColumnasFecha
            columnas={serie.map((p) => ({ clave: p.mes, texto: p.texto, valor: p.valor, fecha: `${p.mes}-01`, etiqueta: p.texto }))}
            formatear={(v) => (v === null ? SIN_MOVIMIENTOS : conUnidad(v))}
            escala={escala}
            marcas={marcasEje(escala, conUnidad)}
            claveElegida={elegido}
            onAlternar={(mes) =>
              serie.find((p) => p.mes === mes)?.valor !== null && setElegido((actual) => (actual === mes ? null : mes))
            }
          />
        </>
      )}
    </section>
  )
}
