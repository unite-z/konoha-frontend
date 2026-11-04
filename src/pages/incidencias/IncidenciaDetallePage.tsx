// HU-021 a HU-023 · Detalle de incidencia (AV-284, Figma «Incidencia · clasificar» 388-7305)
/**
 * A la izquierda, la foto y la ficha (ubicación, ejemplar, descripción y quién la reportó); a la derecha, la tarjeta
 * de acción según el estado. Registrada: «Clasificar» (`TarjetaClasificar`). La derivación por cada vía llega en los
 * siguientes PR de AV-284. Datos simulados hasta el backend (AV-274 a AV-278), con `AvisoDatosSimulados` (D9).
 */
import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import AvisoDatosSimulados from '@/components/reportes-indicadores/AvisoDatosSimulados'
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
import { obtenerIncidencia } from '@/services/api/incidencias'
import type { IncidenciaDetalle } from '@/types/incidencias'
import { hoyLima } from '@/utils/instanteLima'
import { ESTADO_INCIDENCIA } from './bandeja'
import { textoEjemplar, textoReporto, textoUbicacion } from './detalleIncidencia'
import TarjetaClasificar from './TarjetaClasificar'
import TarjetaEncargo from './TarjetaEncargo'
import estilos from './Incidencias.module.css'

export default function IncidenciaDetallePage() {
  const { id: idRuta } = useParams()
  const navegar = useNavigate()
  const id = Number(idRuta)
  const consulta = useConsulta(`incidencia:${id}`, (signal) => obtenerIncidencia(id, signal))
  const [local, setLocal] = useState<IncidenciaDetalle | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
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
  return (
    <div className={estilos.pagina}>
      <JuntoTitulo>
        <Estado tono={estado.tono} texto={estado.texto} punto={incidencia.estado !== 'EnAtencion'} />
      </JuntoTitulo>
      <AvisoDatosSimulados />
      <div className={estilos.detalle}>
        <div className={estilos.ficha}>
          <div className={estilos.foto} aria-label={incidencia.foto_url ? undefined : 'Sin foto'} role={incidencia.foto_url ? undefined : 'img'}>
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
        </div>
        {/* Clasificada por la vía de personal propio: el encargo a un capataz (Figma 389-7502 y 394-8975). */}
        {incidencia.estado === 'Clasificada' && incidencia.via === 'PersonalPropio' && (
          <TarjetaEncargo
            key={incidencia.id}
            incidencia={incidencia}
            onVolver={() => navegar(RUTAS_INCIDENCIAS.bandeja)}
            onCreado={(derivada, mensaje) => {
              setLocal(derivada)
              setAviso(mensaje)
            }}
          />
        )}
        {incidencia.estado === 'Registrada' && (
          <TarjetaClasificar
            key={incidencia.id}
            incidencia={incidencia}
            onAviso={setAviso}
            onCambiada={(cambiada, mensaje) => {
              setLocal(cambiada)
              setAviso(mensaje)
            }}
          />
        )}
      </div>
      <AvisoTemporal mensaje={aviso} onCerrar={cerrarAviso} />
    </div>
  )
}
