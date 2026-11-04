/**
 * «Por servicio» (RF-REP-010): programado frente a ejecutado en barras agrupadas (`BarrasHorizontales`). Cada
 * servicio es una barra (programados) seguida de sus ejecutados y pendientes, más claros. Al elegir una barra,
 * «Ver detalles» abre sus trabajos en una tabla (la versión accesible del gráfico).
 */
import { useState } from 'react'
import BarrasHorizontales from '../../../../components/reportes-indicadores/graficos/BarrasHorizontales'
import { escalaRedonda, marcasEje } from '../../../../components/reportes-indicadores/graficos/escala'
import comunes from '../../../../components/reportes-indicadores/graficos/Graficos.module.css'
import { BarraSeleccion, CabeceraGrafico } from '../../../../components/reportes-indicadores/graficos/PartesGrafico'
import type { ComparacionPorServicio, FilaProgramadoEjecutado } from '../../../../types/reportesGestion'
import { formatearNumero, SIN_VALOR } from '../../../../utils/formato'
import { barrasPorServicio, filasDeBarra } from '../../../../utils/programadoEjecutado'
import Tarjeta from '../../../../components/ui/Tarjeta'

export interface GraficoPorServicioProps {
  servicios: ComparacionPorServicio[]
  filas: FilaProgramadoEjecutado[]
  onVerDetalle: (titulo: string, filas: FilaProgramadoEjecutado[]) => void
}

export default function GraficoPorServicio({ servicios, filas, onVerDetalle }: GraficoPorServicioProps) {
  const [elegida, setElegida] = useState<string | null>(null)
  const barras = barrasPorServicio(servicios)
  const escala = escalaRedonda(Math.max(0, ...barras.map((b) => b.valor ?? 0)), { enteros: true })
  const seleccion = elegida ? filasDeBarra(filas, servicios, elegida) : null

  return (
    <Tarjeta etiqueta="Programado frente a ejecutado por servicio">
      <CabeceraGrafico titulo="Programado frente a ejecutado por servicio" total={formatearNumero(filas.length)} />
      <p className={comunes.etiquetaControl}>Cada servicio muestra sus trabajos programados y, debajo, los ejecutados y los pendientes.</p>
      <BarraSeleccion
        seleccionado={seleccion?.titulo ?? null}
        indicacion="Haz clic en una barra para ver sus trabajos."
        onVerDetalle={() => seleccion && onVerDetalle(seleccion.titulo, seleccion.filas)}
      />
      <BarrasHorizontales
        barras={barras}
        agrupadas
        formatear={(v) => (v === null ? SIN_VALOR : formatearNumero(v))}
        escala={escala}
        marcas={marcasEje(escala, formatearNumero)}
        claveElegida={elegida}
        onAlternar={(clave) => setElegida((actual) => (actual === clave ? null : clave))}
      />
    </Tarjeta>
  )
}
