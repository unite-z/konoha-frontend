/**
 * Bandeja «Necesita atención» del Resumen (AV-265): sustituye a la pantalla de alertas. Cada elemento lleva la
 * acción de su tipo: Programar (frecuencia), Registrar motivo (duración excedida, con el contrato de AV-255; antes,
 * Ver ciclo), Ver ciclo (duración próxima) o Configurar (servicio sin duración). Al registrar el motivo, la alerta
 * queda atendida y sale de la bandeja (Figma 373-5370 y 373-5658).
 *
 * Programar abre el panel «Programar ciclo» del Calendario con el servicio elegido (`?programar=`, AV-267) y Ver
 * ciclo, el detalle del ciclo (AV-269). Como en Figma, «Programar» es primario y las demás acciones, secundarias.
 */
import { useState } from 'react'
import AvisoTemporal from '@/components/ui/AvisoTemporal'
import Boton, { BotonEnlace } from '@/components/ui/Boton'
import Estado from '@/components/ui/Estado'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Icono from '@/components/ui/Icono'
import Tarjeta from '@/components/ui/Tarjeta'
import { RUTAS_PLANIFICACION, rutaCiclo } from '@/router/rutasApp'
import type { AlertaPlanificacion, Programacion, ServicioPeriodico } from '@/types/planificacion'
import DialogoMotivoAlerta from './DialogoMotivoAlerta'
import { elementosAtencion, type ElementoAtencion } from './resumenPlanificacion'
import estilos from './ResumenPlanificacion.module.css'

const ACCIONES: Record<Exclude<ElementoAtencion['accion'], 'registrarMotivo'>, { texto: string; ruta: (e: ElementoAtencion) => string }> = {
  programar: { texto: 'Programar', ruta: (e) => `${RUTAS_PLANIFICACION.calendario}?programar=${e.servicioId}` },
  verCiclo: { texto: 'Ver ciclo', ruta: (e) => (e.programacionId ? rutaCiclo(e.programacionId) : RUTAS_PLANIFICACION.ciclos) },
  configurar: { texto: 'Configurar', ruta: () => RUTAS_PLANIFICACION.configuracion },
}

export interface NecesitaAtencionProps {
  alertas: AlertaPlanificacion[]
  servicios: ServicioPeriodico[]
  programaciones?: Programacion[]
}

export default function NecesitaAtencion({ alertas, servicios, programaciones = [] }: NecesitaAtencionProps) {
  const [atendidas, setAtendidas] = useState<string[]>([])
  const [motivo, setMotivo] = useState<ElementoAtencion | null>(null)
  const [registrado, setRegistrado] = useState<string | null>(null)
  const elementos = elementosAtencion(alertas, servicios, programaciones).filter((e) => !atendidas.includes(e.clave))
  return (
    <Tarjeta
      titulo="Necesita atención"
      relleno="amplio"
      junto={elementos.length > 0 ? <Estado tono="error" texto={String(elementos.length)} punto={false} /> : undefined}
    >
      {elementos.length === 0 ? (
        <EstadoVacio titulo="Todo al día" descripcion="Ninguna frecuencia por vencer, duración excedida ni servicio sin configurar." nivel={3} />
      ) : (
        <ul className={estilos.lista}>
          {elementos.map((elemento) => {
            const accion = elemento.accion === 'registrarMotivo' ? null : ACCIONES[elemento.accion]
            return (
              <li key={elemento.clave} className={estilos.fila}>
                <span className={`${estilos.icono} ${estilos[elemento.tono]}`} aria-hidden="true">
                  <Icono nombre={elemento.icono} tamano="base" />
                </span>
                <span className={estilos.textos}>
                  <span className={estilos.titulo}>{elemento.titulo}</span>
                  <span className={estilos.detalle}>{elemento.detalle}</span>
                </span>
                {accion ? (
                  <BotonEnlace to={accion.ruta(elemento)} variante={elemento.accion === 'programar' ? 'primario' : 'secundario'}>
                    {accion.texto}
                  </BotonEnlace>
                ) : (
                  <Boton variante="secundario" onClick={() => setMotivo(elemento)}>
                    Registrar motivo
                  </Boton>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {motivo?.alertaId != null && (
        <DialogoMotivoAlerta
          alertaId={motivo.alertaId}
          descripcion={motivo.titulo}
          onCerrar={() => setMotivo(null)}
          onRegistrado={() => {
            setAtendidas((previas) => [...previas, motivo.clave])
            setRegistrado(motivo.titulo)
            setMotivo(null)
          }}
        />
      )}
      {registrado && <AvisoTemporal mensaje="Motivo registrado" detalle={`${registrado}: alerta atendida.`} onCerrar={() => setRegistrado(null)} />}
    </Tarjeta>
  )
}
