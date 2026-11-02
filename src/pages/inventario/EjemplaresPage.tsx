import { useState, type FormEvent } from 'react'
import AvisoEnLinea from '../../components/ui/AvisoEnLinea'
import CampoFormulario from '../../components/ui/CampoFormulario'
import EstadoCarga from '../../components/ui/EstadoCarga'
import EstadoError from '../../components/ui/EstadoError'
import EstadoVacio from '../../components/ui/EstadoVacio'
import Selector from '../../components/ui/Selector'
import { useConsulta } from '../../hooks/useConsulta'
import { usePaginaActual } from '../../hooks/usePaginaActual'
import { MIGAS_INVENTARIO } from '../../router/rutasApp'
import { useSesionActiva } from '../../sesion/ContextoSesion'
import { PERMISOS, puede } from '../../config/permisosCore'
import { cambiarEspecie, crearEjemplar, crearEspecie, listarEjemplares, listarEspecies, quitarPlacaAntigua } from '../../services/api/inventario'
import estilos from './Inventario.module.css'

export default function EjemplaresPage() {
  usePaginaActual('Ejemplares y especies', [MIGAS_INVENTARIO.areasVerdes, { texto: 'Ejemplares y especies' }])
  const sesion = useSesionActiva()
  const puedeRegistrar = puede(sesion, PERMISOS.registrarInventario)
  const puedeGestionar = puede(sesion, PERMISOS.gestionarCatalogos)
  const consulta = useConsulta('ejemplares-inventario', (signal) => listarEjemplares('', 1, signal))
  const especies = useConsulta('especies-inventario', (signal) => listarEspecies(false, signal))
  const [codigoPlaca, setCodigoPlaca] = useState('')
  const [especieId, setEspecieId] = useState('')
  const [vegetacion, setVegetacion] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [latitud, setLatitud] = useState('')
  const [longitud, setLongitud] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [nombreComun, setNombreComun] = useState('')
  const [nombreCientifico, setNombreCientifico] = useState('')
  const [formaBiologica, setFormaBiologica] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function ejecutar(accion: () => Promise<unknown>, mensaje: string) {
    setError(null)
    setAviso(null)
    setGuardando(true)
    try {
      await accion()
      setAviso(mensaje)
      await Promise.all([consulta.reintentar(), especies.reintentar()])
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo guardar el cambio.')
    } finally {
      setGuardando(false)
    }
  }

  function enviar(evento: FormEvent<HTMLFormElement>, accion: () => Promise<unknown>, mensaje: string) {
    evento.preventDefault()
    void ejecutar(accion, mensaje)
  }

  if (consulta.estado === 'error' && !consulta.datos) {
    return <EstadoError titulo="No pudimos cargar los ejemplares" descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} />
  }
  if (!consulta.datos) return <EstadoCarga forma="tabla" texto="Cargando ejemplares…" retrasar />

  return (
    <div className={estilos.pagina}>
      <p>Registro de ejemplares del campus con código interno, referencia del catastro y placa antigua independiente.</p>
      {error && <AvisoEnLinea tono="error">{error}</AvisoEnLinea>}
      {aviso && <AvisoEnLinea tono="exito">{aviso}</AvisoEnLinea>}

      {puedeRegistrar && <section className={estilos.superficie} aria-labelledby="titulo-alta-ejemplar">
        <h2 id="titulo-alta-ejemplar">Registrar ejemplar</h2>
        {especies.estado === 'error' && <EstadoError titulo="No se pudieron cargar las especies" descripcion={especies.error?.detalle ?? ''} onReintentar={especies.reintentar} />}
        <form className={estilos.formulario} onSubmit={(evento) => enviar(evento, () => crearEjemplar({
          codigo_placa_antigua: codigoPlaca.trim() || null,
          especie_id: especieId ? Number(especieId) : null,
          tipo_vegetacion: vegetacion.trim() || null,
          ubicacion: ubicacion.trim() || null,
          latitud: latitud || null,
          longitud: longitud || null,
          cantidad: Number(cantidad),
        }), 'Ejemplar registrado con código nuevo.') }>
          <CampoFormulario id="placa-antigua" etiqueta="Placa de aluminio antigua (opcional)" value={codigoPlaca} onChange={(evento) => setCodigoPlaca(evento.target.value)} maxLength={80} />
          {especies.datos && <Selector id="especie-ejemplar" etiqueta="Especie" valor={especieId} onCambiar={setEspecieId} opcionTodos="Sin especie asignada" opciones={especies.datos.map((especie) => ({ valor: String(especie.id), texto: `${especie.nombre_comun ?? especie.nombre_cientifico ?? 'Sin nombre'}${especie.nombre_cientifico ? ` · ${especie.nombre_cientifico}` : ''}` }))} />}
          <CampoFormulario id="vegetacion-ejemplar" etiqueta="Tipo de vegetación" value={vegetacion} onChange={(evento) => setVegetacion(evento.target.value)} maxLength={80} />
          <CampoFormulario id="ubicacion-ejemplar" etiqueta="Ubicación" value={ubicacion} onChange={(evento) => setUbicacion(evento.target.value)} maxLength={200} />
          <div className={estilos.filtros}>
            <CampoFormulario id="latitud-ejemplar" etiqueta="Latitud" type="number" min="-90" max="90" step="any" value={latitud} onChange={(evento) => setLatitud(evento.target.value)} />
            <CampoFormulario id="longitud-ejemplar" etiqueta="Longitud" type="number" min="-180" max="180" step="any" value={longitud} onChange={(evento) => setLongitud(evento.target.value)} />
            <CampoFormulario id="cantidad-ejemplar" etiqueta="Cantidad" type="number" min="1" step="1" value={cantidad} onChange={(evento) => setCantidad(evento.target.value)} required />
          </div>
          <div className={estilos.accionesFormulario}>
            <span>El código interno único se genera al guardar.</span>
            <button className={estilos.guardar} type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Registrar ejemplar'}</button>
          </div>
        </form>
      </section>}

      {puedeGestionar && <section className={estilos.superficie} aria-labelledby="titulo-nueva-especie">
        <h2 id="titulo-nueva-especie">Añadir especie</h2>
        <form className={estilos.filaCobertura} onSubmit={(evento) => enviar(evento, () => crearEspecie({
          nombre_comun: nombreComun.trim(),
          nombre_cientifico: nombreCientifico.trim() || undefined,
          forma_biologica: formaBiologica.trim(),
        }), 'Especie añadida al catálogo.') }>
          <CampoFormulario id="nombre-comun-especie" etiqueta="Nombre común" value={nombreComun} onChange={(evento) => setNombreComun(evento.target.value)} maxLength={150} required />
          <CampoFormulario id="nombre-cientifico-especie" etiqueta="Nombre científico (opcional)" value={nombreCientifico} onChange={(evento) => setNombreCientifico(evento.target.value)} maxLength={200} />
          <CampoFormulario id="forma-biologica-especie" etiqueta="Forma biológica" value={formaBiologica} onChange={(evento) => setFormaBiologica(evento.target.value)} maxLength={80} required />
          <button className={estilos.guardar} type="submit" disabled={guardando}>Añadir especie</button>
        </form>
        <ul className={estilos.listaCoberturas}>{especies.datos?.map((especie) => <li className={estilos.filaCobertura} key={especie.id}>
          <span>{especie.nombre_comun ?? especie.nombre_cientifico} · {especie.nombre_cientifico ?? 'Sin nombre científico'} · {especie.forma_biologica ?? 'Sin forma'}{especie.activo ? '' : ' · inactiva'}</span>
          {especie.activo && <button className={estilos.botonTabla} type="button" disabled={guardando} onClick={() => void ejecutar(() => cambiarEspecie(especie.id, { activo: false }), 'Especie desactivada.')}>Desactivar</button>}
        </li>)}</ul>
      </section>}

      <section className={estilos.superficie} aria-labelledby="titulo-lista-ejemplares">
        <h2 id="titulo-lista-ejemplares">Ejemplares</h2>
        {consulta.datos.length === 0 ? <EstadoVacio titulo="Aún no hay ejemplares" descripcion="Los ejemplares registrados aparecerán aquí." /> : (
          <ul className={estilos.listaCoberturas}>{consulta.datos.map((ejemplar) => <li className={estilos.filaCobertura} key={ejemplar.id}>
            <div>
              <strong>{ejemplar.codigo}</strong> · {ejemplar.especie_nombre_comun ?? 'Especie sin asignar'}
              <div>{ejemplar.especie_nombre_cientifico ?? 'Sin nombre científico'} · {ejemplar.especie_forma_biologica ?? ejemplar.tipo_vegetacion ?? 'Sin forma biológica'}</div>
              <div>Referencia: {ejemplar.referencia_catastro ?? '—'} · Código de catastro: {ejemplar.codigo_catastro ?? '—'} · Placa antigua: {ejemplar.codigo_placa_antigua ?? '—'}</div>
              <div>{ejemplar.ubicacion ?? 'Sin ubicación'}{ejemplar.latitud && ejemplar.longitud ? ` · ${ejemplar.latitud}, ${ejemplar.longitud}` : ''}</div>
              {ejemplar.advertencia_placa_repetida && <p role="status">Aviso: esta placa antigua también figura en otro ejemplar.</p>}
            </div>
            {ejemplar.codigo_placa_antigua && <button className={estilos.botonTabla} type="button" disabled={guardando} onClick={() => void ejecutar(() => quitarPlacaAntigua(ejemplar.id), 'Placa antigua quitada.')}>Quitar placa</button>}
          </li>)}</ul>
        )}
      </section>
    </div>
  )
}
