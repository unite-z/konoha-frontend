import { useState } from 'react'
import Boton from '../../components/ui/Boton'
import Badge from '../../components/ui/Badge'
import CampoFormulario, { AreaTexto } from '../../components/ui/CampoFormulario'
import Selector from '../../components/ui/Selector'
import DialogoFormulario from '../../components/ui/DialogoFormulario'
import AvisoEnLinea from '../../components/ui/AvisoEnLinea'
import { usePaginaActual } from '../../hooks/usePaginaActual'
import { useConsulta } from '../../hooks/useConsulta'
import { useSesionCampo } from '../../sesion/ContextoSesionCampo'
import { campoApi, todosCampo } from '../../services/api/operacionCampo'
import type { CatalogoCampo, CuadrillaCampo, EncargoCampo, EntradaEncargo } from '../../types/operacionCampo'
import { esJefeCampo, hoyLima, sumarDiasCampo, validarEncargoCampo } from '../../utils/operacionCampo'
import { formatearFecha } from '../../utils/formato'
import { BuscarCampo, EstadoCatalogos, TablaCampo } from './ComponentesCampo'
import { useListadoCampo, useMutacionCampo } from './useCampo'
import estilos from './OperacionCampo.module.css'

export default function EncargosPage() {
  usePaginaActual('Encargos',[{texto:'Operación de campo'},{texto:'Encargos'}])
  const jefe=esJefeCampo(useSesionCampo().usuario)
  const listado=useListadoCampo<EncargoCampo>('encargos',['periodicidad','desde','hasta'])
  const [dialogo,setDialogo]=useState<EncargoCampo|'nuevo'|null>(null),[aviso,setAviso]=useState('')
  return <div className={estilos.pagina}>
    <div className={estilos.introduccion}><p className={estilos.descripcion}>Organiza los encargos de la reunión de planificación por capataz y periodo.</p>{jefe&&<Boton onClick={()=>setDialogo('nuevo')}>Registrar encargo</Boton>}</div>
    {aviso&&<AvisoEnLinea tono="exito" accion={{texto:'Cerrar aviso',onClick:()=>setAviso('')}}>{aviso}</AvisoEnLinea>}
    <div className={estilos.filtros}>
      <BuscarCampo valor={String(listado.params.q??'')} onBuscar={q=>listado.filtrar({q})}/>
      <Selector id="encargo-periodicidad" etiqueta="Periodo" valor={String(listado.params.periodicidad??'')} opciones={[{valor:'Semanal',texto:'Semanal'},{valor:'Quincenal',texto:'Quincenal'}]} opcionTodos="Todos" onCambiar={periodicidad=>listado.filtrar({periodicidad})}/>
      <CampoFormulario id="encargo-desde" etiqueta="Desde" type="date" value={String(listado.params.desde??'')} onChange={e=>listado.filtrar({desde:e.target.value})}/>
      <CampoFormulario id="encargo-hasta" etiqueta="Hasta" type="date" value={String(listado.params.hasta??'')} onChange={e=>listado.filtrar({hasta:e.target.value})}/>
      <Boton variante="terciario" onClick={()=>listado.filtrar({q:'',periodicidad:'',desde:'',hasta:''})}>Limpiar filtros</Boton>
    </div>
    <TablaCampo titulo="Encargos por capataz" listado={listado} vacio="No hay encargos con estos filtros" columnas={[
      {clave:'descripcion',titulo:'Encargo',multilinea:true,render:e=><><span className={estilos.celdaPrincipal}>{e.descripcion}</span><span className={estilos.secundario}>{e.tipo_actividad_nombre} · {e.area_verde_nombre}</span></>},
      {clave:'capataz_nombre',titulo:'Capataz',render:e=><>{e.capataz_nombre}<span className={estilos.secundario}>{e.cuadrilla_nombre}</span></>},
      {clave:'periodo',titulo:'Periodo',render:e=><><Badge tono="info" texto={e.periodicidad}/><span className={estilos.secundario}>{formatearFecha(e.fecha_inicio)} — {formatearFecha(e.fecha_fin)}</span></>},
      {clave:'plazo_previsto',titulo:'Plazo previsto',render:e=>formatearFecha(e.plazo_previsto)},
      {clave:'acciones',titulo:'Acciones',render:e=><Boton variante="terciario" compacto aria-label={`${jefe?'Editar':'Ver'} encargo ${e.id}`} onClick={()=>setDialogo(e)}>{jefe?'Editar encargo':'Ver encargo'}</Boton>},
    ]}/>
    {dialogo&&<DialogoEncargo actual={dialogo==='nuevo'?null:dialogo} soloLectura={!jefe} onCerrar={()=>setDialogo(null)} onGuardado={()=>{setDialogo(null);setAviso('El encargo se guardó correctamente');listado.consulta.reintentar()}}/>}
  </div>
}

function DialogoEncargo({actual,soloLectura,onCerrar,onGuardado}:{actual:EncargoCampo|null;soloLectura:boolean;onCerrar:()=>void;onGuardado:()=>void}) {
  const hoy=hoyLima()
  const [body,setBody]=useState<EntradaEncargo>(actual??{cuadrilla_id:0,tipo_actividad_id:0,area_verde_id:0,descripcion:'',periodicidad:'Semanal',fecha_reunion:hoy,fecha_inicio:hoy,fecha_fin:sumarDiasCampo(hoy,6),plazo_previsto:sumarDiasCampo(hoy,6)})
  const [errores,setErrores]=useState<Record<string,string>>({}),[cambios,setCambios]=useState(false)
  const mutacion=useMutacionCampo()
  const catalogos=useConsulta('catalogos-encargo',async signal=>{
    const [cuadrillas,tipos,areas]=await Promise.all([todosCampo<CuadrillaCampo>('cuadrillas/',{},signal),todosCampo<CatalogoCampo>('catalogos/tipos-actividad/',{},signal),todosCampo<CatalogoCampo>('catalogos/areas-verdes/',{},signal)])
    return {cuadrillas,tipos,areas}
  })
  function cambiar(cambios:Partial<EntradaEncargo>) {setCambios(true);setBody(prev=>({...prev,...cambios}));setErrores({})}
  function guardar() {
    if(soloLectura) {onCerrar();return}
    const errors=validarEncargoCampo(body);setErrores(errors)
    if(Object.keys(errors).length) {document.getElementById(`form-encargo-${Object.keys(errors)[0]}`)?.focus();return}
    if(!catalogos.datos||catalogos.estado==='error') {mutacion.setDetalle('Carga las opciones antes de guardar');return}
    // Solo se envían los campos de entrada, nunca las etiquetas o auditoría de una respuesta GET.
    const entrada:EntradaEncargo={cuadrilla_id:body.cuadrilla_id,tipo_actividad_id:body.tipo_actividad_id,area_verde_id:body.area_verde_id,descripcion:body.descripcion.trim(),periodicidad:body.periodicidad,fecha_reunion:body.fecha_reunion,fecha_inicio:body.fecha_inicio,fecha_fin:body.fecha_fin,plazo_previsto:body.plazo_previsto}
    void mutacion.enviar(()=>campoApi(`encargos/${actual?`${actual.id}/`:''}`,{metodo:actual?'PUT':'POST',cuerpo:entrada}),onGuardado)
  }
  return <DialogoFormulario abierto titulo={soloLectura?'Detalle del encargo':actual?'Editar encargo':'Registrar encargo'} textoConfirmar={soloLectura?'Cerrar':'Guardar encargo'} ancho="amplio" onEnviar={guardar} onCerrar={onCerrar} error={mutacion.error} enviando={mutacion.enviando} hayCambios={!soloLectura&&cambios} conObligatorios={!soloLectura}>
    <EstadoCatalogos consulta={catalogos}>{({cuadrillas,tipos,areas})=><fieldset className={estilos.formulario} disabled={soloLectura||mutacion.enviando}>
      <div className={estilos.rejilla}>
        <Selector id="form-encargo-cuadrilla_id" etiqueta="Cuadrilla y capataz" obligatorio valor={body.cuadrilla_id?String(body.cuadrilla_id):''} opcionTodos="Selecciona una cuadrilla" opciones={cuadrillas.filter(c=>c.activa||c.id===actual?.cuadrilla_id).map(c=>({valor:String(c.id),texto:`${c.nombre} · ${c.capataz_nombre}`}))} onCambiar={v=>cambiar({cuadrilla_id:Number(v)})} error={errores.cuadrilla_id}/>
        <Selector id="form-encargo-periodicidad" etiqueta="Periodicidad" valor={body.periodicidad} opciones={[{valor:'Semanal',texto:'Semanal · hasta 7 días'},{valor:'Quincenal',texto:'Quincenal · hasta 14 días'}]} onCambiar={v=>{const fin=sumarDiasCampo(body.fecha_inicio,v==='Semanal'?6:13);cambiar({periodicidad:v as EntradaEncargo['periodicidad'],fecha_fin:fin,plazo_previsto:fin})}}/>
        <Selector id="form-encargo-tipo_actividad_id" etiqueta="Tipo de actividad" obligatorio valor={body.tipo_actividad_id?String(body.tipo_actividad_id):''} opcionTodos="Selecciona una actividad" opciones={tipos.filter(t=>t.activo||t.id===actual?.tipo_actividad_id).map(t=>({valor:String(t.id),texto:t.nombre}))} onCambiar={v=>cambiar({tipo_actividad_id:Number(v)})} error={errores.tipo_actividad_id}/>
        <Selector id="form-encargo-area_verde_id" etiqueta="Espacio" obligatorio valor={body.area_verde_id?String(body.area_verde_id):''} opcionTodos="Selecciona un espacio" opciones={areas.filter(a=>a.activo||a.id===actual?.area_verde_id).map(a=>({valor:String(a.id),texto:a.nombre}))} onCambiar={v=>cambiar({area_verde_id:Number(v)})} error={errores.area_verde_id}/>
        {(['fecha_reunion','fecha_inicio','fecha_fin','plazo_previsto'] as const).map(key=><CampoFormulario key={key} id={`form-encargo-${key}`} etiqueta={{fecha_reunion:'Fecha de reunión',fecha_inicio:'Inicio del periodo',fecha_fin:'Fin del periodo',plazo_previsto:'Plazo previsto'}[key]} type="date" obligatorio value={body[key]} onChange={e=>cambiar({[key]:e.target.value})} error={errores[key]}/>)}
      </div>
      <AreaTexto id="form-encargo-descripcion" etiqueta="Descripción del encargo" obligatorio maxLength={1000} value={body.descripcion} onChange={e=>cambiar({descripcion:e.target.value})} error={errores.descripcion}/>
      <p className={estilos.ayuda}>Los encargos con ejecución registrada conservan su planificación y no pueden redefinirse.</p>
    </fieldset>}</EstadoCatalogos>
  </DialogoFormulario>
}
