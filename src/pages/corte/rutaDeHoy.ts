/**
 * Lógica pura de «Ruta de hoy» del capataz (AV-271, Figma 353-2335 y 375-6817): jardines por cortar y marcados,
 * hora de la marca y textos. Se prueba en `rutaDeHoy.test.ts`.
 */
import type { JardinRuta } from '@/types/corte'
import { instanteALocalLima } from '@/utils/instanteLima'

/** Pendientes, en el orden de la ruta. */
export function porCortar(jardines: JardinRuta[]): JardinRuta[] {
  return jardines.filter((j) => j.estado === 'Pendiente')
}

/** Cortados, del más reciente al más antiguo. */
export function marcados(jardines: JardinRuta[]): JardinRuta[] {
  return jardines.filter((j) => j.estado === 'Cortado').sort((a, b) => Date.parse(b.marcado_en ?? '') - Date.parse(a.marcado_en ?? ''))
}

/** «10:18» en hora de Lima, o `null` sin marca. */
export function horaMarca(jardin: JardinRuta): string | null {
  if (!jardin.marcado_en) return null
  return (instanteALocalLima(jardin.marcado_en) ?? jardin.marcado_en).slice(11, 16)
}

/** «J-016 · Talud de Química». */
export function tituloJardin(jardin: JardinRuta): string {
  return `${jardin.codigo} · ${jardin.nombre}`
}

/** Detalle de una fila marcada: «10:18 · J. Ramos». */
export function detalleMarcado(jardin: JardinRuta): string {
  return [horaMarca(jardin), jardin.marcado_por].filter(Boolean).join(' · ')
}

/** Descripción de la hoja «ya está marcado»: «Por J. Ramos a las 10:18.» */
export function textoYaMarcado(jardin: JardinRuta): string {
  const hora = horaMarca(jardin)
  return `Por ${jardin.marcado_por ?? 'otra persona'}${hora ? ` a las ${hora}` : ''}.`
}

/** Una marca hecha sin conexión: la hora real del toque y su clave de idempotencia, para enviarla al volver. */
export interface MarcaPendiente {
  marcado_en: string
  clave: string
}

/** Detalle de una fila sin sincronizar: «11:05 · se enviará al tener conexión». */
export function detallePendiente(marca: MarcaPendiente): string {
  const hora = (instanteALocalLima(marca.marcado_en) ?? marca.marcado_en).slice(11, 16)
  return `${hora} · se enviará al tener conexión`
}

/** «Sin conexión · 2 marcas pendientes de enviar», o «Enviando 2 marcas» si ya hay conexión. */
export function textoSinConexion(pendientes: number, enLinea: boolean): string {
  const marcas = `${pendientes} ${pendientes === 1 ? 'marca pendiente' : 'marcas pendientes'} de enviar`
  if (enLinea) return `Enviando ${pendientes === 1 ? '1 marca' : `${pendientes} marcas`}`
  return pendientes > 0 ? `Sin conexión · ${marcas}` : 'Sin conexión · las marcas se enviarán al volver'
}

/** Aviso de un jardín que, al enviarlo, ya había marcado otro: «J-015 ya estaba marcado · J. Ramos, 10:18». */
export function textoYaEstabaMarcado(jardin: JardinRuta): string {
  const quien = [jardin.marcado_por, horaMarca(jardin)].filter(Boolean).join(', ')
  return quien ? `${jardin.codigo} ya estaba marcado · ${quien}` : `${jardin.codigo} ya estaba marcado`
}
