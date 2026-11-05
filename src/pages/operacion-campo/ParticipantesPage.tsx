import { useState } from 'react'
import Boton from '@/components/ui/Boton'
import Tarjeta from '@/components/ui/Tarjeta'
import CampoFormulario from '@/components/ui/CampoFormulario'
import Selector from '@/components/ui/Selector'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import ExportarExcel from '@/components/core/ExportarExcel'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import AccionesPagina from '@/layouts/LayoutOficina/AccionesPagina'
import { useConsulta } from '@/hooks/useConsulta'
import { useSesionCampo } from '@/sesion/ContextoSesionCampo'
import { campoApi, todosCampo } from '@/services/api/operacionCampo'
import type { ActividadCampo, CuadrillaCampo, OperarioCampo, ParticipantesCampo } from '@/types/operacionCampo'
import { esJefeCampo, puedeRegistrarCampo } from '@/utils/operacionCampo'
import { formatearFecha, formatearFechaHora } from '@/utils/formato'
import { BuscarCampo, EstadoCatalogos, SeleccionOperarios, TablaCampo } from './ComponentesCampo'
import { useListadoCampo, useMutacionCampo } from './useCampo'
import DialogoNuevaActividad from './DialogoNuevaActividad'
import MaterialesActividad from './MaterialesActividad'
import Adjuntos from '@/components/core/Adjuntos'
import { comprimirFotografia } from '@/utils/comprimirFotografia'
import estilos from './OperacionCampo.module.css'
import Estado from '@/components/ui/Estado'
import { TONO_ESTADO } from '@/components/ui/tonos'
import VerificacionActividad from './VerificacionActividad'

export default function ParticipantesPage() {
  usePaginaActual('Participantes por actividad',[{texto:'Operación de campo'},{texto:'Participantes por actividad'}])
  const {usuario}=useSesionCampo(), puedeRegistrar=puedeRegistrarCampo(usuario), puedeVerificar=esJefeCampo(usuario)
  const listado=useListadoCampo<ActividadCampo>('actividades',['fecha','cuadrilla_id'])
  const cuadrillas=useConsulta('filtro-cuadrillas',signal=>todosCampo<CuadrillaCampo>('cuadrillas/',{},signal))
  const [actual,setActual]=useState<ActividadCampo|null>(null),[materialActividad,setMaterialActividad]=useState<ActividadCampo|null>(null),[evidenciaActividad,setEvidenciaActividad]=useState<ActividadCampo|null>(null),[verificacionActividad,setVerificacionActividad]=useState<ActividadCampo|null>(null),[nueva,setNueva]=useState(false),[aviso,setAviso]=useState('')
  return <div className={estilos.pagina}>
    <AccionesPagina><ExportarExcel listado="actividades" />{puedeRegistrar&&<Boton onClick={()=>setNueva(true)}>Registrar actividad</Boton>}</AccionesPagina>
    <p className={estilos.descripcion}>Indica quiénes realizaron cada actividad. La cantidad se calcula a partir de las personas seleccionadas.</p>
    {aviso&&<AvisoEnLinea tono="exito" accion={{texto:'Cerrar aviso',onClick:()=>setAviso('')}}>{aviso}</AvisoEnLinea>}
    <Tarjeta>
      <div className={estilos.filtros}>
        <BuscarCampo valor={String(listado.params.q??'')} onBuscar={q=>listado.filtrar({q})}/>
        <Selector id="actividad-cuadrilla" etiqueta="Cuadrilla" valor={String(listado.params.cuadrilla_id??'')} opcionTodos="Todas" opciones={(cuadrillas.datos??[]).map(c=>({valor:String(c.id),texto:c.nombre}))} onCambiar={cuadrilla_id=>listado.filtrar({cuadrilla_id})} bloqueadoMotivo={cuadrillas.estado==='error'?'No se pudieron cargar las cuadrillas':undefined}/>
        <CampoFormulario id="actividad-fecha" etiqueta="Fecha" type="date" value={String(listado.params.fecha??'')} onChange={e=>listado.filtrar({fecha:e.target.value})}/>
        <Boton variante="fantasma" onClick={()=>listado.filtrar({q:'',fecha:'',cuadrilla_id:''})}>Limpiar filtros</Boton>
      </div>
    </Tarjeta>
    <TablaCampo titulo="Actividades y operarios participantes" listado={listado} vacio="No hay actividades con estos filtros" columnas={[
      {clave:'tipo_actividad_nombre',titulo:'Actividad',multilinea:true,render:a=><><span className={estilos.celdaPrincipal}>{a.tipo_actividad_nombre}</span><span className={estilos.secundario}>{a.area_verde_nombre}</span></>},
      {clave:'cuadrilla_nombre',titulo:'Cuadrilla'},
      {clave:'fecha',titulo:'Fecha',render:a=>formatearFecha(a.fecha)},
      {clave:'cantidad',titulo:'Participantes',alineacion:'derecha',render:a=>a.participantes.cantidad_operarios},
      {clave:'operarios',titulo:'Operarios',multilinea:true,render:a=>a.participantes.operarios.length?a.participantes.operarios.map(p=>`${p.nombres} ${p.apellidos}`).join(', '):'Sin selección registrada'},
      {clave:'estado',titulo:'Parte',render:a=><Estado tono={TONO_ESTADO[a.estado==='Abierto'?'info':'neutral']} texto={a.estado}/>},
      {clave:'verificacion',titulo:'Verificación',multilinea:true,render:a=>a.fecha_verificacion?<><span className={estilos.celdaPrincipal}>Verificada por {a.verificado_por_nombre??'Jefe de sección'}</span><span className={estilos.secundario}>{formatearFechaHora(a.fecha_verificacion)} · {a.verificacion_observaciones}</span></>:'Pendiente de verificar'},
      {clave:'acciones',titulo:'Acciones',render:a=><Boton variante="fantasma" compacto aria-label={`${puedeRegistrar&&a.estado==='Abierto'?'Seleccionar':'Ver'} operarios de actividad ${a.id}`} onClick={()=>setActual(a)}>{puedeRegistrar&&a.estado==='Abierto'?'Seleccionar operarios':'Ver participantes'}</Boton>},
      {clave:'materiales',titulo:'Materiales',render:a=><Boton variante="fantasma" compacto aria-label={`Materiales de actividad ${a.id}`} onClick={()=>setMaterialActividad(a)}>Materiales</Boton>},
      {clave:'evidencias',titulo:'Evidencias',render:a=><Boton variante="fantasma" compacto aria-label={`Fotografías de actividad ${a.id}`} onClick={()=>setEvidenciaActividad(a)}>Fotografías</Boton>},
      ...(puedeVerificar?[{clave:'verificar',titulo:'Revisión',render:(a:ActividadCampo)=><Boton variante="fantasma" compacto aria-label={`Verificar actividad ${a.id}`} onClick={()=>setVerificacionActividad(a)}>{a.fecha_verificacion?'Actualizar verificación':'Verificar'}</Boton>}]:[]),
    ]}/>
    {nueva&&<DialogoNuevaActividad onCerrar={()=>setNueva(false)} onGuardado={actividad=>{setNueva(false);setActual(actividad);setAviso('Actividad registrada. Selecciona los operarios que participaron');listado.consulta.reintentar()}}/>}
    {actual&&<DialogoParticipantes actividad={actual} soloLectura={!puedeRegistrar||actual.estado==='Cerrado'} onCerrar={()=>setActual(null)} onGuardado={()=>{setActual(null);setAviso('Los participantes se guardaron correctamente');listado.consulta.reintentar()}}/>}
    {materialActividad&&<MaterialesActividad actividad={materialActividad} soloLectura={!puedeRegistrar||materialActividad.estado==='Cerrado'} onCerrar={()=>setMaterialActividad(null)}/>}
    {evidenciaActividad&&<DialogoFormulario abierto titulo="Fotografías de la actividad" textoConfirmar="Cerrar" onEnviar={()=>setEvidenciaActividad(null)} onCerrar={()=>setEvidenciaActividad(null)} conObligatorios={false}><Adjuntos entidad="actividad" registroId={evidenciaActividad.id} puedeAdjuntar={usuario?.rol==='Capataz'&&evidenciaActividad.estado==='Abierto'} tiposAceptados=".jpg,.jpeg,.png" ayudaCarga="JPEG o PNG, de hasta 20 MB." prepararArchivo={comprimirFotografia}/></DialogoFormulario>}
    {verificacionActividad&&<VerificacionActividad actividad={verificacionActividad} onCerrar={()=>setVerificacionActividad(null)} onGuardado={()=>{setVerificacionActividad(null);setAviso('Verificación registrada con su autor y fecha');listado.consulta.reintentar()}}/>}
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
        <AvisoEnLinea tono="info">{actividad.cuadrilla_nombre} · <strong>{ids.length} operarios participantes</strong></AvisoEnLinea>
        {soloLectura&&<AvisoEnLinea tono="info">{actividad.estado==='Cerrado'?'El parte está cerrado y sus participantes no pueden modificarse.':'Tu rol permite consultar los participantes.'}</AvisoEnLinea>}
        {!soloLectura&&datos.actuales.operarios.some(p=>!disponibles.has(p.id))&&<AvisoEnLinea tono="advertencia">Hay participantes que ya no están disponibles. Retíralos de la selección para guardar cambios.</AvisoEnLinea>}
        <SeleccionOperarios opciones={opciones} seleccion={ids} soloLectura={soloLectura||mutacion.enviando} onCambiar={setSeleccion}/>
        <p className={estilos.ayuda}>Se muestran los operarios asignados a la cuadrilla en la fecha de la actividad.</p>
      </div>
    }}</EstadoCatalogos>
  </DialogoFormulario>
}
