// RF-SER-006 · Adjuntar el reporte y la documentación del proveedor
/**
 * Cada envío crea una revisión completa nueva; las anteriores se conservan. Exige al menos un «Informe final»
 * y la recepción no puede ser anterior al fin del servicio. La evidencia por espacio indica su alcance.
 *
 * - Un solo envío multipart con `fetch`. Mientras sube se muestra un indicador sin porcentaje y se puede
 *   cancelar (TODO: progreso por porcentaje con `XMLHttpRequest`).
 * - Los archivos quedan en el formulario ante cualquier error, para reintentar sin volver a elegirlos.
 * - El envío no es idempotente (un reintento crea otra revisión). Si se pierde la conexión o se cancela, se
 *   cuentan las revisiones antes y después: si aumentó, la revisión se registró; si no se puede saber, se
 *   pide revisar los documentos antes de reintentar.
 * - El tamaño máximo lo define el servidor (configurable); su mensaje se muestra tal cual.
 */
import { useRef, useState } from 'react'
import AvisoEnLinea from '../../../components/ui/AvisoEnLinea'
import Boton from '../../../components/ui/Boton'
import CampoFormulario, { AreaTexto } from '../../../components/ui/CampoFormulario'
import DialogoFormulario from '../../../components/ui/DialogoFormulario'
import Icono from '../../../components/ui/Icono'
import Selector from '../../../components/ui/Selector'
import ZonaCarga from '../../../components/ui/ZonaCarga'
import { aErrorApi, esCancelacion } from '../../../services/api/cliente'
import { adjuntarReporte, listarReportes, obtenerAtencion } from '../../../services/api/tercerizados'
import type { Atencion, CategoriaDocumento, ReporteProveedor } from '../../../types/tercerizados'
import { OPCIONES_CATEGORIA, textoAlcance } from '../../../utils/estadosTercerizados'
import { formatearFecha, formatearNumero, formatearTamanoArchivo } from '../../../utils/formato'
import { fechaLimaDeInstante, hoyLima } from '../../../utils/instanteLima'
import {
  ACEPTA_DOCUMENTOS,
  LARGO_MAXIMO_DESCRIPCION_DOCUMENTO,
  categoriaSugerida,
  hayErroresReporte,
  validarReporte,
  type DocumentoBorrador,
  type ErroresReporte,
} from '../../../utils/validacionTercerizados'
import estilos from './Acciones.module.css'

const ID_FECHA = 'reporte-fecha'
const ID_ZONA = 'reporte-archivos'

interface Documento extends DocumentoBorrador {
  archivo: File
}

export interface DialogoReporteProps {
  atencion: Atencion
  abierto: boolean
  onCerrar: () => void
  onActualizada: (atencion: Atencion) => void
  onReporteAdjunto: (reporte: ReporteProveedor | null) => void
  onExito: (mensaje: string) => void
}

let contador = 0
function nuevaClave(): string {
  contador += 1
  return `doc-${contador}`
}

/** Mismo archivo elegido dos veces (nombre, tamaño y fecha de modificación). */
function mismoArchivo(a: File, b: File): boolean {
  return a.name === b.name && a.size === b.size && a.lastModified === b.lastModified
}

async function contarRevisiones(id: number): Promise<number | null> {
  try {
    return (await listarReportes(id)).count
  } catch {
    return null
  }
}

const ERRORES_VACIOS: ErroresReporte = { porDocumento: {} }

function Formulario({ atencion, onCerrar, onActualizada, onReporteAdjunto, onExito }: Omit<DialogoReporteProps, 'abierto'>) {
  const finLima = atencion.fecha_hora_fin ? fechaLimaDeInstante(atencion.fecha_hora_fin) : null
  const nuevaRevision = atencion.estado === 'Reporte adjunto'
  const [fecha, setFecha] = useState(() => hoyLima())
  const [resumen, setResumen] = useState('')
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [intentado, setIntentado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<{ titulo: string; detalle: string } | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const enCurso = useRef(false)
  const controlador = useRef<AbortController | null>(null)

  const errores = intentado ? validarReporte({ fecha, documentos }, finLima) : ERRORES_VACIOS
  const totalBytes = documentos.reduce((suma, d) => suma + d.archivo.size, 0)
  const hayCambios = documentos.length > 0 || resumen.trim() !== ''
  const opcionesAlcance = atencion.alcances.map((a) => ({ valor: String(a.id), texto: textoAlcance(a) }))

  function agregar(archivos: File[]) {
    setError(null)
    const nuevos = archivos.filter((f) => !documentos.some((d) => mismoArchivo(d.archivo, f)))
    const repetidos = archivos.length - nuevos.length
    setAviso(repetidos > 0 ? `${repetidos === 1 ? 'Un archivo ya estaba' : `${repetidos} archivos ya estaban`} en la lista; no se agregó de nuevo.` : null)
    setDocumentos((actuales) => [
      ...actuales,
      ...nuevos.map((archivo) => ({
        clave: nuevaClave(),
        archivo,
        categoria: categoriaSugerida(archivo.name),
        alcance_id: '',
        descripcion: '',
      })),
    ])
  }

  function actualizar(clave: string, cambios: Partial<Documento>) {
    setDocumentos((actuales) => actuales.map((d) => (d.clave === clave ? { ...d, ...cambios } : d)))
  }

  /** Recarga la atención (estado) y avisa a la sección de documentos. */
  async function refrescar(reporte: ReporteProveedor | null) {
    onReporteAdjunto(reporte)
    try {
      onActualizada(await obtenerAtencion(atencion.id))
    } catch {
      /* la ficha conserva su copia; la sección de documentos ya se recarga */
    }
  }

  async function enviar() {
    if (enCurso.current) return
    setIntentado(true)
    const nuevos = validarReporte({ fecha, documentos }, finLima)
    if (hayErroresReporte(nuevos)) {
      const primera = Object.keys(nuevos.porDocumento)[0]
      const campo = primera ? nuevos.porDocumento[primera] : null
      const destino = nuevos.fecha
        ? ID_FECHA
        : nuevos.general
          ? ID_ZONA
          : `${primera}-${campo?.categoria ? 'categoria' : campo?.alcance ? 'alcance' : campo?.descripcion ? 'descripcion' : 'quitar'}`
      document.getElementById(destino)?.focus()
      return
    }
    enCurso.current = true
    setEnviando(true)
    setError(null)
    // El controlador existe desde el inicio: «Cancelar envío» funciona también mientras se cuentan revisiones.
    const control = new AbortController()
    controlador.current = control
    const antes = await contarRevisiones(atencion.id)
    if (control.signal.aborted) {
      setError({ titulo: 'Envío cancelado', detalle: 'No se envió ningún archivo. Tus archivos siguen aquí.' })
      controlador.current = null
      enCurso.current = false
      setEnviando(false)
      return
    }
    try {
      const reporte = await adjuntarReporte(
        atencion.id,
        {
          fecha_recepcion: fecha,
          resumen,
          documentos: documentos.map((d) => ({
            categoria: d.categoria as CategoriaDocumento,
            alcance_id: d.alcance_id ? Number(d.alcance_id) : undefined,
            descripcion: d.descripcion,
            archivo: d.archivo,
          })),
        },
        control.signal,
      )
      await refrescar(reporte)
      onExito(`Revisión ${reporte.revision} del reporte adjuntada`)
    } catch (causa) {
      const cancelada = esCancelacion(causa)
      const fallo = cancelada ? null : aErrorApi(causa)
      if (cancelada || fallo?.estado === 0) {
        const despues = await contarRevisiones(atencion.id)
        if (antes !== null && despues !== null && despues > antes) {
          await refrescar(null)
          onExito(cancelada ? 'La revisión ya se había registrado antes de cancelar' : 'Revisión del reporte adjuntada')
          return
        }
        setError(
          antes !== null && despues !== null
            ? {
                titulo: cancelada ? 'Subida cancelada' : 'Se perdió la conexión',
                detalle: 'La revisión no se registró. Tus archivos siguen aquí para reintentar.',
              }
            : {
                titulo: 'No pudimos confirmar la subida',
                detalle:
                  'No sabemos si la revisión se registró. Revisa los documentos de la atención antes de reintentar para no duplicarla.',
              },
        )
      } else if (fallo?.estado === 409) {
        await refrescar(null)
        setError({ titulo: 'La atención cambió', detalle: `${fallo.detalle}. La ficha ya muestra su estado actual.` })
      } else if (fallo?.estado === 403) {
        setError({ titulo: 'Sin permiso', detalle: 'Tu usuario no puede adjuntar reportes. Si cambiaron tus roles, vuelve a ingresar.' })
      } else if (fallo && Object.keys(fallo.errores_campo).length > 0) {
        setError({ titulo: 'Revisa los datos', detalle: 'El servidor rechazó algunos datos del reporte. Revisa la fecha y los documentos.' })
      } else {
        setError({
          titulo: fallo?.estado === 503 ? 'No se pudieron guardar los archivos' : 'No se pudo adjuntar el reporte',
          detalle: `${fallo?.detalle ?? ''}. Tus archivos siguen aquí para reintentar.`,
        })
      }
    } finally {
      controlador.current = null
      enCurso.current = false
      setEnviando(false)
    }
  }

  return (
    <DialogoFormulario
      abierto
      ancho="amplio"
      titulo={nuevaRevision ? 'Adjuntar nueva revisión del reporte' : 'Adjuntar reporte del proveedor'}
      descripcion={
        nuevaRevision
          ? 'Se registra una revisión completa nueva; las anteriores se conservan. Incluye otra vez todos los documentos vigentes.'
          : 'Adjunta el informe final y la documentación que entregó el proveedor.'
      }
      textoConfirmar={nuevaRevision ? 'Adjuntar nueva revisión' : 'Adjuntar reporte'}
      enviando={enviando}
      hayCambios={hayCambios}
      error={error}
      onEnviar={enviar}
      onCerrar={onCerrar}
      onCancelarEnvio={() => controlador.current?.abort()}
    >
      <div className={estilos.filaCampos}>
        <CampoFormulario
          id={ID_FECHA}
          etiqueta="Fecha de recepción del informe"
          type="date"
          obligatorio
          min={finLima ?? undefined}
          ayuda={finLima ? `No anterior al fin del servicio (${formatearFecha(finLima)})` : undefined}
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          error={errores.fecha}
          disabled={enviando}
        />
      </div>
      <AreaTexto
        id="reporte-resumen"
        etiqueta="Resumen (opcional)"
        value={resumen}
        onChange={(e) => setResumen(e.target.value)}
        disabled={enviando}
      />

      <ZonaCarga
        id={ID_ZONA}
        acepta={ACEPTA_DOCUMENTOS}
        ayuda="PDF, JPEG, PNG, DOCX o XLSX. El tamaño máximo por archivo lo fija el servidor (20 MB por defecto)."
        deshabilitada={enviando}
        error={errores.general}
        onArchivos={agregar}
      />
      {aviso && <AvisoEnLinea tono="info">{aviso}</AvisoEnLinea>}

      {documentos.length > 0 && (
        <section aria-labelledby="titulo-documentos-reporte" className={estilos.documentos}>
          <h3 id="titulo-documentos-reporte" className={estilos.tituloDocumentos}>
            Documentos ({formatearNumero(documentos.length)} · {formatearTamanoArchivo(totalBytes)})
          </h3>
          <ul className={estilos.listaDocumentos}>
            {documentos.map((d) => {
              const e = errores.porDocumento[d.clave] ?? {}
              return (
                <li key={d.clave} className={estilos.documento}>
                  <div className={estilos.cabeceraDocumento}>
                    <span className={estilos.archivo}>
                      <Icono nombre="documento" />
                      <span>
                        <strong>{d.archivo.name}</strong>
                        <span className={estilos.ayuda}> · {formatearTamanoArchivo(d.archivo.size)}</span>
                      </span>
                    </span>
                    <Boton
                      id={`${d.clave}-quitar`}
                      variante="terciario"
                      compacto
                      deshabilitado={enviando}
                      aria-label={`Quitar ${d.archivo.name}`}
                      onClick={() => setDocumentos((actuales) => actuales.filter((x) => x.clave !== d.clave))}
                    >
                      Quitar
                    </Boton>
                  </div>
                  {e.archivo && (
                    <p className={estilos.error} role="alert">
                      <Icono nombre="aspa" tamano="sm" />
                      <span>{e.archivo}</span>
                    </p>
                  )}
                  <div className={estilos.camposDocumento}>
                    <Selector
                      id={`${d.clave}-categoria`}
                      etiqueta="Categoría"
                      obligatorio
                      valor={d.categoria}
                      opciones={OPCIONES_CATEGORIA}
                      opcionTodos="Elige una categoría"
                      onCambiar={(valor) => actualizar(d.clave, { categoria: valor })}
                      error={e.categoria}
                      disabled={enviando}
                    />
                    <Selector
                      id={`${d.clave}-alcance`}
                      etiqueta="Espacio o ejemplar"
                      obligatorio={d.categoria === 'EvidenciaEspacio'}
                      valor={d.alcance_id}
                      opciones={opcionesAlcance}
                      opcionTodos={d.categoria === 'EvidenciaEspacio' ? 'Elige el espacio o ejemplar' : 'No aplica'}
                      onCambiar={(valor) => actualizar(d.clave, { alcance_id: valor })}
                      error={e.alcance}
                      disabled={enviando}
                    />
                    <CampoFormulario
                      id={`${d.clave}-descripcion`}
                      etiqueta="Descripción (opcional)"
                      maxLength={LARGO_MAXIMO_DESCRIPCION_DOCUMENTO}
                      value={d.descripcion}
                      onChange={(ev) => actualizar(d.clave, { descripcion: ev.target.value })}
                      error={e.descripcion}
                      disabled={enviando}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {enviando && (
        <AvisoEnLinea tono="info" titulo="Subiendo documentos…">
          No cierres esta pestaña. Puedes cancelar el envío si tarda demasiado.
        </AvisoEnLinea>
      )}
    </DialogoFormulario>
  )
}

/** El formulario se monta al abrir: cada apertura empieza vacía. */
export default function DialogoReporte({ abierto, ...props }: DialogoReporteProps) {
  return abierto ? <Formulario {...props} /> : null
}
