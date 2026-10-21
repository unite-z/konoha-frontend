/**
 * ZonaCarga: zona para soltar archivos con alternativa de botón, accesible por teclado (Guía Web 5.11).
 *
 * Solo entrega los archivos elegidos (`onArchivos`); la lista, sus estados y el envío los maneja quien la usa.
 * TODO: progreso por porcentaje (requiere `XMLHttpRequest`); hoy la subida muestra un indicador sin porcentaje.
 */
import { useId, useRef, useState, type DragEvent } from 'react'
import Boton from './Boton'
import Icono from './Icono'
import estilos from './ZonaCarga.module.css'

export interface ZonaCargaProps {
  /** Valor de `accept` del selector (extensiones admitidas). */
  acepta: string
  /** Texto de ayuda (tipos y tamaño admitidos). */
  ayuda: string
  deshabilitada?: boolean
  error?: string
  /** Id para enfocar la zona desde un resumen de errores. */
  id?: string
  onArchivos: (archivos: File[]) => void
}

export default function ZonaCarga({ acepta, ayuda, deshabilitada = false, error, id, onArchivos }: ZonaCargaProps) {
  const entrada = useRef<HTMLInputElement>(null)
  const idAyuda = useId()
  const [encima, setEncima] = useState(false)

  function soltar(evento: DragEvent<HTMLDivElement>) {
    evento.preventDefault()
    setEncima(false)
    if (deshabilitada) return
    const archivos = Array.from(evento.dataTransfer.files)
    if (archivos.length > 0) onArchivos(archivos)
  }

  return (
    <div
      className={[estilos.zona, encima && estilos.encima, error && estilos.conError, deshabilitada && estilos.deshabilitada]
        .filter(Boolean)
        .join(' ')}
      onDragOver={(e) => {
        e.preventDefault()
        if (!deshabilitada) setEncima(true)
      }}
      onDragLeave={() => setEncima(false)}
      onDrop={soltar}
    >
      <Icono nombre="documento" />
      <p className={estilos.texto}>Arrastra los archivos aquí o selecciónalos</p>
      <p id={idAyuda} className={estilos.ayuda}>
        {ayuda}
      </p>
      <Boton
        id={id}
        variante="secundario"
        deshabilitado={deshabilitada}
        aria-describedby={idAyuda}
        onClick={() => entrada.current?.click()}
      >
        Seleccionar archivos
      </Boton>
      <input
        ref={entrada}
        type="file"
        multiple
        accept={acepta}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const archivos = Array.from(e.target.files ?? [])
          // Permite volver a elegir el mismo archivo después de quitarlo.
          e.target.value = ''
          if (archivos.length > 0) onArchivos(archivos)
        }}
      />
      {error && (
        <p className={estilos.error} role="alert">
          <Icono nombre="aspa" tamano="sm" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
