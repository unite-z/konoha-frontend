/** Texto del botón según el estado: primera entrega, subsanación de una observación o revisión nueva. */
export function textoAdjuntar(estado: string): string {
  if (estado === 'Observado') return 'Subsanar informe'
  return estado === 'Ejecutado pendiente de reporte' ? 'Adjuntar reporte' : 'Adjuntar nueva revisión'
}
