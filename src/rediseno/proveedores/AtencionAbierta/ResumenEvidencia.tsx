/**
 * Resumen del análisis dentro de `RevisionIa` (RD-55): la planta, la calidad de las fotos con su `motivo_calidad`, las
 * hipótesis por confianza (sin ninguna destacada ni preseleccionada) y, si ya se validó, el resultado. Reutiliza las
 * piezas de `asistencia-ia/evidencia/`. Nunca indica un tratamiento. Las hipótesis entran en cascada corta.
 */
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import Boton from '@/design-system/Boton'
import Estado from '@/design-system/Estado'
import CabeceraEvidencia from '@/pages/reportes-indicadores/asistencia-ia/evidencia/CabeceraEvidencia'
import MiniaturasEvidencia from '@/pages/reportes-indicadores/asistencia-ia/evidencia/MiniaturasEvidencia'
import TarjetasHipotesis from '@/pages/reportes-indicadores/asistencia-ia/evidencia/TarjetasHipotesis'
import type { SugerenciaEvidencia } from '@/types/evidenciaFitosanitariaIa'
import { estadoEvidencia, textoResultado, tituloEvidencia } from '@/utils/evidenciaFitosanitariaIa'
import { formatearFechaHora } from '@/utils/formato'
import estilos from './EvidenciaKonoha.module.css'

export interface AccionesEvidencia {
  puedeSolicitar: boolean
  puedeValidar: boolean
  /** «Subir nuevas fotografías» con la planta de este análisis. */
  nuevasFotos: (analisis: SugerenciaEvidencia) => void
  /** «Registrar evaluación manual» con la planta de este análisis. */
  registrarManual: (analisis: SugerenciaEvidencia) => void
}

export default function ResumenEvidencia({
  sugerencia,
  acciones,
}: {
  sugerencia: SugerenciaEvidencia
  acciones: AccionesEvidencia
}) {
  const { contenido, estado } = sugerencia
  const pendiente = estado === 'Propuesta'
  const { validacion } = contenido
  const insuficientes = contenido.fotografias.filter((f) => f.calidad === 'Insuficiente')
  const sinElemento = contenido.origen === 'manual' || validacion?.resultado === 'OtraCategoria'

  return (
    <div className={estilos.resumen}>
      <CabeceraEvidencia
        contenido={contenido}
        fechaCreacion={sugerencia.fecha_creacion}
        insignias={
          <>
            <Estado {...estadoEvidencia(estado, validacion)} />
            {pendiente && (
              <Estado tono="aviso" icono="triangle-alert" texto="Hipótesis: pendiente de validación técnica" />
            )}
          </>
        }
      />
      {!contenido.calidad_suficiente && pendiente && (
        <AvisoEnLinea
          tono="advertencia"
          titulo="Las fotografías no tienen calidad suficiente para un análisis confiable"
        >
          <ul className={estilos.motivos}>
            {insuficientes.map((f) => (
              <li key={f.archivo_id}>{`${f.nombre}: ${f.motivo_calidad ?? 'calidad insuficiente'}`}</li>
            ))}
          </ul>
          <span className={estilos.acciones}>
            {acciones.puedeSolicitar && (
              <Boton variante="secundario" compacto onClick={() => acciones.nuevasFotos(sugerencia)}>
                Subir nuevas fotografías
              </Boton>
            )}
            {acciones.puedeValidar && (
              <Boton variante="fantasma" compacto onClick={() => acciones.registrarManual(sugerencia)}>
                Registrar evaluación manual
              </Boton>
            )}
          </span>
        </AvisoEnLinea>
      )}
      {contenido.contexto_reducido && pendiente && (
        <AvisoEnLinea tono="info">
          La especie no está identificada: las hipótesis se basan en menos contexto.
        </AvisoEnLinea>
      )}
      {pendiente && !acciones.puedeValidar && (
        <AvisoEnLinea tono="info">Solo la jefatura de sección puede validar o descartar este análisis.</AvisoEnLinea>
      )}
      {estado === 'Validada' && validacion && (
        <AvisoEnLinea
          tono={validacion.resultado === 'NoConcluyente' ? 'info' : 'exito'}
          titulo={`${textoResultado(validacion)} · ${formatearFechaHora(sugerencia.fecha_validacion)}`}
        >
          {contenido.origen === 'manual'
            ? 'Evaluación registrada sin IA. '
            : 'Las hipótesis originales de la IA se conservan abajo. '}
          No se indicó ningún tratamiento.
          {/* Una confirmación o «No es posible concluir» llevan el comentario en su elemento; esto no tiene elemento. */}
          {sinElemento && validacion.comentario && (
            <span className={estilos.comentario}>{`Comentario técnico: ${validacion.comentario}`}</span>
          )}
        </AvisoEnLinea>
      )}
      {estado === 'Rechazada' && (
        <AvisoEnLinea tono="info" titulo={`Análisis descartado el ${formatearFechaHora(sugerencia.fecha_validacion)}`}>
          No se registró ninguna categoría a partir de él.
        </AvisoEnLinea>
      )}
      {contenido.fotografias.length > 0 && (
        <MiniaturasEvidencia
          sugerenciaId={sugerencia.id}
          fotografias={contenido.fotografias}
          codigo={contenido.ejemplar?.codigo ?? tituloEvidencia(contenido)}
        />
      )}
      {contenido.hipotesis.length > 0 && (
        <div className={estilos.cascada}>
          <TarjetasHipotesis hipotesis={contenido.hipotesis} />
        </div>
      )}
      {pendiente && (
        <p className={estilos.nota}>Esto no es un diagnóstico definitivo ni una indicación de tratamiento.</p>
      )}
    </div>
  )
}
