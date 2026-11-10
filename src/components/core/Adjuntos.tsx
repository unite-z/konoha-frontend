// RF-T-007 · Adjuntos y consulta de evidencias (HU-MOD01-009)
/**
 * Fotografías y documentos de un registro (actividad, atención, incidencia, ejemplar o intervención de poda).
 *
 * - Cada subida lleva un UUID propio como `Idempotency-Key`. Si falla, «Reintentar» reutiliza el mismo:
 *   aunque el servidor llegara a guardarlo, no se duplica.
 * - La descarga pasa por la API, que comprueba el permiso: un rol no autorizado no accede al archivo.
 * - Sin permiso para adjuntar, la zona de carga no se muestra; el servidor lo rechazaría igual.
 */
import { useEffect, useRef, useState } from 'react'
import Boton from '../ui/Boton'
import AvisoEnLinea from '../ui/AvisoEnLinea'
import DialogoDetalle from '../ui/DialogoDetalle'
import TablaDatos, { type ColumnaTabla } from '../ui/TablaDatos'
import ZonaCarga from '../ui/ZonaCarga'
import { useConsulta } from '@/hooks/useConsulta'
import { aErrorApi } from '@/services/api/cliente'
import { descargarAdjunto, listarAdjuntos, subirAdjunto } from '@/services/api/core'
import type { Adjunto, EntidadRegistro } from '@/types/core'
import { formatearFechaHora, formatearTamanoArchivo } from '@/utils/formato'
import estilos from './Adjuntos.module.css'

const TIPOS = '.pdf,.jpg,.jpeg,.png,.docx,.xlsx'

interface Pendiente {
  archivo: File
  clave: string
  error: string | null
  vistaPrevia: string
}

interface VistaPrevia {
  nombre: string
  url: string
  revocarAlCerrar: boolean
}

export interface AdjuntosProps {
  entidad: EntidadRegistro
  registroId: number
  /** La interfaz oculta la carga si el rol no puede adjuntar; el servidor decide. */
  puedeAdjuntar: boolean
  tiposAceptados?: string
  ayudaCarga?: string
  prepararArchivo?: (archivo: File) => Promise<File>
  /** Cuando la ficha ya tiene una vista previa de foto, evita repetir el estado vacío. */
  presentacion?: 'evidencias' | 'foto'
  /** Tras subir un archivo, por si la ficha depende de sus adjuntos (poda verificada, AV-309). */
  onCambio?: () => void
  /** Conserva la selección en el navegador hasta que la persona confirme la subida. */
  confirmarSeleccion?: boolean
}

export default function Adjuntos({
  entidad,
  registroId,
  puedeAdjuntar,
  tiposAceptados = TIPOS,
  ayudaCarga = 'PDF, JPEG, PNG, DOCX o XLSX, de hasta 20 MB.',
  prepararArchivo,
  presentacion = 'evidencias',
  onCambio,
  confirmarSeleccion = false,
}: AdjuntosProps) {
  const [version, setVersion] = useState(0)
  const [pendiente, setPendiente] = useState<Pendiente | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null)
  const [seleccionados, setSeleccionados] = useState<Pendiente[]>([])
  const [errorSeleccion, setErrorSeleccion] = useState<string | null>(null)
  const [vistaPrevia, setVistaPrevia] = useState<VistaPrevia | null>(null)
  const urlsTemporales = useRef(new Set<string>())
  const consulta = useConsulta(
    `${entidad}-${registroId}-${version}`,
    (signal) => listarAdjuntos(entidad, registroId, signal),
    (datos) => datos.length === 0,
  )

  useEffect(() => () => {
    urlsTemporales.current.forEach((url) => URL.revokeObjectURL(url))
    urlsTemporales.current.clear()
  }, [])

  function crearVistaPrevia(archivo: File): string {
    const url = URL.createObjectURL(archivo)
    urlsTemporales.current.add(url)
    return url
  }

  function liberarVistaPrevia(url: string) {
    if (!url || !urlsTemporales.current.delete(url)) return
    URL.revokeObjectURL(url)
  }

  function cerrarVistaPrevia() {
    if (vistaPrevia?.revocarAlCerrar) liberarVistaPrevia(vistaPrevia.url)
    setVistaPrevia(null)
  }

  async function subir(objetivo: Pendiente) {
    setSubiendo(true)
    setPendiente({ ...objetivo, error: null })
    try {
      await subirAdjunto(entidad, registroId, prepararArchivo ? await prepararArchivo(objetivo.archivo) : objetivo.archivo, objetivo.clave)
      setPendiente(null)
      setVersion((v) => v + 1)
      onCambio?.()
    } catch (causa) {
      setPendiente({ ...objetivo, error: causa instanceof Error ? causa.message : aErrorApi(causa).detalle })
    } finally {
      setSubiendo(false)
    }
  }

  function seleccionar(archivos: File[]) {
    const admitidos = archivos.filter((archivo) => {
      if (archivo.size > 20 * 1024 * 1024) {
        setErrorSeleccion(`${archivo.name} supera el tamaño máximo de 20 MB.`)
        return false
      }
      const extension = `.${archivo.name.split('.').pop()?.toLowerCase() ?? ''}`
      if (!tiposAceptados.toLowerCase().split(',').includes(extension)) {
        setErrorSeleccion(`${archivo.name} no tiene un formato admitido.`)
        return false
      }
      return true
    })
    if (!admitidos.length) return
    setErrorSeleccion(null)
    const nuevos = admitidos.map((archivo) => ({
      archivo,
      clave: crypto.randomUUID(),
      error: null,
      vistaPrevia: confirmarSeleccion ? crearVistaPrevia(archivo) : '',
    }))
    if (confirmarSeleccion) setSeleccionados((actuales) => [...actuales, ...nuevos])
    else void subir(nuevos[0])
  }

  async function subirSeleccionados() {
    if (!seleccionados.length) return
    setSubiendo(true)
    const fallidos: Pendiente[] = []
    let subidos = 0
    for (const seleccionado of seleccionados) {
      try {
        const archivo = prepararArchivo ? await prepararArchivo(seleccionado.archivo) : seleccionado.archivo
        await subirAdjunto(entidad, registroId, archivo, seleccionado.clave)
        liberarVistaPrevia(seleccionado.vistaPrevia)
        subidos++
      } catch (causa) {
        fallidos.push({ ...seleccionado, error: causa instanceof Error ? causa.message : aErrorApi(causa).detalle })
      }
    }
    setSeleccionados(fallidos)
    setSubiendo(false)
    if (subidos > 0) {
      setVersion((v) => v + 1)
      onCambio?.()
    }
  }

  async function descargar(adjunto: Adjunto) {
    setErrorDescarga(null)
    try {
      const url = URL.createObjectURL(await descargarAdjunto(adjunto.id))
      const enlace = document.createElement('a')
      enlace.href = url
      enlace.download = adjunto.nombre
      enlace.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (causa) {
      setErrorDescarga(aErrorApi(causa).detalle)
    }
  }

  async function visualizar(adjunto: Adjunto) {
    setErrorDescarga(null)
    try {
      const url = URL.createObjectURL(await descargarAdjunto(adjunto.id))
      urlsTemporales.current.add(url)
      setVistaPrevia({ nombre: adjunto.nombre, url, revocarAlCerrar: true })
    } catch (causa) {
      setErrorDescarga(aErrorApi(causa).detalle)
    }
  }

  const columnas: ColumnaTabla<Adjunto>[] = [
    { clave: 'nombre', titulo: 'Archivo', multilinea: true, render: (a) => a.nombre },
    { clave: 'tamano', titulo: 'Tamaño', alineacion: 'derecha', render: (a) => formatearTamanoArchivo(a.tamano_bytes) },
    { clave: 'usuario', titulo: 'Subido por', render: (a) => `${a.usuario} · ${formatearFechaHora(a.fecha_creacion)}` },
    {
      clave: 'accion',
      titulo: 'Acción',
      render: (a) => (
        <div className={estilos.accionesArchivo}>
          {a.tipo_mime.startsWith('image/') && (
            <Boton variante="fantasma" compacto onClick={() => void visualizar(a)} aria-label={`Ver ${a.nombre}`}>
              Ver
            </Boton>
          )}
          <Boton variante="fantasma" compacto onClick={() => void descargar(a)} aria-label={`Descargar ${a.nombre}`}>
            Descargar
          </Boton>
        </div>
      ),
    },
  ]
  const sinPermiso = consulta.error?.estado === 403
  const modoFoto = presentacion === 'foto'
  const mostrarArchivos = !modoFoto || consulta.estado === 'error' || Boolean(consulta.datos?.length)

  return (
    <>
      {errorDescarga && <AvisoEnLinea tono="error" titulo="No se pudo descargar">{errorDescarga}</AvisoEnLinea>}
      {mostrarArchivos && (
        <TablaDatos
          titulo={modoFoto ? 'Archivos adjuntos' : 'Evidencias'}
          tituloVisible
          columnas={columnas}
          filas={consulta.datos ?? []}
          claveFila={(a) => String(a.id)}
          estado={consulta.estado === 'inactivo' || consulta.estado === 'cargando' ? 'cargando' : consulta.estado}
          vacio={{ titulo: 'Sin fotografías ni documentos', nivel: 3 }}
          error={{
            titulo: sinPermiso
              ? modoFoto ? 'Sin permiso para ver los archivos' : 'No tiene permiso para ver las evidencias'
              : modoFoto ? 'No pudimos cargar los archivos' : 'No pudimos cargar las evidencias',
            descripcion: sinPermiso ? 'Tu rol no incluye la consulta de este registro.' : (consulta.error?.detalle ?? ''),
            onReintentar: consulta.reintentar,
            nivel: 3,
          }}
          compacta
        />
      )}
      {puedeAdjuntar && !sinPermiso && (
        <>
          {errorSeleccion && <AvisoEnLinea tono="error">{errorSeleccion}</AvisoEnLinea>}
          {confirmarSeleccion && seleccionados.length > 0 && (
            <section className={estilos.pendientes} aria-labelledby="titulo-fotografias-pendientes">
              <h3 id="titulo-fotografias-pendientes">Fotografías pendientes de guardar</h3>
              <ul className={estilos.listaPendientes}>
                {seleccionados.map((pendienteSeleccionado) => (
                  <li key={pendienteSeleccionado.clave} className={estilos.pendiente}>
                    <Boton
                      variante="fantasma"
                      className={estilos.botonVistaPrevia}
                      onClick={() => setVistaPrevia({
                        nombre: pendienteSeleccionado.archivo.name,
                        url: pendienteSeleccionado.vistaPrevia,
                        revocarAlCerrar: false,
                      })}
                    >
                      <img
                        className={estilos.miniatura}
                        src={pendienteSeleccionado.vistaPrevia}
                        alt={`Vista previa de ${pendienteSeleccionado.archivo.name}`}
                        onError={() => setSeleccionados((actuales) => actuales.map((item) =>
                          item.clave === pendienteSeleccionado.clave
                            ? { ...item, error: item.error ?? 'No se pudo mostrar la vista previa de esta fotografía.' }
                            : item,
                        ))}
                      />
                    </Boton>
                    <div className={estilos.datosPendiente}>
                      <span className={estilos.nombreArchivo}>{pendienteSeleccionado.archivo.name}</span>
                      <span>{formatearTamanoArchivo(pendienteSeleccionado.archivo.size)}</span>
                      {pendienteSeleccionado.error && (
                        <span className={estilos.errorPendiente}>{pendienteSeleccionado.error}</span>
                      )}
                    </div>
                    <Boton
                      variante="fantasma"
                      compacto
                      deshabilitado={subiendo}
                      onClick={() => {
                        liberarVistaPrevia(pendienteSeleccionado.vistaPrevia)
                        setSeleccionados((actuales) =>
                          actuales.filter((item) => item.clave !== pendienteSeleccionado.clave),
                        )
                      }}
                    >
                      Quitar
                    </Boton>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <ZonaCarga
            acepta={tiposAceptados}
            ayuda={ayudaCarga}
            compacta={modoFoto}
            multiple={!modoFoto}
            textoBoton={modoFoto ? 'Añadir foto' : undefined}
            deshabilitada={subiendo}
            onArchivos={seleccionar}
          />
          {confirmarSeleccion && seleccionados.length > 0 && (
            <Boton cargando={subiendo} onClick={() => void subirSeleccionados()}>
              Guardar {seleccionados.length === 1 ? 'archivo' : 'archivos'}
            </Boton>
          )}
          {pendiente?.error && (
            <AvisoEnLinea
              tono="error"
              titulo={`No se pudo adjuntar ${pendiente.archivo.name}`}
              accion={{ texto: 'Reintentar', onClick: () => void subir(pendiente) }}
            >
              {pendiente.error}
            </AvisoEnLinea>
          )}
        </>
      )}
      {vistaPrevia && (
        <DialogoDetalle
          abierto
          titulo={vistaPrevia.nombre}
          onCerrar={cerrarVistaPrevia}
        >
          <img className={estilos.imagenAmpliada} src={vistaPrevia.url} alt={`Vista ampliada de ${vistaPrevia.nombre}`} />
        </DialogoDetalle>
      )}
    </>
  )
}
