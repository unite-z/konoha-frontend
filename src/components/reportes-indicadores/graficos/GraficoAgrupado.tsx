/**
 * Gráfico agrupado del MOD-06 (detalle de indicadores y material vegetal): agrupa los registros según la
 * agrupación elegida (chips «Agrupar por»). Por fecha son columnas en orden; el resto, barras de mayor a menor
 * (10 primeras y «Ver todas»). Con `unidadDe` se elige la unidad (chips «Unidad»): nunca se suman unidades
 * distintas. Al elegir una barra o columna, «Ver detalles» abre sus registros.
 */
import { useMemo, useState } from 'react'
import BarrasHorizontales from './BarrasHorizontales'
import ColumnasFecha from './ColumnasFecha'
import { agruparRegistros, type Agrupacion } from './agrupar'
import { escalaRedonda, marcasEje } from './escala'
import comunes from './Graficos.module.css'
import { BarraSeleccion, CabeceraGrafico } from './PartesGrafico'
import Boton from '../../ui/Boton'
import { GrupoChips } from '../../ui/ChipsFiltro'
import { formatearNumero, SIN_VALOR } from '../../../utils/formato'

const BARRAS_INICIALES = 10

export interface GraficoAgrupadoProps<F> {
  filas: F[]
  agrupaciones: Agrupacion<F>[]
  /** Unidad de cada registro (consumo de materiales): se elige una y solo se suman las de esa unidad. */
  unidadDe?: (fila: F) => string
  onVerDetalle: (titulo: string, filas: F[]) => void
}

export default function GraficoAgrupado<F>({ filas, agrupaciones, unidadDe, onVerDetalle }: GraficoAgrupadoProps<F>) {
  const unidades = useMemo(
    () => (unidadDe ? [...new Set(filas.map(unidadDe))].sort((a, b) => a.localeCompare(b, 'es')) : []),
    [filas, unidadDe],
  )
  const [valorAgrupacion, setValorAgrupacion] = useState(agrupaciones[0]?.valor ?? '')
  const [unidadElegida, setUnidadElegida] = useState<string | null>(null)
  const [verTodas, setVerTodas] = useState(false)
  const [elegida, setElegida] = useState<string | null>(null)

  const agrupacion = agrupaciones.find((a) => a.valor === valorAgrupacion) ?? agrupaciones[0]
  const unidad = unidadDe ? (unidadElegida ?? unidades[0] ?? '') : null
  const filasUnidad = useMemo(
    () => (unidadDe && unidad !== null ? filas.filter((f) => unidadDe(f) === unidad) : filas),
    [filas, unidadDe, unidad],
  )
  const grupos = useMemo(() => (agrupacion ? agruparRegistros(filasUnidad, agrupacion) : []), [filasUnidad, agrupacion])
  if (!agrupacion) return null

  const visibles = agrupacion.porFecha || verTodas ? grupos : grupos.slice(0, BARRAS_INICIALES)
  const cuenta = !agrupacion.peso
  const conUnidad = (v: number) => (unidad ? `${formatearNumero(v)} ${unidad}` : formatearNumero(v))
  const formatear = (v: number | null) => (v === null ? SIN_VALOR : conUnidad(v))
  const escala = escalaRedonda(Math.max(0, ...grupos.map((g) => g.valor)), { enteros: cuenta })
  const total = grupos.reduce((a, g) => a + g.valor, 0)
  const grupoElegido = grupos.find((g) => g.clave === elegida)
  const titulo = `${cuenta ? 'Registros' : `Cantidad${unidad ? ` (${unidad})` : ''}`} por ${agrupacion.texto.toLowerCase()}`

  function reiniciar() {
    setVerTodas(false)
    setElegida(null)
  }

  const comun = {
    formatear,
    escala,
    marcas: marcasEje(escala, conUnidad),
    claveElegida: elegida,
    onAlternar: (clave: string) => setElegida((actual) => (actual === clave ? null : clave)),
  }

  return (
    <section className={comunes.superficie} aria-label="Resumen de los registros">
      <CabeceraGrafico titulo={titulo} total={conUnidad(Math.round(total * 100) / 100)} />
      <div className={comunes.controles}>
        <div className={comunes.control}>
          <span className={comunes.etiquetaControl}>Agrupar por</span>
          <GrupoChips
            etiqueta="Agrupar por"
            opciones={agrupaciones.map((a) => ({ valor: a.valor, texto: a.texto }))}
            valor={agrupacion.valor}
            onCambiar={(v) => {
              setValorAgrupacion(v)
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
              valor={unidad ?? ''}
              onCambiar={(v) => {
                setUnidadElegida(v)
                reiniciar()
              }}
            />
          </div>
        )}
      </div>
      <BarraSeleccion
        seleccionado={grupoElegido?.texto ?? null}
        indicacion={agrupacion.porFecha ? 'Haz clic en una columna para ver sus registros.' : 'Haz clic en una barra para ver sus registros.'}
        onVerDetalle={() => grupoElegido && onVerDetalle(`${agrupacion.texto}: ${grupoElegido.texto}`, grupoElegido.filas)}
      />
      {agrupacion.porFecha ? (
        <ColumnasFecha
          {...comun}
          columnas={visibles.map((g) => ({ clave: g.clave, texto: g.texto, valor: g.valor, fecha: g.clave }))}
        />
      ) : (
        <BarrasHorizontales
          {...comun}
          agrupadas={false}
          barras={visibles.map((g) => ({ clave: g.clave, texto: g.texto, valor: g.valor, esTipo: false }))}
        />
      )}
      {!agrupacion.porFecha && grupos.length > BARRAS_INICIALES && (
        <div className={comunes.pie}>
          <p className="cifra">
            Mostrando {formatearNumero(visibles.length)} de {formatearNumero(grupos.length)}
          </p>
          <Boton variante="terciario" onClick={() => setVerTodas((v) => !v)}>
            {verTodas ? 'Ver menos' : `Ver todas (${formatearNumero(grupos.length)})`}
          </Boton>
        </div>
      )}
    </section>
  )
}
