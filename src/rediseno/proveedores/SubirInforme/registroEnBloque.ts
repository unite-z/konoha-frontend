/**
 * «Registrar en bloque» (RD-56, P-14): valida una a una las propuestas completas y devuelve el resultado de cada
 * informe. Una propuesta está completa si sigue pendiente, no le falta ningún dato obligatorio y la IA encontró valor
 * para todos sus datos: entonces se aceptan tal cual. Las demás se dejan para revisarlas una a una.
 */
import { aErrorApi } from '@/services/api/cliente'
import { obtenerExtraccion, validarExtraccion } from '@/services/api/ia'
import { claveCampo, type CuerpoValidacion, type SugerenciaIA } from '@/types/ia'
import { tieneValor, valorSugerido } from '@/pages/reportes-indicadores/asistencia-ia/extraccion/valoresCampo'

export type EstadoRegistro = 'registrado' | 'incompleto' | 'sin-pendiente' | 'fallo'

export interface ResultadoRegistro {
  estado: EstadoRegistro
  detalle: string
}

export function propuestaCompleta(s: SugerenciaIA): boolean {
  const campos = s.contenido.entrada.campos_solicitados
  return (
    s.estado === 'Propuesta' &&
    s.contenido.campos_obligatorios_faltantes.length === 0 &&
    campos.length > 0 &&
    campos.every((c) => tieneValor(valorSugerido(s, c)))
  )
}

export function aceptarTodo(s: SugerenciaIA): CuerpoValidacion {
  const decisiones: CuerpoValidacion['decisiones'] = {}
  for (const c of s.contenido.entrada.campos_solicitados) decisiones[claveCampo(c.campo_id)] = { accion: 'aceptar' }
  return { decisiones }
}

export interface DependenciasRegistro {
  obtener: (id: number) => Promise<SugerenciaIA>
  validar: (id: number, cuerpo: CuerpoValidacion) => Promise<SugerenciaIA>
}

const REALES: DependenciasRegistro = { obtener: (id) => obtenerExtraccion(id), validar: validarExtraccion }

/** Una por una y en orden: un fallo de una propuesta no detiene las demás. */
export async function registrarEnBloque(
  ids: readonly number[],
  { obtener, validar }: DependenciasRegistro = REALES,
): Promise<Map<number, ResultadoRegistro>> {
  const resultados = new Map<number, ResultadoRegistro>()
  for (const id of ids) {
    try {
      const propuesta = await obtener(id)
      if (propuesta.estado !== 'Propuesta') {
        resultados.set(id, {
          estado: 'sin-pendiente',
          detalle: `La propuesta ya está ${propuesta.estado.toLowerCase()}.`,
        })
      } else if (!propuestaCompleta(propuesta)) {
        resultados.set(id, { estado: 'incompleto', detalle: 'No está completa: revísala dato por dato.' })
      } else {
        await validar(id, aceptarTodo(propuesta))
        resultados.set(id, { estado: 'registrado', detalle: 'Registrada: se aceptaron todos sus datos.' })
      }
    } catch (causa) {
      resultados.set(id, { estado: 'fallo', detalle: aErrorApi(causa).detalle })
    }
  }
  return resultados
}
