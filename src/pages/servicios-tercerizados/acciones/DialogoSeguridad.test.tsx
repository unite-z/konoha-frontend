// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Atencion } from '@/types/tercerizados'
import DialogoSeguridad from './DialogoSeguridad'

const verificar = vi.fn()
vi.mock('@/services/api/tercerizados', () => ({
  verificarSeguridad: (...args: unknown[]) => verificar(...args),
  obtenerAtencion: vi.fn(),
}))
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
  HTMLDialogElement.prototype.close = function () { this.open = false }
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

it('exige medidas y confirmación antes de registrar', async () => {
  const usuario = userEvent.setup()
  const atencion = { id: 5 } as Atencion
  verificar.mockResolvedValue(atencion)
  const onExito = vi.fn()
  const onActualizada = vi.fn()
  render(<DialogoSeguridad abierto atencion={atencion} onCerrar={vi.fn()} onExito={onExito} onActualizada={onActualizada} />)
  const guardar = screen.getByRole('button', { name: 'Guardar verificación' })
  await usuario.click(guardar)
  expect(verificar).not.toHaveBeenCalled()
  await usuario.type(screen.getByRole('textbox', { name: /EPP y medidas/ }), 'Guantes y área delimitada')
  await usuario.click(guardar)
  expect(verificar).not.toHaveBeenCalled()
  await usuario.click(screen.getByRole('checkbox'))
  await usuario.click(guardar)
  await waitFor(() => expect(onExito).toHaveBeenCalledWith('Verificación de seguridad registrada'))
  expect(verificar).toHaveBeenCalledWith(5, 'Guantes y área delimitada')
  expect(onActualizada).toHaveBeenCalledWith(atencion)
})
