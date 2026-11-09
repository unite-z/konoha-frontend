import { useState } from 'react'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton from '@/components/ui/Boton'
import CampoFormulario from '@/components/ui/CampoFormulario'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import { corregirUbicacionEjemplar } from '@/services/api/ejemplares'
import type { EjemplarInventario } from '@/types/ejemplares'
import SelectorPuntoMapa from './SelectorPuntoMapa'
import estilos from './Catalogos.module.css'

export default function EditarUbicacionEjemplar({ ejemplar, alGuardar }: {
  ejemplar: EjemplarInventario
  alGuardar: () => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [latitud, setLatitud] = useState('')
  const [longitud, setLongitud] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const puntoActual = ejemplar.latitud !== null && ejemplar.longitud !== null
    ? { latitud: ejemplar.latitud, longitud: ejemplar.longitud } : undefined
  const punto = { latitud: Number(latitud), longitud: Number(longitud) }
  const puntoValido = latitud.trim() !== '' && longitud.trim() !== ''
    && Math.abs(punto.latitud) <= 90 && Math.abs(punto.longitud) <= 180
  const puntoDistinto = puntoValido && (punto.latitud !== puntoActual?.latitud || punto.longitud !== puntoActual?.longitud)

  async function guardar() {
    if (!puntoDistinto || guardando) return
    setGuardando(true)
    setError(null)
    try {
      await corregirUbicacionEjemplar(ejemplar.id, punto)
      setAbierto(false)
      alGuardar()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo guardar la ubicación.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <div className={estilos.accionesFila}>
        <Boton variante="secundario" onClick={() => {
          setLatitud('')
          setLongitud('')
          setError(null)
          setAbierto(true)
        }}>Editar ubicación</Boton>
      </div>
      <DialogoFormulario abierto={abierto} titulo="Editar ubicación" descripcion={ejemplar.codigo} ancho="amplio"
        textoConfirmar="Guardar ubicación" conObligatorios={false} hayCambios={Boolean(latitud || longitud)}
        enviando={guardando} envioDeshabilitado={!puntoDistinto}
        error={error ? { titulo: 'No se pudo guardar', detalle: error } : null}
        onCerrar={() => setAbierto(false)} onEnviar={() => void guardar()}>
        {abierto && <div className={estilos.seccionFicha}>
          <AvisoEnLinea tono="info">
            Usa esta opción para corregir el punto registrado. Si el ejemplar fue movido físicamente,
            registra el cambio en Situación y traslados para conservar el historial.
          </AvisoEnLinea>
          <div className={estilos.accionesFila} aria-label="Leyenda de ubicación" role="group">
            <span className={estilos.puntoActual}>Punto actual · {puntoActual ? `${puntoActual.latitud}, ${puntoActual.longitud}` : 'Sin coordenadas'}</span>
            <span className={estilos.puntoNuevo}>Punto nuevo · {puntoValido ? `${latitud}, ${longitud}` : 'Pendiente de marcar'}</span>
          </div>
          <SelectorPuntoMapa areaId={ejemplar.area_verde_id} puntoActual={puntoActual} compacto
            latitud={puntoValido ? latitud : ''} longitud={puntoValido ? longitud : ''}
            onElegir={(nuevaLatitud, nuevaLongitud) => {
              setLatitud(nuevaLatitud.toFixed(7))
              setLongitud(nuevaLongitud.toFixed(7))
            }} />
          <details>
            <summary>Introducir coordenadas manualmente</summary>
            <div className={estilos.coordenadas}>
              <CampoFormulario id="editar-latitud-ejemplar" etiqueta="Latitud nueva" type="number"
                min="-90" max="90" step="any" value={latitud} onChange={(evento) => setLatitud(evento.target.value)} />
              <CampoFormulario id="editar-longitud-ejemplar" etiqueta="Longitud nueva" type="number"
                min="-180" max="180" step="any" value={longitud} onChange={(evento) => setLongitud(evento.target.value)} />
            </div>
          </details>
        </div>}
      </DialogoFormulario>
    </>
  )
}
