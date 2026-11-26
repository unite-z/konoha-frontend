/** Informes de este ticket (RD-60) que se pintan dentro de la vista; los de RD-61 siguen en el panel hasta que lleguen. */
const CLAVES_EN_LINEA: readonly string[] = ['cumplimiento-corte', 'distribucion-personal', 'atenciones-espacio-sector']

export function esInformeEnLinea(clave: string | null): clave is string {
  return clave !== null && CLAVES_EN_LINEA.includes(clave)
}
