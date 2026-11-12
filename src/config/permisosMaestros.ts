/**
 * Quién puede hacer qué en proveedores, contratos y atención especial (RF-SER-001, RF-SER-002, RF-INV-011).
 * AV-382: por permiso de la sesión, no por nombre de rol. La interfaz solo oculta: el back-end vuelve a comprobarlo.
 */
import { tiene, type Permisos } from './permisosSesion'
import { PERMISOS_TERCERIZADOS } from './permisosTercerizados'

/** Registrar proveedores y contratos: `SER.CONTRATO.GESTIONAR`. */
export function puedeRegistrarProveedoresYContratos(permisos: Permisos): boolean {
  return tiene(permisos, PERMISOS_TERCERIZADOS.gestionarContratos)
}

/** Marcar ejemplares con atención especial (RF-INV-011): `SER.ATENCION.REGISTRAR`. */
export function puedeMarcarAtencionEspecial(permisos: Permisos): boolean {
  return tiene(permisos, PERMISOS_TERCERIZADOS.registrarAtencion)
}

/** Habilitar o inhabilitar un proveedor: `SER.CONTRATO.GESTIONAR`. */
export function puedeCambiarEstadoProveedor(permisos: Permisos): boolean {
  return tiene(permisos, PERMISOS_TERCERIZADOS.gestionarContratos)
}

/** Administrar el catálogo de productos agronómicos (RF-FIT-003): `SER.CONTRATO.GESTIONAR`. */
export function puedeAdministrarProductosAgronomicos(permisos: Permisos): boolean {
  return tiene(permisos, PERMISOS_TERCERIZADOS.gestionarContratos)
}

/** Registrar observaciones de plagas (RF-FIT-005): `SER.ATENCION.REGISTRAR`. */
export function puedeRegistrarObservacionPlaga(permisos: Permisos): boolean {
  return tiene(permisos, PERMISOS_TERCERIZADOS.registrarAtencion)
}
