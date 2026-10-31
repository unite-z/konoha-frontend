// RF-T-007 · Adjuntos y consulta de evidencias (HU-MOD01-009)
/**
 * Fotografías y documentos de un registro (actividad, atención, incidencia o ejemplar).
 *
 * - Cada subida lleva un UUID propio como `Idempotency-Key`. Si falla, «Reintentar» reutiliza el mismo:
 *   aunque el servidor llegara a guardarlo, no se duplica.
 * - La descarga pasa por la API, que comprueba el permiso: un rol no autorizado no accede al archivo.
 * - Sin permiso para adjuntar, la zona de carga no se muestra; el servidor lo rechazaría igual.
 */
import { useState } from 'react'
import Boton from '../ui/Boton'
import AvisoEnLinea from '../ui/AvisoEnLinea'
import TablaDatos, { type ColumnaTabla } from '../ui/TablaDatos'
import ZonaCarga from '../ui/ZonaCarga'
import { useConsulta } from '../../hooks/useConsulta'
import { aErrorApi } from '../../services/api/cliente'
import { descargarAdjunto, listarAdjuntos, subirAdjunto } from '../../services/api/core'
import type { Adjunto, EntidadRegistro } from '../../types/core'
import { formatearFechaHora, formatearTamanoArchivo } from '../../utils/formato'

const TIPOS = '.pdf,.jpg,.jpeg,.png,.docx,.xlsx'

interface Pendiente {
  archivo: File
  clave: string
  error: string | null
}

export interface AdjuntosProps {
  entidad: EntidadRegistro
  registroId: number
  /** La interfaz oculta la carga si el rol no puede adjuntar; el servidor decide. */
  puedeAdjuntar: boolean
}

export default function Adjuntos({ entidad, registroId, puedeAdjuntar }: AdjuntosProps) {
  const [version, setVersion] = useState(0)
  const [pendiente, setPendiente] = useState<Pendiente | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null)
  const consulta = useConsulta(
    `${entidad}-${registroId}-${version}`,
    (signal) => listarAdjuntos(entidad, registroId, signal),
    (datos) => datos.length === 0,
  )

  async function subir(objetivo: Pendiente) {
    setSubiendo(true)
    setPendiente({ ...objetivo, error: null })
    try {
      await subirAdjunto(entidad, registroId, objetivo.archivo, objetivo.clave)
      setPendiente(null)
      setVersion((v) => v + 1)
    } catch (causa) {
      setPendiente({ ...objetivo, error: aErrorApi(causa).detalle })
    } finally {
      setSubiendo(false)
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

  const columnas: ColumnaTabla<Adjunto>[] = [
    { clave: 'nombre', titulo: 'Archivo', multilinea: true, render: (a) => a.nombre },
    { clave: 'tamano', titulo: 'Tamaño', alineacion: 'derecha', render: (a) => formatearTamanoArchivo(a.tamano_bytes) },
    { clave: 'usuario', titulo: 'Subido por', render: (a) => `${a.usuario} · ${formatearFechaHora(a.fecha_creacion)}` },
    {
      clave: 'accion',
      titulo: 'Acción',
      render: (a) => (
        <Boton variante="terciario" compacto onClick={() => void descargar(a)} aria-label={`Descargar ${a.nombre}`}>
          Descargar
        </Boton>
      ),
    },
  ]
  const sinPermiso = consulta.error?.estado === 403

  return (
    <>
      {errorDescarga && <AvisoEnLinea tono="error" titulo="No se pudo descargar">{errorDescarga}</AvisoEnLinea>}
      <TablaDatos
        titulo="Evidencias"
        tituloVisible
        columnas={columnas}
        filas={consulta.datos ?? []}
        claveFila={(a) => String(a.id)}
        estado={consulta.estado === 'inactivo' || consulta.estado === 'cargando' ? 'cargando' : consulta.estado}
        vacio={{ titulo: 'Sin fotografías ni documentos', nivel: 3 }}
        error={{
          titulo: sinPermiso ? 'No tiene permiso para ver las evidencias' : 'No pudimos cargar las evidencias',
          descripcion: sinPermiso ? 'Tu rol no incluye la consulta de este registro.' : (consulta.error?.detalle ?? ''),
          onReintentar: consulta.reintentar,
          nivel: 3,
        }}
        compacta
      />
      {puedeAdjuntar && !sinPermiso && (
        <>
          <ZonaCarga
            acepta={TIPOS}
            ayuda="PDF, JPEG, PNG, DOCX o XLSX, de hasta 20 MB."
            deshabilitada={subiendo}
            onArchivos={(archivos) => {
              const archivo = archivos[0]
              if (archivo) void subir({ archivo, clave: crypto.randomUUID(), error: null })
            }}
          />
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
    </>
  )
}
