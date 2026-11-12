import { useState } from 'react'
import { useSearchParams } from 'react-router'
import AccionFila from '@/design-system/AccionFila'
import Boton from '@/components/ui/Boton'
import Tarjeta from '@/components/ui/Tarjeta'
import CampoFormulario from '@/components/ui/CampoFormulario'
import Selector from '@/components/ui/Selector'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import DialogoDetalle from '@/components/ui/DialogoDetalle'
import ListaDescripcion from '@/components/ui/ListaDescripcion'
import type { ColumnaTabla } from '@/components/ui/TablaDatos'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import ExportarExcel from '@/components/core/ExportarExcel'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import AccionesPagina from '@/layouts/LayoutOficina/AccionesPagina'
import { useConsulta } from '@/hooks/useConsulta'
import { campoApi, todosCampo, type ParametrosCampo } from '@/services/api/operacionCampo'
import type {
  ActividadCampo,
  CuadrillaCampo,
  OperarioCampo,
  PaginaCampo,
  ParticipantesCampo,
} from '@/types/operacionCampo'
import { esJefeCampo, puedeRegistrarCampo, puedeRegistrarParte } from '@/utils/operacionCampo'
import { usePermisos } from '@/sesion/ContextoSesion'
import { formatearFecha, formatearFechaHora } from '@/utils/formato'
import { BuscarCampo, EstadoCatalogos, SeleccionOperarios, TablaCampo } from './ComponentesCampo'
import { useMutacionCampo } from './useCampo'
import DialogoNuevaActividad from './DialogoNuevaActividad'
import MaterialesActividad from './MaterialesActividad'
import Adjuntos from '@/components/core/Adjuntos'
import { comprimirFotografia } from '@/utils/comprimirFotografia'
import estilos from './OperacionCampo.module.css'
import Estado from '@/components/ui/Estado'
import { TONO_ESTADO } from '@/components/ui/tonos'
import VerificacionActividad from './VerificacionActividad'
import DialogoPodaMenor from './DialogoPodaMenor'
import { conCache } from '@/sincronizacion/datosDescargados'

const ACTIVIDADES_POR_PAGINA = 25

type PaginaActividades = PaginaCampo<ActividadCampo> & { pendientes_verificacion: number }

function useListadoActividades() {
  const [url, setUrl] = useSearchParams()
  const pagina = Math.max(1, Number.parseInt(url.get('page') ?? '1', 10) || 1)
  const params: ParametrosCampo = {
    page: pagina,
    q: url.get('q') ?? '',
    fecha: url.get('fecha') ?? '',
    cuadrilla_id: url.get('cuadrilla_id') ?? '',
    verificacion: url.get('verificacion') ?? '',
  }
  const parametrosRemotos: ParametrosCampo = {
    q: params.q,
    fecha: params.fecha,
    cuadrilla_id: params.cuadrilla_id,
  }
  const claveRemota = JSON.stringify(['actividades', parametrosRemotos])
  const consulta = useConsulta(
    JSON.stringify(['actividades-verificacion', params]),
    async (signal) => {
      // El contrato actual no admite filtrar ni contar por verificación. Para que el total y la paginación
      // local sean exactos se recorren las páginas del resto de filtros. `conCache` solo interviene sin red;
      // el reintento posterior a una mutación vuelve a consultar el servidor y renueva esa copia.
      const actividades = await conCache(`listado-completo-${claveRemota}`, () =>
        todosCampo<ActividadCampo>('actividades/', parametrosRemotos, signal),
      )
      const pendientes = actividades.filter((actividad) => !actividad.fecha_verificacion).length
      const verificacion = String(params.verificacion ?? '')
      const filtradas = actividades.filter((actividad) =>
        verificacion === 'pendiente'
          ? !actividad.fecha_verificacion
          : verificacion === 'verificada'
            ? Boolean(actividad.fecha_verificacion)
            : true,
      )
      const inicio = (pagina - 1) * ACTIVIDADES_POR_PAGINA
      return {
        count: filtradas.length,
        next: null,
        previous: null,
        results: filtradas.slice(inicio, inicio + ACTIVIDADES_POR_PAGINA),
        pendientes_verificacion: pendientes,
      } satisfies PaginaActividades
    },
    (datos) => datos.count === 0,
  )
  function filtrar(cambios: ParametrosCampo) {
    const siguiente = new URLSearchParams(url)
    siguiente.delete('page')
    Object.entries(cambios).forEach(([clave, valor]) => {
      if (valor === '' || valor == null) siguiente.delete(clave)
      else siguiente.set(clave, String(valor))
    })
    setUrl(siguiente)
  }
  function cambiarPagina(nuevaPagina: number) {
    const siguiente = new URLSearchParams(url)
    if (nuevaPagina > 1) siguiente.set('page', String(nuevaPagina))
    else siguiente.delete('page')
    setUrl(siguiente)
  }
  return { consulta, pagina, params, filtrar, cambiarPagina }
}

export default function ParticipantesPage() {
  usePaginaActual('Participantes por actividad', [
    { texto: 'Operación de campo' },
    { texto: 'Participantes por actividad' },
  ])
  const permisos = usePermisos(),
    puedeRegistrar = puedeRegistrarCampo(permisos),
    puedeVerificar = esJefeCampo(permisos),
    // Poda menor y fotos de evidencia: quien registra en su propio parte (hoy, el capataz).
    registraParte = puedeRegistrarParte(permisos)
  const listado = useListadoActividades()
  const cuadrillas = useConsulta('filtro-cuadrillas', (signal) => todosCampo<CuadrillaCampo>('cuadrillas/', {}, signal))
  const [actual, setActual] = useState<ActividadCampo | null>(null),
    [materialActividad, setMaterialActividad] = useState<ActividadCampo | null>(null),
    [evidenciaActividad, setEvidenciaActividad] = useState<ActividadCampo | null>(null),
    // Poda registrada sin conexión (RF-T-012): su foto de evidencia se encola colgando de ella.
    [evidenciaEnCola, setEvidenciaEnCola] = useState<string | null>(null),
    [verificacionActividad, setVerificacionActividad] = useState<ActividadCampo | null>(null),
    [detalleActividad, setDetalleActividad] = useState<ActividadCampo | null>(null),
    [nueva, setNueva] = useState(false),
    [poda, setPoda] = useState(false),
    [aviso, setAviso] = useState(''),
    [avisoPendientesVisible, setAvisoPendientesVisible] = useState(true)
  return (
    <div className={estilos.pagina}>
      <AccionesPagina>
        <ExportarExcel listado="actividades" />
        {registraParte && (
          <Boton variante="secundario" onClick={() => setPoda(true)}>
            Registrar poda menor
          </Boton>
        )}
        {puedeRegistrar && <Boton onClick={() => setNueva(true)}>Registrar actividad</Boton>}
      </AccionesPagina>
      <p className={estilos.descripcion}>
        Usa «Registrar actividad» para las tareas del parte y «Registrar poda menor» para podas de ejemplares que
        cumplan el límite de altura. Después, indica quiénes realizaron cada actividad.
      </p>
      {aviso && (
        <AvisoEnLinea tono="exito" accion={{ texto: 'Cerrar aviso', onClick: () => setAviso('') }}>
          {aviso}
        </AvisoEnLinea>
      )}
      {puedeVerificar && avisoPendientesVisible && Boolean(listado.consulta.datos?.pendientes_verificacion) && (
        <AvisoEnLinea
          tono="advertencia"
          titulo={`${listado.consulta.datos?.pendientes_verificacion ?? 0} ${
            listado.consulta.datos?.pendientes_verificacion === 1 ? 'actividad pendiente' : 'actividades pendientes'
          } de verificación`}
          accion={
            listado.params.verificacion === 'pendiente'
              ? undefined
              : { texto: 'Ver pendientes', onClick: () => listado.filtrar({ verificacion: 'pendiente' }) }
          }
          onCerrar={() => setAvisoPendientesVisible(false)}
        >
          Revisa las actividades de campo y registra el resultado de la verificación.
        </AvisoEnLinea>
      )}
      <Tarjeta>
        <div className={estilos.filtros}>
          <BuscarCampo valor={String(listado.params.q ?? '')} onBuscar={(q) => listado.filtrar({ q })} />
          <Selector
            id="actividad-cuadrilla"
            etiqueta="Cuadrilla"
            valor={String(listado.params.cuadrilla_id ?? '')}
            opcionTodos="Todas"
            opciones={(cuadrillas.datos ?? []).map((c) => ({ valor: String(c.id), texto: c.nombre }))}
            onCambiar={(cuadrilla_id) => listado.filtrar({ cuadrilla_id })}
            bloqueadoMotivo={cuadrillas.estado === 'error' ? 'No se pudieron cargar las cuadrillas' : undefined}
          />
          <CampoFormulario
            id="actividad-fecha"
            etiqueta="Fecha"
            type="date"
            value={String(listado.params.fecha ?? '')}
            onChange={(e) => listado.filtrar({ fecha: e.target.value })}
          />
          <Selector
            id="actividad-verificacion"
            etiqueta="Estado de verificación"
            valor={String(listado.params.verificacion ?? '')}
            opcionTodos="Todos"
            opciones={[
              { valor: 'pendiente', texto: 'Pendientes' },
              { valor: 'verificada', texto: 'Verificadas' },
            ]}
            onCambiar={(verificacion) => listado.filtrar({ verificacion })}
          />
        </div>
      </Tarjeta>
      <TablaCampo
        titulo="Actividades y operarios participantes"
        listado={listado}
        vacio="No hay actividades con estos filtros"
        columnas={(
          [
            {
              clave: 'tipo_actividad_nombre',
              titulo: 'Actividad',
              multilinea: true,
              render: (a) => (
                <>
                  <span className={estilos.celdaPrincipal}>{a.tipo_actividad_nombre}</span>
                  <span className={estilos.secundario}>
                    {a.area_verde_nombre}
                    {a.ejemplar_codigo
                      ? ` · ${a.ejemplar_codigo}`
                      : a.pendiente_vinculacion
                        ? ' · Pendiente de vinculación'
                        : ''}
                  </span>
                </>
              ),
            },
            { clave: 'cuadrilla_nombre', titulo: 'Cuadrilla' },
            { clave: 'fecha', titulo: 'Fecha', render: (a) => formatearFecha(a.fecha) },
            {
              clave: 'cantidad',
              titulo: 'Participantes',
              alineacion: 'derecha',
              render: (a) => a.participantes.cantidad_operarios,
            },
            {
              clave: 'operarios',
              titulo: 'Operarios',
              multilinea: true,
              render: (a) =>
                a.participantes.operarios.length
                  ? a.participantes.operarios.map((p) => `${p.nombres} ${p.apellidos}`).join(', ')
                  : 'Sin selección registrada',
            },
            {
              clave: 'estado',
              titulo: 'Parte',
              render: (a) => (
                <Estado tono={TONO_ESTADO[a.estado === 'Abierto' ? 'info' : 'neutral']} texto={a.estado} />
              ),
            },
            {
              clave: 'verificacion',
              titulo: 'Verificación',
              multilinea: true,
              render: (a) =>
                a.fecha_verificacion ? (
                  <>
                    <span className={estilos.celdaPrincipal}>
                      Verificada por {a.verificado_por_nombre ?? 'Jefe de sección'}
                    </span>
                    <span className={estilos.secundario}>
                      {formatearFechaHora(a.fecha_verificacion)} · {a.verificacion_observaciones}
                    </span>
                  </>
                ) : (
                  'Pendiente de verificar'
                ),
            },
            {
              clave: 'acciones',
              titulo: 'Acciones',
              render: (a) => (
                <AccionFila
                  icono="eye"
                  nombre="Ver detalle"
                  etiqueta={`Ver detalle de ${a.tipo_actividad_nombre}`}
                  onClick={() => setDetalleActividad(a)}
                />
              ),
            },
            {
              clave: 'materiales',
              titulo: 'Materiales',
              render: (a) => (
                <Boton
                  variante="fantasma"
                  compacto
                  aria-label={`Materiales de actividad ${a.id}`}
                  onClick={() => setMaterialActividad(a)}
                >
                  Materiales
                </Boton>
              ),
            },
            {
              clave: 'evidencias',
              titulo: 'Evidencias',
              render: (a) => (
                <Boton
                  variante="fantasma"
                  compacto
                  aria-label={`Fotografías de actividad ${a.id}`}
                  onClick={() => setEvidenciaActividad(a)}
                >
                  Fotografías
                </Boton>
              ),
            },
            ...(puedeVerificar
              ? [
                  {
                    clave: 'verificar',
                    titulo: 'Revisión',
                    render: (a: ActividadCampo) => (
                      <Boton
                        variante="fantasma"
                        compacto
                        aria-label={`Verificar actividad ${a.id}`}
                        onClick={() => setVerificacionActividad(a)}
                      >
                        {a.fecha_verificacion ? 'Actualizar verificación' : 'Verificar'}
                      </Boton>
                    ),
                  },
                ]
              : []),
          ] satisfies ColumnaTabla<ActividadCampo>[]
        ).filter((columna) =>
          ['tipo_actividad_nombre', 'cuadrilla_nombre', 'fecha', 'cantidad', 'acciones'].includes(columna.clave),
        )}
      />
      {detalleActividad && (
        <DialogoDetalle
          abierto
          titulo={detalleActividad.tipo_actividad_nombre}
          descripcion={`${detalleActividad.area_verde_nombre} · ${formatearFecha(detalleActividad.fecha)}`}
          onCerrar={() => setDetalleActividad(null)}
          lateral
        >
          <div className={estilos.formulario}>
            <section className={estilos.seccionDetalle}>
              <h3>Actividad</h3>
              <ListaDescripcion
                elementos={[
                  { etiqueta: 'Fecha y hora', valor: formatearFechaHora(detalleActividad.fecha_hora_actividad) },
                  { etiqueta: 'Ubicación', valor: detalleActividad.area_verde_nombre },
                  { etiqueta: 'Cuadrilla', valor: detalleActividad.cuadrilla_nombre },
                  { etiqueta: 'Estado del parte', valor: detalleActividad.estado },
                  {
                    etiqueta: 'Tiempo empleado',
                    valor: detalleActividad.tiempo_minutos ? `${detalleActividad.tiempo_minutos} min` : null,
                  },
                  {
                    etiqueta: 'Superficie',
                    valor: detalleActividad.superficie_m2 === null ? null : `${detalleActividad.superficie_m2} m²`,
                  },
                  { etiqueta: 'Observaciones', valor: detalleActividad.observaciones, ancho: true },
                ]}
              />
            </section>
            <section className={estilos.seccionDetalle}>
              <h3>Participantes</h3>
              <p>
                {detalleActividad.participantes.operarios.length
                  ? detalleActividad.participantes.operarios.map((p) => `${p.nombres} ${p.apellidos}`).join(', ')
                  : 'No se han registrado participantes.'}
              </p>
              <Boton
                variante="secundario"
                onClick={() => {
                  setActual(detalleActividad)
                  setDetalleActividad(null)
                }}
              >
                {puedeRegistrar && detalleActividad.estado === 'Abierto'
                  ? 'Gestionar participantes'
                  : 'Ver participantes'}
              </Boton>
            </section>
            <section className={estilos.seccionDetalle}>
              <h3>Registro complementario</h3>
              <div className={estilos.accionesDetalle}>
                <Boton
                  variante="secundario"
                  onClick={() => {
                    setMaterialActividad(detalleActividad)
                    setDetalleActividad(null)
                  }}
                >
                  Ver materiales
                </Boton>
                <Boton
                  variante="secundario"
                  onClick={() => {
                    setEvidenciaActividad(detalleActividad)
                    setDetalleActividad(null)
                  }}
                >
                  Ver fotografías
                </Boton>
              </div>
            </section>
            <section className={estilos.seccionDetalle}>
              <h3>Verificación</h3>
              <ListaDescripcion
                columnas="una"
                elementos={[
                  {
                    etiqueta: 'Verificación',
                    valor: detalleActividad.fecha_verificacion
                      ? `${detalleActividad.verificado_por_nombre ?? 'Jefe de sección'} · ${formatearFechaHora(detalleActividad.fecha_verificacion)}`
                      : 'Pendiente de verificar',
                  },
                  { etiqueta: 'Observaciones de verificación', valor: detalleActividad.verificacion_observaciones },
                ]}
              />
              {puedeVerificar && (
                <Boton
                  variante="secundario"
                  onClick={() => {
                    setVerificacionActividad(detalleActividad)
                    setDetalleActividad(null)
                  }}
                >
                  {detalleActividad.fecha_verificacion ? 'Actualizar verificación' : 'Verificar actividad'}
                </Boton>
              )}
            </section>
          </div>
        </DialogoDetalle>
      )}
      {nueva && (
        <DialogoNuevaActividad
          onCerrar={() => setNueva(false)}
          onGuardado={(actividad) => {
            setNueva(false)
            setActual(actividad)
            setAviso('Actividad registrada. Selecciona los operarios que participaron')
            setAvisoPendientesVisible(true)
            listado.consulta.reintentar()
          }}
          onEncolado={() => {
            setNueva(false)
            setAviso(
              'Sin conexión: la actividad se guardó en este dispositivo y se enviará al volver la red. Los operarios se seleccionan después',
            )
          }}
        />
      )}
      {poda && (
        <DialogoPodaMenor
          onCerrar={() => setPoda(false)}
          onGuardado={(actividad) => {
            setPoda(false)
            setEvidenciaActividad(actividad)
            setAviso('Poda menor registrada. Añade la fotografía de evidencia')
            setAvisoPendientesVisible(true)
            listado.consulta.reintentar()
          }}
          onIncidencia={(mensaje) => {
            setPoda(false)
            setAviso(mensaje)
          }}
          onEncolado={(id) => {
            setPoda(false)
            setEvidenciaEnCola(id)
            setAviso(
              'Sin conexión: la poda se guardó en este dispositivo y se enviará al volver la red. Añade la fotografía de evidencia',
            )
          }}
        />
      )}
      {actual && (
        <DialogoParticipantes
          actividad={actual}
          soloLectura={!puedeRegistrar || actual.estado === 'Cerrado'}
          onCerrar={() => setActual(null)}
          onGuardado={() => {
            setActual(null)
            setAviso('Los participantes se guardaron correctamente')
            listado.consulta.reintentar()
          }}
        />
      )}
      {materialActividad && (
        <MaterialesActividad
          actividad={materialActividad}
          soloLectura={!puedeRegistrar || materialActividad.estado === 'Cerrado'}
          onCerrar={() => setMaterialActividad(null)}
        />
      )}
      {evidenciaActividad && (
        <DialogoFormulario
          abierto
          titulo="Fotografías de la actividad"
          textoConfirmar="Cerrar"
          onEnviar={() => setEvidenciaActividad(null)}
          onCerrar={() => setEvidenciaActividad(null)}
          conObligatorios={false}
          ocultarCancelar
          conCierre
          ancho="amplio"
        >
          <Adjuntos
            entidad="actividad"
            registroId={evidenciaActividad.id}
            puedeAdjuntar={registraParte && evidenciaActividad.estado === 'Abierto'}
            tiposAceptados=".jpg,.jpeg,.png"
            ayudaCarga="JPEG o PNG, de hasta 20 MB."
            prepararArchivo={comprimirFotografia}
            confirmarSeleccion
          />
        </DialogoFormulario>
      )}
      {evidenciaEnCola && (
        <DialogoFormulario
          abierto
          titulo="Fotografía de la poda"
          textoConfirmar="Cerrar"
          onEnviar={() => setEvidenciaEnCola(null)}
          onCerrar={() => setEvidenciaEnCola(null)}
          conObligatorios={false}
        >
          <Adjuntos
            entidad="actividad"
            registroId={0}
            registroPendiente={evidenciaEnCola}
            puedeAdjuntar
            tiposAceptados=".jpg,.jpeg,.png"
            ayudaCarga="JPEG o PNG, de hasta 20 MB. Se subirá con la poda al volver la conexión."
            prepararArchivo={comprimirFotografia}
            presentacion="foto"
          />
        </DialogoFormulario>
      )}
      {verificacionActividad && (
        <VerificacionActividad
          actividad={verificacionActividad}
          onCerrar={() => setVerificacionActividad(null)}
          onGuardado={() => {
            setVerificacionActividad(null)
            setAviso('Verificación registrada con su autor y fecha')
            setAvisoPendientesVisible(true)
            listado.consulta.reintentar()
          }}
        />
      )}
    </div>
  )
}

function DialogoParticipantes({
  actividad,
  soloLectura,
  onCerrar,
  onGuardado,
}: {
  actividad: ActividadCampo
  soloLectura: boolean
  onCerrar: () => void
  onGuardado: () => void
}) {
  const mutacion = useMutacionCampo()
  const [seleccion, setSeleccion] = useState<number[] | null>(null)
  const consulta = useConsulta(`participantes-${actividad.id}`, async (signal) => {
    const [actuales, disponibles] = await Promise.all([
      campoApi<ParticipantesCampo>(`actividades/${actividad.id}/participantes/`, { signal }),
      campoApi<OperarioCampo[]>(`actividades/${actividad.id}/operarios-disponibles/`, { signal }),
    ])
    return { actuales, disponibles }
  })
  function guardar() {
    if (soloLectura) {
      onCerrar()
      return
    }
    if (!consulta.datos || consulta.estado === 'error') {
      mutacion.setDetalle('Carga los participantes antes de guardar')
      return
    }
    const ids = seleccion ?? consulta.datos.actuales.operarios.map((p) => p.id)
    void mutacion.enviar(
      () => campoApi(`actividades/${actividad.id}/participantes/`, { metodo: 'PUT', cuerpo: { operarios: ids } }),
      onGuardado,
    )
  }
  return (
    <DialogoFormulario
      abierto
      titulo={soloLectura ? 'Participantes de la actividad' : 'Seleccionar operarios participantes'}
      descripcion={`${actividad.tipo_actividad_nombre} · ${actividad.area_verde_nombre} · ${formatearFecha(actividad.fecha)}`}
      textoConfirmar={soloLectura ? 'Cerrar' : 'Guardar participantes'}
      enviando={mutacion.enviando}
      onCerrar={onCerrar}
      onEnviar={guardar}
      error={mutacion.error}
      hayCambios={!soloLectura && seleccion !== null}
      ancho="amplio"
      conObligatorios={false}
    >
      <EstadoCatalogos consulta={consulta}>
        {(datos) => {
          const ids = seleccion ?? datos.actuales.operarios.map((p) => p.id)
          const disponibles = new Set(datos.disponibles.map((p) => p.id))
          const opciones = [...datos.disponibles, ...datos.actuales.operarios.filter((p) => !disponibles.has(p.id))]
          return (
            <div className={estilos.formulario}>
              <AvisoEnLinea tono="info">
                {actividad.cuadrilla_nombre} · <strong>{ids.length} operarios participantes</strong>
              </AvisoEnLinea>
              {soloLectura && (
                <AvisoEnLinea tono="info">
                  {actividad.estado === 'Cerrado'
                    ? 'El parte está cerrado y sus participantes no pueden modificarse.'
                    : 'Tu rol permite consultar los participantes.'}
                </AvisoEnLinea>
              )}
              {!soloLectura && datos.actuales.operarios.some((p) => !disponibles.has(p.id)) && (
                <AvisoEnLinea tono="advertencia">
                  Hay participantes que ya no están disponibles. Retíralos de la selección para guardar cambios.
                </AvisoEnLinea>
              )}
              <SeleccionOperarios
                opciones={opciones}
                seleccion={ids}
                soloLectura={soloLectura || mutacion.enviando}
                onCambiar={setSeleccion}
              />
              <p className={estilos.ayuda}>
                Se muestran los operarios asignados a la cuadrilla en la fecha de la actividad.
              </p>
            </div>
          )
        }}
      </EstadoCatalogos>
    </DialogoFormulario>
  )
}
