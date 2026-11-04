/**
 * Tarjeta «Encargo a un capataz» de una incidencia clasificada por la vía de personal propio (AV-284, Figma 389-7502 y
 * 394-8975; AV-277): capataz libre ese día, espacio, actividad, plazo, lo que se incluye y «Avisar al capataz».
 *
 * Si ninguna cuadrilla tiene hueco el día del plazo, el capataz queda en error («Sin capataz libre el 01/11»), se ve
 * la carga de cada cuadrilla y «Reprogramar plazo» prueba con otra fecha (394-8975).
 */
import { useState } from 'react'
import Boton from '@/components/ui/Boton'
import CampoFormulario from '@/components/ui/CampoFormulario'
import Casilla from '@/components/ui/Casilla'
import Estado from '@/components/ui/Estado'
import Selector from '@/components/ui/Selector'
import Tarjeta from '@/components/ui/Tarjeta'
import { useConsulta } from '@/hooks/useConsulta'
import { crearEncargo, listarActividadesEncargo, listarCapatacesDisponibles } from '@/services/api/incidencias'
import type { IncidenciaDetalle } from '@/types/incidencias'
import { hoyLima } from '@/utils/instanteLima'
import { capatacesLibres, diaMes, incluyeEncargo, masDias, textoCarga } from './detalleIncidencia'
import estilos from './Incidencias.module.css'

export interface TarjetaEncargoProps {
  incidencia: IncidenciaDetalle
  onVolver: () => void
  onCreado: (incidencia: IncidenciaDetalle, aviso: string) => void
}

export default function TarjetaEncargo({ incidencia, onVolver, onCreado }: TarjetaEncargoProps) {
  // Plazo objetivo de una sencilla: un día (RN-019).
  const [plazo, setPlazo] = useState(() => masDias(hoyLima(), 1))
  const [nuevoPlazo, setNuevoPlazo] = useState(plazo)
  const capataces = useConsulta(`encargo-capataces:${incidencia.id}:${plazo}`, (signal) => listarCapatacesDisponibles(incidencia.id, signal, plazo))
  const actividades = useConsulta('encargo-actividades', listarActividadesEncargo)
  const [capataz, setCapataz] = useState('')
  const [actividad, setActividad] = useState('')
  const [avisar, setAvisar] = useState(true)
  const [mostrarErrores, setMostrarErrores] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const libres = capatacesLibres(capataces.datos ?? [])
  const sinLibre = Boolean(capataces.datos) && libres.length === 0
  const incluye = incluyeEncargo(incidencia)

  async function crear() {
    setMostrarErrores(true)
    if (!capataz || !actividad || !plazo) return
    setEnviando(true)
    setError(null)
    try {
      const derivada = await crearEncargo(incidencia.id, {
        capataz_id: Number(capataz),
        espacio: incidencia.espacio,
        actividad,
        plazo,
        incluye,
        avisar_capataz: avisar,
      })
      onCreado(derivada, `Encargo creado para ${derivada.responsable ?? 'el capataz'}`)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo crear el encargo.')
      setEnviando(false)
    }
  }

  return (
    <Tarjeta titulo="Encargo a un capataz" nivel={2}>
      <div className={estilos.accion}>
        <div className={estilos.camposAccion}>
          {sinLibre ? (
            <>
              <Selector
                id="encargo-capataz"
                etiqueta="Capataz"
                obligatorio
                valor=""
                opcionTodos={`Sin capataz libre el ${diaMes(plazo)}`}
                opciones={[]}
                onCambiar={() => undefined}
                error={`Sin capataz libre el ${diaMes(plazo)}`}
                idErrorExterno="encargo-carga"
              />
              <div id="encargo-carga" className={estilos.carga}>
                <p className={estilos.rotuloCarga}>Carga del {diaMes(plazo)}</p>
                <ul className={estilos.listaCarga}>
                  {(capataces.datos ?? []).map((c) => (
                    <li key={c.id}>
                      <span>
                        {c.cuadrilla} · {c.nombre}
                      </span>
                      <span className={estilos.cifraCarga}>{textoCarga(c)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <CampoFormulario id="encargo-plazo" etiqueta="Plazo" obligatorio type="date" value={nuevoPlazo} onChange={(e) => setNuevoPlazo(e.target.value)} />
            </>
          ) : (
            <>
              <Selector
                id="encargo-capataz"
                etiqueta="Capataz"
                obligatorio
                valor={capataz}
                opcionTodos={capataces.datos ? 'Elige el capataz' : 'Cargando capataces…'}
                opciones={libres.map((c) => ({ valor: String(c.id), texto: `${c.nombre} · ${c.cuadrilla}` }))}
                onCambiar={setCapataz}
                error={mostrarErrores && !capataz ? 'Elige el capataz.' : undefined}
              />
              <Selector id="encargo-espacio" etiqueta="Espacio" valor={incidencia.espacio} opciones={[{ valor: incidencia.espacio, texto: incidencia.espacio }]} onCambiar={() => undefined} />
              <Selector
                id="encargo-actividad"
                etiqueta="Actividad"
                obligatorio
                valor={actividad}
                opcionTodos="Elige la actividad"
                opciones={(actividades.datos ?? []).map((a) => ({ valor: a, texto: a }))}
                onCambiar={setActividad}
                error={mostrarErrores && !actividad ? 'Elige la actividad.' : undefined}
              />
              <CampoFormulario
                id="encargo-plazo"
                etiqueta="Plazo"
                obligatorio
                type="date"
                value={plazo}
                onChange={(e) => {
                  setPlazo(e.target.value)
                  setNuevoPlazo(e.target.value)
                  setCapataz('')
                }}
              />
              <div>
                <p className={estilos.rotuloCarga}>Se incluye</p>
                <p className={estilos.insignias}>
                  {incluye.map((cosa) => (
                    <Estado key={cosa} tono="neutro" texto={cosa} punto={false} />
                  ))}
                </p>
              </div>
              <Casilla id="encargo-avisar" etiqueta="Avisar al capataz" marcada={avisar} onCambiar={setAvisar} />
            </>
          )}
          {error && <p className={estilos.errorAccion}>{error}</p>}
        </div>
        <div className={`${estilos.pieAccion} ${estilos.pieDerecha}`}>
          <Boton variante="secundario" onClick={onVolver}>
            Volver
          </Boton>
          {sinLibre ? (
            <Boton onClick={() => setPlazo(nuevoPlazo)} deshabilitado={!nuevoPlazo || nuevoPlazo === plazo}>
              Reprogramar plazo
            </Boton>
          ) : (
            <Boton cargando={enviando} onClick={() => void crear()}>
              Crear encargo
            </Boton>
          )}
        </div>
      </div>
    </Tarjeta>
  )
}
