import { describe, expect, it } from 'vitest'
import type { Programacion, Restriccion } from '@/types/planificacion'
import type { ResumenSectores } from '@/types/resumenSectores'
import {
  avanceGlobal,
  ciclosDeLaVentana,
  cicloInicial,
  restriccionesDeLaVentana,
  resumenDelCiclo,
  resumenDelPeriodo,
  serviciosPresentes,
  textoActualizacion,
  textoPorcentaje,
  ultimaActualizacion,
} from './sectores'

function ciclo(id: number, estado: Programacion['estado'], inicio: string, fin: string): Programacion {
  return {
    id,
    tipo_servicio_id: 1,
    servicio: 'Corte de césped',
    proveedor_id: null,
    proveedor: null,
    estacion: 'Primavera',
    fecha_inicio_prevista: inicio,
    fecha_fin_prevista: fin,
    estado,
    fecha_inicio_real: null,
    fecha_fin_real: null,
  }
}

const resumen: ResumenSectores = {
  ciclo_id: 1,
  desde: null,
  hasta: null,
  generado_en: '2026-11-26T15:00:00-05:00',
  sectores: [
    {
      sector_id: 1,
      sector: 'Ciencias',
      servicios: [
        { servicio: 'corte', programado: 4, ejecutado: 1, porcentaje: 25, actualizado_en: '2026-11-26T09:30:00-05:00' },
        { servicio: 'riego', programado: 0, ejecutado: 0, porcentaje: 0, actualizado_en: null },
      ],
    },
    {
      sector_id: 2,
      sector: 'Letras',
      servicios: [
        { servicio: 'corte', programado: 4, ejecutado: 2, porcentaje: 50, actualizado_en: '2026-11-26T11:45:00-05:00' },
      ],
    },
  ],
}

describe('cicloInicial', () => {
  const hoy = '2026-11-26'
  it('prefiere el pedido, luego el en curso, el próximo y el último completado', () => {
    const ciclos = [
      ciclo(1, 'Completada', '2026-10-01', '2026-10-04'),
      ciclo(2, 'Programada', '2026-12-01', '2026-12-04'),
      ciclo(3, 'EnCurso', '2026-11-24', '2026-11-27'),
      ciclo(4, 'Cancelada', '2026-11-20', '2026-11-22'),
    ]
    expect(cicloInicial(ciclos, hoy, 1)?.id).toBe(1)
    expect(cicloInicial(ciclos, hoy, 4)?.id).toBe(3)
    expect(
      cicloInicial(
        ciclos.filter((c) => c.id !== 3),
        hoy,
        null,
      )?.id,
    ).toBe(2)
    expect(cicloInicial([ciclos[0]], hoy, null)?.id).toBe(1)
    expect(cicloInicial([], hoy, null)).toBeNull()
  })
})

describe('avance por sector', () => {
  it('suma lo programado y lo ejecutado', () => {
    expect(avanceGlobal(resumen)).toEqual({ programado: 8, ejecutado: 3, porcentaje: 37.5 })
    expect(avanceGlobal({ ...resumen, sectores: [] }).porcentaje).toBeNull()
  })
  it('toma la actualización más reciente y la escribe en hora de Lima', () => {
    expect(ultimaActualizacion(resumen)).toBe('2026-11-26T15:00:00-05:00')
    expect(ultimaActualizacion({ ...resumen, generado_en: '2026-11-26T08:00:00-05:00' })).toBe(
      '2026-11-26T11:45:00-05:00',
    )
    expect(textoActualizacion('2026-11-26T15:05:00-05:00')).toBe('Actualizado a las 15:05')
    expect(textoActualizacion('no es una fecha')).toBeNull()
  })
  it('lista solo los servicios que trae el resumen', () => {
    expect(serviciosPresentes(resumen).map((s) => s.clave)).toEqual(['corte', 'riego'])
  })
  it('escribe el porcentaje con coma', () => {
    expect(textoPorcentaje(50)).toBe('50 %')
    expect(textoPorcentaje(12.5)).toBe('12,5 %')
  })
})

describe('ventana de «Esta semana»', () => {
  const hoy = '2026-11-26'
  it('7 días no incluye lo que empieza el día 8 y 14 sí', () => {
    const ciclos = [
      ciclo(1, 'Programada', '2026-11-27', '2026-11-30'),
      ciclo(2, 'Programada', '2026-12-03', '2026-12-06'),
      ciclo(3, 'Completada', '2026-11-26', '2026-11-26'),
    ]
    expect(ciclosDeLaVentana(hoy, 7, ciclos).map((c) => c.id)).toEqual([1])
    expect(ciclosDeLaVentana(hoy, 14, ciclos).map((c) => c.id)).toEqual([1, 2])
  })
  it('filtra las restricciones por la ventana', () => {
    const r = (id: number, inicio: string, fin: string) => ({ id, fecha_inicio: inicio, fecha_fin: fin }) as Restriccion
    const lista = [r(1, '2026-11-20', '2026-11-25'), r(2, '2026-11-25', '2026-11-26'), r(3, '2026-12-03', '2026-12-03')]
    expect(restriccionesDeLaVentana(hoy, 7, lista).map((x) => x.id)).toEqual([2])
    expect(restriccionesDeLaVentana(hoy, 14, lista).map((x) => x.id)).toEqual([2, 3])
  })
})

describe('resumen vigente', () => {
  const elegido = ciclo(7, 'EnCurso', '2026-11-24', '2026-11-27')
  const base: ResumenSectores = {
    ciclo_id: null,
    desde: '2026-11-24',
    hasta: '2026-11-27',
    generado_en: '2026-11-26T10:00:00-05:00',
    sectores: [],
  }
  it('descarta el resumen de otro ciclo mientras llega el nuevo', () => {
    expect(resumenDelCiclo({ ...base, ciclo_id: 7 }, elegido)).not.toBeNull()
    expect(resumenDelCiclo({ ...base, ciclo_id: 8 }, elegido)).toBeNull()
    expect(resumenDelCiclo({ ...base, ciclo_id: 7 }, null)).toBeNull()
  })
  it('descarta el resumen de otro periodo', () => {
    expect(resumenDelPeriodo(base, { desde: '2026-11-24', hasta: '2026-11-27' })).toBe(base)
    expect(resumenDelPeriodo(base, { desde: '2026-12-01', hasta: '2026-12-04' })).toBeNull()
    expect(resumenDelPeriodo({ ...base, ciclo_id: 7 }, { desde: '2026-11-24', hasta: '2026-11-27' })).toBeNull()
  })
})
