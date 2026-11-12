// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import { fijarUsuarioDatos, olvidarDatos } from '@/sincronizacion/datosDescargados'
import { useConsulta } from './useConsulta'

function Pantalla({ cargar }: { cargar: () => Promise<string> }) {
  const consulta = useConsulta('calendario-cuadrilla:2026-11-09', cargar)
  return <p>{consulta.estado === 'error' ? `error ${consulta.error?.estado}` : (consulta.datos ?? 'cargando')}</p>
}

beforeEach(async () => {
  fijarUsuarioDatos(7)
  await olvidarDatos()
})
afterEach(cleanup)

describe('useConsulta sin conexión (RF-T-012)', () => {
  it('tras recargar sin red, abre con la última lectura correcta', async () => {
    render(<Pantalla cargar={async () => 'Semana del 9'} />)
    expect(await screen.findByText('Semana del 9')).toBeTruthy()
    cleanup()
    render(<Pantalla cargar={() => Promise.reject(new ErrorApi(0, null, 'sin red'))} />)
    expect(await screen.findByText('Semana del 9')).toBeTruthy()
  })

  it('sin copia descargada, muestra el error de conexión', async () => {
    render(<Pantalla cargar={() => Promise.reject(new ErrorApi(0, null, 'sin red'))} />)
    expect(await screen.findByText('error 0')).toBeTruthy()
  })

  it('un 403 no se tapa con la copia', async () => {
    render(<Pantalla cargar={async () => 'Semana del 9'} />)
    await screen.findByText('Semana del 9')
    cleanup()
    render(<Pantalla cargar={() => Promise.reject(new ErrorApi(403, null, 'Sin permiso'))} />)
    expect(await screen.findByText('error 403')).toBeTruthy()
  })
})
