/**
 * Validación y armado de las entradas de proveedores, contratos y atención especial (RF-SER-001,
 * RF-SER-002 y RF-INV-011). Funciones puras: el servidor vuelve a validar todo y su respuesta manda.
 */
import type {
  AtencionEspecialEntrada,
  ContratoEntrada,
  ProveedorEntrada,
  ProveedorMaestro,
  TipoVinculo,
} from '../types/maestrosTercerizados'
import type { Ejemplar } from '../types/tercerizados'
import { esFechaIsoValida } from './formato'

// --- Proveedor ------------------------------------------------------------------------------------------

export const OPCIONES_VINCULO: { valor: TipoVinculo; texto: string }[] = [
  { valor: 'SinVinculo', texto: 'Sin vínculo' },
  { valor: 'Principal', texto: 'Empresa principal' },
  { valor: 'Subsidiaria', texto: 'Subsidiaria' },
  { valor: 'Vinculada', texto: 'Empresa vinculada' },
]

/** «Subsidiaria» y «Vinculada» indican con qué proveedor se vinculan. */
export function requiereRelacionado(tipo: TipoVinculo): boolean {
  return tipo === 'Subsidiaria' || tipo === 'Vinculada'
}

/** Texto del vínculo para la lista: «Subsidiaria de Servicios Verdes Demo», «Empresa principal»… */
export function textoVinculo(proveedor: Pick<ProveedorMaestro, 'tipo_vinculo' | 'proveedor_relacionado_nombre'>): string {
  const relacionado = proveedor.proveedor_relacionado_nombre
  switch (proveedor.tipo_vinculo) {
    case 'Principal':
      return 'Empresa principal'
    case 'Subsidiaria':
      return relacionado ? `Subsidiaria de ${relacionado}` : 'Subsidiaria'
    case 'Vinculada':
      return relacionado ? `Vinculada con ${relacionado}` : 'Empresa vinculada'
    default:
      return 'Sin vínculo'
  }
}

export interface BorradorProveedor {
  razonSocial: string
  ruc: string
  contacto: string
  tipoVinculo: TipoVinculo
  relacionado: ProveedorMaestro | null
}

export const BORRADOR_PROVEEDOR_VACIO: BorradorProveedor = {
  razonSocial: '',
  ruc: '',
  contacto: '',
  tipoVinculo: 'SinVinculo',
  relacionado: null,
}

export interface ErroresProveedor {
  razonSocial?: string
  ruc?: string
  relacionado?: string
}

export function validarProveedor(b: BorradorProveedor): ErroresProveedor {
  const errores: ErroresProveedor = {}
  const razon = b.razonSocial.trim()
  if (!razon) errores.razonSocial = 'Escribe la razón social del proveedor'
  else if (razon.length > 200) errores.razonSocial = 'Usa 200 caracteres como máximo'
  const ruc = b.ruc.trim()
  if (!ruc) errores.ruc = 'Escribe el RUC del proveedor'
  else if (!/^\d{11}$/.test(ruc)) errores.ruc = 'El RUC tiene 11 dígitos, sin espacios ni guiones'
  if (requiereRelacionado(b.tipoVinculo) && !b.relacionado) errores.relacionado = 'Selecciona el proveedor con el que se vincula'
  return errores
}

export function construirProveedor(b: BorradorProveedor): ProveedorEntrada {
  const entrada: ProveedorEntrada = { razon_social: b.razonSocial.trim(), ruc: b.ruc.trim(), tipo_vinculo: b.tipoVinculo }
  if (b.contacto.trim()) entrada.contacto = b.contacto.trim()
  if (requiereRelacionado(b.tipoVinculo) && b.relacionado) entrada.proveedor_relacionado_id = b.relacionado.id
  return entrada
}

// --- Contrato -------------------------------------------------------------------------------------------

/**
 * Monto en soles como el servidor lo espera (`12000.00`). Acepta espacios como separador de miles y coma
 * decimal (`12 000,00`). `null` si no es un monto válido (hasta 10 enteros y 2 decimales, no negativo).
 */
export function normalizarMonto(texto: string): string | null {
  const limpio = texto.replace(/[\s ]/g, '').replace(',', '.')
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(limpio)) return null
  const [enteros, decimales = ''] = limpio.split('.')
  return `${enteros}.${decimales.padEnd(2, '0')}`
}

export interface BorradorContrato {
  proveedor: ProveedorMaestro | null
  tipoServicioId: string
  area: string
  monto: string
  frecuencia: string
  inicio: string
  fin: string
  condiciones: string
}

export const BORRADOR_CONTRATO_VACIO: BorradorContrato = {
  proveedor: null,
  tipoServicioId: '',
  area: '',
  monto: '',
  frecuencia: '',
  inicio: '',
  fin: '',
  condiciones: '',
}

export interface ErroresContrato {
  proveedor?: string
  tipoServicio?: string
  area?: string
  monto?: string
  frecuencia?: string
  inicio?: string
  fin?: string
}

export function validarContrato(b: BorradorContrato): ErroresContrato {
  const errores: ErroresContrato = {}
  if (!b.proveedor) errores.proveedor = 'Selecciona el proveedor del contrato'
  if (!b.tipoServicioId) errores.tipoServicio = 'Selecciona el tipo de servicio'
  if (!b.area.trim()) errores.area = 'Indica el área o metrado estimado'
  else if (b.area.trim().length > 120) errores.area = 'Usa 120 caracteres como máximo'
  if (!b.monto.trim()) errores.monto = 'Indica el monto fijo en soles'
  else if (normalizarMonto(b.monto) === null) errores.monto = 'Escribe un monto válido, por ejemplo 12000,00'
  if (!b.frecuencia.trim()) errores.frecuencia = 'Indica la frecuencia pactada'
  else if (b.frecuencia.trim().length > 120) errores.frecuencia = 'Usa 120 caracteres como máximo'
  if (!b.inicio) errores.inicio = 'Indica cuándo empieza la vigencia'
  else if (!esFechaIsoValida(b.inicio)) errores.inicio = 'Escribe una fecha válida'
  if (!b.fin) errores.fin = 'Indica cuándo termina la vigencia'
  else if (!esFechaIsoValida(b.fin)) errores.fin = 'Escribe una fecha válida'
  else if (!errores.inicio && b.inicio && b.fin < b.inicio) errores.fin = 'El fin de la vigencia no puede ser anterior al inicio'
  return errores
}

/** Construye la entrada. Solo se llama con un borrador sin errores. */
export function construirContrato(b: BorradorContrato): ContratoEntrada {
  const entrada: ContratoEntrada = {
    proveedor_id: b.proveedor!.id,
    tipo_servicio_id: Number(b.tipoServicioId),
    area_metrado_estimado: b.area.trim(),
    monto_fijo: normalizarMonto(b.monto)!,
    frecuencia_pactada: b.frecuencia.trim(),
    vigencia_inicio: b.inicio,
    vigencia_fin: b.fin,
  }
  if (b.condiciones.trim()) entrada.condiciones = b.condiciones.trim()
  return entrada
}

// --- Atención especial ----------------------------------------------------------------------------------

export const OPCIONES_APLICACIONES = [
  { valor: '1', texto: '1 aplicación' },
  { valor: '2', texto: '2 aplicaciones' },
]

export interface BorradorEspecial {
  ejemplar: Ejemplar | null
  plagaId: string
  aplicaciones: string
}

export const BORRADOR_ESPECIAL_VACIO: BorradorEspecial = { ejemplar: null, plagaId: '', aplicaciones: '2' }

export interface ErroresEspecial {
  ejemplar?: string
  plaga?: string
  aplicaciones?: string
}

export function validarEspecial(b: BorradorEspecial): ErroresEspecial {
  const errores: ErroresEspecial = {}
  if (!b.ejemplar) errores.ejemplar = 'Selecciona el ejemplar que se va a marcar'
  if (!b.plagaId) errores.plaga = 'Selecciona la plaga recurrente'
  if (b.aplicaciones !== '1' && b.aplicaciones !== '2') errores.aplicaciones = 'Son una o dos aplicaciones adicionales al año'
  return errores
}

export function construirEspecial(b: BorradorEspecial): AtencionEspecialEntrada {
  return { ejemplar_id: b.ejemplar!.id, plaga_id: Number(b.plagaId), aplicaciones_adicionales: Number(b.aplicaciones) }
}

/** Texto «0 de 2» de las aplicaciones adicionales. */
export function textoAplicaciones(realizadas: number, adicionales: number): string {
  return `${realizadas} de ${adicionales}`
}

export function hayErrores(errores: object): boolean {
  return Object.values(errores).some(Boolean)
}
