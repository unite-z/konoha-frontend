/**
 * Subir al inicio de la página (AV-393). En escritorio lo que se desplaza es el panel de contenido del layout
 * (`data-desplazable`), no la ventana; en móvil, la ventana. Se suben los dos.
 */
export function subirAlInicio() {
  document.querySelector<HTMLElement>('[data-desplazable]')?.scrollTo?.({ top: 0 })
  window.scrollTo?.({ top: 0 })
}
