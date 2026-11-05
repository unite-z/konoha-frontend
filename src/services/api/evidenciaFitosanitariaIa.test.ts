import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  descartarEvidencia,
  listarAnalisisEvidencia,
  obtenerAnalisisEvidencia,
  obtenerFotografia,
  registrarEvaluacionManual,
  solicitarAnalisisEvidencia,
  validarEvidencia,
} from './evidenciaFitosanitariaIa'

vi.mock('@/config/datosSimulados', () => ({ DATOS_SIMULADOS: false }))

afterEach(() => {
  vi.unstubAllGlobals()
})

function capturar(cuerpo: unknown = { id: 1 }, status = 200) {
  const peticion = vi.fn((_url: string, _opciones: RequestInit) => Promise.resolve(new Response(JSON.stringify(cuerpo), { status })))
  vi.stubGlobal('fetch', peticion)
  return peticion
}

const VALIDACION = { resultado: 'NoConcluyente' as const, hipotesis_clave: null, categoria: null, plaga_id: null, nombre: null, comentario: null }

describe('evidencia fitosanitaria con el backend (RF-IA-006)', () => {
  it('lista con sus filtros y envía el análisis en multipart', async () => {
    const peticion = capturar({ count: 0, next: null, previous: null, results: [] })
    await listarAnalisisEvidencia({ estado: 'Validada', page: 2 })
    const foto = new File(['x'], 'hoja.jpg', { type: 'image/jpeg' })
    await solicitarAnalisisEvidencia({ ejemplar_id: 412, sintomas: 'Manchas' }, [foto])
    expect(peticion.mock.calls[0][0]).toBe('/api/v1/ia/evidencias-fitosanitarias/?estado=Validada&page=2')
    const [url, opciones] = peticion.mock.calls[1]
    expect(`${opciones.method} ${url}`).toBe('POST /api/v1/ia/evidencias-fitosanitarias/')
    const cuerpo = opciones.body as FormData
    expect(JSON.parse(String(cuerpo.get('datos')))).toEqual({ ejemplar_id: 412, sintomas: 'Manchas' })
    expect((cuerpo.get('fotografias') as File).name).toBe('hoja.jpg')
  })

  it('obtiene, valida, descarta y registra en manual con sus rutas y cuerpos', async () => {
    const peticion = capturar()
    await obtenerAnalisisEvidencia(5)
    await validarEvidencia(5, VALIDACION)
    await descartarEvidencia(5, '')
    await registrarEvaluacionManual({ ...VALIDACION, ejemplar_id: 412, atencion_id: null })
    expect(peticion.mock.calls.map(([url, o]) => `${o.method} ${url}`)).toEqual([
      'GET /api/v1/ia/evidencias-fitosanitarias/5/',
      'POST /api/v1/ia/evidencias-fitosanitarias/5/validar/',
      'POST /api/v1/ia/evidencias-fitosanitarias/5/rechazar/',
      'POST /api/v1/ia/evidencias-fitosanitarias/manual/',
    ])
    expect(JSON.parse(String(peticion.mock.calls[2][1].body))).toEqual({ motivo: null })
  })

  it('pide la fotografía como blob y el 503 de la IA llega como ErrorApi', async () => {
    const peticion = vi.fn((_url: string) => Promise.resolve(new Response(new Blob(['img'], { type: 'image/jpeg' }))))
    vi.stubGlobal('fetch', peticion)
    const blob = await obtenerFotografia(5, 9001)
    expect(peticion.mock.calls[0][0]).toBe('/api/v1/ia/evidencias-fitosanitarias/5/fotografias/9001/')
    expect(blob.type).toBe('image/jpeg')

    capturar({ codigo: 'ia-no-disponible', detalle: 'IA no disponible' }, 503)
    await expect(solicitarAnalisisEvidencia({ ejemplar_id: 1 }, [])).rejects.toMatchObject({ estado: 503 })
  })
})
