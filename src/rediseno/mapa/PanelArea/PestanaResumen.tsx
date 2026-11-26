import Estado from '@/design-system/Estado'
import ListaDescripcion from '@/design-system/ListaDescripcion'
import type { ResumenArea } from '@/types/resumenArea'
import { formatearFecha } from '@/utils/formato'
import { nombreSituacion } from './formato'
import NotaArea from './NotaArea'
import estilos from './PanelArea.module.css'

const formatoSuperficie = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 })

function superficie(texto: string): string | null {
  const valor = Number(texto)
  return Number.isFinite(valor) ? `${formatoSuperficie.format(valor)} m²` : null
}

/** Resumen del área: la ficha, los ejemplares por situación, la próxima actividad y la nota calculada. */
export default function PestanaResumen({ resumen, tieneContorno }: { resumen: ResumenArea; tieneContorno: boolean }) {
  const { area, ejemplares_por_situacion: situaciones, proxima_actividad: proxima } = resumen
  const entradas = Object.entries(situaciones ?? {}).filter(([, cantidad]) => cantidad > 0)
  return (
    <div className={estilos.resumen}>
      <div className={estilos.estados}>
        <Estado tono={area.activo ? 'exito' : 'neutro'} texto={area.activo ? 'Activa' : 'Inactiva'} />
        {!tieneContorno && <Estado tono="aviso" texto="Sin contorno en el mapa" />}
      </div>
      <ListaDescripcion
        columnas="una"
        elementos={[
          { etiqueta: 'Sector', valor: area.sector_nombre },
          { etiqueta: 'Tipo de uso', valor: area.tipo_uso_nombre },
          { etiqueta: 'Cuartel', valor: area.cuartel_numero ? `Cuartel ${area.cuartel_numero}` : null },
          { etiqueta: 'Superficie', valor: superficie(area.superficie_m2) },
          { etiqueta: 'Cobertura', valor: area.tipo_cobertura_nombre },
          { etiqueta: 'Ubicación', valor: area.ubicacion || area.lugar || null, ancho: true },
        ]}
      />
      {situaciones !== null && (
        <section aria-label="Ejemplares por situación">
          <h3 className={estilos.subtitulo}>Ejemplares</h3>
          {entradas.length === 0 ? (
            <p className={estilos.secundario}>El área no tiene ejemplares registrados.</p>
          ) : (
            <ul className={estilos.situaciones}>
              {entradas.map(([situacion, cantidad]) => (
                <li key={situacion}>
                  <span className={estilos.cifra}>{cantidad}</span>
                  <span className={estilos.secundario}>{nombreSituacion(situacion)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {proxima && (
        <section aria-label="Próxima actividad">
          <h3 className={estilos.subtitulo}>Próxima actividad</h3>
          <p>
            {proxima.tipo_servicio} · {formatearFecha(proxima.fecha_inicio_prevista)}
            {proxima.fecha_fin_prevista ? ` al ${formatearFecha(proxima.fecha_fin_prevista)}` : ''}
          </p>
          <p className={estilos.secundario}>{proxima.estado}</p>
        </section>
      )}
      <NotaArea resumen={resumen} />
    </div>
  )
}
