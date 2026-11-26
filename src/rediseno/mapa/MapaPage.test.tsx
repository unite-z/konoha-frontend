// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { PERMISOS } from '@/config/permisosCore'
import { ErrorApi } from '@/services/api/cliente'
import type { AreaVerde } from '@/types/areasVerdes'
import type { EjemplarInventario } from '@/types/ejemplares'
import type { PoligonoMapaAsignado } from '@/types/mapaInventario'
import { rutasMapa } from './rutas'
import { RUTA_MAPA } from './enlaces'

const api = vi.hoisted(() => ({
  listarAreasVerdes: vi.fn(),
  obtenerAreaVerde: vi.fn(),
  listarPoligonosMapa: vi.fn(),
  listarEjemplares: vi.fn(),
  listarEjemplaresDeArea: vi.fn(),
  listarEjemplaresDePoligono: vi.fn(),
  cargarResumenArea: vi.fn(),
  marcadores: [] as { id: string }[],
  activarMarcador: null as null | ((m: { id: string }) => void),
  listarSectores: vi.fn(),
  listarTiposUso: vi.fn(),
  listarCuarteles: vi.fn(),
  permisos: [] as string[],
  seleccionar: null as null | ((area: unknown) => void),
  vista: vi.fn(),
}))
vi.mock('@/services/api/areasVerdes', () => ({
  listarAreasVerdes: api.listarAreasVerdes,
  obtenerAreaVerde: api.obtenerAreaVerde,
}))
vi.mock('@/services/api/mapaAsignaciones', () => ({
  listarPoligonosMapa: api.listarPoligonosMapa,
  listarEjemplaresDePoligono: api.listarEjemplaresDePoligono,
}))
vi.mock('@/services/api/resumenArea', () => ({ cargarResumenArea: api.cargarResumenArea }))
vi.mock('@/services/api/ejemplares', () => ({
  listarEjemplares: api.listarEjemplares,
  listarEjemplaresDeArea: api.listarEjemplaresDeArea,
}))
vi.mock('@/services/api/catalogosInventario', () => ({
  listarSectores: api.listarSectores,
  listarTiposUso: api.listarTiposUso,
  listarCuarteles: api.listarCuarteles,
}))
vi.mock('@/sesion/ContextoSesion', () => ({ usePermisos: () => api.permisos }))
// La ficha se prueba en `FichaEjemplar.test.tsx`; aquí solo importa cuándo se abre y con qué.
vi.mock('./FichaEjemplar/FichaEjemplar', () => ({
  default: (props: {
    ejemplarId: number
    inicial: { codigo: string } | null
    propuestaMuerto?: boolean
    onCerrar: () => void
  }) => (
    <div role="dialog" aria-label={`Ficha ${props.inicial?.codigo ?? props.ejemplarId}`}>
      {props.propuestaMuerto && <p>Propuesta de planta muerta</p>}
      <button onClick={props.onCerrar}>Cerrar ficha</button>
    </div>
  ),
}))
vi.mock('../base/Escenario', () => ({
  useVistaDeMapa: (opciones: { areaSeleccionada?: string; onSeleccionarArea: (a: unknown) => void }) => {
    api.vista(opciones.areaSeleccionada)
    api.seleccionar = opciones.onSeleccionarArea
    return { volarA: () => undefined, volver: () => undefined }
  },
}))
vi.mock('@/pages/inventario/AreaVerdeForm', () => ({
  default: ({ alGuardar, alCancelar }: { alGuardar: (a: { id: number }) => void; alCancelar: () => void }) => (
    <div>
      <p>Formulario de alta</p>
      <button onClick={() => alGuardar({ id: 77 })}>Guardar área</button>
      <button onClick={alCancelar}>Cancelar</button>
    </div>
  ),
}))
vi.mock('../base/MapaCampus/CapaColores', () => ({ default: () => null }))
vi.mock('../base/MapaCampus/CapaGeometrias', () => ({ default: () => null }))
vi.mock('../base/MapaCampus/CapaMarcadores', () => ({
  default: (props: { marcadores: { id: string }[]; onActivar: (m: { id: string }) => void }) => {
    api.marcadores = props.marcadores
    api.activarMarcador = props.onActivar
    return null
  },
}))

const area = (id: number, nombre: string, extra: Partial<AreaVerde> = {}): AreaVerde => ({
  id,
  nombre,
  lugar: '',
  ubicacion: '',
  superficie_m2: '1200',
  tipo_cobertura_id: null,
  tipo_cobertura_nombre: null,
  tipo_uso_id: 1,
  tipo_uso_nombre: 'Jardín',
  sector_id: 1,
  sector_nombre: 'Sector A',
  cuartel_id: 2,
  cuartel_numero: '2',
  activo: true,
  ...extra,
})
const poligono = (id: string, areaId: number | null): PoligonoMapaAsignado => ({
  id_fuente: id,
  area_verde_id: areaId,
  area_verde_nombre: null,
  area_verde_tipo_uso_id: null,
  area_verde_tipo_uso_nombre: null,
  superficie_registrada_m2: null,
  area_verde_activa: true,
})
const ejemplar = {
  id: 9,
  codigo: 'ARB-009',
  codigo_placa_antigua: 'P-77',
  especie_nombre_comun: 'Ficus',
  area_verde_id: 12,
  area_verde_nombre: 'Bosque',
  latitud: -12,
  longitud: -77,
} as EjemplarInventario

const resumen = (areaId: number, nombre: string) => ({
  area: area(areaId, nombre),
  ejemplares_por_situacion: { activo: 3 },
  incidencias_abiertas: 2,
  ultima_atencion: null,
  proxima_actividad: null,
  prioridad_validada: null,
  fuentes_visibles: [],
  historial: { count: 0, next: null, previous: null, results: [] },
})

// jsdom no implementa showModal ni close de <dialog>.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})

const LECTURA = [PERMISOS.consultarInventario]
const JEFE = [PERMISOS.consultarInventario, PERMISOS.registrarInventario]

function Ubicacion() {
  return <output data-testid="ubicacion">{useLocation().search}</output>
}

function pagina(inicial: string) {
  const ruta = rutasMapa[0].children?.[0].Component
  if (!ruta) throw new Error('Sin componente')
  const Pagina = ruta
  const router = createMemoryRouter(
    [
      {
        path: RUTA_MAPA,
        element: (
          <>
            <Pagina />
            <Ubicacion />
          </>
        ),
      },
    ],
    { initialEntries: [inicial] },
  )
  return { ...render(<RouterProvider router={router} />), router }
}

beforeEach(() => {
  api.permisos = JEFE
  api.listarAreasVerdes.mockResolvedValue({
    count: 2,
    next: null,
    previous: null,
    results: [area(12, 'Bosque Húmedo'), area(13, 'Jardín Letras', { sector_nombre: 'Sector B' })],
  })
  api.listarPoligonosMapa.mockResolvedValue([poligono('m12', 12), poligono('m99', null)])
  api.listarEjemplares.mockResolvedValue([ejemplar])
  api.listarSectores.mockResolvedValue([{ id: 1, nombre: 'Sector A', activo: true }])
  api.listarTiposUso.mockResolvedValue([{ id: 1, nombre: 'Jardín', activo: true, color: '' }])
  api.listarCuarteles.mockResolvedValue([{ id: 2, numero: '2', nombre: 'Letras', estado: 'vigente' }])
  api.obtenerAreaVerde.mockResolvedValue(area(40, 'Área suelta'))
  api.cargarResumenArea.mockImplementation((id: number) =>
    Promise.resolve(resumen(id, id === 12 ? 'Bosque Húmedo' : `Área ${id}`)),
  )
  api.listarEjemplaresDePoligono.mockResolvedValue([ejemplar])
  api.listarEjemplaresDeArea.mockResolvedValue([ejemplar])
  api.marcadores = []
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Mapa (RD-17)', () => {
  it('con permiso de registro lista las áreas y enseña «Registrar área»', async () => {
    pagina(RUTA_MAPA)
    expect(await screen.findByRole('button', { name: /Bosque Húmedo/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Jardín Letras/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Registrar área/ })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Mapa del campus' })).toBeTruthy()
  })

  it('el capataz lo ve en lectura: sin «Registrar área»', async () => {
    api.permisos = LECTURA
    pagina(RUTA_MAPA)
    await screen.findByRole('button', { name: /Bosque Húmedo/ })
    expect(screen.queryByRole('button', { name: /Registrar área/ })).toBeNull()
  })

  it('sin permiso de consulta no monta el mapa ni pide datos', () => {
    api.permisos = []
    pagina(RUTA_MAPA)
    expect(screen.getByText('No tienes acceso al mapa')).toBeTruthy()
    expect(api.vista).not.toHaveBeenCalled()
    expect(api.listarAreasVerdes).not.toHaveBeenCalled()
  })

  it('un 403 del servidor enseña «sin acceso»', async () => {
    api.listarAreasVerdes.mockRejectedValue(new ErrorApi(403, null, 'Prohibido'))
    pagina(RUTA_MAPA)
    expect(await screen.findByText('No tienes acceso al mapa')).toBeTruthy()
  })

  it('elegir una fila selecciona su contorno en el mapa y lo deja en la URL', async () => {
    pagina(RUTA_MAPA)
    await userEvent.click(await screen.findByRole('button', { name: /Bosque Húmedo/ }))
    expect(screen.getByTestId('ubicacion').textContent).toBe('?area=12')
    await waitFor(() => expect(api.vista).toHaveBeenLastCalledWith('m12'))
    // La fila se transforma en el panel del área: la lista cede su sitio.
    expect(await screen.findByRole('heading', { name: 'Bosque Húmedo', level: 2 })).toBeTruthy()
    expect(screen.queryByRole('list', { name: 'Áreas del resultado' })).toBeNull()
  })

  it('con el área abierta, cerrar el panel quita la selección y devuelve la lista', async () => {
    pagina(`${RUTA_MAPA}?area=12`)
    await screen.findByRole('heading', { name: 'Bosque Húmedo', level: 2 })
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }))
    expect(screen.getByTestId('ubicacion').textContent).toBe('')
    expect(await screen.findByRole('list', { name: 'Áreas del resultado' })).toBeTruthy()
    await waitFor(() => expect(api.vista).toHaveBeenLastCalledWith(undefined))
  })

  it('los ejemplares del área brotan como marcadores al llegar la cámara y tocar uno abre su ficha sin cerrar el panel', async () => {
    pagina(`${RUTA_MAPA}?area=12`)
    await screen.findByRole('heading', { name: 'Bosque Húmedo', level: 2 })
    // Se piden por el contorno del área, no por nombre.
    await waitFor(() => expect(api.listarEjemplaresDePoligono).toHaveBeenCalledWith('m12', expect.anything()))
    expect(api.marcadores).toHaveLength(0)
    await waitFor(() => expect(api.marcadores.map((m) => m.id)).toEqual(['ejemplar-9']), { timeout: 3000 })
    api.activarMarcador?.({ id: 'ejemplar-9' })
    await waitFor(() => expect(screen.getByTestId('ubicacion').textContent).toBe('?area=12&ejemplar=9'))
    expect(await screen.findByRole('dialog', { name: /ARB-009/ })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Bosque Húmedo', level: 2 })).toBeTruthy()
  })

  it('`?area=&ejemplar=&propuesta=muerto` abre la ficha con el ejemplar de la lista; cerrarla limpia la URL', async () => {
    pagina(`${RUTA_MAPA}?area=12&ejemplar=9&propuesta=muerto`)
    expect(await screen.findByRole('dialog', { name: `Ficha ${ejemplar.codigo}` })).toBeTruthy()
    expect(screen.getByText('Propuesta de planta muerta')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar ficha' }))
    await waitFor(() => expect(screen.getByTestId('ubicacion').textContent).toBe('?area=12'))
  })

  it('`?ejemplar=` sin área no abre la ficha: vive sobre el área', async () => {
    pagina(`${RUTA_MAPA}?ejemplar=9`)
    expect(await screen.findByRole('heading', { name: 'Mapa del campus' })).toBeTruthy()
    expect(screen.queryByRole('dialog', { name: /Ficha/ })).toBeNull()
  })

  it('un área sin contorno pide sus ejemplares por área', async () => {
    api.listarPoligonosMapa.mockResolvedValue([])
    pagina(`${RUTA_MAPA}?area=12`)
    await waitFor(() => expect(api.listarEjemplaresDeArea).toHaveBeenCalledWith(12, expect.anything()))
    expect(api.listarEjemplaresDePoligono).not.toHaveBeenCalled()
  })

  it('?area= y ?poligono= abren el área directamente', async () => {
    pagina(`${RUTA_MAPA}?area=12`)
    await waitFor(() => expect(api.vista).toHaveBeenLastCalledWith('m12'))
    cleanup()
    pagina(`${RUTA_MAPA}?poligono=m99`)
    await waitFor(() => expect(api.vista).toHaveBeenLastCalledWith('m99'))
  })

  it('un clic en el mapa abre el área vinculada o el contorno suelto', async () => {
    pagina(RUTA_MAPA)
    await screen.findByRole('button', { name: /Bosque Húmedo/ })
    api.seleccionar?.({ id: 'm12' })
    await waitFor(() => expect(screen.getByTestId('ubicacion').textContent).toBe('?area=12'))
    api.seleccionar?.({ id: 'm99' })
    await waitFor(() => expect(screen.getByTestId('ubicacion').textContent).toBe('?poligono=m99'))
    api.seleccionar?.(null)
    await waitFor(() => expect(screen.getByTestId('ubicacion').textContent).toBe(''))
  })

  it('un ?poligono= desconocido avisa sin romper la vista', async () => {
    pagina(`${RUTA_MAPA}?poligono=nada`)
    expect(await screen.findByText('No se encontró el área en el mapa del campus.')).toBeTruthy()
  })

  it('los filtros viajan en la URL y piden el resultado filtrado', async () => {
    pagina(RUTA_MAPA)
    await screen.findByRole('button', { name: /Bosque Húmedo/ })
    await userEvent.selectOptions(screen.getByLabelText('Sector'), '1')
    expect(screen.getByTestId('ubicacion').textContent).toBe('?sector=1')
    await waitFor(() =>
      expect(api.listarAreasVerdes).toHaveBeenLastCalledWith(
        '',
        expect.anything(),
        expect.objectContaining({ sector_id: 1 }),
      ),
    )
  })

  it('la búsqueda llega a la URL y enseña los ejemplares encontrados', async () => {
    pagina(RUTA_MAPA)
    await screen.findByRole('button', { name: /Bosque Húmedo/ })
    await userEvent.type(screen.getByLabelText('Buscar áreas y ejemplares'), 'P-77')
    const lista = await screen.findByRole('list', {
      name: 'Ejemplares encontrados',
    })
    expect(screen.getByTestId('ubicacion').textContent).toBe('?q=P-77')
    await userEvent.click(within(lista).getByRole('button', { name: /ARB-009 · placa P-77/ }))
    expect(screen.getByTestId('ubicacion').textContent).toBe('?q=P-77&area=12')
  })

  it('sin resultados enseña el vacío y «Limpiar filtros» los quita', async () => {
    api.listarAreasVerdes.mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })
    pagina(`${RUTA_MAPA}?sector=1`)
    expect(await screen.findByText('Ninguna área coincide')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(screen.getByTestId('ubicacion').textContent).toBe('')
  })

  it('sin áreas ni filtros enseña el vacío del inventario', async () => {
    api.listarAreasVerdes.mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })
    pagina(RUTA_MAPA)
    expect(await screen.findByText('Aún no hay áreas registradas')).toBeTruthy()
  })

  it('un error enseña el estado de error y reintenta', async () => {
    api.listarAreasVerdes.mockRejectedValueOnce(new ErrorApi(500, null, 'Falla'))
    pagina(RUTA_MAPA)
    expect(await screen.findByText('No pudimos cargar las áreas')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('button', { name: /Bosque Húmedo/ })).toBeTruthy()
  })

  it('pagina el resultado de diez en diez', async () => {
    api.listarAreasVerdes.mockResolvedValue({
      count: 12,
      next: null,
      previous: null,
      results: Array.from({ length: 12 }, (_, i) => area(100 + i, `Área ${i + 1}`)),
    })
    pagina(RUTA_MAPA)
    await screen.findByText('Área 1', { exact: true })
    expect(screen.queryByText('Área 11', { exact: true })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /Siguiente/ }))
    expect(await screen.findByText('Área 11', { exact: true })).toBeTruthy()
    expect(screen.getByTestId('ubicacion').textContent).toBe('?pagina=2')
  })
  it('recorre todas las páginas del servidor para que mapa y lista coincidan', async () => {
    api.listarAreasVerdes
      .mockResolvedValueOnce({
        count: 2,
        next: 2,
        previous: null,
        results: [area(12, 'Bosque Húmedo')],
      })
      .mockResolvedValueOnce({
        count: 2,
        next: null,
        previous: 1,
        results: [area(14, 'Jardín Ciencias')],
      })
    pagina(RUTA_MAPA)
    expect(await screen.findByRole('button', { name: /Jardín Ciencias/ })).toBeTruthy()
    expect(api.listarAreasVerdes).toHaveBeenLastCalledWith('', expect.anything(), expect.objectContaining({ page: 2 }))
  })

  it('la leyenda explica el color de cada tipo de uso con contorno', async () => {
    api.listarPoligonosMapa.mockResolvedValue([poligono('m12', 12), poligono('m13', 13)])
    pagina(RUTA_MAPA)
    const leyenda = await screen.findByRole('list', {
      name: 'Colores del mapa por tipo de uso',
    })
    expect(within(leyenda).getByText('Jardín')).toBeTruthy()
    expect(within(leyenda).getByText('2')).toBeTruthy()
  })

  it('ofrece los cuarteles desaparecidos y avisa si un catálogo no carga', async () => {
    api.listarCuarteles.mockResolvedValue([{ id: 3, numero: '7', nombre: 'Antiguo', estado: 'desaparecido' }])
    api.listarSectores.mockRejectedValueOnce(new ErrorApi(500, null, 'Falla'))
    pagina(RUTA_MAPA)
    expect(await screen.findByRole('option', { name: '7 · Antiguo (desaparecido)' })).toBeTruthy()
    expect(api.listarCuarteles).toHaveBeenCalledWith(true, expect.anything())
    expect(await screen.findByText('No pudimos cargar todas las opciones de los filtros.')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('option', { name: 'Sector A' })).toBeTruthy()
  })

  it('«Atrás» tras abrir un área vuelve al mapa sin área', async () => {
    const { router } = pagina(RUTA_MAPA)
    await userEvent.click(await screen.findByRole('button', { name: /Bosque Húmedo/ }))
    expect(screen.getByTestId('ubicacion').textContent).toBe('?area=12')
    await router.navigate(-1)
    await waitFor(() => expect(screen.getByTestId('ubicacion').textContent).toBe(''))
    await waitFor(() => expect(api.vista).toHaveBeenLastCalledWith(undefined))
  })
  it('«Registrar área» abre el alta en el panel y al guardar abre el área nueva', async () => {
    pagina(RUTA_MAPA)
    await userEvent.click(await screen.findByRole('button', { name: /Registrar área/ }))
    expect(screen.getByTestId('ubicacion').textContent).toBe('?registrar=1')
    expect(screen.getByText('Formulario de alta')).toBeTruthy()
    const llamadas = api.listarAreasVerdes.mock.calls.length
    await userEvent.click(screen.getByRole('button', { name: 'Guardar área' }))
    expect(screen.getByTestId('ubicacion').textContent).toBe('?area=77')
    await waitFor(() => expect(api.listarAreasVerdes.mock.calls.length).toBeGreaterThan(llamadas))
    expect(screen.queryByText('Formulario de alta')).toBeNull()
  })

  it('la redirección del alta antigua (?registrar=1) no abre el formulario sin permiso de registro', async () => {
    api.permisos = LECTURA
    pagina(`${RUTA_MAPA}?registrar=1`)
    await screen.findByRole('button', { name: /Bosque Húmedo/ })
    expect(screen.queryByText('Formulario de alta')).toBeNull()
  })
})
