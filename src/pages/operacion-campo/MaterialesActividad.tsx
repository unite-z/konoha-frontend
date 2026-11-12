import { useState } from 'react'
import CampoFormulario from '@/components/ui/CampoFormulario'
import Selector from '@/components/ui/Selector'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import TablaDatos from '@/components/ui/TablaDatos'
import EstadoSinAcceso from '@/components/ui/EstadoSinAcceso'
import { useConsulta } from '@/hooks/useConsulta'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import { encolar, nuevaClave, porSincronizar, useCola } from '@/sincronizacion/cola'
import { conCache } from '@/sincronizacion/datosDescargados'
import { esSinRed } from './actividadSinConexion'
import { campoApi, todosCampo } from '@/services/api/operacionCampo'
import type { ActividadCampo, MaterialActividadCampo, MaterialCatalogoCampo, UnidadMedidaCampo } from '@/types/operacionCampo'
import { EstadoCatalogos } from './ComponentesCampo'
import { useMutacionCampo } from './useCampo'
import estilos from './OperacionCampo.module.css'

export default function MaterialesActividad({ actividad, soloLectura, onCerrar }: { actividad: ActividadCampo; soloLectura: boolean; onCerrar: () => void }) {
  const [material, setMaterial] = useState(''), [descripcion, setDescripcion] = useState(''), [cantidad, setCantidad] = useState(''), [unidad, setUnidad] = useState('')
  const [origen, setOrigen] = useState(''), [destino, setDestino] = useState(''), [error, setError] = useState('')
  const mutacion = useMutacionCampo()
  const usuarioId = useSesionActiva()?.usuario.id ?? null
  // Insumos de esta actividad que esperan en la cola sin conexión (RF-T-012).
  const enCola = porSincronizar(useCola(), 'campo.material').filter((p) => p.carga.actividad_id === actividad.id)
  const consulta = useConsulta(`materiales-actividad-${actividad.id}`, signal => conCache(`materiales-actividad-${actividad.id}`, async () => {
    const [registrados, catalogo, unidades] = await Promise.all([
      campoApi<MaterialActividadCampo[]>(`actividades/${actividad.id}/materiales/`, { signal }),
      todosCampo<MaterialCatalogoCampo>('catalogos/materiales/', { activo: true }, signal),
      todosCampo<UnidadMedidaCampo>('catalogos/unidades-medida/', {}, signal),
    ])
    return { registrados, catalogo, unidades }
  }))
  function guardar() {
    if (soloLectura) { onCerrar(); return }
    if (!consulta.datos) return
    if (!material || !cantidad || Number(cantidad.replace(',', '.')) <= 0 || !unidad || (material === 'otro' && !descripcion.trim()) || Boolean(origen.trim()) !== Boolean(destino.trim())) {
      setError('Indica material, cantidad y unidad; si hay traslado, completa origen y destino')
      return
    }
    setError('')
    const cuerpo = {
      material_id: material === 'otro' ? null : Number(material), descripcion_otro: material === 'otro' ? descripcion.trim() : null,
      cantidad: Number(cantidad.replace(',', '.')), unidad_medida_id: Number(unidad), origen: origen.trim() || null, destino: destino.trim() || null,
    }
    const clave = nuevaClave()
    const nombre = material === 'otro' ? descripcion.trim() : consulta.datos.catalogo.find((item) => item.id === Number(material))?.nombre ?? 'Material'
    const aLaCola = async () => {
      if (usuarioId === null) return
      await encolar({ id: clave, tipo: 'campo.material', carga: { actividad_id: actividad.id, cuerpo }, descripcion: `Insumo · ${nombre} · ${actividad.tipo_actividad_nombre}`, usuario_id: usuarioId })
    }
    void mutacion.enviar(async () => {
      if (!navigator.onLine) return aLaCola()
      try {
        await campoApi(`actividades/${actividad.id}/materiales/`, { metodo: 'POST', cuerpo, claveIdempotencia: clave })
      } catch (causa) {
        if (esSinRed(causa)) return aLaCola()
        throw causa
      }
    }, () => { setMaterial(''); setDescripcion(''); setCantidad(''); setUnidad(''); setOrigen(''); setDestino(''); consulta.reintentar() })
  }
  return <DialogoFormulario abierto titulo="Materiales de la actividad" descripcion={`${actividad.tipo_actividad_nombre} · ${actividad.area_verde_nombre}`} textoConfirmar={soloLectura ? 'Cerrar' : 'Añadir material'} onCerrar={onCerrar} onEnviar={guardar} enviando={mutacion.enviando} error={mutacion.error} hayCambios={!soloLectura && Boolean(material || cantidad || origen || destino)} ancho="amplio">
    {mutacion.estadoError === 403 ? <EstadoSinAcceso/> : <EstadoCatalogos consulta={consulta}>{datos => <div className={estilos.formulario}>
      <TablaDatos
        titulo="Materiales registrados"
        filas={datos.registrados}
        claveFila={item => String(item.id)}
        columnas={[
          { clave: 'nombre_material', titulo: 'Material' },
          { clave: 'cantidad', titulo: 'Cantidad', alineacion: 'derecha', render: item => `${item.cantidad} ${item.unidad_simbolo}` },
          { clave: 'traslado', titulo: 'Traslado', render: item => item.origen && item.destino ? `${item.origen} → ${item.destino}` : '—' },
        ]}
        vacio={{ titulo: 'No hay materiales registrados', descripcion: 'Los materiales que añadas a esta actividad aparecerán aquí.' }}
      />
      {!soloLectura && <fieldset className={estilos.formulario} disabled={mutacion.enviando}>
        {error && <AvisoEnLinea tono="error">{error}</AvisoEnLinea>}
        {enCola.length > 0 && <AvisoEnLinea tono="advertencia" icono="wifi-off" compacto>{enCola.length === 1 ? '1 insumo pendiente de enviar' : `${enCola.length} insumos pendientes de enviar`}</AvisoEnLinea>}
        <Selector id="material-actividad" etiqueta="Material o insumo" valor={material} opcionTodos="Selecciona un material" opciones={[...datos.catalogo.map(item => ({ valor: String(item.id), texto: item.nombre })), { valor: 'otro', texto: 'Otro' }]} onCambiar={setMaterial}/>
        {material === 'otro' && <CampoFormulario id="material-otro" etiqueta="Descripción de otro material" maxLength={150} value={descripcion} onChange={event => setDescripcion(event.target.value)}/>}
        <CampoFormulario id="material-cantidad" etiqueta="Cantidad utilizada" formato="decimal" decimales={2} value={cantidad} onChange={event => setCantidad(event.target.value)}/>
        <Selector id="material-unidad" etiqueta="Unidad de medida" valor={unidad} opcionTodos="Selecciona una unidad" opciones={datos.unidades.map(item => ({ valor: String(item.id), texto: `${item.nombre} (${item.simbolo})` }))} onCambiar={setUnidad}/>
        <CampoFormulario id="material-origen" etiqueta="Origen del traslado" maxLength={150} value={origen} onChange={event => setOrigen(event.target.value)}/>
        <CampoFormulario id="material-destino" etiqueta="Destino del traslado" maxLength={150} value={destino} onChange={event => setDestino(event.target.value)}/>
      </fieldset>}
    </div>}</EstadoCatalogos>}
  </DialogoFormulario>
}
