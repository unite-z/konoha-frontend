/**
 * ZonaCarga: zona para soltar archivos con alternativa de botón, accesible por teclado (Guía Web 5.11).
 *
 * Solo entrega los archivos elegidos (`onArchivos`); la lista, sus estados y el envío los maneja quien la usa.
 * `compacta`: una fila punteada con un solo botón («Adjuntar foto» de «Registrar incidencia», Figma 394-8504); la
 * ayuda, si la hay, va al lado (por ejemplo, el nombre del archivo elegido).
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
  /** Fila punteada con un solo botón, para adjuntar algo opcional en un formulario. */
  compacta?: boolean
  /** Texto del botón (por defecto, «Seleccionar archivos»). */
  textoBoton?: string
  /** Permite elegir varios archivos (por defecto, sí). */
  multiple?: boolean
  /** Hueco punteado del tamaño de una miniatura, con icono de cámara y el texto («Otra», Figma 391-8394). */
  miniatura?: boolean
}

export default function ZonaCarga({ acepta, ayuda, deshabilitada = false, error, id, onArchivos, compacta = false, textoBoton = 'Seleccionar archivos', multiple = true, miniatura = false }: ZonaCargaProps) {
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
      className={[estilos.zona, compacta && estilos.compacta, miniatura && estilos.miniatura, encima && estilos.encima, error && estilos.conError, deshabilitada && estilos.deshabilitada]
        .filter(Boolean)
        .join(' ')}
      onDragOver={(e) => {
        e.preventDefault()
        if (!deshabilitada) setEncima(true)
      }}
      onDragLeave={() => setEncima(false)}
      onDrop={soltar}
    >
      {!compacta && !miniatura && <Icono nombre="documento" />}
      {!compacta && !miniatura && <p className={estilos.texto}>Arrastra los archivos aquí o selecciónalos</p>}
      {!compacta && !miniatura && (
        <p id={idAyuda} className={estilos.ayuda}>
          {ayuda}
        </p>
      )}
      {miniatura ? (
        <Boton id={id} variante="fantasma" className={estilos.botonMiniatura} deshabilitado={deshabilitada} onClick={() => entrada.current?.click()}>
          <Icono nombre="camera" tamano="md" />
          <span>{textoBoton}</span>
        </Boton>
      ) : (
      <Boton
        id={id}
        variante={compacta ? 'fantasma' : 'secundario'}
        compacto={compacta}
        icono={compacta ? 'paperclip' : undefined}
        deshabilitado={deshabilitada}
        aria-describedby={ayuda ? idAyuda : undefined}
        onClick={() => entrada.current?.click()}
      >
        {textoBoton}
      </Boton>
      )}
      {compacta && ayuda && (
        <p id={idAyuda} className={estilos.ayuda}>
          {ayuda}
        </p>
      )}
      <input
        ref={entrada}
        type="file"
        multiple={multiple}
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
      {/* En la miniatura no cabe: solo marca el borde y la pantalla pinta el mensaje debajo. */}
      {error && !miniatura && (
        <p className={estilos.error} role="alert">
          <Icono nombre="aspa" tamano="sm" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
