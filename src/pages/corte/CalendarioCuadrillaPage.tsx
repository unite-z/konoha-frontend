// RF-PLA-007 · Calendario de solo lectura del capataz en el móvil (AV-271, Figma 380-8307)
/**
 * La semana de su cuadrilla con la tira de días y la agenda, como el calendario móvil del jefe (`VistaMovil`), pero
 * sin acciones: «Cuadrilla B · solo lectura». El filtro por cuadrilla llega con AV-254; hasta entonces, con datos
 * simulados, se ven todas las actividades (D9).
 */
import { useState } from 'react'
import AvisoDatosSimulados from '@/components/reportes-indicadores/AvisoDatosSimulados'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_CORTE } from '@/router/rutasApp'
import { obtenerCalendarioCuadrilla } from '@/services/api/corte'
import { hoyLima } from '@/utils/instanteLima'
import { diasDeSemana, eventosDeCapas } from '../planificacion/calendario/calendarioCapas'
import VistaMovil from '../planificacion/calendario/VistaMovil'
import estilos from './RutaDeHoy.module.css'

export default function CalendarioCuadrillaPage() {
  usePaginaActual('Calendario', [MIGAS_CORTE.corte, { texto: 'Calendario' }])
  const hoy = hoyLima()
  const [fecha, setFecha] = useState(hoy)
  const dias = diasDeSemana(fecha)
  const desde = dias[0]
  const hasta = dias[6]
  const consulta = useConsulta(`calendario-cuadrilla:${desde}`, (signal) => obtenerCalendarioCuadrilla(desde, hasta, signal))

  let contenido
  if (consulta.estado === 'error' && !consulta.datos) {
    contenido = <EstadoError titulo="No pudimos cargar el calendario" descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} />
  } else if (!consulta.datos) {
    contenido = consulta.cargaVisible ? <EstadoCarga forma="tarjetas" texto="Cargando el calendario…" /> : null
  } else {
    contenido = (
      <>
        <p className={estilos.ciclo}>{consulta.datos.cuadrilla ? `${consulta.datos.cuadrilla} · solo lectura` : 'Sin cuadrilla asignada · solo lectura'}</p>
        <VistaMovil fecha={fecha} hoy={hoy} eventos={eventosDeCapas(consulta.datos.restricciones, consulta.datos.programaciones)} onCambiarFecha={setFecha} />
      </>
    )
  }

  return (
    <div className={estilos.pagina}>
      <AvisoDatosSimulados />
      {contenido}
    </div>
  )
}
