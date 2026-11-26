// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Ellipsis, MapIcon } from 'lucide-react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PERMISOS } from '@/config/permisosCore'
import type { SesionCore } from '@/types/core'
import { seccionCampo } from '@/rediseno/campo/seccion'
import { seccionIncidencias } from '@/rediseno/incidencias/seccion'
import type { SeccionRediseno } from '@/rediseno/tipos'
import BarraInferior from '../BarraInferior/BarraInferior'
import Cabecera from './Cabecera'

const estado = vi.hoisted(() => ({
  permisos: [] as string[],
  conSesion: true,
  pendientes: 0,
}))

vi.mock('@/sesion/ContextoSesion', () => ({
  usePermisos: () => (estado.conSesion ? estado.permisos : null),
  useSesionActiva: () =>
    estado.conSesion
      ? ({
          usuario: { id: 1, nombre: 'Robert G.', nombre_usuario: 'rg' },
          permisos: estado.permisos,
        } as SesionCore)
      : null,
}))
vi.mock('@/sincronizacion/cola', () => ({
  useCola: () => ({
    pendientes: Array.from({ length: estado.pendientes }, () => ({
      estado: 'pendiente',
    })),
  }),
  porSincronizar: (cola: { pendientes: unknown[] }) => cola.pendientes,
}))

afterEach(() => {
  cleanup()
  estado.permisos = []
  estado.conSesion = true
  estado.pendientes = 0
})

const J = [
  PERMISOS.consultarInventario,
  PERMISOS.consultarPlanificacion,
  PERMISOS.registrarIncidencia,
  PERMISOS.consultarIndicadores,
  PERMISOS.registrarAtencion,
  PERMISOS.consultarContratos,
]
const I = [PERMISOS.consultarInventario, PERMISOS.registrarIncidencia, PERMISOS.registrarPoda]
const P = [PERMISOS.registrarIncidencia]
const C = [PERMISOS.consultarCuadrillas, PERMISOS.registrarCorte, PERMISOS.registrarIncidencia, 'CAM.PARTE.REGISTRAR']
const SA = Object.values(PERMISOS)

function Url() {
  const { pathname } = useLocation()
  return <output aria-label="url">{pathname}</output>
}

function montar(entrada: string, secciones?: readonly SeccionRediseno[]) {
  return render(
    <MemoryRouter initialEntries={[entrada]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <Cabecera secciones={secciones} />
              <Url />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

function secciones() {
  return within(screen.getByRole('navigation', { name: 'Secciones' }))
    .getAllByRole('link')
    .map((a) => a.textContent)
}

describe('Cabecera por permisos (RD-04)', () => {
  it.each([
    ['J', J, ['Mapa', 'Planificación', 'Incidencias', 'Proveedores', 'Reportes']],
    ['I', I, ['Mapa', 'Incidencias']],
    ['P', P, ['Incidencias']],
    ['C', C, ['Incidencias']],
    ['SA', SA, ['Mapa', 'Planificación', 'Incidencias', 'Proveedores', 'Reportes']],
  ])('pinta solo las secciones de %s', (_, permisos, esperadas) => {
    estado.permisos = permisos
    montar('/n/mapa')
    expect(secciones()).toEqual(esperadas)
  })

  it('sin secciones no pinta la navegación, pero sí al usuario', () => {
    montar('/n/cuenta')
    expect(screen.queryByRole('navigation', { name: 'Secciones' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Robert G.: Configuración' })).toBeTruthy()
  })

  it('marca la sección activa con aria-current y el nombre lleva a Configuración', async () => {
    estado.permisos = SA
    montar('/n/incidencias')
    expect(screen.getByRole('link', { name: 'Incidencias' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Mapa' }).getAttribute('aria-current')).toBeNull()
    await userEvent.click(screen.getByRole('link', { name: 'Robert G.: Configuración' }))
    expect(screen.getByLabelText('url').textContent).toBe('/n/cuenta')
  })

  it('el indicador de sincronización solo aparece con pendientes y muestra el contador', () => {
    estado.permisos = SA
    montar('/n/mapa')
    expect(screen.queryByLabelText(/pendientes de enviar/)).toBeNull()
    cleanup()
    estado.pendientes = 3
    montar('/n/mapa')
    expect(screen.getByLabelText('3 operaciones pendientes de enviar').textContent).toBe('3')
  })

  it('las pestañas de la sección activa salen del registro y se reflejan en la URL', async () => {
    estado.permisos = SA
    const seccion: SeccionRediseno = {
      id: 'x',
      etiqueta: 'Sección X',
      icono: MapIcon,
      ruta: '/n/x',
      permisos: [],
      pestanas: [
        { etiqueta: 'Sectores', ruta: '/n/x/sectores' },
        { etiqueta: 'Reglas', ruta: '/n/x/reglas' },
      ],
      movil: [],
      enCabecera: true,
    }
    montar('/n/x/sectores', [seccion])
    const pestanas = within(screen.getByRole('navigation', { name: 'Pestañas de Sección X' }))
    expect(pestanas.getByRole('link', { name: 'Sectores' }).getAttribute('aria-current')).toBe('page')
    await userEvent.click(pestanas.getByRole('link', { name: 'Reglas' }))
    expect(screen.getByLabelText('url').textContent).toBe('/n/x/reglas')
    expect(pestanas.getByRole('link', { name: 'Reglas' }).getAttribute('aria-current')).toBe('page')
  })

  it('con una sola pestaña activa hay un único elemento con la lente', () => {
    estado.permisos = SA
    const { container } = montar('/n/mapa')
    expect(container.querySelectorAll('[aria-hidden="true"][style*="lente-pestanas"]').length).toBe(1)
  })

  it('la lente pasa a la pestaña activa y la cápsula y las pestañas quedan quietas con nombre propio', () => {
    estado.permisos = SA
    const { container } = montar('/n/planificacion/ciclos')
    const pestanas = screen.getByRole('navigation', {
      name: 'Pestañas de Planificación',
    })
    const lentes = container.querySelectorAll('[style*="lente-pestanas"]')
    expect(lentes.length).toBe(1)
    expect(within(pestanas).getByRole('link', { name: 'Ciclos' }).contains(lentes[0])).toBe(true)
    expect(pestanas.getAttribute('style')).toContain('view-transition-name: pestanas')
    // El nombre no va en <header>: un antecesor con nombre anularía el desenfoque del vidrio.
    const cabecera = container.querySelector('header')
    expect(cabecera?.getAttribute('style')).toBeNull()
    expect(cabecera?.querySelector('[style*="view-transition-name: cabecera"]')).not.toBeNull()
  })

  it('el título del móvil nombra también Cuenta, que no es sección de la cabecera', () => {
    estado.permisos = SA
    const { container } = montar('/n/cuenta')
    expect(container.querySelector('header span')?.textContent).toBe('Cuenta')
  })

  it('publica el borde inferior de la cabecera y lo retira al desmontarse', () => {
    estado.permisos = SA
    const { unmount } = montar('/n/mapa')
    expect(document.documentElement.style.getPropertyValue('--rediseno-alto-cabecera')).toBe('0px')
    unmount()
    expect(document.documentElement.style.getPropertyValue('--rediseno-alto-cabecera')).toBe('')
  })
})

function montarBarra(entrada: string, secciones?: readonly SeccionRediseno[]) {
  return render(
    <MemoryRouter initialEntries={[entrada]}>
      <BarraInferior secciones={secciones} />
    </MemoryRouter>,
  )
}

describe('Barra inferior única (RD-04)', () => {
  it('quien no tiene el inicio en campo ve sus secciones permitidas', () => {
    estado.permisos = J
    montarBarra('/n/incidencias')
    const barra = within(screen.getByRole('navigation', { name: 'Navegación principal' }))
    expect(barra.getAllByRole('link').map((a) => a.textContent)).toEqual([
      'Mapa',
      'Planificación',
      'Incidencias',
      'Proveedores',
      'Reportes',
    ])
    expect(barra.getByRole('link', { name: 'Incidencias' }).getAttribute('aria-current')).toBe('page')
  })

  it('con el inicio en campo ve las entradas de campo y «Más»', () => {
    estado.permisos = C
    const campo: SeccionRediseno = {
      id: 'campo',
      etiqueta: 'Campo',
      icono: Ellipsis,
      ruta: '/n/campo',
      permisos: [PERMISOS.consultarCuadrillas],
      pestanas: [],
      movil: [
        { etiqueta: 'Ruta de hoy', icono: MapIcon, ruta: '/n/campo/hoy' },
        { etiqueta: 'Encargos', icono: MapIcon, ruta: '/n/campo/encargos' },
      ],
      enCabecera: false,
      inicioEnCampo: true,
    }
    montarBarra('/n/campo/hoy', [campo])
    const barra = within(screen.getByRole('navigation', { name: 'Navegación principal' }))
    expect(barra.getAllByRole('link').map((a) => a.textContent)).toEqual(['Ruta de hoy', 'Encargos', 'Más'])
    expect(barra.getByRole('link', { name: 'Más' }).getAttribute('href')).toBe('/n/campo/mas')
  })

  it('mientras campo no declara entradas, quien es de campo ve sus secciones y no se queda solo con «Más»', () => {
    estado.permisos = C
    montarBarra('/n/incidencias', [{ ...seccionCampo, movil: [] }, seccionIncidencias])
    const barra = within(screen.getByRole('navigation', { name: 'Navegación principal' }))
    expect(barra.getAllByRole('link').map((a) => a.textContent)).toEqual(['Incidencias'])
  })

  it('la barra queda quieta en las transiciones', () => {
    estado.permisos = J
    montarBarra('/n/mapa')
    expect(screen.getByRole('navigation', { name: 'Navegación principal' }).getAttribute('style')).toContain(
      'view-transition-name: barra-inferior',
    )
  })

  it('quien también verifica partes no cuenta como de campo', () => {
    estado.permisos = [...C, 'CAM.PARTE.VERIFICAR']
    montarBarra('/n/incidencias')
    expect(screen.queryByRole('link', { name: 'Más' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Incidencias' })).toBeTruthy()
  })

  it('sin secciones no pinta barra ni reserva sitio para ella', () => {
    montarBarra('/n/cuenta')
    expect(screen.queryByRole('navigation')).toBeNull()
    expect(document.documentElement.style.getPropertyValue('--rediseno-alto-barra')).toBe('0px')
  })
})
