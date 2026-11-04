/**
 * «Revisar atención» de una incidencia atendida (AV-285, Figma 390-8008, 390-8205 y 390-8390; AV-279): quién la
 * atendió, la evidencia y las observaciones, con «Devolver» y «Cerrar incidencia».
 * - Sin evidencia no se puede cerrar: «Sin evidencia» y «Para cerrar hace falta la evidencia.» (390-8205).
 * - «Devolver» pasa la tarjeta a «Devolver a En atención» con observaciones obligatorias (390-8390).
 */
import { useState } from 'react'
import Boton from '@/components/ui/Boton'
import CampoFormulario from '@/components/ui/CampoFormulario'
import Tarjeta from '@/components/ui/Tarjeta'
import { cerrarIncidencia, devolverIncidencia } from '@/services/api/incidencias'
import type { AtencionIncidencia, IncidenciaDetalle } from '@/types/incidencias'
import { hoyLima } from '@/utils/instanteLima'
import { textoAtendida } from './detalleIncidencia'
import Evidencias from './Evidencias'
import estilos from './Incidencias.module.css'

export interface TarjetaRevisarAtencionProps {
  incidencia: IncidenciaDetalle
  atencion: AtencionIncidencia
  onCambiada: (incidencia: IncidenciaDetalle, aviso: string) => void
}

export default function TarjetaRevisarAtencion({ incidencia, atencion, onCambiada }: TarjetaRevisarAtencionProps) {
  const [devolviendo, setDevolviendo] = useState(false)
  const [observaciones, setObservaciones] = useState('')
  const [mostrarError, setMostrarError] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sinEvidencia = atencion.evidencias.length === 0

  async function cerrar() {
    setEnviando(true)
    setError(null)
    try {
      onCambiada(await cerrarIncidencia(incidencia.id, observaciones.trim() || undefined), `${incidencia.codigo} cerrada`)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo cerrar.')
      setEnviando(false)
    }
  }

  async function devolver() {
    setMostrarError(true)
    if (!observaciones.trim()) return
    setEnviando(true)
    setError(null)
    try {
      onCambiada(await devolverIncidencia(incidencia.id, observaciones.trim()), `${incidencia.codigo} devuelta a En atención`)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo devolver.')
      setEnviando(false)
    }
  }

  if (devolviendo) {
    return (
      <Tarjeta titulo="Devolver a En atención" nivel={2}>
        <div className={estilos.accion}>
          <div className={estilos.camposAccion}>
            <div>
              <p className={estilos.rotuloCarga}>Evidencia *</p>
              <Evidencias evidencias={atencion.evidencias} maximo={1} />
            </div>
            <CampoFormulario
              id="devolver-observaciones"
              etiqueta="Observaciones"
              obligatorio
              value={observaciones}
              maxLength={300}
              onChange={(e) => setObservaciones(e.target.value)}
              error={mostrarError && !observaciones.trim() ? 'Explica qué falta por hacer.' : undefined}
            />
            {error && <p className={estilos.errorAccion}>{error}</p>}
          </div>
          <div className={`${estilos.pieAccion} ${estilos.pieDerecha}`}>
            <Boton variante="secundario" onClick={() => setDevolviendo(false)}>
              Volver
            </Boton>
            <Boton cargando={enviando} onClick={() => void devolver()}>
              Devolver
            </Boton>
          </div>
        </div>
      </Tarjeta>
    )
  }

  return (
    <Tarjeta titulo="Revisar atención" nivel={2}>
      <div className={estilos.accion}>
        <p className={estilos.subtituloAccion}>{textoAtendida(atencion, hoyLima())}</p>
        <div className={estilos.camposAccion}>
          <div>
            <p className={estilos.rotuloCarga}>Evidencia *</p>
            <Evidencias evidencias={atencion.evidencias} />
            {sinEvidencia && <p className={estilos.errorAccion}>Para cerrar hace falta la evidencia.</p>}
          </div>
          {!sinEvidencia && (
            <CampoFormulario
              id="revisar-observaciones"
              etiqueta="Observaciones"
              placeholder="Escribe si hay que repetir algo"
              value={observaciones}
              maxLength={300}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          )}
          {error && <p className={estilos.errorAccion}>{error}</p>}
        </div>
        <div className={`${estilos.pieAccion} ${estilos.pieDerecha}`}>
          <Boton variante="secundario" onClick={() => setDevolviendo(true)}>
            Devolver
          </Boton>
          <Boton cargando={enviando} deshabilitado={sinEvidencia} onClick={() => void cerrar()}>
            Cerrar incidencia
          </Boton>
        </div>
      </div>
    </Tarjeta>
  )
}
