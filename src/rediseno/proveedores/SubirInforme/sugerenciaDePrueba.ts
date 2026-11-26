/** Propuesta de extracción de ejemplo para las pruebas de RD-56. */
import type { SugerenciaIA, ValorCampo } from '@/types/ia'

export function sugerenciaDePrueba(
  valores: Record<number, ValorCampo>,
  cambios: Partial<SugerenciaIA> = {},
  faltantes: string[] = [],
): SugerenciaIA {
  const campos = [
    { campo_id: 1, nombre_campo: 'Metrado', tipo_dato: 'Decimal' as const, obligatorio: true },
    { campo_id: 2, nombre_campo: 'Observaciones', tipo_dato: 'Texto' as const, obligatorio: false },
  ]
  return {
    id: 55,
    tipo: 'ExtraccionReporte',
    entidad: 'ReporteProveedor',
    registro_id: 71,
    archivo_id: 3,
    estado: 'Propuesta',
    etiqueta_estado: 'Pendiente de revisión',
    validador_id: null,
    fecha_validacion: null,
    fecha_creacion: '2026-11-26T10:00:00-05:00',
    usuario_creacion_id: 1,
    fecha_modificacion: null,
    usuario_modificacion_id: null,
    atencion: {
      id: 9,
      codigo: 'AT-2026-009',
      estado: 'Reporte adjunto',
      tipo_servicio_id: 1,
      tipo_servicio: 'Corte de césped',
      proveedor: 'Terraverde SAC',
    },
    informe: null,
    contenido: {
      version_contenido: 1,
      entrada: {
        reporte_proveedor_id: 71,
        atencion_id: 9,
        tipo_servicio_id: 1,
        formato_id: 1,
        formato_version: 2,
        archivo_id: 3,
        campos_solicitados: campos,
      },
      ia: { proveedor: 'gemini', modelo: 'modelo-x', solicitado_en: '2026-11-26T10:00:00-05:00', duracion_ms: 900 },
      propuesta: Object.fromEntries(
        campos.map((c) => [
          `campo_${c.campo_id}`,
          { nombre_campo: c.nombre_campo, valor: valores[c.campo_id] ?? null },
        ]),
      ),
      campos_obligatorios_faltantes: faltantes,
      decision: null,
    },
    ...cambios,
  }
}
