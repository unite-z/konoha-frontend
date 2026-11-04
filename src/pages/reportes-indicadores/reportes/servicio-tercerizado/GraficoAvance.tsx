/**
 * Pestaña «Avance» del reporte por servicio (RF-REP-008): atenciones por clase y por situación en barras, y el
 * metrado ejecutado frente al previsto. Al elegir una barra, «Ver detalles» abre sus atenciones.
 */
import { useState } from 'react'
import BarrasHorizontales from '../../../../components/reportes-indicadores/graficos/BarrasHorizontales'
import { escalaRedonda, marcasEje } from '../../../../components/reportes-indicadores/graficos/escala'
import comunes from '../../../../components/reportes-indicadores/graficos/Graficos.module.css'
import { BarraSeleccion, CabeceraGrafico } from '../../../../components/reportes-indicadores/graficos/PartesGrafico'
import BarraAvance from '../../../../components/ui/BarraAvance'
import EstadoVacio from '../../../../components/ui/EstadoVacio'
import type { AvanceServicio, FilaAtencionServicio } from '../../../../types/reportesGestion'
import { formatearNumero, SIN_VALOR } from '../../../../utils/formato'
import { atencionesDeParte, metradoAvance, PARTES_AVANCE, type ParteAvance } from '../../../../utils/reporteServicio'
import estilos from './ServicioTercerizado.module.css'
import Tarjeta from '../../../../components/ui/Tarjeta'

export interface GraficoAvanceProps {
  avance: AvanceServicio
  filas: FilaAtencionServicio[]
  onVerDetalle: (titulo: string, filas: FilaAtencionServicio[]) => void
}

export default function GraficoAvance({ avance, filas, onVerDetalle }: GraficoAvanceProps) {
  const [elegida, setElegida] = useState<ParteAvance | null>(null)
  if (avance.sin_datos) {
    return <EstadoVacio nivel={3} titulo="Avance sin datos" descripcion={avance.mensaje_sin_datos ?? undefined} />
  }
  const escala = escalaRedonda(Math.max(0, ...PARTES_AVANCE.map((p) => avance[p.clave])), { enteros: true })
  const parte = PARTES_AVANCE.find((p) => p.clave === elegida)
  const metrado = metradoAvance(avance)
  const conUnidad = (v: number) => `${formatearNumero(v)} ${metrado?.unidad ?? ''}`.trim()

  return (
    <div className={estilos.columna}>
      <Tarjeta etiqueta="Atenciones por clase y situación">
        <CabeceraGrafico titulo="Atenciones por clase y situación" total={formatearNumero(filas.length)} />
        <BarraSeleccion
          seleccionado={parte?.texto ?? null}
          indicacion="Haz clic en una barra para ver sus atenciones."
          onVerDetalle={() => parte && onVerDetalle(`Atenciones: ${parte.texto.toLowerCase()}`, atencionesDeParte(filas, parte.clave))}
        />
        <BarrasHorizontales
          barras={PARTES_AVANCE.map((p) => ({ clave: p.clave, texto: p.texto, valor: avance[p.clave], esTipo: false }))}
          agrupadas={false}
          formatear={(v) => (v === null ? SIN_VALOR : formatearNumero(v))}
          escala={escala}
          marcas={marcasEje(escala, formatearNumero)}
          claveElegida={elegida}
          onAlternar={(clave) => setElegida((actual) => (actual === clave ? null : (clave as ParteAvance)))}
        />
      </Tarjeta>

      <Tarjeta etiquetadaPor="titulo-metrado">
        <h3 id="titulo-metrado" className={comunes.tituloGrafico}>
          Metrado ejecutado frente al previsto
        </h3>
        {metrado ? (
          <>
            <p className={`${estilos.cifraGrande} cifra`}>
              {conUnidad(metrado.ejecutado)} <span className={estilos.secundario}>de {conUnidad(metrado.previsto)}</span>
            </p>
            <BarraAvance
              valor={metrado.ejecutado}
              maximo={metrado.previsto}
              etiqueta="Metrado ejecutado frente al previsto"
              textoValor={`${conUnidad(metrado.ejecutado)} de ${conUnidad(metrado.previsto)}`}
            />
          </>
        ) : (
          <p className={estilos.secundario}>Sin datos: el metrado previsto o el ejecutado no están registrados</p>
        )}
      </Tarjeta>
    </div>
  )
}
