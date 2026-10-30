// RF-T-001 · Acceso con correo y contraseña (HU-MOD01-001 y 002)
/**
 * Inicio de sesión de MOD-01. Sin sesión es lo único que se ve (CU-MOD01-001 paso 1).
 *
 * - El servidor responde un mensaje genérico ante credenciales incorrectas y avisa del bloqueo o de la
 *   cuenta no activa: se muestra tal cual.
 * - «Mantener la sesión en este móvil» solo vale en el móvil de campo (canal `campo`) y es voluntario.
 * - Bloquea el doble envío y, al entrar, vuelve a la ruta de `?volver=` (solo internas).
 */
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'
import AvisoEnLinea from '../../components/ui/AvisoEnLinea'
import Boton from '../../components/ui/Boton'
import CampoFormulario, { LeyendaObligatorio } from '../../components/ui/CampoFormulario'
import { RUTAS_CORE, destinoTrasIngresoCore } from '../../router/rutasApp'
import { aErrorApi } from '../../services/api/cliente'
import { useSesion } from '../../sesion/ContextoSesion'
import estilos from './Acceso.module.css'

const ID_CORREO = 'ingreso-correo'
const ID_CLAVE = 'ingreso-clave'

/** Pantalla de móvil: se ofrece mantener la sesión (CU-MOD01-001 5a). */
function esMovil(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
}

export default function IngresoPage() {
  const { estado, ingresar } = useSesion()
  const [parametros] = useSearchParams()
  const { state } = useLocation()
  const navegar = useNavigate()
  const destino = destinoTrasIngresoCore(parametros.get('volver')) ?? '/'

  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [mantener, setMantener] = useState(false)
  const [errores, setErrores] = useState<{ correo?: string; clave?: string }>({})
  const [errorServidor, setErrorServidor] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const enCurso = useRef(false)
  const movil = esMovil()
  const sesionPerdida = Boolean((state as { perdida?: boolean } | null)?.perdida)

  useEffect(() => {
    document.title = 'Iniciar sesión · Gestión de Áreas Verdes'
  }, [])

  if (estado.tipo === 'activa' && !enviando) {
    return <Navigate to={estado.sesion.debe_cambiar_contrasena ? RUTAS_CORE.cambiarContrasena : destino} replace />
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enCurso.current) return
    const nuevos: { correo?: string; clave?: string } = {}
    if (!correo.trim()) nuevos.correo = 'Escribe tu correo institucional'
    if (!clave) nuevos.clave = 'Escribe tu contraseña'
    setErrores(nuevos)
    setErrorServidor(null)
    if (nuevos.correo || nuevos.clave) {
      document.getElementById(nuevos.correo ? ID_CORREO : ID_CLAVE)?.focus()
      return
    }
    enCurso.current = true
    setEnviando(true)
    try {
      const sesion = await ingresar({
        identificador: correo.trim(),
        contrasena: clave,
        canal: movil ? 'campo' : 'oficina',
        mantener_sesion: movil && mantener,
      })
      navegar(sesion.debe_cambiar_contrasena ? RUTAS_CORE.cambiarContrasena : destino, { replace: true })
    } catch (causa) {
      setErrorServidor(aErrorApi(causa).detalle)
      setClave('')
      document.getElementById(ID_CLAVE)?.focus()
    } finally {
      enCurso.current = false
      setEnviando(false)
    }
  }

  return (
    <main className={estilos.fondo}>
      <section className={estilos.tarjeta} aria-labelledby="ingreso-titulo">
        <p className={estilos.marca}>Gestión de Áreas Verdes · Campus PUCP</p>
        <h1 id="ingreso-titulo" className={estilos.titulo}>
          Inicia sesión
        </h1>
        <p className={estilos.texto}>Usa tu correo institucional y tu contraseña.</p>
        <form className={estilos.formulario} onSubmit={enviar} noValidate>
          <LeyendaObligatorio />
          {sesionPerdida && !errorServidor && (
            <AvisoEnLinea tono="info" titulo="Tu sesión terminó">
              Vuelve a iniciar sesión para continuar.
            </AvisoEnLinea>
          )}
          {errorServidor && (
            <AvisoEnLinea tono="error" titulo="No pudimos iniciar la sesión">
              {errorServidor}
            </AvisoEnLinea>
          )}
          <CampoFormulario
            id={ID_CORREO}
            etiqueta="Correo institucional"
            ayuda="Las cuentas que venían de Servicios tercerizados entran con su usuario."
            type="email"
            obligatorio
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            error={errores.correo}
            disabled={enviando}
          />
          <CampoFormulario
            id={ID_CLAVE}
            etiqueta="Contraseña"
            type="password"
            obligatorio
            autoComplete="current-password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            error={errores.clave}
            disabled={enviando}
          />
          {movil && (
            <label className={estilos.casilla}>
              <input type="checkbox" checked={mantener} onChange={(e) => setMantener(e.target.checked)} disabled={enviando} />
              <span>Mantener la sesión en este móvil (hasta 30 días). Úsalo solo en el móvil asignado.</span>
            </label>
          )}
          <p className={estilos.texto}>
            ¿Olvidaste tu contraseña? Pide al jefe de sección una contraseña temporal.
          </p>
          <div className={estilos.acciones}>
            <Boton type="submit" cargando={enviando}>
              Ingresar
            </Boton>
          </div>
        </form>
      </section>
    </main>
  )
}
