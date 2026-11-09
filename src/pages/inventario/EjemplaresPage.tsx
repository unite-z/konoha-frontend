import { useEffect, useRef, useState, type FormEvent } from 'react'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton from '@/components/ui/Boton'
import CampoFormulario from '@/components/ui/CampoFormulario'
import Estado from '@/components/ui/Estado'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Selector from '@/components/ui/Selector'
import Tarjeta from '@/components/ui/Tarjeta'
import { useConsulta } from '@/hooks/useConsulta'
import ExportarExcel from '@/components/core/ExportarExcel'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import AccionesPagina from '@/layouts/LayoutOficina/AccionesPagina'
import { MIGAS_INVENTARIO } from '@/router/rutasApp'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import { PERMISOS, puede } from '@/config/permisosCore'
import { cambiarEspecie, crearEjemplar, crearEspecie, guardarAlturaEjemplar, listarEjemplares, listarEspecies, quitarPlacaAntigua, vincularEjemplarConArea } from '@/services/api/ejemplares'
import { listarTodasLasAreasVerdes } from '@/services/api/mapaAsignaciones'
import type { EjemplarInventario } from '@/types/ejemplares'
import SelectorPuntoMapa from './SelectorPuntoMapa'
import HistorialEjemplar from './HistorialEjemplar'
import SituacionEjemplar, { EtiquetaSituacionEjemplar } from './SituacionEjemplar'
import estilos from './Catalogos.module.css'
import estilosMapa from './MapaAreasVerdesPage.module.css'

export default function EjemplaresPage() {
  usePaginaActual('Ejemplares y especies', [MIGAS_INVENTARIO.areasVerdes, { texto: 'Ejemplares y especies' }])
  const sesion = useSesionActiva()
  const puedeRegistrar = puede(sesion, PERMISOS.registrarInventario)
  const puedeGestionar = puede(sesion, PERMISOS.gestionarCatalogos)
  const [busqueda, setBusqueda] = useState('')
  const [terminoBusqueda, setTerminoBusqueda] = useState('')
  const [ejemplarSeleccionadoId, setEjemplarSeleccionadoId] = useState<number | null>(null)
  const ficha = useRef<HTMLDivElement>(null)
  const botonFicha = useRef<HTMLButtonElement>(null)
  const [alturaFicha, setAlturaFicha] = useState('')
  const consulta = useConsulta(`ejemplares-inventario|${terminoBusqueda}`, (signal) => listarEjemplares(terminoBusqueda, 1, signal))
  const ejemplarSeleccionado = consulta.datos?.find((ejemplar) => ejemplar.id === ejemplarSeleccionadoId)
  const alturaGuardada = ejemplarSeleccionado?.altura_total_m ?? null
  const alturaSinGuardar = alturaFicha !== '' && Number(alturaFicha) !== alturaGuardada

  useEffect(() => {
    if (ejemplarSeleccionadoId !== null) ficha.current?.focus()
  }, [ejemplarSeleccionadoId])

  function abrirFicha(ejemplar: EjemplarInventario, boton: HTMLButtonElement) {
    botonFicha.current = boton
    if (ejemplarSeleccionadoId === ejemplar.id) {
      ficha.current?.focus()
      return
    }
    setEjemplarSeleccionadoId(ejemplar.id)
    setAreaFicha(String(ejemplar.area_verde_id ?? ''))
    setAlturaFicha(String(ejemplar.altura_total_m ?? ''))
  }

  function cerrarFicha() {
    setEjemplarSeleccionadoId(null)
    botonFicha.current?.focus()
  }

  const especies = useConsulta('especies-inventario', (signal) => listarEspecies(false, signal))
  const areas = useConsulta(puedeRegistrar ? 'ejemplares-areas-verdes' : null, listarTodasLasAreasVerdes)
  const opcionesAreas = (areas.datos ?? []).map((area) => ({ valor: String(area.id), texto: `${area.nombre} · ${area.lugar}` }))
  const [areaId, setAreaId] = useState('')
  const [areaFicha, setAreaFicha] = useState('')
  const [mapaAbierto, setMapaAbierto] = useState(false)
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
      <AccionesPagina>
        <ExportarExcel listado="ejemplares" />
      </AccionesPagina>
      <p className={estilos.descripcion}>Consulta la ficha de cada ejemplar o búscalo por código o placa antigua.</p>
      {error && <AvisoEnLinea tono="error">{error}</AvisoEnLinea>}
      {aviso && <AvisoEnLinea tono="exito">{aviso}</AvisoEnLinea>}

      {puedeRegistrar && (
        <Tarjeta titulo="Registrar ejemplar" relleno="amplio">
          {especies.estado === 'error' && <EstadoError titulo="No se pudieron cargar las especies" descripcion={especies.error?.detalle ?? ''} onReintentar={especies.reintentar} nivel={3} />}
          {areas.estado === 'error' && <EstadoError titulo="No se pudieron cargar las áreas verdes" descripcion={areas.error?.detalle ?? ''} onReintentar={areas.reintentar} nivel={3} />}
          <form className={estilosMapa.formularioConMapa} onSubmit={(evento) => enviar(evento, () => crearEjemplar({
            codigo_placa_antigua: codigoPlaca.trim() || null,
            especie_id: especieId ? Number(especieId) : null,
            tipo_vegetacion: vegetacion.trim() || null,
            ubicacion: ubicacion.trim() || null,
            latitud: latitud || null,
            longitud: longitud || null,
            cantidad: Number(cantidad),
            area_verde_id: areaId ? Number(areaId) : null,
          }), 'Ejemplar registrado con código nuevo.')}>
            <div className={estilosMapa.distribucionFormulario}>
              <div className={estilos.formulario}>
                <CampoFormulario id="placa-antigua" etiqueta="Placa de aluminio antigua (opcional)" value={codigoPlaca} onChange={(evento) => setCodigoPlaca(evento.target.value)} maxLength={80} />
                {especies.datos && <Selector id="especie-ejemplar" etiqueta="Especie" valor={especieId} onCambiar={setEspecieId} opcionTodos="Sin especie asignada" opciones={especies.datos.map((especie) => ({ valor: String(especie.id), texto: `${especie.nombre_comun ?? especie.nombre_cientifico ?? 'Sin nombre'}${especie.nombre_cientifico ? ` · ${especie.nombre_cientifico}` : ''}` }))} />}
                <CampoFormulario id="vegetacion-ejemplar" etiqueta="Tipo de vegetación" value={vegetacion} onChange={(evento) => setVegetacion(evento.target.value)} maxLength={80} />
                <CampoFormulario id="ubicacion-ejemplar" etiqueta="Ubicación" value={ubicacion} onChange={(evento) => setUbicacion(evento.target.value)} maxLength={200} />
                <Selector id="area-verde-ejemplar" etiqueta="Área verde" valor={areaId} onCambiar={setAreaId}
                  disabled={!areas.datos} opcionTodos="Sin área vinculada" opciones={opcionesAreas} />
                <Boton variante="secundario" aria-expanded={mapaAbierto} aria-controls="mapa-alta-ejemplar" onClick={() => setMapaAbierto(!mapaAbierto)}>
                  {mapaAbierto ? 'Ocultar mapa' : 'Elegir ubicación en el mapa'}
                </Boton>
                {latitud && longitud && <p role="status" className={estilos.descripcion}>Ubicación marcada.</p>}
                <details>
                  <summary>Introducir coordenadas manualmente</summary>
                  <div className={estilos.coordenadas}>
                    <CampoFormulario id="latitud-ejemplar" etiqueta="Latitud" type="number" min="-90" max="90" step="any" value={latitud} onChange={(evento) => setLatitud(evento.target.value)} />
                    <CampoFormulario id="longitud-ejemplar" etiqueta="Longitud" type="number" min="-180" max="180" step="any" value={longitud} onChange={(evento) => setLongitud(evento.target.value)} />
                  </div>
                </details>
                <CampoFormulario id="cantidad-ejemplar" etiqueta="Cantidad" type="number" min="1" step="1" value={cantidad} onChange={(evento) => setCantidad(evento.target.value)} required />
              </div>
              <div id="mapa-alta-ejemplar" className={estilosMapa.mapaFormulario} hidden={!mapaAbierto}>
                {mapaAbierto && <SelectorPuntoMapa areaId={areaId ? Number(areaId) : null} latitud={latitud} longitud={longitud}
                  onElegir={(nuevaLatitud, nuevaLongitud) => {
                    setLatitud(nuevaLatitud.toFixed(7))
                    setLongitud(nuevaLongitud.toFixed(7))
                  }} />}
              </div>
            </div>
            <div className={estilos.pieFormulario}>
              <span className={estilos.descripcion}>El código interno único se genera al guardar.</span>
              <Boton type="submit" variante="primario" cargando={guardando}>Registrar ejemplar</Boton>
            </div>
          </form>
        </Tarjeta>
      )}

      {puedeGestionar && (
        <Tarjeta titulo="Añadir especie" relleno="amplio">
          <form className={estilos.alta} onSubmit={(evento) => enviar(evento, () => crearEspecie({
            nombre_comun: nombreComun.trim(),
            nombre_cientifico: nombreCientifico.trim(),
            forma_biologica: formaBiologica.trim(),
          }), 'Especie añadida al catálogo.')}>
            <CampoFormulario id="nombre-comun-especie" etiqueta="Nombre común" value={nombreComun} onChange={(evento) => setNombreComun(evento.target.value)} maxLength={150} required />
            <CampoFormulario id="nombre-cientifico-especie" etiqueta="Nombre científico" value={nombreCientifico} onChange={(evento) => setNombreCientifico(evento.target.value)} maxLength={200} required />
            <CampoFormulario id="forma-biologica-especie" etiqueta="Forma biológica" value={formaBiologica} onChange={(evento) => setFormaBiologica(evento.target.value)} maxLength={80} required />
            <Boton type="submit" variante="secundario" deshabilitado={guardando}>Añadir especie</Boton>
          </form>
          <ul className={estilos.lista}>
            {especies.datos?.map((especie) => (
              <li className={estilos.fila} key={especie.id}>
                <span className={estilos.dato}>
                  {especie.nombre_comun ?? especie.nombre_cientifico} · {especie.nombre_cientifico ?? 'Sin nombre científico'} · {especie.forma_biologica ?? 'Sin forma'}
                  {!especie.activo && <Estado tono="neutro" texto="Inactiva" />}
                </span>
                {especie.activo && <Boton variante="fantasma" compacto deshabilitado={guardando} onClick={() => void ejecutar(() => cambiarEspecie(especie.id, { activo: false }), 'Especie desactivada.')}>Desactivar</Boton>}
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}

      <Tarjeta titulo="Buscar ejemplares" relleno="amplio">
        <p className={estilos.descripcion}>Busca por código nuevo o placa antigua; las placas repetidas muestran cada ejemplar por separado.</p>
        <form className={estilos.alta} role="search" aria-label="Buscar ejemplares" onSubmit={(evento) => { evento.preventDefault(); setEjemplarSeleccionadoId(null); setTerminoBusqueda(busqueda.trim()) }}>
          <CampoFormulario id="buscar-ejemplares" etiqueta="Código nuevo o placa antigua" type="search" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} />
          <Boton type="submit" variante="secundario">Buscar</Boton>
        </form>
      </Tarjeta>

      <Tarjeta
        titulo={terminoBusqueda ? `Coincidencias (${consulta.datos.length})` : 'Ejemplares'}
        relleno="amplio"
        acciones={terminoBusqueda && <Boton variante="secundario" onClick={() => {
          setBusqueda('')
          setTerminoBusqueda('')
          setEjemplarSeleccionadoId(null)
        }}>Limpiar búsqueda</Boton>}
      >
        {consulta.datos.length === 0 ? (
          terminoBusqueda
            ? <EstadoVacio titulo="Sin coincidencias" descripcion="No se encontró un ejemplar. Comprueba el código o la placa." nivel={3} />
            : <EstadoVacio titulo="Aún no hay ejemplares" descripcion="Los ejemplares registrados aparecerán aquí." nivel={3} />
        ) : (
          <ul className={estilos.lista}>
            {consulta.datos.map((ejemplar) => {
              const datosEspecie = [ejemplar.especie_nombre_cientifico, ejemplar.especie_forma_biologica ?? ejemplar.tipo_vegetacion].filter(Boolean).join(' · ')
              const datosIdentificacion = [
                ejemplar.referencia_catastro?.trim() && `Referencia de catastro: ${ejemplar.referencia_catastro}`,
                ejemplar.codigo_catastro?.trim() && `Código de catastro: ${ejemplar.codigo_catastro}`,
                ejemplar.codigo_placa_antigua?.trim() && `Placa antigua: ${ejemplar.codigo_placa_antigua}`,
              ].filter(Boolean).join(' · ')
              return (
                <li className={estilos.fila} key={ejemplar.id}>
                  <div>
                    <strong>{ejemplar.codigo}</strong> · {ejemplar.especie_nombre_comun ?? 'Especie sin asignar'}
                    {datosEspecie && <div className={estilos.detalle}>{datosEspecie}</div>}
                    {datosIdentificacion && <div className={estilos.detalle}>{datosIdentificacion}</div>}
                    <div className={estilos.detalle}>{ejemplar.ubicacion ?? 'Sin ubicación'}{ejemplar.latitud !== null && ejemplar.longitud !== null ? ` · ${ejemplar.latitud}, ${ejemplar.longitud}` : ''}</div>
                    {ejemplar.advertencia_placa_repetida && <div className={estilos.avisoFila}><AvisoEnLinea tono="advertencia">Aviso: esta placa antigua también figura en otro ejemplar.</AvisoEnLinea></div>}
                  </div>
                  <div className={estilos.accionesFila}>
                    {!terminoBusqueda && puedeRegistrar && ejemplar.codigo_placa_antigua && <Boton variante="fantasma" compacto deshabilitado={guardando} onClick={() => void ejecutar(() => quitarPlacaAntigua(ejemplar.id), 'Placa antigua quitada.')}>Quitar placa</Boton>}
                    <Boton variante="secundario" compacto aria-label={`Abrir ficha de ${ejemplar.codigo}`}
                      aria-expanded={ejemplarSeleccionadoId === ejemplar.id}
                      onClick={(evento) => abrirFicha(ejemplar, evento.currentTarget)}>Abrir ficha</Boton>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Tarjeta>

      {ejemplarSeleccionado && (
        <div ref={ficha} tabIndex={-1} role="group" aria-label={`Ficha de ${ejemplarSeleccionado.codigo}`}>
          <Tarjeta
            titulo={`${ejemplarSeleccionado.especie_nombre_comun ?? 'Ejemplar'} · ${ejemplarSeleccionado.codigo}`}
            descripcion={ejemplarSeleccionado.ubicacion ?? 'Sin ubicación registrada'}
            junto={<EtiquetaSituacionEjemplar situacion={ejemplarSeleccionado.situacion} />}
            acciones={<Boton variante="fantasma" compacto onClick={cerrarFicha}>Cerrar ficha</Boton>}
            className={estilos.tarjetaFicha}
            relleno="amplio"
          >
            <div className={estilos.seccionesFicha}>
              <section className={estilos.seccionFicha} aria-labelledby="identificacion-ejemplar">
                <h3 id="identificacion-ejemplar">Identificación y ubicación</h3>
                <dl className={estilos.ficha}>
                  {ejemplarSeleccionado.especie_nombre_cientifico && <><dt>Nombre científico</dt><dd>{ejemplarSeleccionado.especie_nombre_cientifico}</dd></>}
                  {ejemplarSeleccionado.codigo_placa_antigua && <><dt>Placa antigua</dt><dd>{ejemplarSeleccionado.codigo_placa_antigua}</dd></>}
                  {ejemplarSeleccionado.referencia_catastro?.trim() && <><dt>Referencia de catastro</dt><dd>{ejemplarSeleccionado.referencia_catastro}</dd></>}
                  {ejemplarSeleccionado.codigo_catastro?.trim() && <><dt>Código de catastro</dt><dd>{ejemplarSeleccionado.codigo_catastro}</dd></>}
                  <dt>Área verde</dt><dd>{ejemplarSeleccionado.area_verde_id === null ? 'Sin área vinculada'
                    : opcionesAreas.find((area) => area.valor === String(ejemplarSeleccionado.area_verde_id))?.texto ?? 'Área vinculada'}</dd>
                  <dt>Coordenadas</dt><dd>{ejemplarSeleccionado.latitud !== null && ejemplarSeleccionado.longitud !== null ? `${ejemplarSeleccionado.latitud}, ${ejemplarSeleccionado.longitud}` : 'Sin coordenadas'}</dd>
                </dl>
                {puedeRegistrar && areas.datos && (
                  <div className={estilos.alta}>
                    <Selector id="area-ficha-ejemplar" etiqueta="Área verde del ejemplar" valor={areaFicha} onCambiar={setAreaFicha}
                      opcionTodos="Selecciona un área verde" opciones={opcionesAreas} disabled={guardando} />
                    <Boton variante="secundario" deshabilitado={guardando || !areaFicha || Number(areaFicha) === ejemplarSeleccionado.area_verde_id}
                      onClick={() => void ejecutar(() => vincularEjemplarConArea(ejemplarSeleccionado.id, Number(areaFicha)), 'Área vinculada al ejemplar.')}>
                      Guardar vínculo
                    </Boton>
                  </div>
                )}
              </section>
              <section className={estilos.seccionFicha} aria-labelledby="medicion-ejemplar">
                <h3 id="medicion-ejemplar">Altura y sugerencia de poda</h3>
                <dl className={estilos.ficha}>
                  <dt>Altura guardada</dt><dd>{alturaGuardada === null ? 'Pendiente de medir' : `${alturaGuardada} m`}</dd>
                  <dt>Sugerencia de poda</dt><dd>{alturaGuardada === null
                    ? 'Pendiente de medir la altura'
                    : alturaGuardada < 5 ? 'Poda menor · menos de 5 m' : 'Poda de altura mediante proveedor · 5 m o más'}</dd>
                </dl>
                {puedeRegistrar && (
                  <form className={estilos.alta} onSubmit={(evento) => enviar(evento,
                    () => guardarAlturaEjemplar(ejemplarSeleccionado.id, Number(alturaFicha)), 'Altura actualizada.')}>
                    <CampoFormulario id="altura-ficha-ejemplar" etiqueta="Altura total (m)" type="number"
                      min="0.01" max="9999.99" step="0.01" required value={alturaFicha}
                      onChange={(evento) => setAlturaFicha(evento.target.value)} />
                    <Boton type="submit" variante="secundario" deshabilitado={guardando || !alturaSinGuardar}>Guardar altura</Boton>
                  </form>
                )}
                {alturaSinGuardar && <p className={estilos.descripcion} role="status">Altura sin guardar. La sugerencia se actualiza al guardar.</p>}
              </section>
            </div>
            <SituacionEjemplar key={`situacion-${ejemplarSeleccionado.id}`} ejemplar={ejemplarSeleccionado}
              editable={puedeGestionar} areas={opcionesAreas}
              alGuardar={(actualizado) => {
                setAreaFicha(String(actualizado.area_verde_id ?? ''))
                consulta.reintentar()
              }} />
            <HistorialEjemplar key={ejemplarSeleccionado.id} ejemplarId={ejemplarSeleccionado.id} />
          </Tarjeta>
        </div>
      )}
    </div>
  )
}
