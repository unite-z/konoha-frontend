// RF-T-001 · Acceso con correo y contraseña (HU-MOD01-001 y 002)
/**
 * Inicio de sesión de MOD-01. Sin sesión es lo único que se ve (CU-MOD01-001 paso 1).
 *
 * - El servidor responde un mensaje genérico ante credenciales incorrectas y avisa del bloqueo o de la
 *   cuenta no activa: se muestra tal cual.
 * - «Mantener sesión en este dispositivo» solo vale en el móvil de campo (canal `campo`) y es voluntario:
 *   en escritorio no se muestra porque el servidor no alarga la sesión de oficina.
 * - «¿Olvidaste tu contraseña?» muestra cómo pedir una contraseña temporal: MOD-01 aún no recupera por correo.
 * - Bloquea el doble envío y, al entrar, vuelve a la ruta de `?volver=` (solo internas).
 *
 * Diseño: Figma «MOD01 · Web · login · Inicia sesión» (423:2) y su versión móvil (423:23), más el fondo de
 * nodos en movimiento (`FondoNodos`), pedido por Marcos y aún no dibujado en Figma.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton from '@/components/ui/Boton'
import Tarjeta from '@/components/ui/Tarjeta'
import Casilla from '@/components/ui/Casilla'
import CampoFormulario from '@/components/ui/CampoFormulario'
import Icono from '@/components/ui/Icono'
import { RUTAS_CORE, destinoTrasIngresoCore } from '@/router/rutasApp'
import { aErrorApi } from '@/services/api/cliente'
import { useSesion } from '@/sesion/ContextoSesion'
import FondoNodos from './FondoNodos'
import estilos from './Acceso.module.css'

const ID_CORREO = 'ingreso-correo'
const ID_CLAVE = 'ingreso-clave'
const ID_OLVIDO = 'ingreso-olvido'

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
  const [verOlvido, setVerOlvido] = useState(false)
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
    <main className={`${estilos.fondo} ${estilos.fondoIngreso}`}>
      <FondoNodos />
      <Tarjeta relleno="amplio" etiquetadaPor="ingreso-titulo" className={`${estilos.tarjeta} ${estilos.tarjetaIngreso}`}>
        <p className={estilos.marcaLogo}>
          <span className={estilos.simbolo}>
            <Icono nombre="leaf" tamano="base" />
          </span>
          <span className={estilos.nombreMarca}>Áreas Verdes</span>
          <span className={estilos.campus}>PUCP</span>
        </p>
        <h1 id="ingreso-titulo" className={estilos.tituloIngreso}>
          Inicia sesión
        </h1>
        <p className={estilos.subtitulo}>Ingresa con tu cuenta institucional para acceder al sistema.</p>
        <form className={estilos.formularioIngreso} onSubmit={enviar} noValidate>
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
            type="email"
            required
            placeholder="usuario@pucp.edu.pe"
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
            required
            autoComplete="current-password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            error={errores.clave}
            disabled={enviando}
          />
          {movil && (
            <Casilla
              etiqueta="Mantener sesión en este dispositivo"
              marcada={mantener}
              onCambiar={setMantener}
              disabled={enviando}
            />
          )}
          <div className={estilos.accionesIngreso}>
            <Boton type="submit" cargando={enviando}>
              Ingresar
            </Boton>
            <Boton
              variante="fantasma"
              aria-expanded={verOlvido}
              aria-controls={ID_OLVIDO}
              onClick={() => setVerOlvido((v) => !v)}
            >
              ¿Olvidaste tu contraseña?
            </Boton>
          </div>
          <div id={ID_OLVIDO}>
            {verOlvido && (
              <AvisoEnLinea tono="info" titulo="Pide una contraseña temporal">
                El jefe de sección te da una contraseña temporal; al entrar, el sistema te pide cambiarla.
              </AvisoEnLinea>
            )}
          </div>
        </form>
      </Tarjeta>
      <p className={estilos.pistaNodos} aria-hidden="true">
        Pulsa sobre las partículas
      </p>
    </main>
  )
}
