import { useState } from 'react'
import Boton from '../../components/ui/Boton'
import Badge from '../../components/ui/Badge'
import CampoFormulario from '../../components/ui/CampoFormulario'
import Selector from '../../components/ui/Selector'
import DialogoFormulario from '../../components/ui/DialogoFormulario'
import AvisoEnLinea from '../../components/ui/AvisoEnLinea'
import { usePaginaActual } from '../../hooks/usePaginaActual'
import { useConsulta } from '../../hooks/useConsulta'
import { useSesionCampo } from '../../sesion/ContextoSesionCampo'
import { campoApi, todosCampo } from '../../services/api/operacionCampo'
import type { ActividadCampo, CuadrillaCampo, OperarioCampo, ParticipantesCampo } from '../../types/operacionCampo'
import { puedeRegistrarCampo } from '../../utils/operacionCampo'
import { formatearFecha } from '../../utils/formato'
import { BuscarCampo, EstadoCatalogos, SeleccionOperarios, TablaCampo } from './ComponentesCampo'
import { useListadoCampo, useMutacionCampo } from './useCampo'
import DialogoNuevaActividad from './DialogoNuevaActividad'
import estilos from './OperacionCampo.module.css'

export default function ParticipantesPage() {
  usePaginaActual('Participantes por actividad',[{texto:'Operación de campo'},{texto:'Participantes por actividad'}])
  const {usuario}=useSesionCampo(), puedeRegistrar=puedeRegistrarCampo(usuario)
  const listado=useListadoCampo<ActividadCampo>('actividades',['fecha','cuadrilla_id'])
  const cuadrillas=useConsulta('filtro-cuadrillas',signal=>todosCampo<CuadrillaCampo>('cuadrillas/',{},signal))
  const [actual,setActual]=useState<ActividadCampo|null>(null),[nueva,setNueva]=useState(false),[aviso,setAviso]=useState('')
  return <div className={estilos.pagina}>
    <div className={estilos.introduccion}>
      <p className={estilos.descripcion}>Indica quiénes realizaron cada actividad. La cantidad se calcula a partir de las personas seleccionadas.</p>
      {puedeRegistrar&&<Boton onClick={()=>setNueva(true)}>Registrar actividad</Boton>}
    </div>
    {aviso&&<AvisoEnLinea tono="exito" accion={{texto:'Cerrar aviso',onClick:()=>setAviso('')}}>{aviso}</AvisoEnLinea>}
    <div className={estilos.filtros}>
      <BuscarCampo valor={String(listado.params.q??'')} onBuscar={q=>listado.filtrar({q})}/>
      <Selector id="actividad-cuadrilla" etiqueta="Cuadrilla" valor={String(listado.params.cuadrilla_id??'')} opcionTodos="Todas" opciones={(cuadrillas.datos??[]).map(c=>({valor:String(c.id),texto:c.nombre}))} onCambiar={cuadrilla_id=>listado.filtrar({cuadrilla_id})} bloqueadoMotivo={cuadrillas.estado==='error'?'No se pudieron cargar las cuadrillas':undefined}/>
      <CampoFormulario id="actividad-fecha" etiqueta="Fecha" type="date" value={String(listado.params.fecha??'')} onChange={e=>listado.filtrar({fecha:e.target.value})}/>
      <Boton variante="terciario" onClick={()=>listado.filtrar({q:'',fecha:'',cuadrilla_id:''})}>Limpiar filtros</Boton>
    </div>
    <TablaCampo titulo="Actividades y operarios participantes" listado={listado} vacio="No hay actividades con estos filtros" columnas={[
      {clave:'tipo_actividad_nombre',titulo:'Actividad',multilinea:true,render:a=><><span className={estilos.celdaPrincipal}>{a.tipo_actividad_nombre}</span><span className={estilos.secundario}>{a.area_verde_nombre}</span></>},
      {clave:'cuadrilla_nombre',titulo:'Cuadrilla'},
      {clave:'fecha',titulo:'Fecha',render:a=>formatearFecha(a.fecha)},
      {clave:'cantidad',titulo:'Participantes',alineacion:'derecha',render:a=>a.participantes.cantidad_operarios},
      {clave:'operarios',titulo:'Operarios',multilinea:true,render:a=>a.participantes.operarios.length?a.participantes.operarios.map(p=>`${p.nombres} ${p.apellidos}`).join(', '):'Sin selección registrada'},
      {clave:'estado',titulo:'Parte',render:a=><Badge tono={a.estado==='Abierto'?'info':'neutral'} texto={a.estado}/>},
      {clave:'acciones',titulo:'Acciones',render:a=><Boton variante="terciario" compacto aria-label={`${puedeRegistrar&&a.estado==='Abierto'?'Seleccionar':'Ver'} operarios de actividad ${a.id}`} onClick={()=>setActual(a)}>{puedeRegistrar&&a.estado==='Abierto'?'Seleccionar operarios':'Ver participantes'}</Boton>},
    ]}/>
    {nueva&&<DialogoNuevaActividad onCerrar={()=>setNueva(false)} onGuardado={actividad=>{setNueva(false);setActual(actividad);setAviso('Actividad registrada. Selecciona los operarios que participaron');listado.consulta.reintentar()}}/>}
    {actual&&<DialogoParticipantes actividad={actual} soloLectura={!puedeRegistrar||actual.estado==='Cerrado'} onCerrar={()=>setActual(null)} onGuardado={()=>{setActual(null);setAviso('Los participantes se guardaron correctamente');listado.consulta.reintentar()}}/>}
  </div>
}

function DialogoParticipantes({actividad,soloLectura,onCerrar,onGuardado}:{actividad:ActividadCampo;soloLectura:boolean;onCerrar:()=>void;onGuardado:()=>void}) {
  const mutacion=useMutacionCampo()
  const [seleccion,setSeleccion]=useState<number[]|null>(null)
  const consulta=useConsulta(`participantes-${actividad.id}`,async signal=>{
    const [actuales,disponibles]=await Promise.all([
      campoApi<ParticipantesCampo>(`actividades/${actividad.id}/participantes/`,{signal}),
      campoApi<OperarioCampo[]>(`actividades/${actividad.id}/operarios-disponibles/`,{signal}),
    ])
    return {actuales,disponibles}
  })
  function guardar() {
    if(soloLectura) {onCerrar();return}
    if(!consulta.datos||consulta.estado==='error') {mutacion.setDetalle('Carga los participantes antes de guardar');return}
    const ids=seleccion??consulta.datos.actuales.operarios.map(p=>p.id)
    void mutacion.enviar(()=>campoApi(`actividades/${actividad.id}/participantes/`,{metodo:'PUT',cuerpo:{operarios:ids}}),onGuardado)
  }
  return <DialogoFormulario abierto titulo={soloLectura?'Participantes de la actividad':'Seleccionar operarios participantes'} descripcion={`${actividad.tipo_actividad_nombre} · ${actividad.area_verde_nombre} · ${formatearFecha(actividad.fecha)}`} textoConfirmar={soloLectura?'Cerrar':'Guardar participantes'} enviando={mutacion.enviando} onCerrar={onCerrar} onEnviar={guardar} error={mutacion.error} hayCambios={!soloLectura&&seleccion!==null} ancho="amplio" conObligatorios={false}>
    <EstadoCatalogos consulta={consulta}>{datos=>{
      const ids=seleccion??datos.actuales.operarios.map(p=>p.id)
      const disponibles=new Set(datos.disponibles.map(p=>p.id))
      const opciones=[...datos.disponibles,...datos.actuales.operarios.filter(p=>!disponibles.has(p.id))]
      return <div className={estilos.formulario}>
        <p className={estilos.aviso}>{actividad.cuadrilla_nombre} · <strong>{ids.length} operarios participantes</strong></p>
        {soloLectura&&<AvisoEnLinea tono="info">{actividad.estado==='Cerrado'?'El parte está cerrado y sus participantes no pueden modificarse.':'Tu rol permite consultar los participantes.'}</AvisoEnLinea>}
        {!soloLectura&&datos.actuales.operarios.some(p=>!disponibles.has(p.id))&&<AvisoEnLinea tono="advertencia">Hay participantes que ya no están disponibles. Retíralos de la selección para guardar cambios.</AvisoEnLinea>}
        <SeleccionOperarios opciones={opciones} seleccion={ids} soloLectura={soloLectura||mutacion.enviando} onCambiar={setSeleccion}/>
        <p className={estilos.ayuda}>Se muestran los operarios asignados a la cuadrilla en la fecha de la actividad.</p>
      </div>
    }}</EstadoCatalogos>
  </DialogoFormulario>
}
