/**
 * Quién envía cada tipo de operación de la cola (RF-T-012, AV-226).
 *
 * Es cableado de la aplicación: cada ejecutor llama al servicio del módulo dueño (`services/api/<modulo>.ts`) con el
 * UUID de la operación como `Idempotency-Key`. Se registra una vez al arrancar (`ProveedorSincronizacion`), así la cola
 * se vacía aunque la pantalla que la llenó no esté abierta.
 */
import { subirAdjunto } from '@/services/api/core'
import type { EntidadRegistro } from '@/types/core'
import { registrarEjecutor, type Pendiente } from './cola'

/** El `Blob` guardado en IndexedDB, como fichero para el formulario multipart. */
export function comoFichero(p: Pendiente): File {
  if (!p.archivo) throw new Error('Falta el archivo de la operación')
  if (p.archivo instanceof File) return p.archivo
  return new File([p.archivo], p.nombre_archivo || 'archivo', { type: p.archivo.type })
}

let registrados = false

export function registrarEjecutores(): void {
  if (registrados) return
  registrados = true

  // Evidencia de un registro (MOD-01, RF-T-007). `registro_id` puede llegar de la operación de la que depende.
  registrarEjecutor('core.adjunto', (p) =>
    subirAdjunto(
      p.carga.entidad as EntidadRegistro,
      Number(p.carga.registro_id),
      comoFichero(p),
      p.id,
      (p.carga.descripcion as string | undefined) || undefined,
    ),
  )
}
