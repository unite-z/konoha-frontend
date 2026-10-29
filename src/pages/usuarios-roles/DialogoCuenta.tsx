// RF-T-002 · Alta y edición de cuentas (CU-MOD01-003 y 004)
/**
 * Alta o edición de una cuenta. En el alta se elige el rol (el operario aparece deshabilitado, RS-004) y
 * la vigencia opcional. Al editar, el correo no cambia: identifica la cuenta.
 *
 * Con correo duplicado el servidor responde 409 y, si la cuenta existente está inactiva, se ofrece
 * reactivarla (HU-MOD01-004, «Correo duplicado»).
 */
import { useRef, useState } from 'react'
import CampoFormulario from '../../components/ui/CampoFormulario'
import DialogoFormulario from '../../components/ui/DialogoFormulario'
import Selector from '../../components/ui/Selector'
import { aErrorApi } from '../../services/api/cliente'
import { datosDeError } from '../../services/api/clienteCore'
import { actualizarUsuario, crearUsuario } from '../../services/api/core'
import type { CodigoRol, UsuarioConContrasena, UsuarioResumen } from '../../types/core'
import { NOMBRE_ROL, ROLES_ASIGNABLES } from '../../utils/etiquetasCore'
import { hoyLima } from '../../utils/instanteLima'
import { validarCuenta, type ErroresCuenta } from '../../utils/validacionCore'

const OPCIONES_ROL = [
  ...ROLES_ASIGNABLES.map((rol) => ({ valor: rol, texto: NOMBRE_ROL[rol] })),
  { valor: 'operario', texto: 'Operario (previsto para una fase posterior)' },
]

export interface DialogoCuentaProps {
  /** Sin cuenta: alta. */
  cuenta?: UsuarioResumen
  onCerrar: () => void
  onCreada?: (resultado: UsuarioConContrasena) => void
  onActualizada?: (cuenta: UsuarioResumen) => void
  /** Correo en uso por una cuenta inactiva: la página ofrece reactivarla. */
  onCuentaExistente?: (cuentaId: number) => void
}

export default function DialogoCuenta({ cuenta, onCerrar, onCreada, onActualizada, onCuentaExistente }: DialogoCuentaProps) {
  const alta = !cuenta
  const inicial = {
    correo: cuenta?.correo ?? '',
    nombre: cuenta?.nombre ?? '',
    telefono: cuenta?.telefono ?? '',
    fecha_fin_vigencia: cuenta?.fecha_fin_vigencia ?? '',
    rol: (cuenta?.rol ?? 'practicante') as CodigoRol,
  }
  const [borrador, setBorrador] = useState(inicial)
  const [errores, setErrores] = useState<ErroresCuenta & { rol?: string }>({})
  const [error, setError] = useState<{ titulo: string; detalle: string } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const enCurso = useRef(false)

  async function guardar() {
    if (enCurso.current) return
    const locales: ErroresCuenta & { rol?: string } = validarCuenta(borrador, hoyLima(), alta)
    if (alta && borrador.rol === 'operario') {
      locales.rol = 'El operario se registra como persona de una cuadrilla, sin cuenta, en esta fase'
    }
    setErrores(locales)
    setError(null)
    const primero = Object.keys(locales)[0]
    if (primero) {
      document.getElementById(`cuenta-${primero}`)?.focus()
      return
    }
    enCurso.current = true
    setEnviando(true)
    const telefono = borrador.telefono.trim() || null
    const fin = borrador.fecha_fin_vigencia || null
    try {
      if (alta) {
        onCreada?.(
          await crearUsuario({
            correo: borrador.correo.trim(),
            nombre: borrador.nombre.trim(),
            telefono,
            rol: borrador.rol,
            fecha_fin_vigencia: fin,
          }),
        )
      } else {
        onActualizada?.(
          await actualizarUsuario(cuenta.id, { nombre: borrador.nombre.trim(), telefono, fecha_fin_vigencia: fin }),
        )
      }
    } catch (causa) {
      const fallo = aErrorApi(causa)
      if (fallo.codigo === 'correo-en-uso') {
        setErrores({ correo: fallo.detalle })
      } else if (fallo.codigo === 'rol-no-habilitado') {
        setErrores({ rol: fallo.detalle })
      } else {
        setError({ titulo: fallo.estado === 403 ? 'Sin permiso' : 'No se pudo guardar', detalle: fallo.detalle })
      }
      if (fallo.codigo === 'correo-en-uso') reactivable(causa)
    } finally {
      enCurso.current = false
      setEnviando(false)
    }
  }

  /** El cuerpo del 409 trae la cuenta inactiva que se puede reactivar. */
  function reactivable(causa: unknown) {
    const datos = datosDeError(causa)
    if (datos.puede_reactivar === true && typeof datos.cuenta_id === 'number') onCuentaExistente?.(datos.cuenta_id)
  }

  const cambiar = (clave: keyof typeof inicial, valor: string) => setBorrador({ ...borrador, [clave]: valor })

  return (
    <DialogoFormulario
      abierto
      titulo={alta ? 'Nueva cuenta' : `Editar ${cuenta.nombre}`}
      descripcion={
        alta
          ? 'La cuenta se crea activa con una contraseña temporal, que verás una sola vez.'
          : 'El correo identifica la cuenta y no se puede cambiar.'
      }
      textoConfirmar={alta ? 'Crear cuenta' : 'Guardar cambios'}
      enviando={enviando}
      hayCambios={JSON.stringify(borrador) !== JSON.stringify(inicial)}
      error={error}
      conObligatorios
      onEnviar={guardar}
      onCerrar={onCerrar}
    >
      {alta && (
        <CampoFormulario
          id="cuenta-correo"
          etiqueta="Correo institucional"
          type="email"
          obligatorio
          autoCapitalize="none"
          spellCheck={false}
          value={borrador.correo}
          onChange={(e) => cambiar('correo', e.target.value)}
          error={errores.correo}
          disabled={enviando}
        />
      )}
      <CampoFormulario
        id="cuenta-nombre"
        etiqueta="Nombres y apellidos"
        obligatorio
        value={borrador.nombre}
        onChange={(e) => cambiar('nombre', e.target.value)}
        error={errores.nombre}
        disabled={enviando}
      />
      <CampoFormulario
        id="cuenta-telefono"
        etiqueta="Teléfono"
        type="tel"
        value={borrador.telefono}
        onChange={(e) => cambiar('telefono', e.target.value)}
        error={errores.telefono}
        disabled={enviando}
      />
      {alta && (
        <Selector
          id="cuenta-rol"
          etiqueta="Rol"
          obligatorio
          valor={borrador.rol}
          opciones={OPCIONES_ROL}
          onCambiar={(valor) => cambiar('rol', valor)}
          error={errores.rol}
          ayuda="Un solo rol por persona. El capataz se vincula luego con su cuadrilla."
          disabled={enviando}
        />
      )}
      <CampoFormulario
        id="cuenta-fecha_fin_vigencia"
        etiqueta="Fin de vigencia"
        ayuda="Opcional. La cuenta se desactiva sola al día siguiente y se avisa 7 días antes."
        type="date"
        min={hoyLima()}
        value={borrador.fecha_fin_vigencia}
        onChange={(e) => cambiar('fecha_fin_vigencia', e.target.value)}
        error={errores.fecha_fin_vigencia}
        disabled={enviando}
      />
    </DialogoFormulario>
  )
}
