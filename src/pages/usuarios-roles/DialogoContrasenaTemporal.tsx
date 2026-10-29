/**
 * Muestra una sola vez la contraseña temporal de un alta, una reactivación o un restablecimiento.
 * No hay envío de correo desde el entorno académico (ADR 0003): el jefe se la entrega a la persona,
 * que tendrá que cambiarla al entrar (HU-MOD01-003, «Primer acceso»).
 */
import { useState } from 'react'
import AvisoEnLinea from '../../components/ui/AvisoEnLinea'
import Boton from '../../components/ui/Boton'
import DialogoConfirmacion from '../../components/ui/DialogoConfirmacion'
import type { UsuarioConContrasena } from '../../types/core'
import estilos from './UsuariosRoles.module.css'

export default function DialogoContrasenaTemporal({
  resultado,
  onCerrar,
}: {
  resultado: UsuarioConContrasena
  onCerrar: () => void
}) {
  const [copiada, setCopiada] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(resultado.contrasena_temporal)
      setCopiada(true)
    } catch {
      setCopiada(false)
    }
  }

  return (
    <DialogoConfirmacion
      abierto
      titulo={`Contraseña temporal de ${resultado.usuario.nombre}`}
      consecuencia="Entrégasela a la persona por un medio seguro. No volverás a verla: si se pierde, genera otra."
      textoConfirmar="Ya la entregué"
      onConfirmar={onCerrar}
      onCancelar={onCerrar}
    >
      <p className={estilos.contrasena} aria-label="Contraseña temporal">
        {resultado.contrasena_temporal}
      </p>
      <Boton variante="secundario" compacto onClick={() => void copiar()}>
        {copiada ? 'Copiada' : 'Copiar'}
      </Boton>
      {resultado.avisos.map((aviso) => (
        <AvisoEnLinea key={aviso} tono="advertencia">
          {aviso}
        </AvisoEnLinea>
      ))}
    </DialogoConfirmacion>
  )
}
