/**
 * Ciclo de corte simulado de MOD-03 (AV-258 a AV-262), solo con `VITE_DATOS_SIMULADOS=true`: el backend del corte
 * espera a las rutas de MOD-02. Ruta de 45 jardines en cuatro zonas, con las marcas según el estado del ciclo:
 * programado, todo pendiente; en curso, 28 cortados en dos días y una interrupción Sociales a Ciencias (desde el
 * tercer día, la ruta completa; desde el cuarto, una jornada de limpieza, y desde el quinto, dos: «No cumple»);
 * completado, todo cortado y una jornada de limpieza.
 */
import type { CicloCorte, InterrupcionCorte, JardinRuta, LimpiezaCorte, NuevaInterrupcion, ZonaAlternativa } from '@/types/corte'
import type { Programacion } from '@/types/planificacion'
import { responderSimulado } from './simulacion'

const NOMBRES: Record<string, string> = {
  'J-014': 'Jardín de la Biblioteca',
  'J-015': 'Patio de Física',
  'J-016': 'Talud de Química',
  'J-031': 'Pabellón Z',
  'J-040': 'Patio de Letras',
}

function codigos(desde: number, hasta: number): string[] {
  return Array.from({ length: hasta - desde + 1 }, (_, i) => `J-${String(desde + i).padStart(3, '0')}`)
}

/** Ciencias 16, Sociales 11, Letras 9 e Ingeniería 9: 45 jardines. */
const RUTA: { codigo: string; zona: string }[] = [
  ...codigos(14, 29).map((codigo) => ({ codigo, zona: 'Ciencias' })),
  ...[...codigos(31, 39), 'J-041', 'J-042'].map((codigo) => ({ codigo, zona: 'Sociales' })),
  ...['J-040', ...codigos(43, 50)].map((codigo) => ({ codigo, zona: 'Letras' })),
  ...codigos(51, 59).map((codigo) => ({ codigo, zona: 'Ingeniería' })),
]

function sumarDias(fecha: string, dias: number): string {
  const dia = new Date(`${fecha}T00:00:00Z`)
  dia.setUTCDate(dia.getUTCDate() + dias)
  return dia.toISOString().slice(0, 10)
}

/** Día del ciclo (0 o 1) y hora de la marca de cada jardín cortado en curso; el resto queda pendiente. */
function marcaEnCurso(codigo: string, zona: string): { dia: 0 | 1; hora: string } | null {
  if (codigo === 'J-014') return { dia: 1, hora: '10:42' }
  if (codigo === 'J-015') return { dia: 1, hora: '10:18' }
  if (zona === 'Ingeniería') return { dia: 0, hora: `0${7 + (Number(codigo.slice(2)) % 3)}:${String(Number(codigo.slice(2)) % 60).padStart(2, '0')}` }
  if (['J-043', 'J-044', 'J-045', 'J-046'].includes(codigo)) return { dia: 0, hora: '11:30' }
  if (codigo === 'J-017' || codigo === 'J-018') return { dia: 0, hora: '12:10' }
  if (zona === 'Ciencias' && codigo !== 'J-016') return { dia: 1, hora: '09:20' }
  return null
}

function diasDesde(inicio: string, hoy: string): number {
  return Math.round((Date.parse(`${hoy}T00:00:00Z`) - Date.parse(`${inicio}T00:00:00Z`)) / 86_400_000)
}

export function cicloCorteSimulado(ciclo: Programacion, hoy: string = new Date().toISOString().slice(0, 10)): CicloCorte {
  const inicio = ciclo.fecha_inicio_real ?? ciclo.fecha_inicio_prevista
  const transcurridos = ciclo.estado === 'EnCurso' ? diasDesde(inicio, hoy) : 0
  const rutaCompleta = ciclo.estado === 'Completada' || transcurridos >= 2
  const autor = ciclo.proveedor ?? 'Personal propio'
  const jardines: JardinRuta[] = RUTA.map(({ codigo, zona }, indice) => {
    const base = { id: indice + 1, codigo, nombre: NOMBRES[codigo] ?? `Jardín ${codigo.slice(2)}`, zona, detenido_por_interrupcion: false }
    if (rutaCompleta) {
      return { ...base, estado: 'Cortado', marcado_en: `${sumarDias(inicio, indice % 3)}T10:00:00-05:00`, marcado_por: 'J. Ramos' }
    }
    const marca = ciclo.estado === 'EnCurso' ? marcaEnCurso(codigo, zona) : null
    if (!marca) return { ...base, estado: 'Pendiente', marcado_en: null, marcado_por: null, detenido_por_interrupcion: ciclo.estado === 'EnCurso' && codigo === 'J-031' }
    return { ...base, estado: 'Cortado', marcado_en: `${sumarDias(inicio, marca.dia)}T${marca.hora}:00-05:00`, marcado_por: 'J. Ramos' }
  })
  const interrupciones: InterrupcionCorte[] =
    ciclo.estado === 'EnCurso'
      ? [
          {
            id: 1,
            zona_afectada: 'Sociales',
            zona_alternativa: 'Ciencias',
            hora: `${sumarDias(inicio, 1)}T10:15:00-05:00`,
            motivo: 'Ruido durante clases en las aulas Z201 a Z205.',
            minutos_descontados: 35,
            aviso_proveedor: true,
            registrada_como_restriccion: false,
          },
        ]
      : []
  const jornadas = ciclo.estado === 'Completada' ? 1 : Math.max(0, Math.min(2, transcurridos - 2))
  const limpiezas: LimpiezaCorte[] = Array.from({ length: jornadas }, (_, i) => ({ id: i + 1, fecha: sumarDias(inicio, 3 + i), autor }))
  return {
    programacion_id: ciclo.id,
    jardines,
    interrupciones,
    limpiezas,
    dias_interrupcion_descontados: interrupciones.length > 0 ? 0.5 : 0,
  }
}

export function simularRegistrarLimpieza(fecha: string): Promise<LimpiezaCorte> {
  return responderSimulado(() => ({ id: Date.now(), fecha, autor: 'Usuario de prueba' }))
}

export function simularObtenerCicloCorte(ciclo: Programacion, signal?: AbortSignal): Promise<CicloCorte> {
  return responderSimulado(() => cicloCorteSimulado(ciclo), { signal })
}

export function simularZonasAlternativas(signal?: AbortSignal): Promise<ZonaAlternativa[]> {
  return responderSimulado(
    () => [
      { zona: 'Ciencias', pendientes: 14, aviso_hoy: null },
      { zona: 'Letras', pendientes: 9, aviso_hoy: 'Reserva de jardín' },
    ],
    { signal },
  )
}

export function simularRegistrarInterrupcion(cuerpo: NuevaInterrupcion): Promise<InterrupcionCorte> {
  return responderSimulado(() => ({
    id: Date.now(),
    zona_afectada: cuerpo.zona_afectada,
    zona_alternativa: cuerpo.zona_alternativa,
    hora: cuerpo.hora,
    motivo: cuerpo.motivo,
    minutos_descontados: 0,
    aviso_proveedor: cuerpo.aviso_proveedor,
    registrada_como_restriccion: cuerpo.registrar_restriccion,
  }))
}
