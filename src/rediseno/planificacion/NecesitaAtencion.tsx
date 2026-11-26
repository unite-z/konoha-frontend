import { useState } from 'react'
import AvisoTemporal from '@/design-system/AvisoTemporal'
import Boton, { BotonEnlace } from '@/design-system/Boton'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import Icono from '@/design-system/Icono'
import type { ResultadoConsulta } from '@/hooks/useConsulta'
import DialogoMotivoAlerta from '@/pages/planificacion/resumen/DialogoMotivoAlerta'
import { elementosAtencion, type ElementoAtencion } from '@/pages/planificacion/resumen/resumenPlanificacion'
import type { AlertaPlanificacion, Programacion, ServicioPeriodico } from '@/types/planificacion'
import { rutaPlanificacionCiclo, rutaPlanificacionCiclos, rutaPlanificacionProgramar, rutaPlanificacionReglas } from './enlaces'
import estilos from './Sectores.module.css'

export interface NecesitaAtencionProps {
  alertas: ResultadoConsulta<AlertaPlanificacion[]>
  servicios: ResultadoConsulta<ServicioPeriodico[]>
  programaciones: ResultadoConsulta<Programacion[]>
  /** Solo el jefe (`PLA.PLANIFICACION.GESTIONAR`) registra motivos y programa; los demás ven el ciclo. */
  puedeEditar: boolean
}

type Destino = { texto: string; ruta: string; primaria: boolean }

function destino(elemento: ElementoAtencion, puedeEditar: boolean): Destino | null {
  if (elemento.accion === 'configurar') return { texto: 'Configurar', ruta: rutaPlanificacionReglas(), primaria: false }
  if (elemento.accion === 'programar' && puedeEditar) return { texto: 'Programar', ruta: rutaPlanificacionProgramar(elemento.servicioId), primaria: true }
  if (elemento.accion === 'registrarMotivo' && puedeEditar) return null
  return { texto: 'Ver ciclo', ruta: elemento.programacionId ? rutaPlanificacionCiclo(elemento.programacionId) : rutaPlanificacionCiclos(), primaria: false }
}

/** «Necesita atención»: frecuencia vencida, duración excedida y duración próxima. «Registrar motivo» solo para el jefe. */
export default function NecesitaAtencion({ alertas, servicios, programaciones, puedeEditar }: NecesitaAtencionProps) {
  const [atendidas, setAtendidas] = useState<string[]>([])
  const [motivo, setMotivo] = useState<ElementoAtencion | null>(null)
  const [registrado, setRegistrado] = useState<string | null>(null)
  const fallida = [alertas, servicios].find((c) => c.estado === 'error' && !c.datos)
  const elementos =
    alertas.datos && servicios.datos
      ? elementosAtencion(alertas.datos, servicios.datos, programaciones.datos ?? []).filter((e) => !atendidas.includes(e.clave))
      : []

  let cuerpo
  if (fallida) {
    cuerpo =
      fallida.error?.estado === 403 ? (
        <EstadoSinAcceso nivel={3} titulo="No puedes ver las alertas" />
      ) : (
        <EstadoError nivel={3} titulo="No pudimos cargar las alertas" descripcion={fallida.error?.detalle ?? ''} onReintentar={fallida.reintentar} />
      )
  } else if (!alertas.datos || !servicios.datos) {
    cuerpo = alertas.cargaVisible || servicios.cargaVisible ? <p role="status">Cargando las alertas…</p> : null
  } else if (elementos.length === 0) {
    cuerpo = <EstadoVacio titulo="Todo al día" descripcion="Ninguna frecuencia por vencer, duración excedida ni servicio sin configurar." nivel={3} />
  } else {
    cuerpo = (
      <ul className={estilos.lista}>
        {elementos.map((elemento) => {
          const accion = destino(elemento, puedeEditar)
          return (
            <li key={elemento.clave} className={estilos.fila}>
              <span className={`${estilos.marca} ${estilos[elemento.tono]}`} aria-hidden="true">
                <Icono nombre={elemento.icono} tamano="base" />
              </span>
              <span className={estilos.textos}>
                <span className={estilos.titulo}>{elemento.titulo}</span>
                <span className={estilos.detalle}>{elemento.detalle}</span>
              </span>
              {accion ? (
                <BotonEnlace to={accion.ruta} variante={accion.primaria ? 'primario' : 'secundario'} aria-label={`${accion.texto}: ${elemento.titulo}`}>
                  {accion.texto}
                </BotonEnlace>
              ) : (
                <Boton variante="secundario" aria-label={`Registrar motivo: ${elemento.titulo}`} onClick={() => setMotivo(elemento)}>
                  Registrar motivo
                </Boton>
              )}
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <section className={estilos.vidrio} aria-labelledby="titulo-atencion">
      <div className={estilos.cabeceraPanel}>
        <h2 id="titulo-atencion">Necesita atención</h2>
        {elementos.length > 0 && <span className={estilos.leyenda}>{elementos.length === 1 ? '1 aviso' : `${elementos.length} avisos`}</span>}
      </div>
      {cuerpo}
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
      <AvisoTemporal mensaje={registrado ? 'Motivo registrado' : null} detalle={registrado ? `${registrado}: alerta atendida.` : undefined} onCerrar={() => setRegistrado(null)} />
    </section>
  )
}
