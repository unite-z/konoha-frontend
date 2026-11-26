// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { PERMISO_CONSULTA_REPORTES, PERMISO_SOLICITAR_IA, PERMISO_VALIDAR_IA } from '@/config/permisos'
import { ErrorApi } from '@/services/api/cliente'
import type { Paginado } from '@/types/comun'
import type { PropuestaCronograma, SugerenciaCronograma } from '@/types/cronogramaIa'
import BloqueKonohaPropone from './BloqueKonohaPropone'
import { cuerpoValidacion } from './adaptadorCronograma'
import { enPeriodo } from './periodo'

const api = vi.hoisted(() => ({
  listarCronogramas: vi.fn(),
  obtenerCronograma: vi.fn(),
  confirmarCronograma: vi.fn(),
  rechazarCronograma: vi.fn(),
  solicitarCronograma: vi.fn(),
  listarProgramacionExistente: vi.fn(),
  permisos: [] as string[],
}))
vi.mock('@/services/api/cronogramaIa', () => ({
  listarCronogramas: api.listarCronogramas,
  obtenerCronograma: api.obtenerCronograma,
  confirmarCronograma: api.confirmarCronograma,
  rechazarCronograma: api.rechazarCronograma,
  solicitarCronograma: api.solicitarCronograma,
  listarProgramacionExistente: api.listarProgramacionExistente,
  programacionExistenteDisponible: () => false,
}))
vi.mock('@/services/api/reportesGestion', () => ({
  obtenerCatalogoComparacion: vi.fn().mockResolvedValue({ espacios: [], tipos_servicio: [] }),
}))
vi.mock('@/sesion/ContextoSesion', () => ({ usePermisos: () => api.permisos }))

const CONSULTA = [PERMISO_CONSULTA_REPORTES]
const JEFE = [PERMISO_CONSULTA_REPORTES, PERMISO_SOLICITAR_IA, PERMISO_VALIDAR_IA]

function propuesta(clave: string, actividad: string, bloqueada = false): PropuestaCronograma {
  return {
    clave,
    tipo_servicio_id: 1,
    actividad,
    area_verde_id: 10,
    ubicacion: 'Jardín central',
    fecha_inicio: '2026-12-01',
    fecha_fin: '2026-12-03',
    recursos: {
      modalidad: 'PersonalPropio',
      cuadrilla_id: 4,
      cuadrilla: 'Cuadrilla 1',
      proveedor_id: null,
      proveedor: null,
      operarios: 3,
    },
    motivo: `Toca ${actividad}`,
    coincidencias: bloqueada
      ? [
          {
            fecha_inicio: '2026-12-01',
            fecha_fin: '2026-12-02',
            tipo: 'Prohibicion',
            descripcion: 'Evento de graduación',
            espacio: 'Jardín central',
          },
        ]
      : [],
  }
}

function sugerencia(sobre: Partial<SugerenciaCronograma> = {}): SugerenciaCronograma {
  return {
    id: 1,
    tipo: 'cronograma',
    entidad: 'cronograma',
    registro_id: 0,
    archivo_id: null,
    estado: 'Propuesta',
    etiqueta_estado: null,
    validador_id: null,
    fecha_validacion: null,
    fecha_creacion: '2026-11-25T15:00:00Z',
    usuario_creacion_id: 1,
    fecha_modificacion: null,
    usuario_modificacion_id: null,
    contenido: {
      ia: { proveedor: 'gemini', modelo: 'modelo-x', solicitado_en: '2026-11-25T15:00:00Z', duracion_ms: 10 },
      suficiencia: 'suficiente',
      faltantes: [],
      datos_utilizados: ['Historial de ciclos'],
      limitaciones: [],
      explicacion: 'Por frecuencia',
      version_contenido: 1,
      entrada: { desde: '2026-12-01', hasta: '2026-12-31', actividades_pendientes: 3 },
      criterios: ['Priorizar los espacios más atrasados'],
      restricciones: [],
      propuestas: [
        propuesta('a', 'Corte de césped'),
        propuesta('b', 'Riego profundo'),
        propuesta('c', 'Poda de setos', true),
      ],
      decision: null,
    },
    ...sobre,
  } as SugerenciaCronograma
}

const pagina = (...resultados: SugerenciaCronograma[]): Paginado<SugerenciaCronograma> => ({
  count: resultados.length,
  next: null,
  previous: null,
  results: resultados,
})

function montar(permisos: string[], ruta = '/n/planificacion') {
  api.permisos = permisos
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <BloqueKonohaPropone />
    </MemoryRouter>,
  )
}

beforeAll(() => {
  // jsdom no implementa `<dialog>`: se simula la apertura y el cierre.
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
  }
})
beforeEach(() => {
  api.listarCronogramas.mockResolvedValue(pagina(sugerencia()))
  api.obtenerCronograma.mockResolvedValue(sugerencia())
  api.confirmarCronograma.mockResolvedValue(sugerencia({ estado: 'Validada' }))
  api.rechazarCronograma.mockResolvedValue(sugerencia({ estado: 'Rechazada' }))
  api.listarProgramacionExistente.mockResolvedValue([])
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('bloque «Konoha propone»', () => {
  it('sin permiso de consulta no se muestra ni consulta', () => {
    const { container } = montar([])
    expect(container.innerHTML).toBe('')
    expect(api.listarCronogramas).not.toHaveBeenCalled()
  })

  it('con consulta muestra la última propuesta sin «Generar propuesta»', async () => {
    montar(CONSULTA)
    expect(await screen.findByText(/3 sugerencias · generada el/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Revisar propuesta' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Generar propuesta' })).toBeNull()
  })

  it('«Generar propuesta» aparece con IA.PROPUESTA.PROPONER y crea la propuesta', async () => {
    api.solicitarCronograma.mockResolvedValue(sugerencia({ id: 2 }))
    montar(JEFE)
    await userEvent.click(await screen.findByRole('button', { name: 'Generar propuesta' }))
    const dialogo = await screen.findByRole('dialog')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Generar propuesta' }))
    await waitFor(() => expect(api.solicitarCronograma).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(api.obtenerCronograma).toHaveBeenCalledWith(2, expect.anything()))
  })

  it('sin propuestas muestra el estado vacío', async () => {
    api.listarCronogramas.mockResolvedValue(pagina())
    montar(JEFE)
    expect(await screen.findByText('Aún no hay propuestas de cronograma')).toBeTruthy()
  })

  it('con error ofrece reintentar', async () => {
    api.listarCronogramas.mockRejectedValueOnce(new ErrorApi(500, null, 'Falló el servidor'))
    montar(CONSULTA)
    expect(await screen.findByText('No pudimos cargar la última propuesta')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: /Reintentar/ }))
    expect(await screen.findByText(/3 sugerencias · generada el/)).toBeTruthy()
  })

  it('con 403 muestra sin acceso y con 404 degrada sin romper la vista', async () => {
    api.listarCronogramas.mockRejectedValueOnce(new ErrorApi(403, null, 'Sin permiso'))
    montar(CONSULTA)
    expect(await screen.findByText('No puedes ver las propuestas')).toBeTruthy()
    cleanup()
    api.listarCronogramas.mockRejectedValueOnce(new ErrorApi(404, null, 'No existe'))
    montar(CONSULTA)
    expect(await screen.findByText('Konoha aún no propone cronogramas')).toBeTruthy()
  })

  it('el historial filtra por estado y por periodo', async () => {
    api.listarCronogramas.mockResolvedValue(pagina(sugerencia()))
    montar(CONSULTA)
    await userEvent.click(await screen.findByRole('button', { name: 'Ver el historial de propuestas' }))
    expect(await screen.findByLabelText('Propuestas anteriores')).toBeTruthy()
    await userEvent.selectOptions(screen.getByLabelText('Estado'), 'Validada')
    await waitFor(() =>
      expect(api.listarCronogramas).toHaveBeenCalledWith({ estado: 'Validada', page: 1 }, expect.anything()),
    )
    await userEvent.type(screen.getByLabelText('Desde'), '2027-02-01')
    expect(await screen.findByText('Sin propuestas con estos filtros')).toBeTruthy()
  })

  it('enPeriodo cruza el periodo de la propuesta con el intervalo', () => {
    const s = sugerencia()
    expect(enPeriodo(s, '', '')).toBe(true)
    expect(enPeriodo(s, '2026-12-31', '')).toBe(true)
    expect(enPeriodo(s, '2027-01-01', '')).toBe(false)
    expect(enPeriodo(s, '', '2026-11-30')).toBe(false)
  })
})

describe('panel de revisión', () => {
  const abierto = '/n/planificacion?propuesta=1'

  it('muestra el panel con las vistas y la sugerencia bloqueada por prohibición', async () => {
    montar(JEFE, abierto)
    expect(await screen.findByRole('tab', { name: 'Calendario' })).toBeTruthy()
    expect(screen.getByText('3 sugerencias para', { exact: false })).toBeTruthy()
    await userEvent.click(screen.getByRole('tab', { name: 'Lista' }))
    expect(screen.getAllByText('Poda de setos').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Coincide con una prohibición/).length).toBeGreaterThan(0)
    expect(screen.getByText('Propuesta: no es una programación confirmada')).toBeTruthy()
    expect(screen.getByText('Criterios y restricciones consideradas')).toBeTruthy()
    expect(screen.getByText('Priorizar los espacios más atrasados')).toBeTruthy()
  })

  /** Confirma en el diálogo «Confirmar planificación» y devuelve su texto. */
  async function confirmarEnDialogo() {
    const dialogo = await screen.findByRole('dialog', { name: 'Confirmar planificación' })
    const texto = dialogo.textContent ?? ''
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar planificación' }))
    return texto
  }

  it('aceptar, modificar y descartar cada sugerencia y confirmar solo lo decidido', async () => {
    montar(JEFE, abierto)
    await userEvent.click(await screen.findByRole('button', { name: 'Corregir' }))
    await userEvent.click(screen.getAllByRole('radio', { name: 'Aceptar' })[0])
    await userEvent.click(screen.getAllByRole('radio', { name: 'Descartar' })[2])
    // Al corregir, el diálogo de cambios se abre solo.
    await userEvent.click(screen.getAllByRole('radio', { name: 'Corregir' })[1])
    const modificar = await screen.findByRole('dialog', { name: 'Modificar propuesta' })
    const operarios = within(modificar).getByLabelText(/Operarios/)
    await userEvent.clear(operarios)
    await userEvent.type(operarios, '5')
    await userEvent.click(within(modificar).getByRole('button', { name: 'Guardar cambios' }))
    expect(screen.getByText('Aceptada: se programará')).toBeTruthy()
    expect(screen.getByText('Modificada: 3 → 5 operarios')).toBeTruthy()
    expect(screen.getByText('Descartada: no se programa')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Validar decisiones' }))
    expect(await confirmarEnDialogo()).toMatch(
      /Se programarán 2 actividades: 1 aceptadas y 1 modificadas\. 1 descartadas\./,
    )
    await waitFor(() => expect(api.confirmarCronograma).toHaveBeenCalledTimes(1))
    const [id, cuerpo] = api.confirmarCronograma.mock.calls[0]
    expect(id).toBe(1)
    expect(cuerpo.por_propuesta.a).toEqual({ accion: 'aceptar', valores_finales: null, confirma_restriccion: false })
    expect(cuerpo.por_propuesta.b.accion).toBe('corregir')
    expect(cuerpo.por_propuesta.b.valores_finales).toMatchObject({ fecha_inicio: '2026-12-01', operarios: 5 })
    expect(cuerpo.por_propuesta.c).toEqual({ accion: 'descartar', valores_finales: null, confirma_restriccion: false })
  })

  it('volver atrás en «Confirmar planificación» no envía nada', async () => {
    montar(JEFE, abierto)
    await userEvent.click(await screen.findByRole('button', { name: 'Corregir' }))
    await userEvent.click(screen.getAllByRole('radio', { name: 'Descartar' })[2])
    await userEvent.click(screen.getByRole('button', { name: 'Aceptar pendientes' }))
    await userEvent.click(screen.getByRole('button', { name: 'Validar decisiones' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Confirmar planificación' })
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Volver' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Confirmar planificación' })).toBeNull())
    expect(api.confirmarCronograma).not.toHaveBeenCalled()
  })

  it('una modificación sin cambios no se confirma', async () => {
    montar(JEFE, abierto)
    await userEvent.click(await screen.findByRole('button', { name: 'Corregir' }))
    await userEvent.click(screen.getAllByRole('radio', { name: 'Descartar' })[2])
    await userEvent.click(screen.getAllByRole('radio', { name: 'Corregir' })[0])
    const modificar = await screen.findByRole('dialog', { name: 'Modificar propuesta' })
    await userEvent.click(within(modificar).getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByText('Aún no has indicado los cambios')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Aceptar pendientes' }))
    await userEvent.click(screen.getByRole('button', { name: 'Validar decisiones' }))
    expect(await screen.findByText(/Indica los cambios de «Corte de césped · Jardín central»/)).toBeTruthy()
    expect(api.confirmarCronograma).not.toHaveBeenCalled()
  })

  it('una sugerencia bloqueada no se puede aceptar: avisa y no confirma', async () => {
    montar(JEFE, abierto)
    await userEvent.click(await screen.findByRole('button', { name: 'Corregir' }))
    await userEvent.click(screen.getAllByRole('radio', { name: 'Aceptar' })[2])
    expect(screen.getByText('Sugerencia bloqueada por una prohibición')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Aceptar pendientes' }))
    await userEvent.click(screen.getByRole('button', { name: 'Validar decisiones' }))
    expect(await screen.findByText(/1 sugerencia está bloqueada por una prohibición/)).toBeTruthy()
    expect(screen.queryByRole('dialog', { name: 'Confirmar planificación' })).toBeNull()
    expect(api.confirmarCronograma).not.toHaveBeenCalled()
  })

  it('descartar la propuesta pide el motivo opcional', async () => {
    montar(JEFE, abierto)
    await userEvent.click(await screen.findByRole('button', { name: 'Rechazar con motivo' }))
    await userEvent.type(screen.getByLabelText('Motivo del rechazo'), 'Fechas ya cubiertas')
    await userEvent.click(screen.getByRole('button', { name: 'Rechazar propuesta' }))
    await waitFor(() => expect(api.rechazarCronograma).toHaveBeenCalledWith(1, 'Fechas ya cubiertas'))
  })

  it('sin permiso de validar se ve sin acciones; ya confirmada muestra quién decidió', async () => {
    montar(CONSULTA, abierto)
    expect(await screen.findByRole('tab', { name: 'Calendario' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Aplicar' })).toBeNull()
    expect(screen.getByText(/Solo la jefatura de sección puede confirmar/)).toBeTruthy()
    cleanup()
    api.obtenerCronograma.mockResolvedValue(
      sugerencia({
        estado: 'Validada',
        validador_id: 7,
        fecha_validacion: '2026-11-26T15:00:00Z',
        contenido: {
          ...sugerencia().contenido,
          decision: {
            por_propuesta: {
              a: { accion: 'aceptar', valores_finales: null, confirma_restriccion: false },
              b: { accion: 'descartar', valores_finales: null, confirma_restriccion: false },
              c: { accion: 'descartar', valores_finales: null, confirma_restriccion: false },
            },
            resumen: { aceptados: 1, corregidos: 0, descartados: 2 },
            programaciones_creadas: [5],
            motivo_rechazo: null,
          },
        },
      }),
    )
    montar(CONSULTA, abierto)
    expect(await screen.findAllByText(/Decidido por la persona n\.º 7/)).toHaveLength(3)
    expect(screen.getByText(/Programaciones creadas: 1/)).toBeTruthy()
  })

  it('con error al cargar la propuesta ofrece reintentar', async () => {
    api.obtenerCronograma.mockRejectedValueOnce(new ErrorApi(500, null, 'Falló'))
    montar(JEFE, abierto)
    expect(await screen.findByText('No se pudo cargar')).toBeTruthy()
  })
})

describe('cuerpoValidacion', () => {
  it('no incluye valores finales salvo al modificar', () => {
    const p = [propuesta('a', 'Corte')]
    const cuerpo = cuerpoValidacion(p, { a: { accion: 'aceptar', valorFinal: null } })
    expect(cuerpo.por_propuesta.a.valores_finales).toBeNull()
  })
})
