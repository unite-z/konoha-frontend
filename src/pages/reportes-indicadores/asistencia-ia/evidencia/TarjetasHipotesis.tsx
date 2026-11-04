/**
 * «Hipótesis de la IA» (RF-IA-006, criterios 1 y 2): una tarjeta por hipótesis con su categoría, la confianza (barra
 * y texto, o «Incierta») y las evidencias visuales. Se ordenan por confianza y ninguna se destaca ni se preselecciona.
 */
import BarraAvance from '@/components/ui/BarraAvance'
import Estado from '@/components/ui/Estado'
import Tarjeta from '@/components/ui/Tarjeta'
import type { HipotesisFitosanitaria } from '@/types/evidenciaFitosanitariaIa'
import { ETIQUETA_CATEGORIA, ordenarHipotesis, textoConfianza } from '@/utils/evidenciaFitosanitariaIa'
import estilos from './Evidencia.module.css'

export default function TarjetasHipotesis({ hipotesis }: { hipotesis: HipotesisFitosanitaria[] }) {
  return (
    <Tarjeta titulo="Hipótesis de la IA" nivel={2} descripcion="Ordenadas por confianza; ninguna es un diagnóstico.">
      <ul className={estilos.hipotesis}>
        {ordenarHipotesis(hipotesis).map((h) => {
          const porcentaje = h.confianza === null ? null : Math.round(h.confianza * 100)
          return (
            <li key={h.clave}>
              <article className={estilos.tarjetaHipotesis} aria-label={`Hipótesis: ${h.nombre}`}>
                <div>
                  <Estado tono="neutro" texto={ETIQUETA_CATEGORIA[h.categoria]} />
                </div>
                <h3 className={estilos.nombreHipotesis}>{h.nombre}</h3>
                <div className={estilos.confianza}>
                  <span className={estilos.secundario}>Confianza: {textoConfianza(h)}</span>
                  {porcentaje !== null && <BarraAvance valor={porcentaje} maximo={100} etiqueta={`Confianza de ${h.nombre}`} textoValor={textoConfianza(h)} />}
                </div>
                {h.evidencias.length > 0 && (
                  <ul className={estilos.evidencias} aria-label="Evidencias visuales">
                    {h.evidencias.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                )}
              </article>
            </li>
          )
        })}
      </ul>
    </Tarjeta>
  )
}
