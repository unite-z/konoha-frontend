/**
 * Adaptador de la extracción de informes con IA para `RevisionIa` (RD-56): cada dato solicitado del formato estándar
 * es un elemento; las decisiones (aceptar, corregir, descartar) se traducen al cuerpo de `validar/`. Un dato sin valor
 * no se puede aceptar: si no es obligatorio, «Aceptar pendientes» lo descarta; si es obligatorio, se exige corregirlo.
 * Los filtros (Todos, Pendientes, No encontrados, Obligatorios) recortan los elementos que se ven, no los que se
 * validan: sin decisión para todos los datos no se valida.
 */
import { createElement } from 'react'
import {
  convertirCorreccion,
  pasaFiltro,
  tieneValor,
  valorATexto,
  valorSugerido,
  type FiltroCampos,
} from '@/pages/reportes-indicadores/asistencia-ia/extraccion/valoresCampo'
import type {
  AdaptadorRevision,
  DecisionElemento,
  ElementoRevision,
  PropuestaRevision,
  RegistroDecision,
} from '@/rediseno/base/RevisionIa/contrato'
import { ErrorApi } from '@/services/api/cliente'
import { obtenerExtraccion, rechazarExtraccion, validarExtraccion } from '@/services/api/ia'
import { claveCampo, type CampoSolicitado, type CuerpoValidacion, type SugerenciaIA, type ValorCampo } from '@/types/ia'
import HuecoExtraccion from './HuecoExtraccion'
import ResumenExtraccion from './ResumenExtraccion'
import ValorExtraido from './ValorExtraido'

/** Valor de un dato: el que se propone o decide y su texto editable (al corregir). */
export interface ValorExtraccion {
  valor: ValorCampo
  texto: string
}

/** Lo último que se leyó de la propuesta: la validación necesita sus datos solicitados. */
export interface MemoriaExtraccion {
  sugerencia: SugerenciaIA | null
}

export interface OpcionesAdaptadorExtraccion {
  id: number
  filtro: FiltroCampos
  onFiltro: (filtro: FiltroCampos) => void
  /** Datos que ya tienen decisión en el borrador (para «Pendientes»). */
  decididos: ReadonlySet<string>
  onDecidido: (clave: string) => void
  /** Quien decide: «Pendientes» solo se ofrece entonces. */
  puedeValidar: boolean
  memoria: MemoriaExtraccion
  /** Tras validar o rechazar: quien muestra la revisión vuelve a leer. */
  alCambio: () => void
}

const rechazo = (detalle: string) => new ErrorApi(422, 'validacion-extraccion', detalle)
const nombreDe = (c: CampoSolicitado) => c.nombre_campo ?? claveCampo(c.campo_id)

/** Cuerpo de `validar/` a partir de las decisiones; lanza un 422 con lo que falte o esté mal. */
export function cuerpoDesdeDecisiones(
  sugerencia: SugerenciaIA,
  decisiones: Record<string, DecisionElemento<ValorExtraccion>>,
): CuerpoValidacion {
  const cuerpo: CuerpoValidacion['decisiones'] = {}
  const sinDecidir: string[] = []
  const errores: string[] = []
  for (const campo of sugerencia.contenido.entrada.campos_solicitados) {
    const clave = claveCampo(campo.campo_id)
    const decision = decisiones[clave]
    if (!decision) {
      sinDecidir.push(nombreDe(campo))
    } else if (decision.accion === 'corregir') {
      const { valor, error } = convertirCorreccion(campo.tipo_dato, decision.valorFinal?.texto ?? '')
      if (error) errores.push(`${nombreDe(campo)}: ${error}`)
      else cuerpo[clave] = { accion: 'corregir', valor_final: valor ?? null }
    } else if (decision.accion === 'aceptar' && !tieneValor(valorSugerido(sugerencia, campo))) {
      if (campo.obligatorio) errores.push(`${nombreDe(campo)}: es obligatorio y no hay valor que aceptar; corrígelo`)
      else cuerpo[clave] = { accion: 'descartar' }
    } else {
      cuerpo[clave] = { accion: decision.accion }
    }
  }
  if (sinDecidir.length > 0) {
    throw rechazo(
      `Falta decidir ${sinDecidir.length === 1 ? 'un dato' : `${sinDecidir.length} datos`}: ${sinDecidir.join(', ')}. Elige «Todos» para verlos.`,
    )
  }
  if (errores.length > 0) throw rechazo(errores.join(' · '))
  return { decisiones: cuerpo }
}

function registroDe(s: SugerenciaIA, campo: CampoSolicitado): RegistroDecision<ValorExtraccion> | null {
  const final = s.contenido.decision?.por_campo[claveCampo(campo.campo_id)]
  if (!final || s.estado !== 'Validada') return null
  return {
    accion: final.accion,
    valorFinal:
      final.accion === 'descartar'
        ? null
        : { valor: final.valor_final, texto: valorATexto(campo.tipo_dato, final.valor_final) },
    decididoPor: 'la jefatura de sección',
    decididoEn: s.fecha_validacion ?? '',
  }
}

function aRevision(s: SugerenciaIA, o: OpcionesAdaptadorExtraccion): PropuestaRevision<ValorExtraccion> {
  const { contenido } = s
  const enPropuesta = s.estado === 'Propuesta'
  const decide = o.puedeValidar && enPropuesta
  const elementos: ElementoRevision<ValorExtraccion>[] = contenido.entrada.campos_solicitados
    .filter((c) =>
      pasaFiltro(o.filtro, c, valorSugerido(s, c), o.decididos.has(claveCampo(c.campo_id)) ? 'aceptar' : undefined),
    )
    .map((c) => {
      const sugerido = valorSugerido(s, c)
      return {
        id: claveCampo(c.campo_id),
        titulo: c.obligatorio ? `${nombreDe(c)} (obligatorio)` : nombreDe(c),
        sugerencia: createElement(ValorExtraido, { valor: sugerido, tipo: c.tipo_dato }),
        valorSugerido: { valor: sugerido, texto: valorATexto(c.tipo_dato, sugerido) },
        decision: registroDe(s, c),
      }
    })
  const faltantes = contenido.campos_obligatorios_faltantes
  return {
    id: s.id,
    estado: s.estado,
    resumen: createElement(ResumenExtraccion, {
      sugerencia: s,
      filtro: o.filtro,
      onFiltro: o.onFiltro,
      conPendientes: decide,
      visibles: elementos.length,
    }),
    ia: contenido.ia,
    contexto: {
      suficiencia: faltantes.length > 0 ? 'parcial' : 'suficiente',
      faltantes,
      datos_utilizados: [
        'Informe final del proveedor',
        `Formato estándar versión ${contenido.entrada.formato_version ?? 'vigente'}`,
      ],
      limitaciones: [],
      explicacion: '',
    },
    elementos,
    validadaPor: enPropuesta ? null : 'la jefatura de sección',
    validadaEn: s.fecha_validacion,
    motivoRechazo: contenido.decision?.motivo_rechazo ?? null,
  }
}

export function crearAdaptadorExtraccion(o: OpcionesAdaptadorExtraccion): AdaptadorRevision<ValorExtraccion> {
  const { id, memoria } = o
  const campoDe = (clave: string) =>
    memoria.sugerencia?.contenido.entrada.campos_solicitados.find((c) => claveCampo(c.campo_id) === clave)
  const olvidar = () => {
    memoria.sugerencia = null
  }
  return {
    clave: `extraccion|${id}|${o.filtro}|${o.filtro === 'pendientes' ? o.decididos.size : ''}`,
    tituloFaltantes: 'Datos mínimos no encontrados en el informe',
    motivoRechazo: 'opcional',
    cargar: async (signal) => {
      const s = memoria.sugerencia?.id === id ? memoria.sugerencia : await obtenerExtraccion(id, signal)
      memoria.sugerencia = s
      return aRevision(s, o)
    },
    validar: async (decisiones) => {
      const s = memoria.sugerencia
      if (!s) throw rechazo('La propuesta aún no se ha cargado.')
      try {
        await validarExtraccion(id, cuerpoDesdeDecisiones(s, decisiones))
        o.alCambio()
      } finally {
        olvidar()
      }
    },
    rechazar: async (motivo) => {
      try {
        await rechazarExtraccion(id, motivo || null)
        o.alCambio()
      } finally {
        olvidar()
      }
    },
    renderHueco: (contexto) => {
      const campo = campoDe(contexto.elemento.id)
      return campo ? createElement(HuecoExtraccion, { contexto, campo, onDecidido: o.onDecidido }) : null
    },
    mostrarValor: (v) =>
      v.valor === null ? 'Sin valor' : createElement(ValorExtraido, { valor: v.valor, tipo: null }),
  }
}
