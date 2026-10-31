import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useConsulta } from '../../hooks/useConsulta'
import { aErrorApi } from '../../services/api/cliente'
import { campoApi, type ParametrosCampo } from '../../services/api/operacionCampo'
import type { PaginaCampo } from '../../types/operacionCampo'

export function useListadoCampo<T>(recurso: string, filtros: string[]) {
  const [url,setUrl]=useSearchParams()
  const pagina=Math.max(1,Number.parseInt(url.get('page') ?? '1',10)||1)
  const params: ParametrosCampo={page:pagina}
  for(const key of ['q',...filtros]) params[key]=url.get(key)??''
  const consulta=useConsulta(JSON.stringify([recurso,params]),signal=>campoApi<PaginaCampo<T>>(`${recurso}/`,{parametros:params,signal}),p=>p.count===0)
  function filtrar(cambios: ParametrosCampo) {
    const next=new URLSearchParams(url); next.delete('page')
    Object.entries(cambios).forEach(([key,value])=>{if(value===''||value==null) next.delete(key); else next.set(key,String(value))})
    setUrl(next)
  }
  function cambiarPagina(page: number) {const next=new URLSearchParams(url); if(page>1)next.set('page',String(page));else next.delete('page');setUrl(next)}
  return {consulta,pagina,params,filtrar,cambiarPagina}
}
export function useMutacionCampo() {
  const [enviando,setEnviando]=useState(false)
  const [detalle,setDetalle]=useState('')
  const bloqueo=useRef(false)
  async function enviar(operacion:()=>Promise<unknown>,exito:()=>void) {
    if(bloqueo.current) return
    bloqueo.current=true;setEnviando(true);setDetalle('')
    try {await operacion();exito()}
    catch(cause) {const error=aErrorApi(cause); const campos=Object.entries(error.errores_campo).map(([field,messages])=>`${field}: ${messages.join('. ')}`);setDetalle(campos.length?campos.join(' · '):error.detalle)}
    finally {bloqueo.current=false;setEnviando(false)}
  }
  return {enviando,enviar,setDetalle,error:detalle?{titulo:'No se pudo guardar',detalle}:null}
}
