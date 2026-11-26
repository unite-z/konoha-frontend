// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { PERMISO_CONSULTA_REPORTES, PERMISO_SOLICITAR_IA, PERMISO_VALIDAR_IA } from '@/config/permisos'
import { ErrorApi } from '@/services/api/cliente'
import type { Paginado } from '@/types/comun'
import type { HipotesisFitosanitaria, SugerenciaEvidencia } from '@/types/evidenciaFitosanitariaIa'
import { cuerpoDesdeDecisiones } from './adaptadorEvidencia'
import EvidenciaKonoha from './EvidenciaKonoha'
import PuntoEntradaEvidencia from './PuntoEntradaEvidencia'

const permisosSesion = vi.hoisted(() => ({ valor: [] as string[] | null }))
vi.mock('@/sesion/ContextoSesion', () => ({ usePermisos: () => permisosSesion.valor, useSesionActiva: () => null }))

const api = vi.hoisted(() => ({
  listarAnalisisEvidencia: vi.fn(),
  obtenerAnalisisEvidencia: vi.fn(),
  obtenerFotografia: vi.fn(),
  validarEvidencia: vi.fn(),
  descartarEvidencia: vi.fn(),
  registrarEvaluacionManual: vi.fn(),
  solicitarAnalisisEvidencia: vi.fn(),
  buscarAtencionesEvidencia: vi.fn(),
  buscarEjemplaresEvidencia: vi.fn(),
  buscarPlagas: vi.fn(),
}))
vi.mock('@/services/api/evidenciaFitosanitariaIa', () => api)

const CONSULTA = [PERMISO_CONSULTA_REPORTES]
const SOLICITA = [PERMISO_CONSULTA_REPORTES, PERMISO_SOLICITAR_IA]
const JEFE = [PERMISO_CONSULTA_REPORTES, PERMISO_SOLICITAR_IA, PERMISO_VALIDAR_IA]

const QUERESA: HipotesisFitosanitaria = {
  clave: 'queresa',
  categoria: 'Plaga',
  nombre: 'Queresa',
  plaga_id: 1,
  confianza: 0.62,
  nivel_confianza: 'Media',
  evidencias: ['Puntos blancos en el envés'],
}
const FUMAGINA: HipotesisFitosanitaria = {
  clave: 'fumagina',
  categoria: 'Enfermedad',
  nombre: 'Fumagina',
  plaga_id: 2,
  confianza: 0.31,
  nivel_confianza: 'Baja',
  evidencias: ['Hojas con hollín'],
}

function analisis(
  extra: Partial<SugerenciaEvidencia['contenido']> = {},
  estado: SugerenciaEvidencia['estado'] = 'Propuesta',
) {
  return {
    id: 9,
    tipo: 'EvidenciaFitosanitaria',
    entidad: 'Ejemplar',
    registro_id: 412,
    archivo_id: null,
    estado,
    etiqueta_estado: null,
    validador_id: null,
    fecha_validacion: null,
    fecha_creacion: '2026-11-25T15:00:00Z',
    usuario_creacion_id: 1,
    fecha_modificacion: '2026-11-25T15:00:00Z',
    usuario_modificacion_id: 1,
    contenido: {
      version_contenido: 1,
      origen: 'ia',
      ia: { proveedor: 'gemini', modelo: 'modelo-x', solicitado_en: '2026-11-25T15:00:00Z', duracion_ms: 10 },
      suficiencia: 'suficiente',
      faltantes: [],
      datos_utilizados: ['2 fotografías'],
      limitaciones: ['No indica tratamientos'],
      explicacion: 'Criterios visuales',
      ejemplar: { id: 412, codigo: 'EJ-00412', especie: 'Ficus', espacio: 'Jardín Central' },
      atencion: { id: 7, codigo: 'AT-2026-007' },
      sintomas: null,
      fotografias: [
        { archivo_id: 1, nombre: 'foto-1.jpg', calidad: 'Suficiente', motivo_calidad: null },
        { archivo_id: 2, nombre: 'foto-2.jpg', calidad: 'Insuficiente', motivo_calidad: 'Foto movida' },
      ],
      calidad_suficiente: true,
      contexto_reducido: false,
      hipotesis: [FUMAGINA, QUERESA],
      validacion: null,
      validada_por: null,
      ...extra,
    },
  } satisfies SugerenciaEvidencia
}

const PLANTA = {
  id: 7,
  plaga: 'Queresa',
  ejemplar: { id: 412, codigo: 'EJ-00412', especie: null, espacio: 'Jardín Central' },
}

const pagina = (...resultados: SugerenciaEvidencia[]): Paginado<SugerenciaEvidencia> => ({
  count: resultados.length,
  next: null,
  previous: null,
  results: resultados,
})

function montar(ui: React.ReactElement) {
  const router = createMemoryRouter([{ path: '*', element: ui }])
  return render(<RouterProvider router={router} />)
}

beforeAll(() => {
  // jsdom no implementa estas APIs que usan la hoja y el diálogo.
  HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
    this.open = false
  }
})

beforeEach(() => {
  permisosSesion.valor = JEFE
  api.listarAnalisisEvidencia.mockResolvedValue(pagina(analisis()))
  api.obtenerAnalisisEvidencia.mockResolvedValue(analisis())
  api.obtenerFotografia.mockRejectedValue(new ErrorApi(404, null, 'sin imagen'))
  api.validarEvidencia.mockResolvedValue(analisis({}, 'Validada'))
  api.descartarEvidencia.mockResolvedValue(analisis({}, 'Rechazada'))
  api.buscarAtencionesEvidencia.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
  api.buscarEjemplaresEvidencia.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const objetivo = { tipo: 'atencion', id: 7 } as const

describe('EvidenciaKonoha · permisos y estados', () => {
  it('sin el permiso de entrada no pinta nada en la ficha y no consulta', () => {
    permisosSesion.valor = []
    const { container } = montar(<EvidenciaKonoha objetivo={objetivo} />)
    expect(container.innerHTML).toBe('')
    expect(api.listarAnalisisEvidencia).not.toHaveBeenCalled()
  })

  it('sin el permiso de entrada, la vista propia muestra «sin acceso»', () => {
    permisosSesion.valor = []
    montar(<EvidenciaKonoha objetivo={objetivo} mostrarSinAcceso />)
    expect(screen.getByText('No puedes ver el análisis')).toBeTruthy()
  })

  it('solo consulta: ve el último análisis, sin «Nuevo análisis»', async () => {
    permisosSesion.valor = CONSULTA
    montar(<EvidenciaKonoha objetivo={objetivo} />)
    expect(await screen.findByText('Queresa · Media')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Nuevo análisis' })).toBeNull()
  })

  it('con permiso de solicitar ve «Nuevo análisis»', async () => {
    permisosSesion.valor = SOLICITA
    montar(<EvidenciaKonoha objetivo={objetivo} />)
    expect(await screen.findByRole('button', { name: 'Nuevo análisis' })).toBeTruthy()
  })

  it('estado vacío: aún no hay análisis de la atención', async () => {
    api.listarAnalisisEvidencia.mockResolvedValue(pagina())
    montar(<EvidenciaKonoha objetivo={objetivo} />)
    expect(await screen.findByText('Aún no se ha analizado la evidencia')).toBeTruthy()
  })

  it('error: lo cuenta y deja reintentar', async () => {
    api.listarAnalisisEvidencia.mockRejectedValueOnce(new ErrorApi(500, null, 'Servidor caído'))
    montar(<EvidenciaKonoha objetivo={objetivo} />)
    expect(await screen.findByText('No pudimos cargar el último análisis')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }))
    expect(await screen.findByText('Queresa · Media')).toBeTruthy()
  })

  it('403 del servidor: «sin acceso»', async () => {
    api.listarAnalisisEvidencia.mockRejectedValue(new ErrorApi(403, null, 'No'))
    montar(<EvidenciaKonoha objetivo={objetivo} />)
    expect(await screen.findByText('No puedes ver los análisis')).toBeTruthy()
  })

  it('404 del servidor: degrada con elegancia', async () => {
    api.listarAnalisisEvidencia.mockRejectedValue(new ErrorApi(404, null, 'No existe'))
    montar(<EvidenciaKonoha objetivo={objetivo} />)
    expect(await screen.findByText('Konoha aún no revisa evidencia')).toBeTruthy()
  })

  it('el último análisis es el de la atención, no el de otra', async () => {
    const otra = { ...analisis({ atencion: { id: 99, codigo: 'AT-99' } }), id: 10 }
    api.listarAnalisisEvidencia.mockResolvedValue(pagina(otra, analisis()))
    montar(<EvidenciaKonoha objetivo={objetivo} abiertoInicial />)
    await waitFor(() => expect(api.obtenerAnalisisEvidencia).toHaveBeenCalledWith(9, expect.anything()))
  })
})

describe('EvidenciaKonoha · revisión', () => {
  it('«Revisar análisis» despliega la revisión: calidad con motivo y ninguna hipótesis preseleccionada', async () => {
    montar(<EvidenciaKonoha objetivo={objetivo} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Revisar análisis' }))
    expect(await screen.findByRole('heading', { name: 'Konoha propone' })).toBeTruthy()
    expect(screen.getByText('Foto movida')).toBeTruthy()
    // Por confianza: primero la más alta.
    const nombres = screen.getAllByRole('article').map((a) => a.getAttribute('aria-label'))
    expect(nombres).toEqual(['Hipótesis: Queresa', 'Hipótesis: Fumagina'])
    await userEvent.click(screen.getByRole('button', { name: 'Corregir' }))
    const decisiones = screen.getByRole('region', { name: /decisiones por elemento/i })
    expect(within(decisiones).getByText('No es posible concluir')).toBeTruthy()
    expect(within(decisiones).queryAllByRole('radio', { checked: true })).toHaveLength(0)
    expect(within(decisiones).queryAllByRole('button', { pressed: true })).toHaveLength(0)
  })

  it('la vista no sugiere ningún tratamiento', async () => {
    montar(<EvidenciaKonoha objetivo={objetivo} abiertoInicial />)
    await screen.findByRole('heading', { name: 'Konoha propone' })
    expect(document.body.textContent).toMatch(/nunca se indica un tratamiento/i)
    expect(document.body.textContent).not.toMatch(
      /\b(dosis|fungicida|insecticida|pesticida|aplica(r)? (el|un) producto)\b/i,
    )
  })

  it('aceptar una hipótesis y descartar el resto registra la validación técnica', async () => {
    montar(<EvidenciaKonoha objetivo={objetivo} abiertoInicial />)
    await userEvent.click(await screen.findByRole('button', { name: 'Corregir' }))
    const decisiones = await screen.findByRole('region', { name: /decisiones por elemento/i })
    // Orden de los elementos: Queresa, Fumagina y «No es posible concluir».
    const opcion = (nombre: string) => within(decisiones).getAllByRole('radio', { name: nombre })
    expect(opcion('Aceptar')).toHaveLength(3)
    await userEvent.click(opcion('Aceptar')[0])
    await userEvent.click(opcion('Descartar')[1])
    await userEvent.click(opcion('Descartar')[2])
    await userEvent.click(screen.getByRole('button', { name: 'Validar decisiones' }))
    await waitFor(() => expect(api.validarEvidencia).toHaveBeenCalledTimes(1))
    expect(api.validarEvidencia.mock.calls[0][1]).toMatchObject({ resultado: 'Confirmada', hipotesis_clave: 'queresa' })
  })

  it('sin permiso de validar se ve en modo lectura', async () => {
    permisosSesion.valor = SOLICITA
    montar(<EvidenciaKonoha objetivo={objetivo} abiertoInicial />)
    await screen.findByRole('heading', { name: 'Konoha propone' })
    expect(screen.queryByRole('button', { name: 'Validar decisiones' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Rechazar con motivo' })).toBeNull()
  })

  it('con fotos insuficientes ofrece subir nuevas fotos y la evaluación manual', async () => {
    const insuficiente = analisis({
      calidad_suficiente: false,
      hipotesis: [],
      fotografias: [{ archivo_id: 2, nombre: 'foto-2.jpg', calidad: 'Insuficiente', motivo_calidad: 'Foto movida' }],
    })
    api.obtenerAnalisisEvidencia.mockResolvedValue(insuficiente)
    montar(<EvidenciaKonoha objetivo={objetivo} abiertoInicial />)
    expect(await screen.findByText(/foto-2.jpg: Foto movida/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Subir nuevas fotografías' })).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Registrar evaluación manual' }).length).toBeGreaterThan(0)
  })

  it('«Nuevo análisis» abre en las fotos con la planta de la atención y admite de 1 a 5', async () => {
    permisosSesion.valor = SOLICITA
    montar(<EvidenciaKonoha objetivo={objetivo} plantaAtencion={PLANTA} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo análisis' }))
    const dialogo = await screen.findByRole('dialog', { name: /nuevo análisis/i })
    expect(within(dialogo).getByText('EJ-00412 · especie no identificada')).toBeTruthy()
    const entrada = dialogo.querySelector<HTMLInputElement>('input[type="file"]')
    if (!entrada) throw new Error('sin entrada de fotos')
    const fotos = Array.from({ length: 6 }, (_, i) => new File(['x'], `foto-${i + 1}.jpg`, { type: 'image/jpeg' }))
    await userEvent.upload(entrada, fotos)
    expect(within(dialogo).getAllByRole('button', { name: 'Quitar' })).toHaveLength(5)
    expect(within(dialogo).getByText('foto-6.jpg: solo se admiten 5 fotografías')).toBeTruthy()
    expect(api.buscarAtencionesEvidencia).not.toHaveBeenCalled()
  })

  it('una atención sin ejemplar en su alcance no ofrece «Nuevo análisis» y lo explica', async () => {
    permisosSesion.valor = SOLICITA
    montar(<EvidenciaKonoha objetivo={objetivo} plantaAtencion={null} />)
    expect(await screen.findByText(/no tiene un ejemplar en su alcance/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Nuevo análisis' })).toBeNull()
  })

  it('sin permiso de validar avisa de que solo la jefatura valida', async () => {
    permisosSesion.valor = SOLICITA
    montar(<EvidenciaKonoha objetivo={objetivo} abiertoInicial />)
    expect(await screen.findByText(/Solo la jefatura de sección puede validar/)).toBeTruthy()
  })

  it('«Aplicar» no elige por la persona: con varias opciones no registra nada', async () => {
    montar(<EvidenciaKonoha objetivo={objetivo} abiertoInicial />)
    await userEvent.click(await screen.findByRole('button', { name: 'Aplicar' }))
    expect(await screen.findByText(/Elige una sola opción/)).toBeTruthy()
    expect(api.validarEvidencia).not.toHaveBeenCalled()
  })

  it('corregir a Plaga ofrece la plaga del catálogo y exige elegir la otra categoría', async () => {
    montar(<EvidenciaKonoha objetivo={objetivo} abiertoInicial />)
    await userEvent.click(await screen.findByRole('button', { name: 'Corregir' }))
    const decisiones = await screen.findByRole('region', { name: /decisiones por elemento/i })
    await userEvent.click(within(decisiones).getAllByRole('radio', { name: 'Corregir' })[0])
    await userEvent.click(within(decisiones).getAllByRole('radio', { name: 'Descartar' })[1])
    await userEvent.click(within(decisiones).getAllByRole('radio', { name: 'Descartar' })[2])
    const categoria = within(decisiones).getByRole('combobox', { name: /otra categoría de afectación/i })
    // Al corregir no queda elegida la categoría de la hipótesis.
    expect((categoria as HTMLSelectElement).value).toBe('')
    await userEvent.click(screen.getByRole('button', { name: 'Validar decisiones' }))
    expect(await screen.findByText('Elige la otra categoría de afectación.')).toBeTruthy()
    expect(api.validarEvidencia).not.toHaveBeenCalled()
    await userEvent.selectOptions(categoria, 'Plaga')
    expect(within(decisiones).getByRole('combobox', { name: /^plaga/i })).toBeTruthy()
  })

  it('validado a otra categoría: muestra el resultado y el comentario técnico', async () => {
    const validado = analisis(
      {
        validacion: {
          resultado: 'OtraCategoria',
          hipotesis_clave: null,
          categoria: 'DanoMecanico',
          plaga_id: null,
          nombre: 'Rama desgajada',
          comentario: 'Golpe de la podadora',
        },
        validada_por: 'Óscar Ramos',
      },
      'Validada',
    )
    api.listarAnalisisEvidencia.mockResolvedValue(pagina(validado))
    api.obtenerAnalisisEvidencia.mockResolvedValue(validado)
    montar(<EvidenciaKonoha objetivo={objetivo} abiertoInicial />)
    expect(await screen.findByText(/Otra categoría: Daño mecánico · Rama desgajada/)).toBeTruthy()
    expect(screen.getByText('Comentario técnico: Golpe de la podadora')).toBeTruthy()
  })
})

describe('cuerpoDesdeDecisiones', () => {
  const hipotesis = [QUERESA, FUMAGINA]
  const valor = (h: HipotesisFitosanitaria) => ({
    clave: h.clave,
    categoria: h.categoria,
    nombre: h.nombre,
    plaga_id: h.plaga_id,
  })
  const noConcluye = { clave: null, categoria: null, nombre: null, plaga_id: null }

  it('una hipótesis aceptada es una confirmación', () => {
    const cuerpo = cuerpoDesdeDecisiones(hipotesis, {
      queresa: { accion: 'aceptar', valorFinal: valor(QUERESA), comentario: 'Se ve en el envés' },
      fumagina: { accion: 'descartar', valorFinal: null },
    })
    expect(cuerpo).toMatchObject({
      resultado: 'Confirmada',
      hipotesis_clave: 'queresa',
      comentario: 'Se ve en el envés',
    })
  })

  it('«No es posible concluir» queda pendiente de diagnóstico', () => {
    const cuerpo = cuerpoDesdeDecisiones(hipotesis, {
      queresa: { accion: 'descartar', valorFinal: null },
      'no-concluyente': { accion: 'aceptar', valorFinal: noConcluye },
    })
    expect(cuerpo).toMatchObject({ resultado: 'NoConcluyente', hipotesis_clave: null })
  })

  it('corregir una hipótesis registra otra categoría', () => {
    const cuerpo = cuerpoDesdeDecisiones(hipotesis, {
      queresa: {
        accion: 'corregir',
        valorFinal: { clave: null, categoria: 'DanoMecanico', nombre: 'Rama desgajada', plaga_id: null },
      },
    })
    expect(cuerpo).toMatchObject({ resultado: 'OtraCategoria', categoria: 'DanoMecanico', nombre: 'Rama desgajada' })
  })

  it('nunca elige por la persona: sin opción, con varias o sin categoría lanza un 422', () => {
    expect(() => cuerpoDesdeDecisiones(hipotesis, { queresa: { accion: 'descartar', valorFinal: null } })).toThrow(
      ErrorApi,
    )
    expect(() =>
      cuerpoDesdeDecisiones(hipotesis, {
        queresa: { accion: 'aceptar', valorFinal: valor(QUERESA) },
        fumagina: { accion: 'aceptar', valorFinal: valor(FUMAGINA) },
      }),
    ).toThrow(/una sola opción/)
    expect(() => cuerpoDesdeDecisiones(hipotesis, { queresa: { accion: 'corregir', valorFinal: noConcluye } })).toThrow(
      /categoría/,
    )
  })
})

describe('puntos de entrada', () => {
  function UbicacionActual() {
    const { pathname, search } = useLocation()
    return <p>{`ahora: ${pathname}${search}`}</p>
  }

  function enRuta(ruta: string) {
    const router = createMemoryRouter(
      [
        {
          path: '/n/proveedores/fitosanitario',
          element: <PuntoEntradaEvidencia>control fitosanitario</PuntoEntradaEvidencia>,
        },
        { path: '/n/proveedores/atenciones/:id', element: <UbicacionActual /> },
      ],
      { initialEntries: [ruta] },
    )
    return render(<RouterProvider router={router} />)
  }

  it('?ejemplar_id= abre el análisis de ese ejemplar', async () => {
    api.listarAnalisisEvidencia.mockResolvedValue(pagina(analisis()))
    enRuta('/n/proveedores/fitosanitario?ejemplar_id=412')
    expect(await screen.findByRole('heading', { level: 1, name: 'Evidencia del ejemplar n.º 412' })).toBeTruthy()
    expect(await screen.findByText('Queresa · Media')).toBeTruthy()
  })

  it('?atencion_id= lleva a la ficha de la atención con la revisión abierta', async () => {
    enRuta('/n/proveedores/fitosanitario?atencion_id=7')
    expect(await screen.findByText('ahora: /n/proveedores/atenciones/7?evidencia=1')).toBeTruthy()
  })

  it('sin parámetros deja pasar el control fitosanitario', () => {
    enRuta('/n/proveedores/fitosanitario')
    expect(screen.getByText('control fitosanitario')).toBeTruthy()
  })
})
