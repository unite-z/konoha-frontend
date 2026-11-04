// HU-021 a HU-023 · Detalle de incidencia (AV-284, Figma «Incidencia · clasificar» 388-7305)
/**
 * A la izquierda, la foto y la ficha (ubicación, ejemplar, descripción y quién la reportó); a la derecha, la tarjeta
 * de acción según el estado. Registrada: «Clasificar» (`TarjetaClasificar`). La derivación por cada vía llega en los
 * siguientes PR de AV-284. Datos simulados hasta el backend (AV-274 a AV-278), con `AvisoDatosSimulados` (D9).
 */
import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import AvisoDatosSimulados from '@/components/reportes-indicadores/AvisoDatosSimulados'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import AvisoTemporal from '@/components/ui/AvisoTemporal'
import { BotonEnlace } from '@/components/ui/Boton'
import Estado from '@/components/ui/Estado'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Icono from '@/components/ui/Icono'
import ListaDescripcion from '@/components/ui/ListaDescripcion'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import JuntoTitulo from '@/layouts/LayoutOficina/JuntoTitulo'
import { MIGAS_INCIDENCIAS, RUTAS_INCIDENCIAS } from '@/router/rutasApp'
import { DERIVACION_DISPONIBLE, obtenerIncidencia } from '@/services/api/incidencias'
import type { IncidenciaDetalle, ViaIncidencia } from '@/types/incidencias'
import { hoyLima } from '@/utils/instanteLima'
import { ESTADO_INCIDENCIA } from './bandeja'
import { textoEjemplar, textoReporto, textoUbicacion } from './detalleIncidencia'
import TarjetaClasificar from './TarjetaClasificar'
import TarjetaEncargo from './TarjetaEncargo'
import HistorialIncidencia from './HistorialIncidencia'
import TarjetaCerrada from './TarjetaCerrada'
import TarjetaDerivarDeNuevo from './TarjetaDerivarDeNuevo'
import TarjetaRevisarAtencion from './TarjetaRevisarAtencion'
import TarjetaRequerimiento from './TarjetaRequerimiento'
import TarjetaSeguimientoRequerimiento from './TarjetaSeguimientoRequerimiento'
import estilos from './Incidencias.module.css'

export default function IncidenciaDetallePage() {
  const { id: idRuta } = useParams()
  const navegar = useNavigate()
  const id = Number(idRuta)
  const consulta = useConsulta(`incidencia:${id}`, (signal) => obtenerIncidencia(id, signal))
  const [local, setLocal] = useState<IncidenciaDetalle | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  // Vía elegida en «Derivar de nuevo» (encargo cancelado), por incidencia.
  const [viaElegida, setViaElegida] = useState<{ id: number; via: ViaIncidencia } | null>(null)
  const cerrarAviso = useCallback(() => setAviso(null), [])
  const incidencia = local?.id === id ? local : consulta.datos
  usePaginaActual(incidencia ? `${incidencia.tipo} · ${incidencia.codigo}` : 'Incidencia', [MIGAS_INCIDENCIAS.incidencias, { texto: incidencia?.codigo ?? 'Incidencia' }])

  if (consulta.estado === 'error' && !consulta.datos) {
    if (consulta.error?.estado === 404) {
      return (
        <EstadoVacio
          titulo="No existe esta incidencia"
          descripcion="Revisa el enlace o búscala en la bandeja."
          accion={
            <BotonEnlace to={RUTAS_INCIDENCIAS.bandeja} variante="secundario">
              Ir a la bandeja
            </BotonEnlace>
          }
        />
      )
    }
    return <EstadoError titulo="No pudimos cargar la incidencia" descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} />
  }
  if (!incidencia) return consulta.cargaVisible ? <EstadoCarga forma="pagina" /> : null

  const estado = ESTADO_INCIDENCIA[incidencia.estado]
  const cerrada = incidencia.estado === 'Cerrada'
  const cancelado = incidencia.estado === 'Clasificada' ? (incidencia.encargo_cancelado ?? null) : null
  const elegida = viaElegida?.id === incidencia.id ? viaElegida.via : null
  // Con el encargo cancelado, la vía es la que se elige en «Derivar de nuevo»; si no, la de la clasificación.
  const via = cancelado ? elegida : incidencia.via
  const volver = cancelado ? () => setViaElegida(null) : () => navegar(RUTAS_INCIDENCIAS.bandeja)
  const derivada = (cambiada: IncidenciaDetalle, mensaje: string) => {
    setLocal(cambiada)
    setAviso(mensaje)
  }
  return (
    <div className={estilos.pagina}>
      <JuntoTitulo>
        <Estado tono={estado.tono} texto={estado.texto} punto={incidencia.estado !== 'EnAtencion'} />
      </JuntoTitulo>
      <AvisoDatosSimulados />
      <div className={estilos.detalle}>
        <div className={estilos.ficha}>
          {cancelado && (
            <AvisoEnLinea tono="advertencia" titulo={`Se canceló el encargo ${cancelado.codigo}`}>
              Motivo: {cancelado.motivo}
            </AvisoEnLinea>
          )}
          <div className={`${estilos.foto} ${cerrada ? estilos.fotoBaja : ''}`} aria-label={incidencia.foto_url ? undefined : 'Sin foto'} role={incidencia.foto_url ? undefined : 'img'}>
            {incidencia.foto_url ? <img src={incidencia.foto_url} alt={`Foto de ${incidencia.tipo}`} /> : <Icono nombre="image" tamano="md" />}
          </div>
          <ListaDescripcion
            columnas="filas"
            elementos={[
              { etiqueta: 'Ubicación', valor: textoUbicacion(incidencia) },
              { etiqueta: 'Ejemplar', valor: textoEjemplar(incidencia) },
              { etiqueta: 'Descripción', valor: incidencia.descripcion },
              { etiqueta: 'Reportó', valor: textoReporto(incidencia, hoyLima()) },
            ]}
          />
          {cerrada && incidencia.historial && incidencia.historial.length > 0 && <HistorialIncidencia eventos={incidencia.historial} />}
        </div>
        {/* Clasificada por la vía de personal propio: el encargo a un capataz (Figma 389-7502 y 394-8975). */}
        {incidencia.estado === 'Clasificada' && (via === 'PersonalPropio' || via === 'Tercerizada') && !DERIVACION_DISPONIBLE && (
          <AvisoEnLinea tono="info" titulo="Derivar aún no está disponible">
            La incidencia queda clasificada. El encargo a un capataz y el requerimiento a un proveedor llegarán pronto.
          </AvisoEnLinea>
        )}
        {incidencia.estado === 'Clasificada' && via === 'PersonalPropio' && DERIVACION_DISPONIBLE && <TarjetaEncargo key={incidencia.id} incidencia={incidencia} onVolver={volver} onCreado={derivada} />}
        {/* Clasificada por la vía tercerizada: el requerimiento a un proveedor (Figma 389-7706 y 389-7903). */}
        {incidencia.estado === 'Clasificada' && via === 'Tercerizada' && DERIVACION_DISPONIBLE && <TarjetaRequerimiento key={incidencia.id} incidencia={incidencia} onVolver={volver} onCreado={derivada} />}
        {/* Encargo cancelado: elegir de nuevo la vía (Figma 390-8582). */}
        {cancelado && !elegida && <TarjetaDerivarDeNuevo onElegir={(nueva) => setViaElegida({ id: incidencia.id, via: nueva })} />}
        {/* Derivada a tercerizado: el avance del requerimiento (Figma 394-9194). */}
        {incidencia.estado === 'DerivadaTercerizada' && incidencia.requerimiento && <TarjetaSeguimientoRequerimiento requerimiento={incidencia.requerimiento} />}
        {/* Atendida: revisar la atención y cerrar o devolver (Figma 390-8008, 390-8205 y 390-8390). */}
        {incidencia.estado === 'Atendida' && incidencia.atencion && (
          <TarjetaRevisarAtencion key={incidencia.id} incidencia={incidencia} atencion={incidencia.atencion} onCambiada={derivada} />
        )}
        {/* Cerrada: tiempo de cierre, evidencia y aviso al reportante (Figma 390-7811). */}
        {cerrada && <TarjetaCerrada incidencia={incidencia} />}
        {incidencia.estado === 'Registrada' && (
          <TarjetaClasificar
            key={incidencia.id}
            incidencia={incidencia}
            onAviso={setAviso}
            onCambiada={derivada}
          />
        )}
      </div>
      <AvisoTemporal mensaje={aviso} onCerrar={cerrarAviso} />
    </div>
  )
}
