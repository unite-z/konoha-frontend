// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import DialogoFormulario from './DialogoFormulario'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false
  }
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('DialogoFormulario', () => {
  it('con ancho lateral se pinta como panel y conserva título y acciones', () => {
    render(
      <DialogoFormulario abierto titulo="Programar ciclo" textoConfirmar="Programar ciclo" ancho="lateral" onEnviar={vi.fn()} onCerrar={vi.fn()}>
        <p>Campos</p>
      </DialogoFormulario>,
    )

    const dialogo = screen.getByRole('dialog', { name: 'Programar ciclo' })
    expect(dialogo.className).toMatch(/lateral/)
    expect(screen.getByRole('button', { name: 'Programar ciclo' })).toBeTruthy()
  })

  it('con ancho hoja es la hoja inferior del móvil: asa, sin X y los dos botones (Figma 375-6817)', () => {
    render(
      <DialogoFormulario abierto titulo="J-015 ya está marcado" descripcion="Por J. Ramos a las 10:18." textoConfirmar="Añadir observación" ancho="hoja" onEnviar={vi.fn()} onCerrar={vi.fn()}>
        <p>Campos</p>
      </DialogoFormulario>,
    )

    const dialogo = screen.getByRole('dialog', { name: 'J-015 ya está marcado' })
    expect(dialogo.className).toMatch(/hoja/)
    expect(dialogo.querySelector('[class*="asa"]')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Cerrar' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Añadir observación' })).toBeTruthy()
  })

  it('el panel lateral sale hacia la derecha y avisa al terminar la animación', () => {
    vi.stubGlobal('matchMedia', (consulta: string) => ({ matches: consulta.includes('no-preference') }))
    const onCerrar = vi.fn()
    render(
      <DialogoFormulario abierto titulo="Nueva restricción" textoConfirmar="Registrar" ancho="lateral" onEnviar={vi.fn()} onCerrar={onCerrar}>
        <p>Campos</p>
      </DialogoFormulario>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    const dialogo = screen.getByRole('dialog', { name: 'Nueva restricción' })
    expect(dialogo.className).toMatch(/saliendo/)
    expect(onCerrar).not.toHaveBeenCalled()

    fireEvent.animationEnd(dialogo)
    expect(onCerrar).toHaveBeenCalledOnce()
  })

  it('sin movimiento, el panel lateral se cierra al momento', () => {
    const onCerrar = vi.fn()
    render(
      <DialogoFormulario abierto titulo="Nueva restricción" textoConfirmar="Registrar" ancho="lateral" onEnviar={vi.fn()} onCerrar={onCerrar}>
        <p>Campos</p>
      </DialogoFormulario>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCerrar).toHaveBeenCalledOnce()
  })

  it('puede mostrar únicamente la acción Cerrar y conservar la X de la cabecera', () => {
    const onCerrar = vi.fn()
    render(
      <DialogoFormulario
        abierto
        titulo="Ver fotografías"
        textoConfirmar="Cerrar"
        ocultarCancelar
        conCierre
        onEnviar={onCerrar}
        onCerrar={onCerrar}
      >
        <p>Fotografías</p>
      </DialogoFormulario>,
    )

    expect(screen.queryByRole('button', { name: 'Cancelar' })).toBeNull()
    expect(screen.getAllByRole('button', { name: 'Cerrar' })).toHaveLength(2)
    fireEvent.click(screen.getAllByRole('button', { name: 'Cerrar' })[0])
    expect(onCerrar).toHaveBeenCalledOnce()
  })

  it('el panel lateral se cierra con la X y, con el envío deshabilitado, no envía', () => {
    const onCerrar = vi.fn()
    const onEnviar = vi.fn()
    render(
      <DialogoFormulario abierto titulo="Editar servicio" textoConfirmar="Guardar cambios" ancho="lateral" envioDeshabilitado onEnviar={onEnviar} onCerrar={onCerrar}>
        <p>Campos</p>
      </DialogoFormulario>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(onEnviar).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onCerrar).toHaveBeenCalledOnce()
  })
})
