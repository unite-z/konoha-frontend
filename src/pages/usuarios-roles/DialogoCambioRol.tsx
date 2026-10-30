// RF-T-003 · Cambio de rol (HU-MOD01-006, CU-MOD01-005)
/**
 * Asigna o cambia el rol de una persona. Un solo rol: el nuevo sustituye al anterior y vale desde la
 * siguiente acción de la persona, sin volver a iniciar sesión. El motivo es obligatorio y queda en el
 * historial con autor y fecha. El operario aparece deshabilitado («previsto para una fase posterior»).
 */
import { useRef, useState } from 'react'
import { AreaTexto } from '../../components/ui/CampoFormulario'
import DialogoFormulario from '../../components/ui/DialogoFormulario'
import EstadoCarga from '../../components/ui/EstadoCarga'
import EstadoError from '../../components/ui/EstadoError'
import { useConsulta } from '../../hooks/useConsulta'
import { aErrorApi } from '../../services/api/cliente'
import { cambiarRol, listarRoles } from '../../services/api/core'
import type { CodigoRol, RolUsuario, UsuarioResumen } from '../../types/core'
import { validarMotivo } from '../../utils/validacionCore'
import estilos from './UsuariosRoles.module.css'

export interface DialogoCambioRolProps {
  cuenta: UsuarioResumen
  onCerrar: () => void
  onCambiado: (resultado: RolUsuario) => void
}

export default function DialogoCambioRol({ cuenta, onCerrar, onCambiado }: DialogoCambioRolProps) {
  const roles = useConsulta('roles', (signal) => listarRoles(signal))
  const [rol, setRol] = useState<CodigoRol>(cuenta.rol)
  const [motivo, setMotivo] = useState('')
  const [errores, setErrores] = useState<{ rol?: string; motivo?: string }>({})
  const [error, setError] = useState<{ titulo: string; detalle: string } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const enCurso = useRef(false)

  async function guardar() {
    if (enCurso.current) return
    const locales: { rol?: string; motivo?: string } = {}
    if (rol === cuenta.rol) locales.rol = 'Elige un rol distinto del actual'
    const errorMotivo = validarMotivo(motivo)
    if (errorMotivo) locales.motivo = errorMotivo
    setErrores(locales)
    setError(null)
    if (locales.rol || locales.motivo) {
      document.getElementById(locales.rol ? 'rol-opciones' : 'rol-motivo')?.focus()
      return
    }
    enCurso.current = true
    setEnviando(true)
    try {
      onCambiado(await cambiarRol(cuenta.id, rol, motivo.trim()))
    } catch (causa) {
      const fallo = aErrorApi(causa)
      setError({ titulo: fallo.estado === 403 ? 'Sin permiso' : 'No se pudo cambiar el rol', detalle: fallo.detalle })
    } finally {
      enCurso.current = false
      setEnviando(false)
    }
  }

  return (
    <DialogoFormulario
      abierto
      titulo={`Cambiar el rol de ${cuenta.nombre}`}
      descripcion="El nuevo rol sustituye al actual y vale desde su siguiente acción."
      textoConfirmar="Cambiar rol"
      enviando={enviando}
      hayCambios={rol !== cuenta.rol || motivo !== ''}
      error={error}
      conObligatorios
      ancho="amplio"
      onEnviar={guardar}
      onCerrar={onCerrar}
    >
      {roles.estado === 'error' ? (
        <EstadoError titulo="No pudimos cargar los roles" descripcion={roles.error?.detalle ?? ''} onReintentar={roles.reintentar} nivel={3} />
      ) : !roles.datos ? (
        <EstadoCarga forma="tabla" filas={4} />
      ) : (
        <fieldset id="rol-opciones" tabIndex={-1} className={estilos.roles} aria-describedby={errores.rol ? 'rol-error' : undefined}>
          <legend>Rol *</legend>
          {roles.datos.map((r) => (
            <label key={r.codigo} className={estilos.opcionRol} aria-disabled={!r.activo}>
              <input
                type="radio"
                name="rol"
                value={r.codigo}
                checked={rol === r.codigo}
                disabled={!r.activo || enviando}
                onChange={() => setRol(r.codigo)}
              />
              <span>
                <strong>{r.nombre}</strong>
                {r.codigo === cuenta.rol && ' (actual)'}
                <br />
                <span className={estilos.ayuda}>
                  {r.activo ? `${r.descripcion}. ${r.permisos.length} permisos.` : 'Previsto para una fase posterior: sin acceso.'}
                </span>
              </span>
            </label>
          ))}
          {errores.rol && (
            <p id="rol-error" role="alert" className={estilos.ayuda}>
              {errores.rol}
            </p>
          )}
        </fieldset>
      )}
      <AreaTexto
        id="rol-motivo"
        etiqueta="Motivo del cambio"
        obligatorio
        rows={3}
        maxLength={500}
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        error={errores.motivo}
        disabled={enviando}
      />
    </DialogoFormulario>
  )
}
