/**
 * Tarjeta «Cerrada» de una incidencia (AV-285, Figma 390-7811; AV-279): tiempo de cierre, la evidencia y a quién se
 * avisó del cierre.
 */
import Tarjeta from '@/components/ui/Tarjeta'
import type { IncidenciaDetalle } from '@/types/incidencias'
import { diaMes, informeDelProveedor, textoTiempoCierre } from './detalleIncidencia'
import Evidencias from './Evidencias'
import estilos from './Incidencias.module.css'

export default function TarjetaCerrada({ incidencia }: { incidencia: IncidenciaDetalle }) {
  // Derivada a un proveedor, la evidencia es su informe en Servicios tercerizados (AV-278).
  const informe = informeDelProveedor(incidencia)
  return (
    <Tarjeta titulo="Cerrada" nivel={2}>
      <div className={estilos.accion}>
        <div className={estilos.camposAccion}>
          {incidencia.cierre && (
            <div>
              <p className={estilos.etiquetaCifra}>Tiempo de cierre</p>
              <p className={estilos.cifraCierre}>{textoTiempoCierre(incidencia.cierre.minutos)}</p>
            </div>
          )}
          {incidencia.atencion && (
            <div>
              <p className={estilos.rotuloCarga}>Evidencia *</p>
              {informe && incidencia.atencion.evidencias.length === 0 ? (
                <p className={estilos.subtituloAccion}>Informe del proveedor en Servicios tercerizados, del {diaMes(informe)}.</p>
              ) : (
                <Evidencias evidencias={incidencia.atencion.evidencias} />
              )}
            </div>
          )}
          {incidencia.cierre?.avisado_a && <p className={estilos.subtituloAccion}>Se avisó a {incidencia.cierre.avisado_a.replace(/\.$/, '')}.</p>}
        </div>
      </div>
    </Tarjeta>
  )
}
