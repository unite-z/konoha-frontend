import type { ResultadoPanel } from '@/types/reportesGestion'
import { frasesResumen } from './resumen'
import estilos from './ReportesPage.module.css'

/**
 * Resumen del periodo con las cifras del panel. Lo calcula la aplicación, no Konoha: no se presenta como texto de
 * IA (P-15) y lo dice con su rótulo.
 */
export default function ResumenCalculado({ panel }: { panel: ResultadoPanel }) {
  const frases = frasesResumen(panel)
  if (frases.length === 0) return null
  return (
    <section className={estilos.vidrio} aria-labelledby="titulo-resumen">
      <h2 id="titulo-resumen" className={estilos.tituloSeccion}>
        Resumen del periodo
      </h2>
      <p className={estilos.ayuda}>Calculado con las cifras de arriba</p>
      <ul className={estilos.resumen}>
        {frases.map((frase) => (
          <li key={frase}>{frase}</li>
        ))}
      </ul>
    </section>
  )
}
