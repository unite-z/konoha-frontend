/**
 * Bandeja «Necesita atención» del Resumen (AV-265): sustituye a la pantalla de alertas. Cada elemento lleva la
 * acción de su tipo: Programar (frecuencia), Ver ciclo (duración) o Configurar (servicio sin duración).
 *
 * Mientras no existan el panel «Programar ciclo» (AV-267) ni la pantalla de Ciclos (AV-269), Programar y Ver ciclo
 * abren el Calendario con el servicio o el ciclo en la URL (`?programar=` y `?ciclo=`), que esas pantallas leerán.
 */
import { BotonEnlace } from '@/components/ui/Boton'
import Estado from '@/components/ui/Estado'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Icono from '@/components/ui/Icono'
import Tarjeta from '@/components/ui/Tarjeta'
import { RUTAS_PLANIFICACION } from '@/router/rutasApp'
import type { AlertaPlanificacion, ServicioPeriodico } from '@/types/planificacion'
import { elementosAtencion, type ElementoAtencion } from './resumenPlanificacion'
import estilos from './ResumenPlanificacion.module.css'

const ACCIONES: Record<ElementoAtencion['accion'], { texto: string; ruta: (e: ElementoAtencion) => string }> = {
  programar: { texto: 'Programar', ruta: (e) => `${RUTAS_PLANIFICACION.calendario}?programar=${e.servicioId}` },
  verCiclo: { texto: 'Ver ciclo', ruta: (e) => `${RUTAS_PLANIFICACION.calendario}?ciclo=${e.programacionId ?? ''}` },
  configurar: { texto: 'Configurar', ruta: () => RUTAS_PLANIFICACION.configuracion },
}

export interface NecesitaAtencionProps {
  alertas: AlertaPlanificacion[]
  servicios: ServicioPeriodico[]
}

export default function NecesitaAtencion({ alertas, servicios }: NecesitaAtencionProps) {
  const elementos = elementosAtencion(alertas, servicios)
  // Un solo botón primario: el de la primera frecuencia por programar (DESIGN.md, «Un Botón primario por pantalla»).
  const primeraProgramar = elementos.findIndex((elemento) => elemento.accion === 'programar')
  return (
    <Tarjeta
      titulo="Necesita atención"
      relleno="amplio"
      acciones={elementos.length > 0 ? <Estado tono="error" texto={String(elementos.length)} /> : undefined}
    >
      {elementos.length === 0 ? (
        <EstadoVacio titulo="Todo al día" descripcion="Ninguna frecuencia por vencer, duración excedida ni servicio sin configurar." nivel={3} />
      ) : (
        <ul className={estilos.lista}>
          {elementos.map((elemento, indice) => {
            const accion = ACCIONES[elemento.accion]
            return (
              <li key={elemento.clave} className={estilos.fila}>
                <span className={`${estilos.icono} ${estilos[elemento.tono]}`} aria-hidden="true">
                  <Icono nombre={elemento.icono} tamano="base" />
                </span>
                <span className={estilos.textos}>
                  <span className={estilos.titulo}>{elemento.titulo}</span>
                  <span className={estilos.detalle}>{elemento.detalle}</span>
                </span>
                <BotonEnlace to={accion.ruta(elemento)} variante={indice === primeraProgramar ? 'primario' : 'secundario'}>
                  {accion.texto}
                </BotonEnlace>
              </li>
            )
          })}
        </ul>
      )}
    </Tarjeta>
  )
}
