import { useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import CampoFormulario from '../../components/ui/CampoFormulario'
import Boton from '../../components/ui/Boton'
import AvisoEnLinea from '../../components/ui/AvisoEnLinea'
import EstadoCarga from '../../components/ui/EstadoCarga'
import { usePaginaActual } from '../../hooks/usePaginaActual'
import { useSesionCampo } from '../../sesion/ContextoSesionCampo'
import { aErrorApi } from '../../services/api/cliente'
import { destinoCampo } from '../../router/rutasCampo'
import estilos from '../servicios-tercerizados/IngresoTercerizados.module.css'

export default function IngresoCampoPage() {
  usePaginaActual('Ingresar a Operación de campo',[{texto:'Operación de campo'},{texto:'Ingresar'}])
  const sesion=useSesionCampo(), navegar=useNavigate(), [params]=useSearchParams()
  const [nombre,setNombre]=useState(''),[clave,setClave]=useState(''),[error,setError]=useState(''),[enviando,setEnviando]=useState(false)
  const bloqueo=useRef(false)
  const destino=destinoCampo(params.get('volver'))
  if(sesion.verificando) return <EstadoCarga texto="Verificando tu sesión…"/>
  if(sesion.usuario) return <Navigate to={destino} replace/>
  async function enviar(event: FormEvent) {
    event.preventDefault(); if(bloqueo.current) return
    if(!nombre.trim()||!clave) {setError('Escribe tu usuario y contraseña'); document.getElementById(!nombre.trim()?'campo-usuario':'campo-clave')?.focus(); return}
    bloqueo.current=true; setEnviando(true); setError('')
    try {await sesion.ingresar(nombre.trim(),clave); navegar(destino,{replace:true})}
    catch(cause) {const e=aErrorApi(cause); setError((e.estado===401||e.estado===403)?'Usuario o contraseña incorrectos, usuario inactivo o sin acceso al módulo':e.detalle); setClave('')}
    finally {bloqueo.current=false;setEnviando(false)}
  }
  return <section className={estilos.tarjeta} aria-labelledby="campo-ingreso-titulo">
    <h2 id="campo-ingreso-titulo" className={estilos.titulo}>Ingresa a Operación de campo</h2>
    <p className={estilos.texto}>Gestiona las cuadrillas, los encargos y las personas que participan en cada actividad.</p>
    <form onSubmit={enviar} className={estilos.formulario}>
      {(error||sesion.error)&&<AvisoEnLinea tono="error" titulo="No pudimos iniciar sesión">{error||sesion.error}</AvisoEnLinea>}
      <CampoFormulario id="campo-usuario" etiqueta="Usuario" value={nombre} onChange={e=>setNombre(e.target.value)} autoComplete="username" obligatorio required disabled={enviando}/>
      <CampoFormulario id="campo-clave" etiqueta="Contraseña" type="password" value={clave} onChange={e=>setClave(e.target.value)} autoComplete="current-password" obligatorio required disabled={enviando}/>
      <Boton type="submit" cargando={enviando}>Ingresar</Boton>
    </form>
  </section>
}
