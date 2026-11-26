/** Adaptador del «Historial de Konoha» para las extracciones de informes (RD-56, IA-16): propuestas por estado. */
import type { ReactNode } from 'react'
import type { AdaptadorHistorial, EntradaHistorial } from '@/rediseno/base/RevisionIa/contrato'
import { listarExtracciones } from '@/services/api/ia'
import type { SugerenciaIA } from '@/types/ia'
import { formatearNumero, SIN_VALOR } from '@/utils/formato'

const TEXTOS_ESTADO = { Propuesta: 'Pendientes de revisión', Validada: 'Validadas', Rechazada: 'Rechazadas' } as const

export function aEntrada(s: SugerenciaIA): EntradaHistorial {
  const { atencion, informe } = s
  const datos = s.contenido.entrada.campos_solicitados.length
  const conValor = Object.values(s.contenido.propuesta).filter((p) => p.valor !== null && p.valor !== undefined).length
  const codigo = atencion?.codigo ?? `Atención n.º ${s.contenido.entrada.atencion_id}`
  return {
    id: s.id,
    estado: s.estado,
    etiquetaEstado: s.etiqueta_estado,
    titulo: `${codigo} · ${atencion?.proveedor ?? SIN_VALOR}`,
    resumen: `${informe ? `Revisión ${informe.revision}` : `Reporte n.º ${s.registro_id}`} · ${formatearNumero(conValor)} de ${formatearNumero(datos)} datos encontrados`,
    solicitadaEn: s.contenido.ia?.solicitado_en ?? s.fecha_creacion ?? '',
    decididaPor: s.estado === 'Propuesta' ? null : 'la jefatura de sección',
    decididaEn: s.fecha_validacion,
  }
}

export function crearAdaptadorHistorial(renderDetalle: (entrada: EntradaHistorial) => ReactNode): AdaptadorHistorial {
  return {
    clave: 'extraccion-informes',
    textosEstado: TEXTOS_ESTADO,
    cargar: async (consulta, signal) => {
      const pagina = await listarExtracciones({ estado: consulta.estado ?? undefined, page: consulta.pagina }, signal)
      // `?atencion_id=` (punto de entrada de la vista): el servicio no filtra por atención, se filtra la página.
      const atencion = consulta.entrada.atencion_id
      const filas = atencion
        ? pagina.results.filter((s) => String(s.contenido.entrada.atencion_id) === atencion)
        : pagina.results
      return { entradas: filas.map(aEntrada), total: atencion ? filas.length : pagina.count }
    },
    renderDetalle,
  }
}
