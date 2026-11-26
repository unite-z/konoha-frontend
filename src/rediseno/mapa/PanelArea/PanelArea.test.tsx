// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PERMISOS } from '@/config/permisosCore'
import type { ResultadoConsulta } from '@/hooks/useConsulta'
import { ErrorApi } from '@/services/api/cliente'
import type { AreaVerde } from '@/types/areasVerdes'
import type { EjemplarInventario } from '@/types/ejemplares'
import type { ResumenArea } from '@/types/resumenArea'
import { rutaIncidencias } from '@/rediseno/incidencias/enlaces'
import { rutaPlanificacionCuadrillas, rutaPlanificacionProgramar } from '@/rediseno/planificacion/enlaces'
import { rutaProveedores } from '@/rediseno/proveedores/enlaces'
import { rutaMapaEditarArea } from '../enlaces'
import PanelArea from './PanelArea'

const api = vi.hoisted(() => ({
  cargarResumenArea: vi.fn(),
  obtenerResumenArea: vi.fn(),
  permisos: [] as string[],
}))
vi.mock('@/services/api/resumenArea', () => ({
  cargarResumenArea: api.cargarResumenArea,
  obtenerResumenArea: api.obtenerResumenArea,
}))
vi.mock('@/sesion/ContextoSesion', () => ({ usePermisos: () => api.permisos }))

const area: AreaVerde = {
  id: 12,
  nombre: 'Bosque Húmedo',
  lugar: '',
  ubicacion: 'Junto a Letras',
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
}

const resumenBase: ResumenArea = {
  area,
  ejemplares_por_situacion: { activo: 3, muerto: 1 },
  incidencias_abiertas: 2,
  ultima_atencion: {
    tipo: 'atencion',
    id: 5,
    fecha: '2026-11-20T10:00:00-05:00',
    titulo: 'Fumigación',
    estado: 'Cerrada',
  },
  proxima_actividad: null,
  prioridad_validada: { prioridad: 'ALTA', fecha_validacion: '2026-11-18T09:00:00-05:00', sugerencia_id: 7 },
  fuentes_visibles: ['incidencias'],
  historial: {
    count: 2,
    next: null,
    previous: null,
    results: [
      {
        tipo: 'cambio_sector',
        id: 1,
        fecha: '2026-10-01T08:00:00-05:00',
        titulo: 'Sector A',
        detalle: null,
        estado: 'vigente',
      },
      {
        tipo: 'incidencia',
        id: 9,
        fecha: '2026-09-01T08:00:00-05:00',
        titulo: 'Rama caída',
        detalle: null,
        estado: 'EnAtencion',
      },
    ],
  },
}

const ejemplar = (id: number, extra: Partial<EjemplarInventario> = {}): EjemplarInventario =>
  ({
    id,
    codigo: `ARB-00${id}`,
    alias: null,
    codigo_placa_antigua: null,
    codigo_catastro: null,
    especie_nombre_comun: 'Ficus',
    especie_nombre_cientifico: 'Ficus benjamina',
    situacion: 'activo',
    latitud: -12,
    longitud: -77,
    area_verde_id: 12,
    ...extra,
  }) as EjemplarInventario

const consulta = (
  parcial: Partial<ResultadoConsulta<EjemplarInventario[]>>,
): ResultadoConsulta<EjemplarInventario[]> => ({
  estado: 'exito',
  datos: null,
  error: null,
  cargaVisible: false,
  reintentar: () => undefined,
  ...parcial,
})

const JEFE = [
  PERMISOS.consultarInventario,
  PERMISOS.registrarInventario,
  PERMISOS.registrarIncidencia,
  PERMISOS.gestionarCuadrillas,
  PERMISOS.gestionarPlanificacion,
  PERMISOS.registrarAtencion,
]

function montar(
  opciones: {
    ejemplares?: ResultadoConsulta<EjemplarInventario[]>
    onElegir?: () => void
    edicionPedida?: boolean
    onSalirDeEdicion?: () => void
  } = {},
) {
  const {
    ejemplares = consulta({ datos: [ejemplar(1), ejemplar(2, { alias: 'Robertito', codigo_placa_antigua: 'P-77' })] }),
  } = opciones
  return render(
    <MemoryRouter>
      <PanelArea
        areaId={12}
        nombreProvisional="Bosque"
        tieneContorno
        ejemplares={ejemplares}
        onElegirEjemplar={opciones.onElegir ?? (() => undefined)}
        edicionPedida={opciones.edicionPedida}
        onSalirDeEdicion={opciones.onSalirDeEdicion}
        onCerrar={() => undefined}
      />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  api.permisos = JEFE
  api.cargarResumenArea.mockResolvedValue(resumenBase)
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('PanelArea (RD-18)', () => {
  it('enseña el resumen con la ficha, los ejemplares por situación y la nota calculada', async () => {
    montar()
    expect(await screen.findByRole('heading', { name: 'Bosque Húmedo', level: 2 })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Resumen' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText(/^1\D?200 m²$/)).toBeTruthy()
    const situaciones = screen.getByRole('region', { name: 'Ejemplares por situación' })
    expect(within(situaciones).getByText('Activos')).toBeTruthy()
    const nota = screen.getByRole('region', { name: 'Nota del área' })
    expect(within(nota).getByText(/Alta · validada el/)).toBeTruthy()
    expect(within(nota).getByText('2')).toBeTruthy()
    expect(within(nota).getByText(/Fumigación/)).toBeTruthy()
    // No es texto de IA.
    expect(screen.queryByText(/Konoha/i)).toBeNull()
  })

  it('la nota no muestra incidencias si el resumen no las trae (sin area_verde_id disponible)', async () => {
    api.cargarResumenArea.mockResolvedValue({ ...resumenBase, incidencias_abiertas: null })
    montar()
    const nota = await screen.findByRole('region', { name: 'Nota del área' })
    expect(within(nota).queryByText('Incidencias abiertas')).toBeNull()
    expect(within(nota).getByText('Prioridad validada')).toBeTruthy()
  })

  it('sin ningún dato calculado la nota lo dice sin inventar nada', async () => {
    api.cargarResumenArea.mockResolvedValue({
      ...resumenBase,
      incidencias_abiertas: null,
      ultima_atencion: null,
      prioridad_validada: null,
    })
    montar()
    expect(await screen.findByText('Aún no hay datos calculados para esta área.')).toBeTruthy()
  })

  it('la pestaña Ejemplares busca por nombre, placa o código y abre la ficha al elegir', async () => {
    const alElegir = vi.fn()
    montar({ onElegir: alElegir })
    await userEvent.click(await screen.findByRole('tab', { name: 'Ejemplares' }))
    const lista = screen.getByRole('list', { name: 'Ejemplares del área' })
    expect(within(lista).getAllByRole('listitem')).toHaveLength(2)
    await userEvent.type(screen.getByLabelText('Buscar ejemplares en el área'), 'p-77')
    expect(within(lista).getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByRole('status').textContent).toContain('1 de 2')
    await userEvent.click(within(lista).getByRole('button', { name: /Robertito/ }))
    expect(alElegir).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }))
    await userEvent.clear(screen.getByLabelText('Buscar ejemplares en el área'))
    await userEvent.type(screen.getByLabelText('Buscar ejemplares en el área'), 'zzz')
    expect(screen.getByText('Ningún ejemplar coincide')).toBeTruthy()
  })

  it('Ejemplares avisa de los que el contorno trae vinculados a otra área o a ninguna', async () => {
    montar({
      ejemplares: consulta({
        datos: [
          ejemplar(1),
          ejemplar(2, { area_verde_id: 40, area_verde_nombre: 'Jardín de Letras' }),
          ejemplar(3, { area_verde_id: null, latitud: null, longitud: null }),
        ],
      }),
    })
    await userEvent.click(await screen.findByRole('tab', { name: 'Ejemplares' }))
    const lista = screen.getByRole('list', { name: 'Ejemplares del área' })
    const [propio, ajeno, suelto] = within(lista).getAllByRole('button')
    expect(propio.textContent).not.toMatch(/vinculado|sin área/)
    expect(ajeno.textContent).toContain('vinculado a Jardín de Letras')
    expect(suelto.textContent).toContain('sin coordenadas · sin área vinculada')
  })

  it('Ejemplares: vacío, carga, error con reintento y sin acceso', async () => {
    const reintentar = vi.fn()
    const { unmount } = montar({ ejemplares: consulta({ datos: [] }) })
    await userEvent.click(await screen.findByRole('tab', { name: 'Ejemplares' }))
    expect(screen.getByText('Esta área no tiene ejemplares')).toBeTruthy()
    unmount()

    const cargando = montar({ ejemplares: consulta({ estado: 'cargando' }) })
    await userEvent.click(await screen.findByRole('tab', { name: 'Ejemplares' }))
    expect(screen.getByText('Cargando ejemplares…')).toBeTruthy()
    cargando.unmount()

    const fallo = montar({
      ejemplares: consulta({ estado: 'error', error: new ErrorApi(500, null, 'Falla'), reintentar }),
    })
    await userEvent.click(await screen.findByRole('tab', { name: 'Ejemplares' }))
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(reintentar).toHaveBeenCalled()
    fallo.unmount()

    montar({ ejemplares: consulta({ estado: 'error', error: new ErrorApi(403, null, 'No') }) })
    await userEvent.click(await screen.findByRole('tab', { name: 'Ejemplares' }))
    expect(screen.getByText('No puedes ver los ejemplares')).toBeTruthy()
  })

  it('la pestaña Historial lista sector y cambios, y vacía enseña su estado', async () => {
    const { unmount } = montar()
    await userEvent.click(await screen.findByRole('tab', { name: 'Historial' }))
    const historial = screen.getByRole('list', { name: 'Historial del área' })
    expect(within(historial).getByText('Cambio de sector')).toBeTruthy()
    expect(within(historial).getByText('Rama caída')).toBeTruthy()
    // Los estados en código se leen como texto.
    expect(within(historial).getByText(/· Vigente$/)).toBeTruthy()
    expect(within(historial).getByText(/· En atención$/)).toBeTruthy()
    unmount()

    api.cargarResumenArea.mockResolvedValue({
      ...resumenBase,
      historial: { count: 0, next: null, previous: null, results: [] },
    })
    montar()
    await userEvent.click(await screen.findByRole('tab', { name: 'Historial' }))
    expect(screen.getByText('Sin historial todavía')).toBeTruthy()
  })

  it('«Cargar más» añade la página siguiente del historial', async () => {
    api.cargarResumenArea.mockResolvedValue({
      ...resumenBase,
      historial: { ...resumenBase.historial, next: 'http://x/?page=2' },
    })
    api.obtenerResumenArea.mockResolvedValue({
      ...resumenBase,
      historial: {
        count: 3,
        next: null,
        previous: null,
        results: [
          {
            tipo: 'actividad',
            id: 3,
            fecha: '2026-08-01T08:00:00-05:00',
            titulo: 'Riego',
            detalle: null,
            estado: null,
          },
        ],
      },
    })
    montar()
    await userEvent.click(await screen.findByRole('tab', { name: 'Historial' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cargar más' }))
    expect(await screen.findByText('Riego')).toBeTruthy()
    expect(api.obtenerResumenArea).toHaveBeenCalledWith(12, 2)
    expect(screen.queryByRole('button', { name: 'Cargar más' })).toBeNull()
  })

  it('las acciones enlazan con las funciones ruta*() de los módulos dueños', async () => {
    montar()
    await screen.findByRole('heading', { name: 'Bosque Húmedo', level: 2 })
    const acciones = screen.getByRole('navigation', { name: 'Acciones del área' })
    const href = (nombre: RegExp | string) => within(acciones).getByRole('link', { name: nombre }).getAttribute('href')

    expect(href('Reportar incidencia')).toBe(`${rutaIncidencias()}?reportar=12`)
    expect(href('Registrar observación de plaga')).toBe(
      `${rutaProveedores()}/plagas-productos?observacion=nueva&area=12`,
    )
    expect(href('Editar')).toBe(rutaMapaEditarArea(12))

    // «Programar trabajo» abre sus dos destinos: encargo (Planificación) y ciclo.
    const programar = within(acciones).getByRole('button', { name: 'Programar trabajo' })
    expect(programar.getAttribute('aria-expanded')).toBe('false')
    await userEvent.click(programar)
    expect(programar.getAttribute('aria-expanded')).toBe('true')
    expect(href('Encargo a una cuadrilla')).toBe(`${rutaPlanificacionCuadrillas()}?encargo=nuevo&area=12`)
    expect(href('Ciclo de servicios')).toBe(rutaPlanificacionProgramar())
  })

  it('«Editar» (&editar=1) avisa de que la edición está en construcción y deja volver al área', async () => {
    const salir = vi.fn()
    montar({ edicionPedida: true, onSalirDeEdicion: salir })
    expect(await screen.findByText('La edición del área desde el mapa está en construcción.')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Volver al área' }))
    expect(salir).toHaveBeenCalled()
  })

  it('cada acción aparece solo con su permiso', async () => {
    api.permisos = [PERMISOS.consultarInventario, PERMISOS.registrarIncidencia]
    montar()
    await screen.findByRole('heading', { name: 'Bosque Húmedo', level: 2 })
    expect(screen.getByRole('link', { name: 'Reportar incidencia' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Editar' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Registrar observación de plaga' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Programar trabajo' })).toBeNull()
  })

  it('solo lectura: sin acciones', async () => {
    api.permisos = [PERMISOS.consultarInventario]
    montar()
    await screen.findByRole('heading', { name: 'Bosque Húmedo', level: 2 })
    expect(screen.queryByRole('navigation', { name: 'Acciones del área' })).toBeNull()
  })

  it('mientras carga usa el nombre de la lista y enseña la carga', () => {
    api.cargarResumenArea.mockReturnValue(new Promise(() => undefined))
    montar()
    expect(screen.getByRole('heading', { name: 'Bosque', level: 2 })).toBeTruthy()
  })

  it('error del resumen: estado de error con reintento', async () => {
    api.cargarResumenArea.mockRejectedValueOnce(new ErrorApi(500, null, 'Falla'))
    montar()
    expect(await screen.findByText('No pudimos cargar el área')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('heading', { name: 'Bosque Húmedo', level: 2 })).toBeTruthy()
  })

  it('403 del servidor: sin acceso; 404: área no encontrada', async () => {
    api.cargarResumenArea.mockRejectedValueOnce(new ErrorApi(403, null, 'No'))
    const { unmount } = montar()
    expect(await screen.findByText('No puedes ver esta área')).toBeTruthy()
    unmount()

    api.cargarResumenArea.mockRejectedValueOnce(new ErrorApi(404, null, 'No existe'))
    montar()
    await waitFor(() => expect(screen.getByText('No se encontró el área')).toBeTruthy())
  })
})
