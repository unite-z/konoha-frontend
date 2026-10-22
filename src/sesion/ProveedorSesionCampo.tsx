import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ContextoSesionCampo } from './ContextoSesionCampo'
import { autorizacionCampo, campoApi, guardarSesionCampo } from '../services/api/operacionCampo'
import { cabeceraBasic } from '../services/api/clienteTercerizados'
import { aErrorApi, esCancelacion } from '../services/api/cliente'
import type { UsuarioCampo } from '../types/operacionCampo'

export default function ProveedorSesionCampo({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioCampo | null>(null)
  const [verificando, setVerificando] = useState(Boolean(autorizacionCampo()))
  const [error,setError] = useState<string | null>(null)
  const [intento,setIntento] = useState(0)
  const generation = useRef(0)
  useEffect(() => {
    const auth = autorizacionCampo()
    if(!auth) return
    const current = ++generation.current
    const controller = new AbortController()
    campoApi<UsuarioCampo>('me/',{signal:controller.signal,autorizacion:auth}).then(user => {
      if(generation.current===current) setUsuario(user)
    }).catch(cause => {
      if(esCancelacion(cause)||generation.current!==current) return
      const apiError = aErrorApi(cause)
      if((apiError.estado===401||apiError.estado===403)) { guardarSesionCampo(null); setUsuario(null) }
      else setError(apiError.detalle)
    }).finally(() => { if(generation.current===current) setVerificando(false) })
    return () => controller.abort()
  },[intento])
  const ingresar = useCallback(async (nombre: string, clave: string) => {
    const auth = cabeceraBasic(nombre,clave)
    const current = ++generation.current
    const user = await campoApi<UsuarioCampo>('me/',{autorizacion:auth})
    if(generation.current!==current) return
    guardarSesionCampo(auth)
    setUsuario(user); setError(null); setVerificando(false)
  },[])
  const cerrarSesion = useCallback(() => {
    generation.current++; guardarSesionCampo(null); setUsuario(null); setError(null); setVerificando(false)
  },[])
  const reintentar = useCallback(() => { setError(null); setVerificando(true); setIntento(n=>n+1) },[])
  const value = useMemo(()=>({usuario,verificando,error,ingresar,cerrarSesion,reintentar}),[usuario,verificando,error,ingresar,cerrarSesion,reintentar])
  return <ContextoSesionCampo.Provider value={value}>{children}</ContextoSesionCampo.Provider>
}
