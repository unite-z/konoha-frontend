// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TEXTO_FORMATO } from '@/utils/exportaciones'
import SelectorFormato from './SelectorFormato'

afterEach(cleanup)

describe('SelectorFormato', () => {
  it('muestra solo los formatos admitidos como radios del sistema y avisa del elegido', async () => {
    const onCambiar = vi.fn()
    render(<SelectorFormato nombre="exportacion" formatos={['PDF', 'Excel']} valor="PDF" onCambiar={onCambiar} />)

    const grupo = screen.getByRole('group', { name: 'Formato' })
    expect(grupo).toBeTruthy()
    expect(screen.getAllByRole('radio')).toHaveLength(2)
    expect((screen.getByRole('radio', { name: TEXTO_FORMATO.PDF }) as HTMLInputElement).checked).toBe(true)

    await userEvent.setup().click(screen.getByRole('radio', { name: TEXTO_FORMATO.Excel }))
    expect(onCambiar).toHaveBeenCalledWith('Excel')
  })
})
