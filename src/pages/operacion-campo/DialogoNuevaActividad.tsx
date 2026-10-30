import { useRef, useState } from 'react'
import CampoFormulario, { AreaTexto } from '../../components/ui/CampoFormulario'
import Selector from '../../components/ui/Selector'
import DialogoFormulario from '../../components/ui/DialogoFormulario'
import AvisoEnLinea from '../../components/ui/AvisoEnLinea'
import { useConsulta } from '../../hooks/useConsulta'
import { campoApi, todosCampo } from '../../services/api/operacionCampo'
import { ErrorApi, aErrorApi } from '../../services/api/cliente'
import type { ActividadCampo, CatalogoCampo, CuadrillaCampo, EncargoCampo, ParteCampo } from '../../types/operacionCampo'
import { hoyLima } from '../../utils/operacionCampo'
import { EstadoCatalogos } from './ComponentesCampo'
import { useMutacionCampo } from './useCampo'
import estilos from './OperacionCampo.module.css'

export default function DialogoNuevaActividad({onCerrar,onGuardado}:{onCerrar:()=>void;onGuardado:(a:ActividadCampo)=>void}) {
  const [cuadrilla,setCuadrilla]=useState(''),[tipo,setTipo]=useState(''),[area,setArea]=useState('')
  const [fecha,setFecha]=useState(hoyLima()),[hora,setHora]=useState('08:00'),[encargo,setEncargo]=useState(''),[observaciones,setObservaciones]=useState('')
  const [cambios,setCambios]=useState(false),[errores,setErrores]=useState<Record<string,string>>({})
  const mutacion=useMutacionCampo()
  const intento=useRef<{cuerpo:string;clave:string}|null>(null)
  const catalogos=useConsulta('catalogos-actividad',async signal=>{
    const [cuadrillas,tipos,areas]=await Promise.all([todosCampo<CuadrillaCampo>('cuadrillas/',{activa:true},signal),todosCampo<CatalogoCampo>('catalogos/tipos-actividad/',{activo:true},signal),todosCampo<CatalogoCampo>('catalogos/areas-verdes/',{activo:true},signal)])
    return {cuadrillas,tipos,areas}
  })
  const encargos=useConsulta(cuadrilla&&fecha?`encargos-actividad-${cuadrilla}-${fecha}`:null,signal=>todosCampo<EncargoCampo>('encargos/',{cuadrilla_id:cuadrilla,desde:fecha,hasta:fecha},signal))
  function cambiar(fn:()=>void) {setCambios(true);setErrores({});fn()}
  async function asegurarParte():Promise<ParteCampo> {
    const existentes=await todosCampo<ParteCampo>('partes/',{cuadrilla_id:cuadrilla,fecha})
    if(existentes.length) return existentes[0]
    try {return await campoApi<ParteCampo>('partes/',{metodo:'POST',cuerpo:{cuadrilla_id:Number(cuadrilla),fecha}})}
    catch(cause) {
      // Otra pestaña puede haber abierto el parte entre la consulta y el POST.
      if(aErrorApi(cause).estado===409) {const nuevos=await todosCampo<ParteCampo>('partes/',{cuadrilla_id:cuadrilla,fecha});if(nuevos.length)return nuevos[0]}
      throw cause
    }
  }
  function guardar() {
    const errors:Record<string,string>={}
    if(!cuadrilla) errors.cuadrilla='Selecciona una cuadrilla'
    if(!tipo) errors.tipo='Selecciona una actividad'
    if(!area) errors.area='Selecciona un espacio'
    if(!fecha||fecha>hoyLima()) errors.fecha='Selecciona una fecha válida que no sea futura'
    if(!/^\d{2}:\d{2}$/.test(hora)) errors.hora='Indica la hora de la actividad'
    if(fecha&&hora&&new Date(`${fecha}T${hora}:00-05:00`).getTime()>Date.now()) errors.hora='La actividad no puede estar en el futuro'
    setErrores(errors)
    if(Object.keys(errors).length) {document.getElementById(`nueva-actividad-${Object.keys(errors)[0]}`)?.focus();return}
    if(!catalogos.datos||catalogos.estado==='error') {mutacion.setDetalle('Carga las opciones antes de registrar la actividad');return}
    void mutacion.enviar(async()=>{
      const parte=await asegurarParte()
      if(parte.estado==='Cerrado') throw new ErrorApi(409,'ParteCerrado','El parte de esa cuadrilla está cerrado para la fecha seleccionada. No se pueden agregar actividades')
      const cuerpo={parte_id:parte.id,tipo_actividad_id:Number(tipo),area_verde_id:Number(area),fecha_hora_actividad:`${fecha}T${hora}:00-05:00`,encargo_id:encargo?Number(encargo):null,observaciones}
      const firma=JSON.stringify(cuerpo)
      if(!intento.current||intento.current.cuerpo!==firma) intento.current={cuerpo:firma,clave:crypto.randomUUID()}
      const actividad=await campoApi<ActividadCampo>('actividades/',{metodo:'POST',cuerpo,claveIdempotencia:intento.current.clave})
      onGuardado(actividad)
    },()=>{})
  }
  return <DialogoFormulario abierto titulo="Registrar actividad" descripcion="Registra la actividad realizada y luego selecciona los operarios participantes." textoConfirmar="Registrar y seleccionar operarios" onEnviar={guardar} onCerrar={onCerrar} error={mutacion.error} enviando={mutacion.enviando} hayCambios={cambios} ancho="amplio">
    <EstadoCatalogos consulta={catalogos}>{datos=><fieldset className={estilos.formulario} disabled={mutacion.enviando}>
      <div className={estilos.rejilla}>
        <Selector id="nueva-actividad-cuadrilla" etiqueta="Cuadrilla" obligatorio valor={cuadrilla} opcionTodos="Selecciona una cuadrilla" opciones={datos.cuadrillas.map(c=>({valor:String(c.id),texto:c.nombre}))} onCambiar={v=>cambiar(()=>{setCuadrilla(v);setEncargo('')})} error={errores.cuadrilla}/>
        <CampoFormulario id="nueva-actividad-fecha" etiqueta="Fecha de atención" type="date" obligatorio max={hoyLima()} value={fecha} onChange={e=>cambiar(()=>{setFecha(e.target.value);setEncargo('')})} error={errores.fecha}/>
        <Selector id="nueva-actividad-tipo" etiqueta="Tipo de actividad" obligatorio valor={tipo} opcionTodos="Selecciona una actividad" opciones={datos.tipos.map(t=>({valor:String(t.id),texto:t.nombre}))} onCambiar={v=>cambiar(()=>{setTipo(v);setEncargo('')})} error={errores.tipo}/>
        <Selector id="nueva-actividad-area" etiqueta="Espacio" obligatorio valor={area} opcionTodos="Selecciona un espacio" opciones={datos.areas.map(a=>({valor:String(a.id),texto:a.nombre}))} onCambiar={v=>cambiar(()=>{setArea(v);setEncargo('')})} error={errores.area}/>
        <CampoFormulario id="nueva-actividad-hora" etiqueta="Hora de la actividad" type="time" obligatorio value={hora} onChange={e=>cambiar(()=>setHora(e.target.value))} error={errores.hora}/>
        <Selector id="nueva-actividad-encargo" etiqueta="Encargo de origen" valor={encargo} opcionTodos="Sin encargo asociado" opciones={(encargos.datos??[]).filter(e=>e.tipo_actividad_id===Number(tipo)&&e.area_verde_id===Number(area)).map(e=>({valor:String(e.id),texto:e.descripcion}))} onCambiar={v=>cambiar(()=>setEncargo(v))} ayuda="Se muestran los encargos que coinciden con la cuadrilla, fecha, actividad y espacio." disabled={encargos.estado==='cargando'}/>
      </div>
      {encargos.estado==='error'&&<AvisoEnLinea tono="advertencia" accion={{texto:'Reintentar',onClick:encargos.reintentar}}>No se pudieron cargar los encargos. Puedes reintentar o registrar una actividad sin encargo asociado.</AvisoEnLinea>}
      <AreaTexto id="nueva-actividad-observaciones" etiqueta="Observaciones" maxLength={1000} value={observaciones} onChange={e=>cambiar(()=>setObservaciones(e.target.value))}/>
    </fieldset>}</EstadoCatalogos>
  </DialogoFormulario>
}
