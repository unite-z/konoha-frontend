/**
 * Almacén del dispositivo para el modo sin conexión (RF-T-012, AV-226; `docs/estandares/pwa-offline.md`).
 *
 * Una base IndexedDB con tres almacenes:
 * - `pendientes`: la cola de operaciones por enviar (con sus fotos como `Blob`).
 * - `datos`: la última lectura correcta de lo que el capataz consulta sin red (ruta de hoy, encargos, catálogos).
 * - `sesion`: la instantánea de la sesión (usuario, rol y permisos). Nunca credenciales: la sesión es una cookie
 *   `HttpOnly` que el navegador guarda por su cuenta.
 *
 * Sin IndexedDB (modo privado de algunos navegadores) todo falla con un error: quien llama decide seguir sin él.
 */

const NOMBRE_BASE = 'areas-verdes-sin-conexion'
const VERSION_BASE = 1

export type NombreAlmacen = 'pendientes' | 'datos' | 'sesion'

const CLAVES: Record<NombreAlmacen, string> = { pendientes: 'id', datos: 'clave', sesion: 'clave' }

let base: Promise<IDBDatabase> | null = null

function abrir(): Promise<IDBDatabase> {
  if (base) return base
  base = new Promise<IDBDatabase>((resolver, rechazar) => {
    if (typeof indexedDB === 'undefined') {
      rechazar(new Error('Este navegador no permite guardar datos sin conexión'))
      return
    }
    const peticion = indexedDB.open(NOMBRE_BASE, VERSION_BASE)
    peticion.onupgradeneeded = () => {
      const bd = peticion.result
      for (const [nombre, clave] of Object.entries(CLAVES)) {
        if (!bd.objectStoreNames.contains(nombre)) bd.createObjectStore(nombre, { keyPath: clave })
      }
    }
    peticion.onsuccess = () => {
      const bd = peticion.result
      // Otra pestaña con una versión nueva de la base: se cierra esta para no bloquearla.
      bd.onversionchange = () => {
        bd.close()
        base = null
      }
      resolver(bd)
    }
    peticion.onerror = () => rechazar(peticion.error ?? new Error('No se pudo abrir el almacén del dispositivo'))
  })
  base.catch(() => {
    base = null
  })
  return base
}

function comoPromesa<T>(peticion: IDBRequest<T>): Promise<T> {
  return new Promise((resolver, rechazar) => {
    peticion.onsuccess = () => resolver(peticion.result)
    peticion.onerror = () => rechazar(peticion.error ?? new Error('Error del almacén del dispositivo'))
  })
}

async function operar<T>(almacen: NombreAlmacen, modo: IDBTransactionMode, accion: (tienda: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const bd = await abrir()
  const transaccion = bd.transaction(almacen, modo)
  const resultado = await comoPromesa(accion(transaccion.objectStore(almacen)))
  await new Promise<void>((resolver, rechazar) => {
    transaccion.oncomplete = () => resolver()
    transaccion.onabort = () => rechazar(transaccion.error ?? new Error('Se canceló la escritura en el dispositivo'))
    transaccion.onerror = () => rechazar(transaccion.error ?? new Error('Error del almacén del dispositivo'))
  })
  return resultado
}

export function leerTodos<T>(almacen: NombreAlmacen): Promise<T[]> {
  return operar(almacen, 'readonly', (tienda) => tienda.getAll() as IDBRequest<T[]>)
}

export async function leer<T>(almacen: NombreAlmacen, clave: string): Promise<T | undefined> {
  return (await operar(almacen, 'readonly', (tienda) => tienda.get(clave) as IDBRequest<T | undefined>)) ?? undefined
}

export async function guardar<T>(almacen: NombreAlmacen, valor: T): Promise<void> {
  await operar(almacen, 'readwrite', (tienda) => tienda.put(valor))
}

export async function borrar(almacen: NombreAlmacen, clave: string): Promise<void> {
  await operar(almacen, 'readwrite', (tienda) => tienda.delete(clave))
}

export async function vaciar(almacen: NombreAlmacen): Promise<void> {
  await operar(almacen, 'readwrite', (tienda) => tienda.clear())
}

/** Solo para las pruebas: cierra la conexión para simular que se cierra y se reabre la aplicación. */
export async function cerrarParaPruebas(): Promise<void> {
  if (!base) return
  const bd = await base.catch(() => null)
  bd?.close()
  base = null
}
