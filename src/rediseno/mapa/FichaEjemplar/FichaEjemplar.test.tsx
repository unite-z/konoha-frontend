// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { PERMISOS } from '@/config/permisosCore'
import { ErrorApi } from '@/services/api/cliente'
import type { DatosCampus } from '@/types/campus3d'
import type { EjemplarInventario } from '@/types/ejemplares'
import { ContextoMapa } from '@/rediseno/base/MapaCampus/contexto'
import { mapaFalso } from '@/rediseno/base/MapaCampus/escenaFalsa'
import { rutaIncidencias } from '@/rediseno/incidencias/enlaces'
import { rutaProveedores } from '@/rediseno/proveedores/enlaces'
import FichaEjemplar, { type FichaEjemplarProps } from './FichaEjemplar'

const api = vi.hoisted(() => ({
  permisos: [] as string[],
  obtenerEjemplar: vi.fn(),
  cambiarAliasEjemplar: vi.fn(),
  guardarAlturaEjemplar: vi.fn(),
  corregirUbicacionEjemplar: vi.fn(),
  cambiarSituacionEjemplar: vi.fn(),
  listarHistorialSituacionEjemplar: vi.fn(),
  listarHistorialActividadesEjemplar: vi.fn(),
  listarHistorialEjemplar: vi.fn(),
  consultarUbicacionEnMapa: vi.fn(),
  listarTodasLasAreasVerdes: vi.fn(),
}))
vi.mock('@/services/api/ejemplares', () => ({
  obtenerEjemplar: api.obtenerEjemplar,
  cambiarAliasEjemplar: api.cambiarAliasEjemplar,
  guardarAlturaEjemplar: api.guardarAlturaEjemplar,
  corregirUbicacionEjemplar: api.corregirUbicacionEjemplar,
  cambiarSituacionEjemplar: api.cambiarSituacionEjemplar,
  listarHistorialSituacionEjemplar: api.listarHistorialSituacionEjemplar,
  listarHistorialActividadesEjemplar: api.listarHistorialActividadesEjemplar,
  listarHistorialEjemplar: api.listarHistorialEjemplar,
}))
vi.mock('@/services/api/mapaAsignaciones', () => ({
  consultarUbicacionEnMapa: api.consultarUbicacionEnMapa,
  listarTodasLasAreasVerdes: api.listarTodasLasAreasVerdes,
}))
vi.mock('@/sesion/ContextoSesion', () => ({ usePermisos: () => api.permisos }))
// La foto y los adjuntos tienen sus propias pruebas; aquí solo importa que aparezcan con permiso.
vi.mock('@/components/core/Adjuntos', () => ({ default: () => <p>Subir fotografía</p> }))
vi.mock('@/pages/inventario/FotoEjemplar', () => ({ default: () => <p>Foto del ejemplar</p> }))

const datos = {
  proyeccion: { tipo: 'equirrectangular-local', origen_lon: 0, origen_lat: 0, kx: 100000, ky: 100000, unidad: 'm' },
  areas: [],
} as unknown as DatosCampus

const ejemplar: EjemplarInventario = {
  id: 9,
  codigo: 'ARB-009',
  alias: 'Robertito',
  referencia_catastro: null,
  codigo_catastro: null,
  codigo_placa_antigua: 'P-77',
  especie_id: 3,
  especie_nombre_comun: 'Ficus',
  especie_nombre_cientifico: 'Ficus benjamina',
  especie_forma_biologica: null,
  tipo_vegetacion: null,
  ubicacion: 'Junto a Letras',
  latitud: 0.0002,
  longitud: 0.0005,
  cantidad: 1,
  area_verde_id: 12,
  area_verde_nombre: 'Bosque Húmedo',
  altura_total_m: 4.5,
  situacion: 'activo',
  fecha_situacion: null,
  advertencia_placa_repetida: false,
}

const LECTOR = [PERMISOS.consultarInventario]
const JEFE = [
  PERMISOS.consultarInventario,
  PERMISOS.registrarInventario,
  PERMISOS.gestionarCatalogos,
  PERMISOS.registrarIncidencia,
  PERMISOS.registrarAtencion,
]

beforeAll(() => {
  // jsdom no implementa showModal ni close de <dialog>.
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})

beforeEach(() => {
  api.permisos = JEFE
  api.listarHistorialSituacionEjemplar.mockResolvedValue([])
  api.listarHistorialActividadesEjemplar.mockResolvedValue([])
  api.listarHistorialEjemplar.mockResolvedValue([])
  api.listarTodasLasAreasVerdes.mockResolvedValue([{ id: 12, nombre: 'Bosque Húmedo' }])
  api.consultarUbicacionEnMapa.mockResolvedValue({ areas: [{ id: 12, nombre: 'Bosque Húmedo' }], estado: 'dentro' })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function montar(props: Partial<FichaEjemplarProps> = {}) {
  const mapa = mapaFalso(datos)
  const alCerrar = vi.fn()
  const alActualizar = vi.fn()
  render(
    <MemoryRouter>
      <ContextoMapa value={mapa}>
        <FichaEjemplar ejemplarId={9} inicial={ejemplar} onCerrar={alCerrar} onActualizado={alActualizar} {...props} />
      </ContextoMapa>
    </MemoryRouter>,
  )
  return { mapa, alCerrar, alActualizar }
}

describe('FichaEjemplar (RD-21)', () => {
  it('con permiso de lectura enseña los datos y acerca la cámara al árbol, sin formularios ni accesos', () => {
    api.permisos = LECTOR
    const { mapa } = montar()
    const ficha = screen.getByRole('dialog', { name: /ARB-009/ })
    expect(within(ficha).getByText('Foto del ejemplar')).toBeTruthy()
    for (const texto of ['ARB-009', 'P-77', 'Ficus · Ficus benjamina', 'Robertito', '4.5 m', 'Activo', 'Bosque Húmedo'])
      expect(within(ficha).getByText(texto)).toBeTruthy()
    expect(within(ficha).queryByLabelText('Alias del ejemplar')).toBeNull()
    expect(within(ficha).queryByRole('button', { name: 'Editar ubicación' })).toBeNull()
    expect(within(ficha).queryByRole('navigation', { name: 'Accesos del ejemplar' })).toBeNull()
    expect(mapa.escena.enfocar).toHaveBeenCalledWith(50, 20, 3)
  })

  it('con permisos enseña los accesos a otros módulos con enlaces del módulo dueño', () => {
    montar()
    const accesos = within(screen.getByRole('navigation', { name: 'Accesos del ejemplar' }))
    const proveedores = rutaProveedores()
    expect(accesos.getByRole('link', { name: 'Marcar atención especial' }).getAttribute('href')).toBe(
      `${proveedores}/fitosanitario?marcar=9`,
    )
    expect(accesos.getByRole('link', { name: 'Registrar observación de plaga' }).getAttribute('href')).toBe(
      `${proveedores}/plagas-productos?observacion=nueva&ejemplar=9`,
    )
    expect(accesos.getByRole('link', { name: 'Analizar fotos' }).getAttribute('href')).toBe(
      `${proveedores}/fitosanitario?ejemplar_id=9`,
    )
    expect(accesos.getByRole('link', { name: 'Reportar incidencia' }).getAttribute('href')).toBe(
      `${rutaIncidencias()}?reportar=12&ejemplar=9`,
    )
  })

  it('edita alias y altura con PATCH y avisa al mapa', async () => {
    const guardado = { ...ejemplar, alias: 'Don Ficus' }
    api.cambiarAliasEjemplar.mockResolvedValue(guardado)
    api.guardarAlturaEjemplar.mockResolvedValue({ ...guardado, altura_total_m: 5.2 })
    const { alActualizar } = montar()
    const alias = screen.getByLabelText('Alias del ejemplar')
    await userEvent.clear(alias)
    await userEvent.type(alias, 'Don Ficus')
    const altura = screen.getByLabelText('Altura total (m)')
    await userEvent.clear(altura)
    await userEvent.type(altura, '5.2')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(api.guardarAlturaEjemplar).toHaveBeenCalledWith(9, 5.2))
    expect(api.cambiarAliasEjemplar).toHaveBeenCalledWith(9, 'Don Ficus')
    expect(await screen.findByText('Cambios guardados.')).toBeTruthy()
    expect(alActualizar).toHaveBeenCalledTimes(1)
  })

  it('si el PATCH falla enseña el error y no avisa al mapa', async () => {
    api.cambiarAliasEjemplar.mockRejectedValue(new ErrorApi(400, null, 'Ese alias ya existe en otro ejemplar.'))
    const { alActualizar } = montar()
    const alias = screen.getByLabelText('Alias del ejemplar')
    await userEvent.clear(alias)
    await userEvent.type(alias, 'Repetido')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByText(/Ese alias ya existe/)).toBeTruthy()
    expect(alActualizar).not.toHaveBeenCalled()
  })

  it('cambia la situación del ejemplar desde la pestaña Situación', async () => {
    api.cambiarSituacionEjemplar.mockResolvedValue({ ...ejemplar, situacion: 'retirado' })
    const { alActualizar } = montar()
    await userEvent.click(screen.getByRole('tab', { name: 'Situación' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Cambiar situación' }))
    await userEvent.selectOptions(screen.getByLabelText('Nueva situación'), 'retirado')
    await userEvent.type(screen.getByLabelText('Motivo'), 'Retirado por obra')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar situación' }))
    await waitFor(() =>
      expect(api.cambiarSituacionEjemplar).toHaveBeenCalledWith(
        9,
        expect.objectContaining({ situacion: 'retirado', motivo: 'Retirado por obra' }),
      ),
    )
    await waitFor(() => expect(alActualizar).toHaveBeenCalled())
  })

  it('sin permiso de catálogo la situación solo se lee', async () => {
    api.permisos = [PERMISOS.consultarInventario, PERMISOS.registrarInventario]
    montar()
    await userEvent.click(screen.getByRole('tab', { name: 'Situación' }))
    expect(await screen.findByText('Sin cambios registrados.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Cambiar situación' })).toBeNull()
  })

  it('la planta muerta propuesta abre en Situación y se confirma con fecha y motivo', async () => {
    api.cambiarSituacionEjemplar.mockResolvedValue({ ...ejemplar, situacion: 'muerto' })
    montar({ propuestaMuerto: true })
    expect(screen.getByRole('tab', { name: 'Situación' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('Planta muerta propuesta')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Registrar como muerto' }))
    await waitFor(() =>
      expect(api.cambiarSituacionEjemplar).toHaveBeenCalledWith(
        9,
        expect.objectContaining({ situacion: 'muerto', motivo: expect.stringContaining('Planta muerta') }),
      ),
    )
  })

  it('sin permiso de catálogo la planta muerta propuesta no se puede confirmar', () => {
    api.permisos = [PERMISOS.consultarInventario, PERMISOS.registrarInventario]
    montar({ propuestaMuerto: true })
    expect(screen.getByText('No puedes confirmar la planta muerta')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Registrar como muerto' })).toBeNull()
  })

  it('el historial muestra actividades, intervenciones y cambios de situación', async () => {
    api.listarHistorialActividadesEjemplar.mockResolvedValue([
      { id: 1, fecha: '2026-11-02', tipo: 'Riego', estado: 'finalizada', detalle: null, ejecutor: null },
    ])
    api.listarHistorialEjemplar.mockImplementation((_id: number, fuente: string) =>
      Promise.resolve(
        fuente === 'podas'
          ? [{ id: 4, fecha: '2026-10-01', tipo: 'Poda de formación', origen: 'poda', entidad: 'intervencion' }]
          : [],
      ),
    )
    api.listarHistorialSituacionEjemplar.mockResolvedValue([
      {
        id: 2,
        situacion_anterior: 'activo',
        situacion_nueva: 'retirado',
        fecha: '2026-09-01',
        motivo: 'Obra',
        autor: 'Ana',
      },
    ])
    montar()
    await userEvent.click(screen.getByRole('tab', { name: 'Historial' }))
    const actividades = await screen.findByRole('list', { name: 'Actividades del ejemplar' })
    expect(within(actividades).getByText('Riego')).toBeTruthy()
    expect(await screen.findByText('Poda de formación')).toBeTruthy()
    const cambios = await screen.findByRole('list', { name: 'Cambios de situación del ejemplar' })
    expect(within(cambios).getByText(/Activo → Retirado/)).toBeTruthy()
  })

  it('el historial vacío lo dice y, si el servidor aún no publica las actividades (404), sigue sirviendo el resto', async () => {
    api.listarHistorialActividadesEjemplar.mockRejectedValue(new ErrorApi(404, null, 'No encontrado'))
    montar()
    await userEvent.click(screen.getByRole('tab', { name: 'Historial' }))
    expect(await screen.findByText('Actividades no disponibles')).toBeTruthy()
    expect(await screen.findByText('Sin cambios de situación')).toBeTruthy()
    expect(await screen.findByText('Sin registros en las fuentes disponibles.')).toBeTruthy()
  })

  it('si el historial de situación falla enseña el error con reintento', async () => {
    api.listarHistorialSituacionEjemplar.mockRejectedValueOnce(new ErrorApi(500, null, 'Fallo del servidor'))
    montar()
    await userEvent.click(screen.getByRole('tab', { name: 'Historial' }))
    expect(await screen.findByText('No pudimos cargar los cambios de situación')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Sin cambios de situación')).toBeTruthy()
  })

  describe('si no la trae la lista, la ficha pide el ejemplar por su id', () => {
    it('lo enseña y avisa de su llegada', async () => {
      api.obtenerEjemplar.mockResolvedValue(ejemplar)
      const alCargar = vi.fn()
      montar({ inicial: null, onCargado: alCargar })
      expect(screen.getByText('Cargando el ejemplar…')).toBeTruthy()
      expect(await screen.findByText('P-77')).toBeTruthy()
      expect(alCargar).toHaveBeenCalledWith(ejemplar)
    })

    it('sin acceso (403)', async () => {
      api.obtenerEjemplar.mockRejectedValue(new ErrorApi(403, null, 'Prohibido'))
      montar({ inicial: null })
      expect(await screen.findByText('No puedes ver este ejemplar')).toBeTruthy()
    })

    it('inexistente (404)', async () => {
      api.obtenerEjemplar.mockRejectedValue(new ErrorApi(404, null, 'No encontrado'))
      montar({ inicial: null })
      expect(await screen.findByText('No se encontró el ejemplar')).toBeTruthy()
    })

    it('con error del servidor, con reintento', async () => {
      api.obtenerEjemplar.mockRejectedValueOnce(new ErrorApi(500, null, 'Fallo')).mockResolvedValue(ejemplar)
      montar({ inicial: null })
      expect(await screen.findByText('No pudimos cargar el ejemplar')).toBeTruthy()
      await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
      expect(await screen.findByText('P-77')).toBeTruthy()
    })
  })

  describe('Editar ubicación', () => {
    const tocar = (mapa: ReturnType<typeof mapaFalso>) =>
      act(() => {
        for (const oyente of mapa.oyentesSuelo) oyente({ x: 100, y: 50 })
      })
    async function empezar() {
      const montado = montar()
      await userEvent.click(screen.getByRole('button', { name: 'Editar ubicación' }))
      return montado
    }

    it('aparta la ficha y deja el mapa a la herramienta de punto; Cancelar la devuelve', async () => {
      await empezar()
      expect(screen.getByRole('region', { name: 'Editar la ubicación de ARB-009' })).toBeTruthy()
      expect(screen.getByRole('dialog', { hidden: true }).hasAttribute('open')).toBe(false)
      await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
      expect(screen.queryByRole('region', { name: /Editar la ubicación/ })).toBeNull()
      expect(screen.getByRole('dialog', { name: /ARB-009/ }).hasAttribute('open')).toBe(true)
    })

    it('aviso «fuera del área» y no deja guardar', async () => {
      api.consultarUbicacionEnMapa.mockResolvedValue({ areas: [], estado: 'fuera' })
      const { mapa } = await empezar()
      tocar(mapa)
      expect(await screen.findByText(/El punto está fuera del área seleccionada/)).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Guardar ubicación' }).getAttribute('aria-disabled')).toBe('true')
    })

    it('aviso «área detectada» cuando el ejemplar no tenía área', async () => {
      api.consultarUbicacionEnMapa.mockResolvedValue({ areas: [{ id: 3, nombre: 'Jardín Norte' }], estado: 'dentro' })
      api.corregirUbicacionEjemplar.mockResolvedValue({ ...ejemplar, area_verde_id: 3 })
      api.permisos = JEFE
      const mapa = mapaFalso(datos)
      render(
        <MemoryRouter>
          <ContextoMapa value={mapa}>
            <FichaEjemplar
              ejemplarId={9}
              inicial={{ ...ejemplar, area_verde_id: null }}
              onCerrar={vi.fn()}
              onActualizado={vi.fn()}
            />
          </ContextoMapa>
        </MemoryRouter>,
      )
      await userEvent.click(screen.getByRole('button', { name: 'Editar ubicación' }))
      tocar(mapa)
      expect(await screen.findByText(/Área detectada · Jardín Norte/)).toBeTruthy()
      await userEvent.click(screen.getByRole('button', { name: 'Guardar ubicación' }))
      await waitFor(() =>
        expect(api.corregirUbicacionEjemplar).toHaveBeenCalledWith(9, {
          latitud: 0.0005,
          longitud: 0.001,
          area_verde_id: 3,
        }),
      )
    })

    it('aviso «varias áreas en el punto» y no deja guardar hasta elegir una', async () => {
      api.consultarUbicacionEnMapa.mockResolvedValue({
        areas: [
          { id: 1, nombre: 'A' },
          { id: 2, nombre: 'B' },
        ],
        estado: 'dentro',
      })
      const mapa = mapaFalso(datos)
      render(
        <MemoryRouter>
          <ContextoMapa value={mapa}>
            <FichaEjemplar
              ejemplarId={9}
              inicial={{ ...ejemplar, area_verde_id: null }}
              onCerrar={vi.fn()}
              onActualizado={vi.fn()}
            />
          </ContextoMapa>
        </MemoryRouter>,
      )
      await userEvent.click(screen.getByRole('button', { name: 'Editar ubicación' }))
      tocar(mapa)
      expect(await screen.findByText(/Hay varias áreas en este punto/)).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Guardar ubicación' }).getAttribute('aria-disabled')).toBe('true')
    })

    it('guarda el punto nuevo con PATCH, actualiza el mapa y vuelve a la ficha', async () => {
      api.corregirUbicacionEjemplar.mockResolvedValue({ ...ejemplar, latitud: 0.0005, longitud: 0.001 })
      const { mapa, alActualizar } = await empezar()
      tocar(mapa)
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Guardar ubicación' }).getAttribute('aria-disabled')).not.toBe(
          'true',
        ),
      )
      await userEvent.click(screen.getByRole('button', { name: 'Guardar ubicación' }))
      await waitFor(() =>
        expect(api.corregirUbicacionEjemplar).toHaveBeenCalledWith(9, { latitud: 0.0005, longitud: 0.001 }),
      )
      await waitFor(() => expect(screen.queryByRole('region', { name: /Editar la ubicación/ })).toBeNull())
      expect(alActualizar).toHaveBeenCalledTimes(1)
    })
  })
})
