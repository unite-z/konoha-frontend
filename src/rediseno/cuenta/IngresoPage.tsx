/**
 * Inicio de sesión del diseño nuevo (RD-63, M1-01, RF-T-001). Vista con mapa: el campus 3D se construye detrás de una
 * tarjeta de vidrio (la construcción es de `MapaCampus`: ≤ 1,8 s, se salta con un clic o una tecla, una vez por sesión
 * y no se reproduce con «reducir movimiento»).
 *
 * Conserva lo de hoy: aviso genérico ante credenciales incorrectas, de bloqueo y de cuenta no activa (el servidor los
 * redacta y se muestran tal cual), «Tu sesión terminó», «Mantener sesión en este dispositivo» solo en el móvil de campo,
 * «¿Olvidaste tu contraseña?» y la vuelta a `?volver=` (solo rutas internas). Al entrar, la tarjeta se desvanece con la
 * transición de vista y el mapa sigue vivo hacia el inicio.
 *
 * Transiciones: tarjeta → desvanecer al navegar (`useNavegarConTransicion`).
 */
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import Boton from '@/design-system/Boton'
import CampoFormulario from '@/design-system/CampoFormulario'
import Casilla from '@/design-system/Casilla'
import Icono from '@/design-system/Icono'
import { aErrorApi } from '@/services/api/cliente'
import { useSesion } from '@/sesion/ContextoSesion'
import { ATRIBUTO_MAPA_LIBRE, useVistaDeMapa } from '../base/Escenario'
import { useNavegarConTransicion } from '../base/movimiento'
import { PREFIJO_REDISENO } from '../prefijo'
import { PARAM_VOLVER, RUTA_CAMBIAR_CONTRASENA, destinoSeguro } from './enlaces'
import estilos from './Acceso.module.css'

const ID_CORREO = 'ingreso-correo'
const ID_CLAVE = 'ingreso-clave'
const ID_OLVIDO = 'ingreso-olvido'

/** Pantalla de móvil: se ofrece mantener la sesión (CU-MOD01-001 5a). */
function esMovil(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
}

const sinSeleccion = () => undefined

export default function IngresoPage() {
  const { estado, ingresar } = useSesion()
  const [parametros] = useSearchParams()
  const { state } = useLocation()
  const navegar = useNavegarConTransicion()
  const destino = destinoSeguro(parametros.get(PARAM_VOLVER)) ?? PREFIJO_REDISENO
  useVistaDeMapa({ onSeleccionarArea: sinSeleccion })

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
    return <Navigate to={estado.sesion.debe_cambiar_contrasena ? RUTA_CAMBIAR_CONTRASENA : destino} replace />
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
      // `enviando` sigue en true: la transición de vista aplica la navegación un fotograma después, y con la sesión
      // ya activa el `<Navigate>` de arriba la pisaría (sin fundido). Sin `?volver=`, `/n` elige el inicio según los
      // permisos (`InicioRediseno`: el capataz, a Campo).
      navegar(sesion.debe_cambiar_contrasena ? RUTA_CAMBIAR_CONTRASENA : destino, { replace: true })
    } catch (causa) {
      setErrorServidor(aErrorApi(causa).detalle)
      setClave('')
      setEnviando(false)
      document.getElementById(ID_CLAVE)?.focus()
    } finally {
      enCurso.current = false
    }
  }

  return (
    <div className={estilos.escena} {...{ [ATRIBUTO_MAPA_LIBRE]: '' }}>
      <section className={`${estilos.tarjeta} ${estilos.tarjetaIngreso}`} aria-labelledby="ingreso-titulo">
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
        <p className={estilos.texto}>Ingresa con tu cuenta institucional para acceder al sistema.</p>
        <form className={estilos.formulario} onSubmit={enviar} noValidate>
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
          <div className={estilos.acciones}>
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
      </section>
    </div>
  )
}
