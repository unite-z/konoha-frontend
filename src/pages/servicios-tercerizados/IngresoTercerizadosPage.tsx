/**
 * Ingreso a Servicios tercerizados (MOD-05).
 *
 * El back-end de MOD-05 exige usuarios reales de Spring Security (HTTP Basic). MOD-06 sigue con su sesión simulada.
 * TODO: sustituir por el inicio de sesión común de MOD-01 (RF-T-001) cuando exista.
 *
 * - Valida campos obligatorios al enviar; el foco va al primer campo con error.
 * - Bloquea el doble envío mientras comprueba las credenciales.
 * - Con sesión activa redirige al destino (`?volver=`, solo rutas internas de MOD-05).
 */
import { useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import AvisoEnLinea from '../../components/ui/AvisoEnLinea'
import Boton from '../../components/ui/Boton'
import CampoFormulario, { LeyendaObligatorio } from '../../components/ui/CampoFormulario'
import { usePaginaActual } from '../../hooks/usePaginaActual'
import { MIGAS_TERCERIZADOS, destinoTrasIngreso } from '../../router/rutasApp'
import { aErrorApi } from '../../services/api/cliente'
import { useSesionTercerizados } from '../../sesion/ContextoSesionTercerizados'
import estilos from './IngresoTercerizados.module.css'

const ID_USUARIO = 'ingreso-usuario'
const ID_CLAVE = 'ingreso-clave'

interface Errores {
  usuario?: string
  clave?: string
}

export default function IngresoTercerizadosPage() {
  usePaginaActual('Ingresar a Servicios tercerizados', [MIGAS_TERCERIZADOS.serviciosTercerizados])
  const { estado, ingresar } = useSesionTercerizados()
  const [parametros] = useSearchParams()
  const navegar = useNavigate()
  const destino = destinoTrasIngreso(parametros.get('volver'))

  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [errores, setErrores] = useState<Errores>({})
  const [errorServidor, setErrorServidor] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  // Cerrojo síncrono contra el doble envío (el estado de React se actualiza después del render).
  const enCurso = useRef(false)

  if (estado.tipo === 'activa' && !enviando) return <Navigate to={destino} replace />

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enCurso.current) return
    const nuevos: Errores = {}
    if (!usuario.trim()) nuevos.usuario = 'Escribe tu usuario'
    if (!clave) nuevos.clave = 'Escribe tu contraseña'
    setErrores(nuevos)
    setErrorServidor(null)
    if (nuevos.usuario || nuevos.clave) {
      document.getElementById(nuevos.usuario ? ID_USUARIO : ID_CLAVE)?.focus()
      return
    }
    enCurso.current = true
    setEnviando(true)
    try {
      await ingresar(usuario.trim(), clave)
      navegar(destino, { replace: true })
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
    <section className={estilos.tarjeta} aria-labelledby="ingreso-titulo">
      <h2 id="ingreso-titulo" className={estilos.titulo}>
        Ingresa con tu usuario del sistema
      </h2>
      <p className={estilos.texto}>
        Servicios tercerizados usa tu usuario y contraseña de la sección. La sesión se cierra al cerrar esta
        pestaña o con «Cerrar sesión».
      </p>
      <form className={estilos.formulario} onSubmit={enviar} noValidate>
        <LeyendaObligatorio />
        {errorServidor && (
          <AvisoEnLinea tono="error" titulo="No pudimos iniciar la sesión">
            {errorServidor}
          </AvisoEnLinea>
        )}
        <CampoFormulario
          id={ID_USUARIO}
          etiqueta="Usuario"
          obligatorio
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          error={errores.usuario}
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
        <div className={estilos.acciones}>
          <Boton type="submit" cargando={enviando}>
            Ingresar
          </Boton>
        </div>
      </form>
    </section>
  )
}
