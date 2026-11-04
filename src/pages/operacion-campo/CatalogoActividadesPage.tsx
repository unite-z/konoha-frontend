import { useRef, useState } from 'react'
import Boton from '@/components/ui/Boton'
import CampoFormulario from '@/components/ui/CampoFormulario'
import Selector from '@/components/ui/Selector'
import Casilla from '@/components/ui/Casilla'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import Estado from '@/components/ui/Estado'
import EstadoSinAcceso from '@/components/ui/EstadoSinAcceso'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import TablaDatos from '@/components/ui/TablaDatos'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import AccionesPagina from '@/layouts/LayoutOficina/AccionesPagina'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import { PERMISOS, puede } from '@/config/permisosCore'
import { aErrorApi, type ErrorApi } from '@/services/api/cliente'
import { guardarTipoActividad, listarClasesActividad, listarTiposActividad } from '@/services/api/catalogoActividadesCampo'
import type { CatalogoCampo, TipoActividadCampo } from '@/types/operacionCampo'
import estilos from './OperacionCampo.module.css'

export default function CatalogoActividadesPage() {
  usePaginaActual('Catálogo de actividades', [{ texto: 'Operación de campo' }, { texto: 'Catálogo de actividades' }])
  const sesion = useSesionActiva()
  const editable = puede(sesion, PERMISOS.gestionarCatalogos)
  const consulta = useConsulta('catalogo-actividades-campo', async signal => {
    const [clases, tipos] = await Promise.all([listarClasesActividad(signal), listarTiposActividad(false, signal)])
    return { clases, tipos }
  })
  const [clase, setClase] = useState('')
  const [estado, setEstado] = useState('')
  const [dialogo, setDialogo] = useState<TipoActividadCampo | 'nuevo' | null>(null)
  const [aviso, setAviso] = useState('')
  if (consulta.error?.estado === 403) return <EstadoSinAcceso />
  if (consulta.estado === 'error') return <EstadoError titulo="No pudimos cargar el catálogo de actividades" descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} />
  if (!consulta.datos || consulta.estado === 'cargando') return <EstadoCarga forma="tabla" filas={3} />
  const { clases, tipos } = consulta.datos
  const visibles = tipos.filter(t => (!clase || t.clase_id === Number(clase)) && (!estado || t.activo === (estado === 'true')))
  return <div className={estilos.pagina}>
    <AccionesPagina>{editable && <Boton onClick={() => setDialogo('nuevo')}>Añadir tipo de actividad</Boton>}</AccionesPagina>
    <p className={estilos.descripcion}>Los tipos se organizan por clase. Desactivar un tipo impide nuevas altas y conserva los partes anteriores.</p>
    {aviso && <AvisoEnLinea tono="exito">{aviso}</AvisoEnLinea>}
    <div className={estilos.filtros}>
      <Selector id="catalogo-clase" etiqueta="Clase de actividad" valor={clase} opcionTodos="Todas las clases" opciones={clases.map(c => ({ valor: String(c.id), texto: c.nombre }))} onCambiar={setClase} />
      <Selector id="catalogo-estado" etiqueta="Estado" valor={estado} opcionTodos="Todos" opciones={[{ valor: 'true', texto: 'Activos' }, { valor: 'false', texto: 'Inactivos' }]} onCambiar={setEstado} />
    </div>
    <TablaDatos titulo="Tipos de actividad" filas={visibles} claveFila={t => String(t.id)} columnas={[
      { clave: 'clase_id', titulo: 'Clase', render: t => clases.find(c => c.id === t.clase_id)?.nombre ?? 'Sin clase asignada' },
      { clave: 'nombre', titulo: 'Tipo' },
      { clave: 'activo', titulo: 'Estado', render: t => <Estado tono={t.activo ? 'exito' : 'neutro'} texto={t.activo ? 'Activo' : 'Inactivo'} /> },
      ...(editable ? [{ clave: 'acciones', titulo: 'Acciones', render: (t: TipoActividadCampo) => <Boton variante="fantasma" compacto aria-label={`Editar ${t.nombre}`} onClick={() => setDialogo(t)}>Editar</Boton> }] : []),
    ]} vacio={{ titulo: 'No hay tipos de actividad', descripcion: 'Prueba con otros filtros o añade un tipo de actividad.' }} />
    {dialogo && <DialogoTipoActividad actual={dialogo === 'nuevo' ? null : dialogo} clases={clases} onCerrar={() => setDialogo(null)} onGuardado={() => { setDialogo(null); setAviso('Tipo de actividad guardado'); consulta.reintentar() }} />}
  </div>
}

function DialogoTipoActividad({ actual, clases, onCerrar, onGuardado }: { actual: TipoActividadCampo | null; clases: CatalogoCampo[]; onCerrar: () => void; onGuardado: () => void }) {
  const [nombre, setNombre] = useState(actual?.nombre ?? '')
  const [clase, setClase] = useState(String(actual?.clase_id ?? ''))
  const [activo, setActivo] = useState(actual?.activo ?? true)
  const [error, setError] = useState<ErrorApi | null>(null)
  const [validacion, setValidacion] = useState('')
  const [enviando, setEnviando] = useState(false)
  const bloqueo = useRef(false)
  const cambios = nombre !== (actual?.nombre ?? '') || clase !== String(actual?.clase_id ?? '') || activo !== (actual?.activo ?? true)
  async function guardar() {
    if (bloqueo.current || error?.estado === 403) return
    setError(null)
    if (!nombre.trim() || !clase) {
      setValidacion('Completa la clase y el nombre del tipo')
      document.getElementById(!clase ? 'tipo-clase' : 'tipo-nombre')?.focus()
      return
    }
    setValidacion('')
    bloqueo.current = true
    setEnviando(true)
    try { await guardarTipoActividad({ nombre: nombre.trim(), clase_id: Number(clase), activo }, actual?.id); onGuardado() }
    catch (causa) { setError(aErrorApi(causa)) }
    finally { bloqueo.current = false; setEnviando(false) }
  }
  return <DialogoFormulario abierto titulo={actual ? 'Editar tipo de actividad' : 'Añadir tipo de actividad'} textoConfirmar="Guardar tipo" onCerrar={onCerrar} onEnviar={() => { void guardar() }} enviando={enviando} hayCambios={cambios} envioDeshabilitado={!cambios || error?.estado === 403} error={error && error.estado !== 403 ? { titulo: 'No se pudo guardar el tipo', detalle: error.detalle } : null}>
    {error?.estado === 403 ? <EstadoSinAcceso /> : <fieldset className={estilos.formulario} disabled={enviando}>
      {validacion && <AvisoEnLinea tono="error">{validacion}</AvisoEnLinea>}
      <Selector id="tipo-clase" etiqueta="Clase de actividad" obligatorio valor={clase} opcionTodos="Selecciona una clase" opciones={clases.filter(c => c.activo || c.id === actual?.clase_id).map(c => ({ valor: String(c.id), texto: c.nombre }))} onCambiar={setClase} />
      <CampoFormulario id="tipo-nombre" etiqueta="Nombre del tipo" obligatorio maxLength={150} value={nombre} onChange={e => setNombre(e.target.value)} />
      <Casilla etiqueta="Tipo activo" marcada={activo} onCambiar={setActivo} ayuda="Los tipos inactivos se conservan en los partes anteriores." />
    </fieldset>}
  </DialogoFormulario>
}
