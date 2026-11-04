/**
 * Bandeja «Necesita atención» del Resumen (AV-265): sustituye a la pantalla de alertas. Cada elemento lleva la
 * acción de su tipo: Programar (frecuencia), Registrar motivo (duración excedida, con el contrato de AV-255; antes,
 * Ver ciclo), Ver ciclo (duración próxima) o Configurar (servicio sin duración). Al registrar el motivo, la alerta
 * queda atendida y sale de la bandeja (Figma 373-5370 y 373-5658). En solo lectura (ingeniería y practicantes,
 * 374-7476), cada alerta lleva «Ver ciclo».
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
  programar: { texto: 'Programar', ruta: (e) => `${RUTAS_PLANIFICACION.calendario}?programar=${e.servicioId}&atiende=1` },
  verCiclo: { texto: 'Ver ciclo', ruta: (e) => (e.programacionId ? rutaCiclo(e.programacionId) : RUTAS_PLANIFICACION.ciclos) },
  configurar: { texto: 'Configurar', ruta: () => RUTAS_PLANIFICACION.configuracion },
}

/** «Corte de césped · faltan 7 días…» → servicio «Corte de césped» y motivo «Faltan 7 días…» (móvil, Figma 352-2038). */
export function partesMovil(titulo: string): { servicio: string; motivo: string } {
  const [servicio, ...resto] = titulo.split(' · ')
  const motivo = resto.join(' · ')
  return { servicio, motivo: motivo.charAt(0).toUpperCase() + motivo.slice(1) }
}

export interface NecesitaAtencionProps {
  alertas: AlertaPlanificacion[]
  servicios: ServicioPeriodico[]
  programaciones?: Programacion[]
  /** Sin permiso de edición: todas las alertas abren el ciclo (o la lista de ciclos). */
  soloLectura?: boolean
}

export default function NecesitaAtencion({ alertas, servicios, programaciones = [], soloLectura = false }: NecesitaAtencionProps) {
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
            const tipo = soloLectura && elemento.accion !== 'configurar' ? 'verCiclo' : elemento.accion
            const accion = tipo === 'registrarMotivo' ? null : ACCIONES[tipo]
            return (
              <li key={elemento.clave} className={estilos.fila}>
                <span className={`${estilos.icono} ${estilos[elemento.tono]}`} aria-hidden="true">
                  <Icono nombre={elemento.icono} tamano="base" />
                </span>
                {/* En móvil (Figma 352-2038): el servicio como título y el motivo debajo, sin el detalle. */}
                <span className={estilos.textos}>
                  <span className={`${estilos.titulo} ${estilos.soloEscritorio}`}>{elemento.titulo}</span>
                  <span className={`${estilos.detalle} ${estilos.soloEscritorio}`}>{elemento.detalle}</span>
                  <span className={`${estilos.titulo} ${estilos.soloMovil}`}>{partesMovil(elemento.titulo).servicio}</span>
                  <span className={`${estilos.detalle} ${estilos.soloMovil}`}>{partesMovil(elemento.titulo).motivo}</span>
                </span>
                {accion ? (
                  <BotonEnlace
                    to={accion.ruta(elemento)}
                    variante={tipo === 'programar' ? 'primario' : 'secundario'}
                    aria-label={tipo === 'verCiclo' ? accion.texto : undefined}
                  >
                    {tipo === 'verCiclo' ? (
                      <>
                        <span className={estilos.soloEscritorio} aria-hidden="true">
                          {accion.texto}
                        </span>
                        <span className={estilos.soloMovil} aria-hidden="true">
                          Ver
                        </span>
                      </>
                    ) : (
                      accion.texto
                    )}
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
