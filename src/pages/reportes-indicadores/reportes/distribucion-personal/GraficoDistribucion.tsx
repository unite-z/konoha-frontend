/**
 * Gráfico «Distribución del personal» (RF-REP-004): agrupa por cuadrilla, actividad, espacio o jornada y mide
 * horas-persona, operarios, tiempo, superficie o actividades.
 *
 * - Cuadrilla y espacio: barras horizontales de mayor a menor (10 primeras y «Ver todas»).
 * - Actividad: barras agrupadas; cada clase de actividad con sus tipos debajo.
 * - Jornada: columnas en orden de fecha.
 * - Clic en una barra: queda elegida y se habilita «Ver detalles».
 */
import { useMemo, useState } from 'react'
import Boton from '../../../../components/ui/Boton'
import { GrupoChips } from '../../../../components/ui/ChipsFiltro'
import type { FilaDistribucion } from '../../../../types/reportes'
import { formatearNumero } from '../../../../utils/formato'
import {
  agrupar,
  DIMENSIONES,
  DIVISIONES_EJE,
  escalaEje,
  formatearMedida,
  MEDIDAS,
  textoMarca,
  totalizar,
  valorMedida,
  type Dimension,
  type Grupo,
  type Medida,
} from './agregacion'
import BarrasHorizontales, { type BarraGrafico } from './BarrasHorizontales'
import ColumnasJornada from './ColumnasJornada'
import type { Seleccion } from './DetalleSeleccion'
import estilos from './Graficos.module.css'
import { BarraSeleccion, CabeceraGrafico, ControlMedida, SinDatosMedida } from './PartesGrafico'

/** Barras visibles antes de «Ver todas». */
const BARRAS_INICIALES = 10

const TEXTO_DIMENSION: Record<Dimension, string> = {
  cuadrilla: 'Cuadrilla',
  actividad: 'Clase de actividad',
  espacio: 'Espacio',
  jornada: 'Jornada',
}

export interface GraficoProps {
  filas: FilaDistribucion[]
  medida: Medida
  onCambiarMedida: (medida: Medida) => void
  onVerDetalle: (seleccion: Seleccion) => void
}

type Elemento = BarraGrafico & { filas: FilaDistribucion[]; titulo: string }

export default function GraficoDistribucion({ filas, medida, onCambiarMedida, onVerDetalle }: GraficoProps) {
  const [dimension, setDimension] = useState<Dimension>('cuadrilla')
  const [verTodas, setVerTodas] = useState(false)
  const [claveElegida, setClaveElegida] = useState<string | null>(null)

  const grupos = useMemo(() => agrupar(filas, dimension, medida), [filas, dimension, medida])
  const total = useMemo(() => totalizar(filas), [filas])
  const esJornada = dimension === 'jornada'
  const limitados = esJornada || verTodas ? grupos : grupos.slice(0, BARRAS_INICIALES)

  // Elementos en orden de dibujo: en «actividad», cada clase seguida de sus tipos.
  const elemento = (g: Grupo, clave: string, titulo: string, grupo?: string): Elemento => ({
    clave,
    texto: g.texto,
    valor: valorMedida(g.totales, medida),
    esTipo: grupo !== undefined,
    grupo,
    filas: g.filas,
    titulo,
  })
  const elementos: Elemento[] = limitados.flatMap((g) => [
    elemento(g, `g:${g.clave}`, `${TEXTO_DIMENSION[dimension]}: ${g.texto}`),
    ...(g.subgrupos ?? []).map((t) =>
      elemento(t, `t:${g.clave}:${t.clave}`, `Tipo de actividad: ${t.texto} (${g.texto})`, `g:${g.clave}`),
    ),
  ])

  const maximo = Math.max(0, ...elementos.map((e) => e.valor ?? 0))
  const escala = escalaEje(maximo, medida)
  const marcas = Array.from({ length: DIVISIONES_EJE + 1 }, (_, i) => textoMarca((escala * i) / DIVISIONES_EJE, medida))
  const textoMedida = MEDIDAS.find((m) => m.valor === medida)?.texto ?? ''

  const elegido = elementos.find((e) => e.clave === claveElegida)
  const seleccion: Seleccion | null = elegido
    ? { clave: elegido.clave, titulo: elegido.titulo, filas: elegido.filas }
    : null

  function cambiarDimension(valor: string) {
    setDimension(valor as Dimension)
    setVerTodas(false)
    setClaveElegida(null)
  }

  function alternar(clave: string) {
    setClaveElegida((actual) => (actual === clave ? null : clave))
  }

  const comunes = { medida, escala, marcas, claveElegida, onAlternar: alternar }
  let cuerpo
  if (maximo === 0) {
    cuerpo = <SinDatosMedida medida={medida} />
  } else if (esJornada) {
    cuerpo = (
      <ColumnasJornada {...comunes} columnas={elementos.map((e) => ({ ...e, jornada: e.clave.slice(2) }))} />
    )
  } else {
    cuerpo = <BarrasHorizontales {...comunes} barras={elementos} agrupadas={dimension === 'actividad'} />
  }

  return (
    <div className={estilos.superficie}>
      <CabeceraGrafico
        titulo={`${textoMedida} por ${TEXTO_DIMENSION[dimension].toLowerCase()}`}
        total={formatearMedida(total[medida], medida)}
      />
      <div className={estilos.controles}>
        <div className={estilos.control}>
          <span className={estilos.etiquetaControl}>Agrupar por</span>
          <GrupoChips etiqueta="Agrupar por" opciones={DIMENSIONES} valor={dimension} onCambiar={cambiarDimension} />
        </div>
        <ControlMedida medida={medida} onCambiar={onCambiarMedida} />
      </div>
      <BarraSeleccion
        seleccion={seleccion}
        indicacion={esJornada ? 'Haz clic en una columna para ver su detalle.' : 'Haz clic en una barra para ver su detalle.'}
        onVerDetalle={onVerDetalle}
      />
      {cuerpo}
      {!esJornada && maximo > 0 && grupos.length > BARRAS_INICIALES && (
        <div className={estilos.pie}>
          <p className="cifra">
            Mostrando {formatearNumero(limitados.length)} de {formatearNumero(grupos.length)}
          </p>
          <Boton variante="terciario" onClick={() => setVerTodas((v) => !v)}>
            {verTodas ? 'Ver menos' : `Ver todas (${formatearNumero(grupos.length)})`}
          </Boton>
        </div>
      )}
    </div>
  )
}
