/**
 * Gráfico del desglose de un indicador del panel (RF-REP-001), en lugar de su tabla:
 * - barras horizontales de mayor a menor (10 primeras y «Ver todas»), o en el orden del flujo en el
 *   cumplimiento de tercerizados (con el porcentaje de cada estado);
 * - chips para elegir el grupo: la unidad en el consumo de materiales (no se comparan unidades distintas) o
 *   «por estado / por tipo» y «por cuadrilla / por espacio» en los indicadores de MOD-04;
 * - al elegir una barra, «Ver detalles» abre sus registros (si el indicador ya tiene detalle).
 */
import { useMemo, useState } from 'react'
import BarrasHorizontales from '../../../components/reportes-indicadores/graficos/BarrasHorizontales'
import { escalaRedonda, marcasEje } from '../../../components/reportes-indicadores/graficos/escala'
import comunes from '../../../components/reportes-indicadores/graficos/Graficos.module.css'
import { BarraSeleccion, CabeceraGrafico } from '../../../components/reportes-indicadores/graficos/PartesGrafico'
import AvisoEnLinea from '../../../components/ui/AvisoEnLinea'
import Boton from '../../../components/ui/Boton'
import { GrupoChips } from '../../../components/ui/ChipsFiltro'
import type { ResultadoIndicador } from '../../../types/reportesGestion'
import { formatearNumero } from '../../../utils/formato'
import { valorTarjeta } from '../../../utils/reportesGestion'
import { esConteo, gruposDesglose, tieneRegistros } from './desglose'

/** Barras visibles antes de «Ver todas». */
const BARRAS_INICIALES = 10

export interface SeleccionDesglose {
  /** Etiqueta original de la barra (para localizar sus registros). */
  etiqueta: string
  titulo: string
}

export interface GraficoDesgloseProps {
  resultado: ResultadoIndicador
  onVerDetalle: (seleccion: SeleccionDesglose) => void
}

export default function GraficoDesglose({ resultado, onVerDetalle }: GraficoDesgloseProps) {
  const grupos = useMemo(() => gruposDesglose(resultado.clave, resultado.desglose), [resultado])
  const [claveGrupo, setClaveGrupo] = useState(grupos[0]?.clave ?? '')
  const [verTodas, setVerTodas] = useState(false)
  const [elegida, setElegida] = useState<string | null>(null)

  const grupo = grupos.find((g) => g.clave === claveGrupo) ?? grupos[0]
  if (!grupo) return null
  const conDetalle = tieneRegistros(resultado.clave)
  const visibles = grupo.enOrden || verTodas ? grupo.barras : grupo.barras.slice(0, BARRAS_INICIALES)
  const totalGrupo = grupo.barras.reduce((a, b) => a + b.valor, 0)
  const maximo = Math.max(0, ...grupo.barras.map((b) => b.valor))
  const escala = escalaRedonda(maximo, { enteros: esConteo(resultado.clave) })
  const conUnidad = (v: number) => (grupo.unidad ? `${formatearNumero(v)} ${grupo.unidad}` : formatearNumero(v))
  const formatear = (v: number | null) => {
    if (v === null) return '—'
    // En el flujo de estados, el porcentaje ayuda a ver dónde se acumulan las atenciones.
    return grupo.enOrden && totalGrupo > 0 ? `${conUnidad(v)} · ${Math.round((v / totalGrupo) * 100)} %` : conUnidad(v)
  }
  const barraElegida = grupo.barras.find((b) => b.etiqueta === elegida)
  const valor = valorTarjeta(resultado)

  function cambiarGrupo(clave: string) {
    setClaveGrupo(clave)
    setVerTodas(false)
    setElegida(null)
  }

  return (
    <section className={comunes.superficie} aria-label={`Desglose de ${resultado.indicador.nombre}`}>
      <CabeceraGrafico
        titulo={resultado.indicador.nombre}
        total={valor !== null ? `${valor} ${resultado.indicador.unidad}` : undefined}
      />
      {grupos.length > 1 && (
        <div className={comunes.control}>
          <span className={comunes.etiquetaControl}>{resultado.clave === 'consumo-materiales' ? 'Unidad' : 'Ver'}</span>
          <GrupoChips
            etiqueta={resultado.clave === 'consumo-materiales' ? 'Unidad' : 'Ver'}
            opciones={grupos.map((g) => ({ valor: g.clave, texto: g.texto }))}
            valor={grupo.clave}
            onCambiar={cambiarGrupo}
          />
        </div>
      )}
      {conDetalle ? (
        <BarraSeleccion
          seleccionado={barraElegida?.texto ?? null}
          indicacion="Haz clic en una barra para ver sus registros."
          onVerDetalle={() =>
            barraElegida &&
            onVerDetalle({ etiqueta: barraElegida.etiqueta, titulo: `${resultado.indicador.nombre}: ${barraElegida.texto}` })
          }
        />
      ) : (
        <AvisoEnLinea tono="info">
          Los registros de este indicador se podrán ver cuando Operación de campo publique sus partes diarios.
        </AvisoEnLinea>
      )}
      <BarrasHorizontales
        barras={visibles.map((b) => ({ clave: b.etiqueta, texto: b.texto, valor: b.valor, esTipo: false }))}
        agrupadas={false}
        formatear={formatear}
        escala={escala}
        marcas={marcasEje(escala, conUnidad)}
        claveElegida={elegida}
        onAlternar={(clave) => conDetalle && setElegida((actual) => (actual === clave ? null : clave))}
      />
      {!grupo.enOrden && grupo.barras.length > BARRAS_INICIALES && (
        <div className={comunes.pie}>
          <p className="cifra">
            Mostrando {formatearNumero(visibles.length)} de {formatearNumero(grupo.barras.length)}
          </p>
          <Boton variante="terciario" onClick={() => setVerTodas((v) => !v)}>
            {verTodas ? 'Ver menos' : `Ver todas (${formatearNumero(grupo.barras.length)})`}
          </Boton>
        </div>
      )}
    </section>
  )
}
