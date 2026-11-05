/**
 * Validación y armado de las entradas de proveedores, contratos y atención especial (RF-SER-001,
 * RF-SER-002 y RF-INV-011). Funciones puras: el servidor vuelve a validar todo y su respuesta manda.
 */
import type {
  AplicacionAdicionalEntrada,
  AtencionEspecialEntrada,
  ContratoEntrada,
  ContratoMaestro,
  ObservacionPlagaEntrada,
  ProductoAgronomico,
  ProductoAgronomicoEntrada,
  ProveedorEntrada,
  ProveedorMaestro,
  TipoVinculo,
  UnidadFrecuencia,
} from '../types/maestrosTercerizados'
import type { AreaVerde, Ejemplar } from '../types/tercerizados'
import { esFechaIsoValida, formatearNumero, SIN_VALOR } from './formato'

// --- Proveedor ------------------------------------------------------------------------------------------

export const OPCIONES_VINCULO: { valor: TipoVinculo; texto: string }[] = [
  { valor: 'SinVinculo', texto: 'Sin vínculo' },
  { valor: 'Principal', texto: 'Empresa principal' },
  { valor: 'Subsidiaria', texto: 'Subsidiaria' },
  { valor: 'Vinculada', texto: 'Empresa vinculada' },
]

/** Teléfono con dígitos, espacios, guiones y paréntesis, y «+» opcional al inicio (6 a 15 dígitos). */
export function esTelefonoValido(texto: string): boolean {
  if (!/^\+?[\d\s()-]+$/.test(texto)) return false
  const digitos = texto.replace(/\D/g, '').length
  return digitos >= 6 && digitos <= 15
}

export function esCorreoValido(texto: string): boolean {
  return texto.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto)
}

/** «Subsidiaria» y «Vinculada» indican con qué proveedor se vinculan. */
export function requiereRelacionado(tipo: TipoVinculo): boolean {
  return tipo === 'Subsidiaria' || tipo === 'Vinculada'
}

/** Nombre, teléfono y correo del contacto, o `null` cuando el dato no se registró (ficha del proveedor). */
export function datosContacto(
  proveedor: Pick<ProveedorMaestro, 'contacto_nombre' | 'contacto_telefono' | 'contacto_correo'>,
): { nombre: string | null; telefono: string | null; correo: string | null } {
  return {
    nombre: proveedor.contacto_nombre || null,
    telefono: proveedor.contacto_telefono || null,
    correo: proveedor.contacto_correo || null,
  }
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
  contactoNombre: string
  contactoTelefono: string
  contactoCorreo: string
  tipoVinculo: TipoVinculo
  relacionado: ProveedorMaestro | null
}

export const BORRADOR_PROVEEDOR_VACIO: BorradorProveedor = {
  razonSocial: '',
  ruc: '',
  contactoNombre: '',
  contactoTelefono: '',
  contactoCorreo: '',
  tipoVinculo: 'SinVinculo',
  relacionado: null,
}

/**
 * Borrador de edición a partir del proveedor cargado. El proveedor relacionado solo trae su nombre: se
 * arma un valor provisional para mostrarlo en el selector (si se cambia, la búsqueda trae el resto de datos).
 */
export function borradorDeProveedor(p: ProveedorMaestro): BorradorProveedor {
  return {
    razonSocial: p.razon_social,
    ruc: p.ruc ?? '',
    contactoNombre: p.contacto_nombre,
    contactoTelefono: p.contacto_telefono,
    contactoCorreo: p.contacto_correo,
    tipoVinculo: p.tipo_vinculo,
    relacionado:
      p.proveedor_relacionado_id === null
        ? null
        : {
            id: p.proveedor_relacionado_id,
            razon_social: p.proveedor_relacionado_nombre ?? '',
            ruc: null,
            activo: true,
            contacto_nombre: '',
            contacto_telefono: '',
            contacto_correo: '',
            tipo_vinculo: 'SinVinculo',
            proveedor_relacionado_id: null,
            proveedor_relacionado_nombre: null,
            contratos: 0,
          },
  }
}

export interface ErroresProveedor {
  razonSocial?: string
  ruc?: string
  contactoNombre?: string
  contactoTelefono?: string
  contactoCorreo?: string
  relacionado?: string
}

/** `idPropio` (al editar) rechaza que el proveedor se vincule consigo mismo. */
export function validarProveedor(b: BorradorProveedor, idPropio?: number): ErroresProveedor {
  const errores: ErroresProveedor = {}
  const razon = b.razonSocial.trim()
  if (!razon) errores.razonSocial = 'Escribe la razón social del proveedor'
  else if (razon.length > 200) errores.razonSocial = 'Usa 200 caracteres como máximo'
  const ruc = b.ruc.trim()
  if (!ruc) errores.ruc = 'Escribe el RUC del proveedor'
  else if (!/^\d{11}$/.test(ruc)) errores.ruc = 'El RUC tiene 11 dígitos, sin espacios ni guiones'
  if (b.contactoNombre.trim().length > 120) errores.contactoNombre = 'Usa 120 caracteres como máximo'
  const telefono = b.contactoTelefono.trim()
  if (telefono && !esTelefonoValido(telefono)) errores.contactoTelefono = 'Escribe un teléfono válido, por ejemplo 999 000 000'
  const correo = b.contactoCorreo.trim()
  if (correo && !esCorreoValido(correo)) errores.contactoCorreo = 'Escribe un correo válido, por ejemplo nombre@empresa.pe'
  if (requiereRelacionado(b.tipoVinculo) && !b.relacionado) errores.relacionado = 'Selecciona el proveedor con el que se vincula'
  else if (b.relacionado && idPropio !== undefined && b.relacionado.id === idPropio)
    errores.relacionado = 'Un proveedor no puede vincularse consigo mismo'
  return errores
}

export function construirProveedor(b: BorradorProveedor): ProveedorEntrada {
  const entrada: ProveedorEntrada = { razon_social: b.razonSocial.trim(), ruc: b.ruc.trim(), tipo_vinculo: b.tipoVinculo }
  if (b.contactoNombre.trim()) entrada.contacto_nombre = b.contactoNombre.trim()
  if (b.contactoTelefono.trim()) entrada.contacto_telefono = b.contactoTelefono.trim()
  if (b.contactoCorreo.trim()) entrada.contacto_correo = b.contactoCorreo.trim()
  if (requiereRelacionado(b.tipoVinculo) && b.relacionado) entrada.proveedor_relacionado_id = b.relacionado.id
  return entrada
}

// --- Contrato -------------------------------------------------------------------------------------------

export const OPCIONES_FRECUENCIA: { valor: UnidadFrecuencia; texto: string }[] = [
  { valor: 'Dia', texto: 'Al día' },
  { valor: 'Semana', texto: 'A la semana' },
  { valor: 'Mes', texto: 'Al mes' },
  { valor: 'Anio', texto: 'Al año' },
]

/** Veces por período admitidas (el servidor valida lo mismo). */
export const FRECUENCIA_MAXIMA = 365

/** «S/ 12 000,00»; sin valor cuando el monto no llega (RNF-008: oculto a los roles sin acceso). */
export function textoMonto(monto: string | null): string {
  return monto === null ? SIN_VALOR : `S/ ${formatearNumero(Number(monto), 2)}`
}

/**
 * Monto en soles como el servidor lo espera (`12000.00`). Basta con escribir números (`12000`): los decimales
 * y los espacios de miles son opcionales, y el decimal puede ir con punto o coma (`12 000,50`). `null` si no
 * es un monto válido (hasta 10 enteros y 2 decimales, no negativo).
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
  /** Veces por período, como texto del campo (`4`). */
  frecuenciaCantidad: string
  /** Período elegido; vacío si aún no se elige. */
  frecuenciaUnidad: UnidadFrecuencia | ''
  inicio: string
  fin: string
  condiciones: string
}

export const BORRADOR_CONTRATO_VACIO: BorradorContrato = {
  proveedor: null,
  tipoServicioId: '',
  area: '',
  monto: '',
  frecuenciaCantidad: '',
  frecuenciaUnidad: '',
  inicio: '',
  fin: '',
  condiciones: '',
}

/**
 * Borrador de edición a partir del contrato cargado. El proveedor solo trae su nombre: se arma un valor
 * provisional para mostrarlo en el selector (si se cambia, la búsqueda trae el resto de datos). Un contrato
 * sin cantidad ni período (texto libre de antes de la separación) deja esos campos vacíos: hay que elegirlos.
 */
export function borradorDeContrato(c: ContratoMaestro): BorradorContrato {
  return {
    proveedor: {
      id: c.proveedor_id,
      razon_social: c.proveedor_nombre ?? '',
      ruc: null,
      activo: true,
      contacto_nombre: '',
      contacto_telefono: '',
      contacto_correo: '',
      tipo_vinculo: 'SinVinculo',
      proveedor_relacionado_id: null,
      proveedor_relacionado_nombre: null,
      contratos: 0,
    },
    tipoServicioId: String(c.tipo_servicio_id),
    area: c.area_metrado_estimado ?? '',
    monto: c.monto_fijo ?? '',
    frecuenciaCantidad: c.frecuencia_cantidad === null ? '' : String(c.frecuencia_cantidad),
    frecuenciaUnidad: c.frecuencia_unidad ?? '',
    inicio: c.vigencia_inicio,
    fin: c.vigencia_fin,
    condiciones: c.condiciones,
  }
}

export interface ErroresContrato {
  proveedor?: string
  tipoServicio?: string
  area?: string
  monto?: string
  frecuenciaCantidad?: string
  frecuenciaUnidad?: string
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
  else if (normalizarMonto(b.monto) === null) errores.monto = 'Escribe solo números, por ejemplo 12000 o 12000,50'
  const cantidad = b.frecuenciaCantidad.trim()
  if (!cantidad) errores.frecuenciaCantidad = 'Indica cuántas veces se presta el servicio'
  else if (!/^\d{1,3}$/.test(cantidad) || Number(cantidad) < 1 || Number(cantidad) > FRECUENCIA_MAXIMA)
    errores.frecuenciaCantidad = `Escribe un número entero de 1 a ${FRECUENCIA_MAXIMA}`
  if (!OPCIONES_FRECUENCIA.some((o) => o.valor === b.frecuenciaUnidad)) errores.frecuenciaUnidad = 'Selecciona el período de la frecuencia'
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
    // oxlint-disable-next-line typescript/no-non-null-assertion -- construirContrato solo se llama con un borrador validado
    proveedor_id: b.proveedor!.id,
    tipo_servicio_id: Number(b.tipoServicioId),
    area_metrado_estimado: b.area.trim(),
    // oxlint-disable-next-line typescript/no-non-null-assertion -- validarContrato ya rechazó un monto no normalizable
    monto_fijo: normalizarMonto(b.monto)!,
    frecuencia_cantidad: Number(b.frecuenciaCantidad.trim()),
    // validarContrato ya exigió un período elegido.
    frecuencia_unidad: b.frecuenciaUnidad as UnidadFrecuencia,
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
  // oxlint-disable-next-line typescript/no-non-null-assertion -- construirEspecial solo se llama con un borrador validado
  return { ejemplar_id: b.ejemplar!.id, plaga_id: Number(b.plagaId), aplicaciones_adicionales: Number(b.aplicaciones) }
}

/** Texto «0 de 2» de las aplicaciones adicionales. */
export function textoAplicaciones(realizadas: number, adicionales: number): string {
  return `${realizadas} de ${adicionales}`
}

// --- Aplicación adicional (RF-FIT-006) -------------------------------------------------------------------

export interface BorradorAplicacionAdicional {
  contrato: ContratoMaestro | null
  fechaInicio: string
  fechaFin: string
  motivo: string
}

export const BORRADOR_APLICACION_VACIO: BorradorAplicacionAdicional = {
  contrato: null,
  fechaInicio: '',
  fechaFin: '',
  motivo: '',
}

export interface ErroresAplicacionAdicional {
  contrato?: string
  fechaInicio?: string
  fechaFin?: string
}

export function validarAplicacionAdicional(b: BorradorAplicacionAdicional): ErroresAplicacionAdicional {
  const errores: ErroresAplicacionAdicional = {}
  if (!b.contrato) errores.contrato = 'Selecciona el contrato de control fitosanitario'
  if (!b.fechaInicio) errores.fechaInicio = 'Indica la fecha de inicio'
  else if (!esFechaIsoValida(b.fechaInicio)) errores.fechaInicio = 'Escribe una fecha válida'
  if (!b.fechaFin) errores.fechaFin = 'Indica la fecha de fin'
  else if (!esFechaIsoValida(b.fechaFin)) errores.fechaFin = 'Escribe una fecha válida'
  else if (!errores.fechaInicio && b.fechaInicio && b.fechaFin < b.fechaInicio)
    errores.fechaFin = 'El fin no puede ser anterior al inicio'
  return errores
}

/** Construye la entrada. Solo se llama con un borrador sin errores. */
export function construirAplicacionAdicional(b: BorradorAplicacionAdicional): AplicacionAdicionalEntrada {
  const entrada: AplicacionAdicionalEntrada = {
    // oxlint-disable-next-line typescript/no-non-null-assertion -- construirAplicacionAdicional solo se llama con un borrador validado
    contrato_id: b.contrato!.id,
    fecha_inicio: b.fechaInicio,
    fecha_fin: b.fechaFin,
  }
  if (b.motivo.trim()) entrada.motivo = b.motivo.trim()
  return entrada
}

export function hayErrores(errores: object): boolean {
  return Object.values(errores).some(Boolean)
}

// --- Producto agronómico (RF-FIT-003) --------------------------------------------------------------------

export interface BorradorProducto {
  nombre: string
  principioActivo: string
  presentacion: string
}

export const BORRADOR_PRODUCTO_VACIO: BorradorProducto = { nombre: '', principioActivo: '', presentacion: '' }

export function borradorDeProducto(p: ProductoAgronomico): BorradorProducto {
  return { nombre: p.nombre, principioActivo: p.principio_activo, presentacion: p.presentacion }
}

export interface ErroresProducto {
  nombre?: string
  principioActivo?: string
  presentacion?: string
}

export function validarProducto(b: BorradorProducto): ErroresProducto {
  const errores: ErroresProducto = {}
  const nombre = b.nombre.trim()
  if (!nombre) errores.nombre = 'Escribe el nombre del producto'
  else if (nombre.length > 150) errores.nombre = 'Usa 150 caracteres como máximo'
  if (b.principioActivo.trim().length > 150) errores.principioActivo = 'Usa 150 caracteres como máximo'
  if (b.presentacion.trim().length > 120) errores.presentacion = 'Usa 120 caracteres como máximo'
  return errores
}

export function construirProducto(b: BorradorProducto): ProductoAgronomicoEntrada {
  const entrada: ProductoAgronomicoEntrada = { nombre: b.nombre.trim() }
  if (b.principioActivo.trim()) entrada.principio_activo = b.principioActivo.trim()
  if (b.presentacion.trim()) entrada.presentacion = b.presentacion.trim()
  return entrada
}

// --- Observación de plaga (RF-FIT-005) -------------------------------------------------------------------

/** El destino es un área verde o un ejemplar, nunca ambos (se elige con pestañas, como en los alcances). */
export type TipoDestinoObservacion = 'area' | 'ejemplar'

export interface BorradorObservacion {
  tipoDestino: TipoDestinoObservacion
  area: AreaVerde | null
  ejemplar: Ejemplar | null
  plagaId: string
  descripcion: string
  fecha: string
}

export const BORRADOR_OBSERVACION_VACIO: BorradorObservacion = {
  tipoDestino: 'area',
  area: null,
  ejemplar: null,
  plagaId: '',
  descripcion: '',
  fecha: '',
}

export interface ErroresObservacion {
  destino?: string
  plaga?: string
  descripcion?: string
  fecha?: string
}

/** `hoy` en formato `FechaIso` (`hoyLima()`): la observación no puede fecharse en el futuro. */
export function validarObservacion(b: BorradorObservacion, hoy: string): ErroresObservacion {
  const errores: ErroresObservacion = {}
  const sinDestino = b.tipoDestino === 'area' ? !b.area : !b.ejemplar
  if (sinDestino) errores.destino = b.tipoDestino === 'area' ? 'Selecciona el área verde observada' : 'Selecciona el ejemplar observado'
  if (!b.plagaId) errores.plaga = 'Selecciona la plaga observada'
  const descripcion = b.descripcion.trim()
  if (!descripcion) errores.descripcion = 'Describe lo observado'
  else if (descripcion.length > 500) errores.descripcion = 'Usa 500 caracteres como máximo'
  if (!b.fecha) errores.fecha = 'Indica la fecha de la observación'
  else if (!esFechaIsoValida(b.fecha)) errores.fecha = 'Escribe una fecha válida'
  else if (b.fecha > hoy) errores.fecha = 'La fecha no puede ser futura'
  return errores
}

/** Construye la entrada. Solo se llama con un borrador sin errores. */
export function construirObservacion(b: BorradorObservacion): ObservacionPlagaEntrada {
  const entrada: ObservacionPlagaEntrada = { plaga_id: Number(b.plagaId), descripcion: b.descripcion.trim(), fecha_observacion: b.fecha }
  // oxlint-disable-next-line typescript/no-non-null-assertion -- construirObservacion solo se llama con un borrador validado
  if (b.tipoDestino === 'area') entrada.area_verde_id = b.area!.id
  // oxlint-disable-next-line typescript/no-non-null-assertion -- construirObservacion solo se llama con un borrador validado
  else entrada.ejemplar_id = b.ejemplar!.id
  return entrada
}
