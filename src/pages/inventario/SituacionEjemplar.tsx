import { useState, type FormEvent } from 'react'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton from '@/components/ui/Boton'
import CampoFormulario from '@/components/ui/CampoFormulario'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import Selector, { type OpcionSelector } from '@/components/ui/Selector'
import { useConsulta } from '@/hooks/useConsulta'
import { cambiarSituacionEjemplar, listarHistorialSituacionEjemplar } from '@/services/api/ejemplares'
import type { EjemplarInventario, SituacionEjemplar as EstadoEjemplar } from '@/types/ejemplares'
import { formatearFecha } from '@/utils/formato'
import { hoyLima } from '@/utils/instanteLima'
import SelectorPuntoMapa from './SelectorPuntoMapa'
import estilos from './Catalogos.module.css'

const ETIQUETAS: Record<EstadoEjemplar, string> = {
  activo: 'Activo',
  retirado: 'Retirado',
  muerto: 'Muerto',
  reemplazado: 'Reemplazado',
  trasladado: 'Trasladado',
}
const SITUACIONES = Object.entries(ETIQUETAS).map(([valor, texto]) => ({ valor, texto }))

export default function SituacionEjemplar({ ejemplar, editable, areas, alGuardar }: {
  ejemplar: EjemplarInventario
  editable: boolean
  areas: OpcionSelector[]
  alGuardar: (ejemplar: EjemplarInventario) => void
}) {
  const historial = useConsulta(`situacion-ejemplar:${ejemplar.id}`,
    (signal) => listarHistorialSituacionEjemplar(ejemplar.id, signal))
  const [editando, setEditando] = useState(false)
  const [situacion, setSituacion] = useState<EstadoEjemplar | ''>('')
  const [fecha, setFecha] = useState(hoyLima)
  const [motivo, setMotivo] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [area, setArea] = useState('')
  const [punto, setPunto] = useState<{ latitud: string; longitud: string } | null>(null)
  const [mapaAbierto, setMapaAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState(false)

  function abrirFormulario() {
    setSituacion('')
    setFecha(hoyLima())
    setMotivo('')
    setUbicacion('')
    setArea('')
    setPunto(null)
    setMapaAbierto(false)
    setError(null)
    setAviso(false)
    setEditando(true)
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!situacion || guardando) return
    if (situacion === 'trasladado' && !ubicacion.trim() && !punto) {
      setError('Escribe la nueva ubicación o elige un punto en el mapa.')
      return
    }
    setError(null)
    setGuardando(true)
    try {
      const actualizado = await cambiarSituacionEjemplar(ejemplar.id, {
        situacion, fecha, motivo: motivo.trim(),
        ...(situacion === 'trasladado' && {
          ubicacion: ubicacion.trim() || undefined,
          area_verde_id: area ? Number(area) : undefined,
          ...punto,
        }),
      })
      setEditando(false)
      setAviso(true)
      historial.reintentar()
      alGuardar(actualizado)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo guardar el cambio de situación.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section aria-label="Situación del ejemplar">
      <h3>Situación del ejemplar</h3>
      <p><strong>{ETIQUETAS[ejemplar.situacion] ?? 'Activo'}</strong>
        {ejemplar.fecha_situacion && ` · ${formatearFecha(ejemplar.fecha_situacion)}`}</p>
      {aviso && <AvisoEnLinea tono="exito">Situación actualizada.</AvisoEnLinea>}
      {error && <AvisoEnLinea tono="error">{error}</AvisoEnLinea>}
      {editable && !editando && (
        <Boton variante="secundario" deshabilitado={guardando} onClick={abrirFormulario}>Cambiar situación</Boton>
      )}
      {editable && editando && (
        <form onSubmit={guardar}>
          <div className={estilos.alta}>
            <Selector id="situacion-ejemplar" etiqueta="Nueva situación" valor={situacion}
              onCambiar={(valor) => setSituacion(valor as EstadoEjemplar | '')}
              opciones={SITUACIONES} opcionTodos="Selecciona una situación" required />
            <CampoFormulario id="fecha-situacion-ejemplar" etiqueta="Fecha del cambio" type="date"
              min={ejemplar.fecha_situacion ?? undefined} max={hoyLima()} value={fecha}
              onChange={(evento) => setFecha(evento.target.value)} required />
            <CampoFormulario id="motivo-situacion-ejemplar" etiqueta="Motivo" value={motivo}
              maxLength={500} onChange={(evento) => setMotivo(evento.target.value)} required />
          </div>
          {situacion === 'trasladado' && (
            <>
              <div className={estilos.alta}>
                <CampoFormulario id="ubicacion-traslado" etiqueta="Nueva ubicación" value={ubicacion}
                  ayuda="Escribe una referencia o marca un punto en el mapa."
                  maxLength={200} onChange={(evento) => setUbicacion(evento.target.value)} />
                <Selector id="area-traslado" etiqueta="Área verde de destino" valor={area}
                  onCambiar={setArea} opciones={areas} opcionTodos="Sin área vinculada" />
                <Boton variante="secundario" aria-expanded={mapaAbierto} onClick={() => setMapaAbierto(!mapaAbierto)}>
                  {mapaAbierto ? 'Ocultar mapa' : 'Elegir destino en el mapa'}
                </Boton>
              </div>
              {mapaAbierto && (
                <SelectorPuntoMapa areaId={area ? Number(area) : null}
                  latitud={punto?.latitud ?? ''} longitud={punto?.longitud ?? ''}
                  onElegir={(latitud, longitud) => setPunto({ latitud: latitud.toFixed(7), longitud: longitud.toFixed(7) })} />
              )}
              {punto && <p>Punto de destino · {punto.latitud}, {punto.longitud}{' '}
                <Boton variante="fantasma" onClick={() => setPunto(null)}>Quitar punto</Boton>
              </p>}
            </>
          )}
          <div className={estilos.accionesFila}>
            <Boton type="submit" variante="primario" deshabilitado={guardando || !motivo.trim()}>Guardar situación</Boton>
            <Boton variante="secundario" deshabilitado={guardando}
              onClick={() => { setEditando(false); setError(null) }}>Cancelar</Boton>
          </div>
        </form>
      )}
      <h4>Historial de situación</h4>
      {historial.estado === 'error' ? (
        <EstadoError titulo="No pudimos cargar el historial de situación" descripcion={historial.error?.detalle ?? ''}
          onReintentar={historial.reintentar} nivel={3} />
      ) : !historial.datos ? <EstadoCarga forma="tabla" texto="Cargando cambios de situación…" /> :
        historial.datos.length === 0 ? <p>Sin cambios registrados.</p> : (
          <ul className={estilos.lista}>
            {historial.datos.map((cambio) => (
              <li key={cambio.id} className={estilos.fila}>
                <div>
                  <strong>{ETIQUETAS[cambio.situacion_anterior]} → {ETIQUETAS[cambio.situacion_nueva]}</strong>
                  <p>{formatearFecha(cambio.fecha)} · {cambio.autor} · {cambio.motivo}</p>
                  {cambio.situacion_nueva === 'trasladado' && (
                    <p>De {describirUbicacion(cambio.ubicacion_anterior, cambio.latitud_anterior, cambio.longitud_anterior)}
                      {' a '}{describirUbicacion(cambio.ubicacion_nueva, cambio.latitud_nueva, cambio.longitud_nueva)}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
    </section>
  )
}

function describirUbicacion(referencia: string | null, latitud: number | null, longitud: number | null) {
  const coordenadas = latitud !== null && longitud !== null ? `${latitud}, ${longitud}` : null
  return [referencia, coordenadas].filter(Boolean).join(' · ') || 'ubicación sin registrar'
}
