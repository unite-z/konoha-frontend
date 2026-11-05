// RF-FIT-005 · Ficha de una observación de plaga
/**
 * Ficha de solo lectura: no se edita. Una corrección se registra como una observación nueva, para no
 * reescribir quién observó qué y cuándo.
 */
import { useParams } from 'react-router'
import { BotonEnlace } from '@/components/ui/Boton'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoVacio from '@/components/ui/EstadoVacio'
import ListaDescripcion from '@/components/ui/ListaDescripcion'
import Tarjeta from '@/components/ui/Tarjeta'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_TERCERIZADOS, RUTAS_TERCERIZADOS } from '@/router/rutasApp'
import { obtenerObservacionPlaga } from '@/services/api/maestrosTercerizados'
import { formatearFecha, formatearFechaHora, SIN_VALOR } from '@/utils/formato'
import estilos from './Maestros.module.css'

export default function ObservacionPlagaDetallePage() {
  const { id: parametro } = useParams()
  const id = parametro && /^\d{1,9}$/.test(parametro) ? Number(parametro) : null

  const consulta = useConsulta(id === null ? null : `observacion-plaga|${id}`, (signal) => obtenerObservacionPlaga(id as number, signal))
  const observacion = consulta.datos

  usePaginaActual(observacion ? observacion.plaga_nombre : 'Observación de plaga', [
    MIGAS_TERCERIZADOS.serviciosTercerizados,
    MIGAS_TERCERIZADOS.observacionesPlagas,
    { texto: observacion ? observacion.plaga_nombre : 'Ficha' },
  ])

  let contenido
  if (id === null || (consulta.estado === 'error' && consulta.error?.estado === 404)) {
    contenido = (
      <EstadoVacio
        titulo="No existe esta observación"
        descripcion="Revisa el enlace o búscala en la lista."
        accion={
          <BotonEnlace to={RUTAS_TERCERIZADOS.observacionesPlagas} variante="secundario">
            Ir a observaciones de plagas
          </BotonEnlace>
        }
      />
    )
  } else if (consulta.estado === 'error' && !observacion) {
    contenido = (
      <EstadoError titulo="No pudimos cargar la observación" descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} />
    )
  } else if (!observacion) {
    contenido = consulta.cargaVisible ? <EstadoCarga forma="pagina" /> : null
  } else {
    contenido = (
      <>
        <Tarjeta relleno="amplio" etiquetadaPor="titulo-observacion">
          <h2 id="titulo-observacion" className={estilos.tituloPrincipal}>
            {observacion.plaga_nombre}
          </h2>
        </Tarjeta>

        <Tarjeta titulo="Datos de la observación" relleno="amplio">
          <ListaDescripcion
            elementos={[
              { etiqueta: 'Espacio o ejemplar', valor: observacion.area_verde_nombre ?? observacion.ejemplar_codigo ?? SIN_VALOR },
              { etiqueta: 'Fecha observada', valor: <span className="cifra">{formatearFecha(observacion.fecha_observacion)}</span> },
              { etiqueta: 'Descripción', valor: observacion.descripcion, ancho: true },
              { etiqueta: 'Registrado por', valor: observacion.usuario_creacion_nombre },
              { etiqueta: 'Fecha de registro', valor: <span className="cifra">{formatearFechaHora(observacion.fecha_creacion)}</span> },
            ]}
          />
        </Tarjeta>
      </>
    )
  }

  return (
    <div className={estilos.pagina}>
      <div>
        <BotonEnlace to={RUTAS_TERCERIZADOS.observacionesPlagas} variante="terciario">
          Volver a observaciones de plagas
        </BotonEnlace>
      </div>
      {contenido}
    </div>
  )
}
