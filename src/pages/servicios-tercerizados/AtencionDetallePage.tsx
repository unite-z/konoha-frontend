// RF-SER-003, 004, 005, 006 y 011 · Ficha de la atención tercerizada
/**
 * Ficha de una atención (mockup, pantalla 6; Guía Web 6: ficha de detalle con historial).
 *
 * Acciones según rol y estado: OC, inicio, fin, reporte, origen y acuerdo de la unidad (`acciones/`). Tras
 * cada operación la ficha se actualiza con la atención que devuelve el servidor (nunca con un resultado
 * supuesto) y se confirma con un aviso temporal.
 * No se muestran conformidad ni seguridad y salud: están fuera de esta entrega.
 */
import { useCallback, useState } from 'react'
import { useLocation, useParams } from 'react-router'
import AvisoTemporal from '@/components/ui/AvisoTemporal'
import { BotonEnlace } from '@/components/ui/Boton'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoVacio from '@/components/ui/EstadoVacio'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_TERCERIZADOS, RUTAS_TERCERIZADOS } from '@/router/rutasApp'
import { obtenerAtencion } from '@/services/api/tercerizados'
import type { Atencion } from '@/types/tercerizados'
import { codigoCorto } from '@/utils/estadosTercerizados'
import { usePermisos } from '@/sesion/ContextoSesion'
import AccionesAtencion from './acciones/AccionesAtencion'
import Ficha from './Ficha'
import type { EstadoNavegacionBandeja } from './AtencionesPage'
import estilos from './Tercerizados.module.css'

/** La versión más reciente entre la consultada y la recibida de una operación (misma atención). */
function masReciente(consultada: Atencion | null, local: Atencion | null): Atencion | null {
  if (!local || !consultada || local.id !== consultada.id) return consultada
  return Date.parse(local.fecha_modificacion) >= Date.parse(consultada.fecha_modificacion) ? local : consultada
}

export default function AtencionDetallePage() {
  const { id: parametro } = useParams()
  const { state } = useLocation()
  const id = parametro && /^\d{1,9}$/.test(parametro) ? Number(parametro) : null
  const volverA = RUTAS_TERCERIZADOS.atenciones + ((state as EstadoNavegacionBandeja | null)?.volverA ?? '')

  const permisos = usePermisos()

  const consulta = useConsulta(id === null ? null : `atencion|${id}`, (signal) => obtenerAtencion(id as number, signal))
  // Última versión recibida de una operación o recarga; se usa si es tan reciente como la consultada.
  const [local, setLocal] = useState<Atencion | null>(null)
  const atencion = masReciente(consulta.datos, local)
  // Aviso que deja el asistente al registrar la atención.
  const [aviso, setAviso] = useState<string | null>(() => (state as { aviso?: string } | null)?.aviso ?? null)
  const cerrarAviso = useCallback(() => setAviso(null), [setAviso])
  const [versionDocumentos, setVersionDocumentos] = useState(0)
  const [enfocarTitulo] = useState(() => Boolean((state as { aviso?: string } | null)?.aviso))

  usePaginaActual(atencion ? `Atención ${codigoCorto(atencion.codigo)}` : 'Atención tercerizada', [
    MIGAS_TERCERIZADOS.serviciosTercerizados,
    MIGAS_TERCERIZADOS.atenciones,
    { texto: atencion ? codigoCorto(atencion.codigo) : 'Ficha' },
  ])

  const volver = (
    <BotonEnlace to={volverA} variante="fantasma">
      Volver a la bandeja
    </BotonEnlace>
  )

  let contenido
  if (id === null || (consulta.estado === 'error' && consulta.error?.estado === 404)) {
    contenido = (
      <EstadoVacio
        titulo="No existe esta atención"
        descripcion="Revisa el enlace o búscala en la bandeja."
        accion={
          <BotonEnlace to={RUTAS_TERCERIZADOS.atenciones} variante="secundario">
            Ir a la bandeja
          </BotonEnlace>
        }
      />
    )
  } else if (consulta.estado === 'error') {
    contenido = (
      <EstadoError
        titulo="No pudimos cargar la atención"
        descripcion={consulta.error?.detalle ?? ''}
        onReintentar={consulta.reintentar}
      />
    )
  } else if (!atencion) {
    contenido = consulta.cargaVisible ? <EstadoCarga forma="pagina" /> : null
  } else {
    contenido = (
      <Ficha
        atencion={atencion}
        versionDocumentos={versionDocumentos}
        enfocarTitulo={enfocarTitulo}
        acciones={
          <AccionesAtencion
            atencion={atencion}
            permisos={permisos}
            onActualizada={setLocal}
            onExito={setAviso}
            onReporteAdjunto={() => setVersionDocumentos((v) => v + 1)}
          />
        }
      />
    )
  }

  return (
    <div className={estilos.pagina}>
      <div>{volver}</div>
      {contenido}
      <AvisoTemporal mensaje={aviso} onCerrar={cerrarAviso} />
    </div>
  )
}
