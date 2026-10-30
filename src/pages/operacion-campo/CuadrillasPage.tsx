import { useState } from 'react'
import Badge from '../../components/ui/Badge'
import Boton from '../../components/ui/Boton'
import CampoFormulario from '../../components/ui/CampoFormulario'
import Selector from '../../components/ui/Selector'
import DialogoFormulario from '../../components/ui/DialogoFormulario'
import AvisoEnLinea from '../../components/ui/AvisoEnLinea'
import { usePaginaActual } from '../../hooks/usePaginaActual'
import { useConsulta } from '../../hooks/useConsulta'
import { useSesionCampo } from '../../sesion/ContextoSesionCampo'
import { campoApi, todosCampo } from '../../services/api/operacionCampo'
import type { CuadrillaCampo, PersonalCampo } from '../../types/operacionCampo'
import { esJefeCampo } from '../../utils/operacionCampo'
import { BuscarCampo, EstadoCatalogos, SeleccionOperarios, TablaCampo } from './ComponentesCampo'
import { useListadoCampo, useMutacionCampo } from './useCampo'
import estilos from './OperacionCampo.module.css'

export default function CuadrillasPage() {
  usePaginaActual('Cuadrillas',[{texto:'Operación de campo'},{texto:'Cuadrillas'}])
  const {usuario}=useSesionCampo(), jefe=esJefeCampo(usuario)
  const listado=useListadoCampo<CuadrillaCampo>('cuadrillas',['activa'])
  const [dialogo,setDialogo]=useState<CuadrillaCampo | 'nueva' | null>(null)
  const [personal,setPersonal]=useState(false),[aviso,setAviso]=useState('')
  function guardado() {setDialogo(null);setPersonal(false);setAviso('Los cambios se guardaron correctamente');listado.consulta.reintentar()}
  return <div className={estilos.pagina}>
    <div className={estilos.introduccion}>
      <p className={estilos.descripcion}>Consulta los equipos de trabajo, sus capataces y los operarios asignados.</p>
      {jefe&&<div className={estilos.acciones}><Boton variante="secundario" onClick={()=>setPersonal(true)}>Registrar personal</Boton><Boton onClick={()=>setDialogo('nueva')}>Registrar cuadrilla</Boton></div>}
    </div>
    {aviso&&<AvisoEnLinea tono="exito" accion={{texto:'Cerrar aviso',onClick:()=>setAviso('')}}>{aviso}</AvisoEnLinea>}
    <div className={estilos.filtros}>
      <BuscarCampo valor={String(listado.params.q??'')} onBuscar={q=>listado.filtrar({q})}/>
      <Selector id="cuadrilla-estado" etiqueta="Estado" valor={String(listado.params.activa??'')} opciones={[{valor:'true',texto:'Activas'},{valor:'false',texto:'Inactivas'}]} opcionTodos="Todos" onCambiar={activa=>listado.filtrar({activa})}/>
      <Boton variante="terciario" onClick={()=>listado.filtrar({q:'',activa:''})}>Limpiar filtros</Boton>
    </div>
    <TablaCampo titulo="Cuadrillas de trabajo" listado={listado} vacio="No hay cuadrillas con estos filtros" columnas={[
      {clave:'nombre',titulo:'Cuadrilla',render:c=><span className={estilos.celdaPrincipal}>{c.nombre}</span>},
      {clave:'capataz_nombre',titulo:'Capataz responsable'},
      {clave:'cantidad_operarios',titulo:'Operarios',alineacion:'derecha'},
      {clave:'operarios',titulo:'Personal asignado',multilinea:true,render:c=>c.operarios.length?c.operarios.map(p=>`${p.nombres} ${p.apellidos}`).join(', '):'Sin operarios asignados'},
      {clave:'activa',titulo:'Estado',render:c=><Badge tono={c.activa?'exito':'neutral'} texto={c.activa?'Activa':'Inactiva'}/>},
      {clave:'acciones',titulo:'Acciones',render:c=><Boton variante="terciario" compacto aria-label={`${jefe?'Editar':'Ver'} ${c.nombre}`} onClick={()=>setDialogo(c)}>{jefe?'Editar cuadrilla':'Ver integrantes'}</Boton>},
    ]}/>
    {dialogo&&<DialogoCuadrilla actual={dialogo==='nueva'?null:dialogo} soloLectura={!jefe} onCerrar={()=>setDialogo(null)} onGuardado={guardado}/>}
    {personal&&<DialogoPersonal onCerrar={()=>setPersonal(false)} onGuardado={guardado}/>}
  </div>
}

function DialogoCuadrilla({actual,soloLectura,onCerrar,onGuardado}:{actual:CuadrillaCampo|null;soloLectura:boolean;onCerrar:()=>void;onGuardado:()=>void}) {
  const [nombre,setNombre]=useState(actual?.nombre??'')
  const [capataz,setCapataz]=useState(String(actual?.capataz_id??''))
  const [activa,setActiva]=useState(actual?.activa??true)
  const [operarios,setOperarios]=useState(actual?.operarios.map(p=>p.id)??[])
  const [cambios,setCambios]=useState(false)
  const mutacion=useMutacionCampo()
  const catalogos=useConsulta('composicion-cuadrilla',async signal=>{
    const [personas,cuadrillas]=await Promise.all([todosCampo<PersonalCampo>('personal/',{},signal),todosCampo<CuadrillaCampo>('cuadrillas/',{activa:true},signal)])
    return {personas,cuadrillas}
  })
  function cambiar(fn:()=>void) {setCambios(true);fn()}
  function guardar() {
    if(soloLectura) {onCerrar();return}
    if(!nombre.trim()||!capataz) {mutacion.setDetalle('Completa el nombre y selecciona un capataz');document.getElementById(!nombre.trim()?'cuadrilla-nombre':'cuadrilla-capataz')?.focus();return}
    if(!catalogos.datos||catalogos.estado==='error') {mutacion.setDetalle('Carga las opciones antes de guardar');return}
    void mutacion.enviar(()=>campoApi(`cuadrillas/${actual?`${actual.id}/`:''}`,{metodo:actual?'PUT':'POST',cuerpo:{nombre:nombre.trim(),capataz_id:Number(capataz),activa,operarios:activa?operarios:[]}}),onGuardado)
  }
  return <DialogoFormulario abierto titulo={soloLectura?`Integrantes de ${nombre}`:actual?'Editar cuadrilla':'Registrar cuadrilla'} textoConfirmar={soloLectura?'Cerrar':'Guardar cuadrilla'} onCerrar={onCerrar} onEnviar={guardar} enviando={mutacion.enviando} hayCambios={!soloLectura&&cambios} error={mutacion.error} ancho="amplio" conObligatorios={!soloLectura}>
    <EstadoCatalogos consulta={catalogos}>{({personas,cuadrillas})=>{
      const ocupados=cuadrillas.filter(c=>c.id!==actual?.id).map(c=>c.capataz_id)
      const capataces=personas.filter(p=>p.tipo_personal==='Capataz'&&p.activo&&(!ocupados.includes(p.id)||p.id===actual?.capataz_id))
      const options=personas.filter(p=>p.tipo_personal==='Operario')
      const bloqueados=options.filter(p=>!p.activo||(p.cuadrilla_id!==null&&p.cuadrilla_id!==actual?.id)).map(p=>p.id)
      return <fieldset className={estilos.formulario} disabled={soloLectura||mutacion.enviando}>
        <div className={estilos.rejilla}>
          <CampoFormulario id="cuadrilla-nombre" etiqueta="Nombre de la cuadrilla" obligatorio maxLength={150} value={nombre} onChange={e=>cambiar(()=>setNombre(e.target.value))}/>
          <Selector id="cuadrilla-capataz" etiqueta="Capataz responsable" obligatorio valor={capataz} opcionTodos="Selecciona un capataz" opciones={capataces.map(p=>({valor:String(p.id),texto:`${p.nombres} ${p.apellidos}`}))} onCambiar={v=>cambiar(()=>setCapataz(v))} ayuda="Solo se muestran capataces disponibles o el responsable actual."/>
        </div>
        <label className={estilos.check}><input type="checkbox" checked={activa} onChange={e=>cambiar(()=>setActiva(e.target.checked))}/>Cuadrilla activa</label>
        {!activa&&<AvisoEnLinea tono="advertencia">Al guardar, la cuadrilla quedará sin operarios asignados. Los registros de actividades anteriores se conservan.</AvisoEnLinea>}
        <SeleccionOperarios opciones={options} seleccion={activa?operarios:[]} bloqueados={bloqueados} soloLectura={!activa||soloLectura} onCambiar={ids=>cambiar(()=>setOperarios(ids))}/>
        <p className={estilos.ayuda}>Para trasladar un operario, retíralo de su cuadrilla actual antes de asignarlo a otra.</p>
      </fieldset>
    }}</EstadoCatalogos>
  </DialogoFormulario>
}

function DialogoPersonal({onCerrar,onGuardado}:{onCerrar:()=>void;onGuardado:()=>void}) {
  const [nombres,setNombres]=useState(''),[apellidos,setApellidos]=useState(''),[tipo,setTipo]=useState('Operario')
  const mutacion=useMutacionCampo()
  function guardar() {
    if(!nombres.trim()||!apellidos.trim()) {mutacion.setDetalle('Completa los nombres y apellidos');document.getElementById(!nombres.trim()?'personal-nombres':'personal-apellidos')?.focus();return}
    void mutacion.enviar(()=>campoApi('personal/',{metodo:'POST',cuerpo:{nombres:nombres.trim(),apellidos:apellidos.trim(),tipo_personal:tipo}}),onGuardado)
  }
  return <DialogoFormulario abierto titulo="Registrar personal" descripcion="Registra a la persona para asignarla a una cuadrilla. Este registro no crea una cuenta de acceso." textoConfirmar="Registrar persona" onCerrar={onCerrar} onEnviar={guardar} enviando={mutacion.enviando} hayCambios={Boolean(nombres||apellidos)} error={mutacion.error}>
    <fieldset className={estilos.formulario} disabled={mutacion.enviando}>
      <CampoFormulario id="personal-nombres" etiqueta="Nombres" obligatorio value={nombres} maxLength={100} onChange={e=>setNombres(e.target.value)}/>
      <CampoFormulario id="personal-apellidos" etiqueta="Apellidos" obligatorio value={apellidos} maxLength={150} onChange={e=>setApellidos(e.target.value)}/>
      <Selector id="personal-tipo" etiqueta="Tipo de personal" valor={tipo} opciones={[{valor:'Operario',texto:'Operario'},{valor:'Capataz',texto:'Capataz'}]} onCambiar={setTipo}/>
    </fieldset>
  </DialogoFormulario>
}
