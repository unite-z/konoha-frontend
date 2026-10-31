// RF-T-001 · Contraseña propia (HU-MOD01-003, CU-MOD01-002)
/**
 * Cambio de la propia contraseña. Es obligatorio tras una contraseña temporal («Primer acceso»): hasta
 * hacerlo, el servidor solo permite esta pantalla y cerrar sesión.
 *
 * - Valida la política antes de enviar e indica qué regla no se cumple; el servidor la vuelve a aplicar.
 * - Al cambiarla, el servidor cierra las demás sesiones del usuario.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import AvisoEnLinea from '../../components/ui/AvisoEnLinea'
import Boton from '../../components/ui/Boton'
import CampoFormulario, { LeyendaObligatorio } from '../../components/ui/CampoFormulario'
import { aErrorApi } from '../../services/api/cliente'
import { cambiarContrasena } from '../../services/api/core'
import { useSesion, useSesionActiva } from '../../sesion/ContextoSesion'
import { LONGITUD_MINIMA_CONTRASENA, validarCambioContrasena, type ErroresCambioContrasena } from '../../utils/validacionCore'
import estilos from './Acceso.module.css'

const IDS: Record<keyof ErroresCambioContrasena, string> = {
  actual: 'contrasena-actual',
  nueva: 'contrasena-nueva',
  confirmacion: 'contrasena-confirmacion',
}

export default function CambioContrasenaPage() {
  const sesion = useSesionActiva()
  const { recargar, cerrarSesion } = useSesion()
  const navegar = useNavigate()
  const obligatoria = sesion?.debe_cambiar_contrasena ?? false

  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [errores, setErrores] = useState<ErroresCambioContrasena>({})
  const [errorServidor, setErrorServidor] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const enCurso = useRef(false)

  useEffect(() => {
    document.title = 'Cambiar contraseña · Gestión de Áreas Verdes'
  }, [])

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enCurso.current) return
    const nuevos = validarCambioContrasena(actual, nueva, confirmacion)
    setErrores(nuevos)
    setErrorServidor(null)
    const primero = (Object.keys(IDS) as (keyof ErroresCambioContrasena)[]).find((clave) => nuevos[clave])
    if (primero) {
      document.getElementById(IDS[primero])?.focus()
      return
    }
    enCurso.current = true
    setEnviando(true)
    try {
      await cambiarContrasena({ contrasena_actual: actual, contrasena_nueva: nueva, confirmacion })
      await recargar()
      navegar('/', { replace: true, state: { aviso: 'Contraseña actualizada' } })
    } catch (causa) {
      setErrorServidor(aErrorApi(causa).detalle)
    } finally {
      enCurso.current = false
      setEnviando(false)
    }
  }

  return (
    <main className={estilos.fondo}>
      <section className={estilos.tarjeta} aria-labelledby="contrasena-titulo">
        <p className={estilos.marca}>Gestión de Áreas Verdes · Campus PUCP</p>
        <h1 id="contrasena-titulo" className={estilos.titulo}>
          {obligatoria ? 'Define tu contraseña' : 'Cambiar contraseña'}
        </h1>
        <p className={estilos.texto}>
          {obligatoria
            ? 'Entraste con una contraseña temporal. Define una propia antes de continuar.'
            : 'Al cambiarla se cerrarán tus sesiones en otros dispositivos.'}
        </p>
        <ul className={estilos.reglas}>
          <li>Al menos {LONGITUD_MINIMA_CONTRASENA} caracteres.</li>
          <li>Con letras y números.</li>
          <li>Distinta de la actual.</li>
        </ul>
        <form className={estilos.formulario} onSubmit={enviar} noValidate>
          <LeyendaObligatorio />
          {errorServidor && (
            <AvisoEnLinea tono="error" titulo="No pudimos cambiar la contraseña">
              {errorServidor}
            </AvisoEnLinea>
          )}
          <CampoFormulario
            id={IDS.actual}
            etiqueta={obligatoria ? 'Contraseña temporal' : 'Contraseña actual'}
            type="password"
            obligatorio
            autoComplete="current-password"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            error={errores.actual}
            disabled={enviando}
          />
          <CampoFormulario
            id={IDS.nueva}
            etiqueta="Contraseña nueva"
            type="password"
            obligatorio
            autoComplete="new-password"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            error={errores.nueva}
            disabled={enviando}
          />
          <CampoFormulario
            id={IDS.confirmacion}
            etiqueta="Repite la contraseña nueva"
            type="password"
            obligatorio
            autoComplete="new-password"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            error={errores.confirmacion}
            disabled={enviando}
          />
          <div className={estilos.acciones}>
            {obligatoria ? (
              <Boton variante="terciario" type="button" onClick={() => void cerrarSesion()} deshabilitado={enviando}>
                Cerrar sesión
              </Boton>
            ) : (
              <Boton variante="terciario" type="button" onClick={() => navegar(-1)} deshabilitado={enviando}>
                Cancelar
              </Boton>
            )}
            <Boton type="submit" cargando={enviando}>
              Guardar contraseña
            </Boton>
          </div>
        </form>
      </section>
    </main>
  )
}
