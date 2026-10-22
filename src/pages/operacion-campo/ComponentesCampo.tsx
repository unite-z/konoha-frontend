import { useState } from 'react'
import type { ReactNode } from 'react'
import Boton from '../../components/ui/Boton'
import CampoFormulario from '../../components/ui/CampoFormulario'
import EstadoCarga from '../../components/ui/EstadoCarga'
import EstadoError from '../../components/ui/EstadoError'
import TablaDatos, { type ColumnaTabla } from '../../components/ui/TablaDatos'
import { type ResultadoConsulta } from '../../hooks/useConsulta'
import type { OperarioCampo } from '../../types/operacionCampo'
import type { useListadoCampo } from './useCampo'
import estilos from './OperacionCampo.module.css'

export function EstadoCatalogos<T>({consulta,children}:{consulta:ResultadoConsulta<T>;children:(datos:T)=>ReactNode}) {
  if(consulta.estado==='error') return <EstadoError titulo="No pudimos cargar las opciones" descripcion={consulta.error?.detalle??''} onReintentar={consulta.reintentar}/>
  if(!consulta.datos||consulta.estado==='cargando') return <EstadoCarga forma="tabla" filas={3}/>
  return <>{children(consulta.datos)}</>
}
export function TablaCampo<T extends {id:number}>({titulo,columnas,listado,vacio,accionVacio}:{titulo:string;columnas:ColumnaTabla<T>[];listado:ReturnType<typeof useListadoCampo<T>>;vacio:string;accionVacio?:ReactNode}) {
  const {consulta,pagina,cambiarPagina}=listado
  return <TablaDatos titulo={titulo} columnas={columnas} filas={consulta.datos?.results??[]} claveFila={r=>String(r.id)}
    estado={consulta.estado==='inactivo'?'cargando':consulta.estado}
    paginacionServidor={{pagina,total:consulta.datos?.count??0,porPagina:25,onCambiarPagina:cambiarPagina}}
    vacio={{titulo:vacio,descripcion:'Prueba con otros filtros o registra el primer elemento.',accion:accionVacio}}
    error={{titulo:'No pudimos cargar los resultados',descripcion:consulta.error?.detalle??'',onReintentar:consulta.reintentar}}/>
}
export function BuscarCampo({valor,onBuscar}:{valor:string;onBuscar:(q:string)=>void}) {
  const [borrador,setBorrador]=useState(valor)
  const [previo,setPrevio]=useState(valor)
  if(previo!==valor) {setPrevio(valor);setBorrador(valor)}
  return <form className={estilos.buscar} role="search" onSubmit={e=>{e.preventDefault();onBuscar(borrador.trim())}}>
    <CampoFormulario id="campo-buscar" etiqueta="Buscar" type="search" placeholder="Escribe para buscar" maxLength={100} value={borrador} onChange={e=>setBorrador(e.target.value)}/>
    <Boton type="submit" variante="secundario">Buscar</Boton>
  </form>
}
export function SeleccionOperarios({opciones,seleccion,onCambiar,bloqueados=[],soloLectura=false}:{opciones:OperarioCampo[];seleccion:number[];onCambiar:(ids:number[])=>void;bloqueados?:number[];soloLectura?:boolean}) {
  const [buscar,setBuscar]=useState('')
  const visibles=opciones.filter(p=>`${p.nombres} ${p.apellidos}`.toLocaleLowerCase('es').includes(buscar.toLocaleLowerCase('es')))
  return <fieldset className={estilos.seleccion} disabled={soloLectura}>
    <legend>Operarios <span className={estilos.cantidad}>{seleccion.length} seleccionados</span></legend>
    <CampoFormulario id="buscar-operarios" etiqueta="Buscar operario" type="search" value={buscar} onChange={e=>setBuscar(e.target.value)}/>
    <div className={estilos.listaOperarios}>
      {visibles.map(p=><label key={p.id} className={estilos.operario}>
        <input type="checkbox" checked={seleccion.includes(p.id)} disabled={bloqueados.includes(p.id)} onChange={e=>onCambiar(e.target.checked?[...seleccion,p.id]:seleccion.filter(id=>id!==p.id))}/>
        <span>{p.nombres} {p.apellidos}{bloqueados.includes(p.id)&&<small>Asignado a otra cuadrilla</small>}</span>
      </label>)}
      {!visibles.length&&<p className={estilos.ayuda}>No hay operarios con esta búsqueda.</p>}
    </div>
  </fieldset>
}
