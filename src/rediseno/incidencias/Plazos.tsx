/**
 * Cabecera «Plazos» (RD-42, M3-28, RN-019): los tres avisos de las incidencias sencillas del personal propio (24 h, 40 h
 * y 48 h) con «Reasignar» y «Anotar causa». Solo se pinta para quien gestiona incidencias (`PLA.INCIDENCIA.CLASIFICAR`).
 */
import { useState } from 'react'
import Boton from '@/design-system/Boton'
import Estado from '@/design-system/Estado'
import { NIVEL_PLAZO, textoAlertaPlazo, type AlertaPlazo } from '@/pages/incidencias/bandeja'
import type { IncidenciaResumen } from '@/types/incidencias'
import AccionesPlazo, { type AccionPlazo } from './AccionesPlazo'
import { AVISOS_PLAZO } from './filtros'
import estilos from './Incidencias.module.css'

export interface PlazosProps {
  alertas: AlertaPlazo[]
  seleccionada: number | null
  onSeleccionar: (id: number) => void
  onAviso: (mensaje: string) => void
  /** Algo cambió en el servidor (reasignación): la bandeja se vuelve a leer. */
  onCambio: () => void
}

export default function Plazos({ alertas, seleccionada, onSeleccionar, onAviso, onCambio }: PlazosProps) {
  const [accion, setAccion] = useState<AccionPlazo | null>(null)

  function cerrarConAviso(mensaje: string) {
    setAccion(null)
    onAviso(mensaje)
    onCambio()
  }

  return (
    <section className={estilos.plazos} aria-labelledby="titulo-plazos">
      <div className={estilos.cabeceraPlazos}>
        <h2 id="titulo-plazos" className={estilos.tituloSeccion}>
          Plazos
        </h2>
        <ul className={estilos.avisosPlazo} aria-label="Avisos de plazo">
          {AVISOS_PLAZO.map(({ nivel, umbral }) => {
            const cantidad = alertas.filter((a) => a.nivel === nivel).length
            const { texto, tono } = NIVEL_PLAZO[nivel]
            return (
              <li key={nivel}>
                <Estado
                  tono={tono}
                  texto={`${texto} · ${umbral}: ${cantidad}`}
                  ayuda={`Sencillas del personal propio, ${umbral}`}
                />
              </li>
            )
          })}
        </ul>
      </div>
      {alertas.length === 0 ? (
        <p className={estilos.secundario}>Ninguna incidencia sencilla ha pasado el objetivo de 24 h.</p>
      ) : (
        <ul className={estilos.listaAlertas} aria-label="Incidencias con aviso de plazo">
          {alertas.map((alerta) => {
            const nivel = NIVEL_PLAZO[alerta.nivel]
            const { incidencia } = alerta
            return (
              <li
                key={incidencia.id}
                className={estilos.filaAlerta}
                data-seleccionada={seleccionada === incidencia.id || undefined}
              >
                <Estado tono={nivel.tono} texto={nivel.texto} />
                <Boton variante="enlace" compacto onClick={() => onSeleccionar(incidencia.id)}>
                  {textoAlertaPlazo(alerta)}
                </Boton>
                <span className={estilos.accionesAlerta}>
                  <Boton variante="secundario" compacto onClick={() => setAccion({ tipo: 'reasignar', incidencia })}>
                    Reasignar
                  </Boton>
                  <Boton variante="secundario" compacto onClick={() => setAccion({ tipo: 'causa', incidencia })}>
                    Anotar causa
                  </Boton>
                </span>
              </li>
            )
          })}
        </ul>
      )}
      <AccionesPlazo
        accion={accion}
        onCerrar={() => setAccion(null)}
        onCausa={(i: IncidenciaResumen) => cerrarConAviso(`Causa anotada en ${i.codigo}`)}
        onReasignada={(a) => cerrarConAviso(`${a.codigo} reasignada a ${a.responsable ?? 'otro capataz'}`)}
      />
    </section>
  )
}
