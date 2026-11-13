import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import AccionFila, { AccionesFila } from '@/design-system/AccionFila'
import Boton from '@/design-system/Boton'
import Tarjeta from '@/design-system/Tarjeta'
import CampoFormulario, { AreaTexto } from '@/design-system/CampoFormulario'
import Selector from '@/design-system/Selector'
import DialogoFormulario from '@/design-system/DialogoFormulario'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import AccionesPagina from '@/layouts/LayoutOficina/AccionesPagina'
import { useConsulta } from '@/hooks/useConsulta'
import { rutaTareasDeEncargo } from '@/router/rutasCampo'
import { usePermisos } from '@/sesion/ContextoSesion'
import { campoApi, todosCampo } from '@/services/api/operacionCampo'
import type { CatalogoCampo, CuadrillaCampo, EncargoCampo, EntradaEncargo, EstadoEncargo } from '@/types/operacionCampo'
import {
  esJefeCampo,
  hoyLima,
  puedeCambiarEstadoEncargo,
  puedeReprogramarEncargo,
  sumarDiasCampo,
  validarEncargoCampo,
  validarReprogramacion,
} from '@/utils/operacionCampo'
import { formatearFecha, formatearFechaHora } from '@/utils/formato'
import { BuscarCampo, EstadoCatalogos, TablaCampo } from './ComponentesCampo'
import { useListadoCampo, useMutacionCampo } from './useCampo'
import estilos from './OperacionCampo.module.css'
import Estado, { type TonoEstado } from '@/design-system/Estado'

const tonosEncargo: Record<EstadoEncargo, TonoEstado> = {
  'Por completar': 'neutro',
  'En curso': 'info',
  Completado: 'exito',
  Observado: 'aviso',
  Cancelado: 'error',
}

const transiciones: Record<EstadoEncargo, EstadoEncargo[]> = {
  'Por completar': ['En curso'],
  'En curso': ['Completado', 'Observado'],
  Completado: [],
  Observado: ['En curso'],
  Cancelado: [],
}

export default function EncargosPage() {
  usePaginaActual('Encargos', [{ texto: 'Operación de campo' }, { texto: 'Encargos' }])
  const permisos = usePermisos()
  const jefe = esJefeCampo(permisos)
  const navegar = useNavigate()
  const [seguimiento, setSeguimiento] = useState<EncargoCampo | null>(null)
  const [reprogramando, setReprogramando] = useState<EncargoCampo | null>(null)
  const listado = useListadoCampo<EncargoCampo>('encargos', ['periodicidad', 'desde', 'hasta'])
  const [dialogo, setDialogo] = useState<EncargoCampo | 'nuevo' | null>(null),
    [aviso, setAviso] = useState('')
  return (
    <div className={estilos.pagina}>
      <AccionesPagina>{jefe && <Boton onClick={() => setDialogo('nuevo')}>Registrar encargo</Boton>}</AccionesPagina>
      <p className={estilos.descripcion}>Consulta y organiza los encargos directos y periódicos por capataz.</p>
      {aviso && (
        <AvisoEnLinea tono="exito" accion={{ texto: 'Cerrar aviso', onClick: () => setAviso('') }}>
          {aviso}
        </AvisoEnLinea>
      )}
      <Tarjeta>
        <div className={estilos.filtros}>
          <BuscarCampo valor={String(listado.params.q ?? '')} onBuscar={(q) => listado.filtrar({ q })} />
          <Selector
            id="encargo-periodicidad"
            etiqueta="Modalidad"
            valor={String(listado.params.periodicidad ?? '')}
            opciones={[
              { valor: 'Semanal', texto: 'Semanal' },
              { valor: 'Quincenal', texto: 'Quincenal' },
              { valor: 'Directo', texto: 'Directo' },
            ]}
            opcionTodos="Todos"
            onCambiar={(periodicidad) => listado.filtrar({ periodicidad })}
          />
          <CampoFormulario
            id="encargo-desde"
            etiqueta="Desde"
            type="date"
            value={String(listado.params.desde ?? '')}
            onChange={(e) => listado.filtrar({ desde: e.target.value })}
          />
          <CampoFormulario
            id="encargo-hasta"
            etiqueta="Hasta"
            type="date"
            value={String(listado.params.hasta ?? '')}
            onChange={(e) => listado.filtrar({ hasta: e.target.value })}
          />
          <Boton variante="fantasma" onClick={() => listado.filtrar({ q: '', periodicidad: '', desde: '', hasta: '' })}>
            Limpiar filtros
          </Boton>
        </div>
      </Tarjeta>
      <TablaCampo
        titulo="Encargos por capataz"
        listado={listado}
        vacio="No hay encargos con estos filtros"
        columnas={[
          {
            clave: 'descripcion',
            titulo: 'Encargo',
            multilinea: true,
            render: (e) => (
              <>
                <Link className={estilos.celdaPrincipal} to={rutaTareasDeEncargo(e.id)}>
                  {e.descripcion}
                </Link>
                <span className={estilos.secundario}>
                  {e.tipo_actividad_nombre} · {e.area_verde_nombre}
                </span>
              </>
            ),
          },
          {
            clave: 'capataz_nombre',
            titulo: 'Capataz',
            render: (e) => (
              <>
                {e.capataz_nombre}
                <span className={estilos.secundario}>{e.cuadrilla_nombre}</span>
              </>
            ),
          },
          {
            clave: 'periodo',
            titulo: 'Periodo',
            render: (e) => (
              <>
                <Estado tono="info" texto={e.periodicidad} />
                {e.periodicidad !== 'Directo' && (
                  <span className={estilos.secundario}>
                    {formatearFecha(e.fecha_inicio)} — {formatearFecha(e.fecha_fin)}
                  </span>
                )}
              </>
            ),
          },
          {
            clave: 'plazo_previsto',
            titulo: 'Plazo previsto',
            render: (e) => formatearFecha(e.plazo_previsto),
          },
          {
            clave: 'estado',
            titulo: 'Estado',
            render: (e) => <Estado tono={tonosEncargo[e.estado]} texto={e.estado} />,
          },
          {
            clave: 'acciones',
            titulo: 'Acciones',
            render: (e) => (
              <AccionesFila>
                <AccionFila
                  icono="list"
                  nombre="Ver tareas"
                  etiqueta={`Ver tareas del encargo ${e.id}`}
                  onClick={() => navegar(rutaTareasDeEncargo(e.id))}
                />
                <AccionFila
                  icono={jefe ? 'pencil' : 'eye'}
                  nombre={jefe ? 'Editar encargo' : 'Ver encargo'}
                  etiqueta={`${jefe ? 'Editar' : 'Ver'} encargo ${e.id}`}
                  onClick={() => setDialogo(e)}
                />
                {jefe && puedeReprogramarEncargo(e.estado) && (
                  <AccionFila
                    icono="calendar"
                    nombre="Reprogramar"
                    etiqueta={`Reprogramar el encargo ${e.id}`}
                    onClick={() => setReprogramando(e)}
                  />
                )}
                <AccionFila
                  icono="history"
                  nombre="Seguimiento"
                  etiqueta={`Seguimiento del encargo ${e.id}`}
                  onClick={() => setSeguimiento(e)}
                />
              </AccionesFila>
            ),
          },
        ]}
      />
      {seguimiento && (
        <DialogoSeguimiento
          id={seguimiento.id}
          puedeCambiar={puedeCambiarEstadoEncargo(permisos)}
          puedeCancelar={jefe}
          onCerrar={() => setSeguimiento(null)}
          onGuardado={() => {
            setSeguimiento(null)
            setAviso('El estado del encargo se guardó correctamente')
            listado.consulta.reintentar()
          }}
        />
      )}
      {reprogramando && (
        <DialogoReprogramar
          encargo={reprogramando}
          onCerrar={() => setReprogramando(null)}
          onGuardado={() => {
            setReprogramando(null)
            setAviso('El encargo se reprogramó correctamente')
            listado.consulta.reintentar()
          }}
        />
      )}
      {dialogo && (
        <DialogoEncargo
          actual={dialogo === 'nuevo' ? null : dialogo}
          soloLectura={!jefe}
          onCerrar={() => setDialogo(null)}
          onGuardado={() => {
            setDialogo(null)
            setAviso('El encargo se guardó correctamente')
            listado.consulta.reintentar()
          }}
        />
      )}
    </div>
  )
}

function DialogoEncargo({
  actual,
  soloLectura,
  onCerrar,
  onGuardado,
}: {
  actual: EncargoCampo | null
  soloLectura: boolean
  onCerrar: () => void
  onGuardado: () => void
}) {
  const hoy = hoyLima()
  const [body, setBody] = useState<EntradaEncargo>(
    actual ?? {
      cuadrilla_id: 0,
      tipo_actividad_id: 0,
      area_verde_id: 0,
      descripcion: '',
      periodicidad: 'Semanal',
      fecha_reunion: hoy,
      fecha_inicio: hoy,
      fecha_fin: sumarDiasCampo(hoy, 6),
      plazo_previsto: sumarDiasCampo(hoy, 6),
    },
  )
  const directo = body.periodicidad === 'Directo'
  const [errores, setErrores] = useState<Record<string, string>>({}),
    [cambios, setCambios] = useState(false)
  const mutacion = useMutacionCampo()
  const catalogos = useConsulta('catalogos-encargo', async (signal) => {
    const [cuadrillas, tipos, areas] = await Promise.all([
      todosCampo<CuadrillaCampo>('cuadrillas/', {}, signal),
      todosCampo<CatalogoCampo>('catalogos/tipos-actividad/', {}, signal),
      todosCampo<CatalogoCampo>('catalogos/areas-verdes/', {}, signal),
    ])
    return { cuadrillas, tipos, areas }
  })
  function cambiar(cambios: Partial<EntradaEncargo>) {
    setCambios(true)
    setBody((prev) => ({ ...prev, ...cambios }))
    setErrores({})
  }
  function guardar() {
    if (soloLectura) {
      onCerrar()
      return
    }
    const errors = validarEncargoCampo(body)
    setErrores(errors)
    if (Object.keys(errors).length) {
      document.getElementById(`form-encargo-${Object.keys(errors)[0]}`)?.focus()
      return
    }
    if (!catalogos.datos || catalogos.estado === 'error') {
      mutacion.setDetalle('Carga las opciones antes de guardar')
      return
    }
    // Solo se envían los campos de entrada, nunca las etiquetas o auditoría de una respuesta GET.
    const entrada = {
      cuadrilla_id: body.cuadrilla_id,
      tipo_actividad_id: body.tipo_actividad_id,
      area_verde_id: body.area_verde_id,
      descripcion: body.descripcion.trim(),
      periodicidad: body.periodicidad,
      ...(directo
        ? {}
        : {
            fecha_reunion: body.fecha_reunion,
            fecha_inicio: body.fecha_inicio,
            fecha_fin: body.fecha_fin,
          }),
      plazo_previsto: body.plazo_previsto,
    }
    void mutacion.enviar(
      () =>
        campoApi(`encargos/${actual ? `${actual.id}/` : ''}`, {
          metodo: actual ? 'PUT' : 'POST',
          cuerpo: entrada,
        }),
      onGuardado,
    )
  }
  return (
    <DialogoFormulario
      abierto
      titulo={soloLectura ? 'Detalle del encargo' : actual ? 'Editar encargo' : 'Registrar encargo'}
      textoConfirmar={soloLectura ? 'Cerrar' : 'Guardar encargo'}
      ancho="amplio"
      onEnviar={guardar}
      onCerrar={onCerrar}
      error={mutacion.error}
      enviando={mutacion.enviando}
      hayCambios={!soloLectura && cambios}
      conObligatorios={!soloLectura}
    >
      <EstadoCatalogos consulta={catalogos}>
        {({ cuadrillas, tipos, areas }) => (
          <fieldset className={estilos.formulario} disabled={soloLectura || mutacion.enviando}>
            <div className={estilos.rejilla}>
              <Selector
                id="form-encargo-cuadrilla_id"
                etiqueta="Cuadrilla y capataz"
                obligatorio
                valor={body.cuadrilla_id ? String(body.cuadrilla_id) : ''}
                opcionTodos="Selecciona una cuadrilla"
                opciones={cuadrillas
                  .filter((c) => c.activa || c.id === actual?.cuadrilla_id)
                  .map((c) => ({ valor: String(c.id), texto: `${c.nombre} · ${c.capataz_nombre}` }))}
                onCambiar={(v) => cambiar({ cuadrilla_id: Number(v) })}
                error={errores.cuadrilla_id}
              />
              <Selector
                id="form-encargo-periodicidad"
                etiqueta="Modalidad"
                valor={body.periodicidad}
                opciones={[
                  { valor: 'Semanal', texto: 'Semanal · hasta 7 días' },
                  { valor: 'Quincenal', texto: 'Quincenal · hasta 14 días' },
                  { valor: 'Directo', texto: 'Directo · con plazo' },
                ]}
                onCambiar={(v) => {
                  const inicio = v === 'Directo' && actual?.periodicidad !== 'Directo' ? hoy : body.fecha_inicio
                  const fin = v === 'Directo' ? inicio : sumarDiasCampo(inicio, v === 'Semanal' ? 6 : 13)
                  cambiar({
                    periodicidad: v as EntradaEncargo['periodicidad'],
                    fecha_reunion: v === 'Directo' ? null : (body.fecha_reunion ?? hoy),
                    fecha_inicio: inicio,
                    fecha_fin: fin,
                    plazo_previsto: fin,
                  })
                }}
              />
              <Selector
                id="form-encargo-tipo_actividad_id"
                etiqueta="Tipo de actividad"
                obligatorio
                valor={body.tipo_actividad_id ? String(body.tipo_actividad_id) : ''}
                opcionTodos="Selecciona una actividad"
                opciones={tipos
                  .filter((t) => t.activo || t.id === actual?.tipo_actividad_id)
                  .map((t) => ({ valor: String(t.id), texto: t.nombre }))}
                onCambiar={(v) => cambiar({ tipo_actividad_id: Number(v) })}
                error={errores.tipo_actividad_id}
              />
              <Selector
                id="form-encargo-area_verde_id"
                etiqueta="Espacio"
                obligatorio
                valor={body.area_verde_id ? String(body.area_verde_id) : ''}
                opcionTodos="Selecciona un espacio"
                opciones={areas
                  .filter((a) => a.activo || a.id === actual?.area_verde_id)
                  .map((a) => ({ valor: String(a.id), texto: a.nombre }))}
                onCambiar={(v) => cambiar({ area_verde_id: Number(v) })}
                error={errores.area_verde_id}
              />
              {(directo
                ? (['plazo_previsto'] as const)
                : (['fecha_reunion', 'fecha_inicio', 'fecha_fin', 'plazo_previsto'] as const)
              ).map((key) => (
                <CampoFormulario
                  key={key}
                  id={`form-encargo-${key}`}
                  etiqueta={
                    {
                      fecha_reunion: 'Fecha de reunión',
                      fecha_inicio: 'Inicio del periodo',
                      fecha_fin: 'Fin del periodo',
                      plazo_previsto: 'Plazo previsto',
                    }[key]
                  }
                  type="date"
                  obligatorio
                  value={body[key] ?? ''}
                  onChange={(e) => cambiar({ [key]: e.target.value })}
                  error={errores[key]}
                />
              ))}
            </div>
            <AreaTexto
              id="form-encargo-descripcion"
              etiqueta="Descripción del encargo"
              obligatorio
              maxLength={1000}
              value={body.descripcion}
              onChange={(e) => cambiar({ descripcion: e.target.value })}
              error={errores.descripcion}
            />
            <p className={estilos.ayuda}>
              Los encargos con ejecución registrada conservan su planificación y no pueden redefinirse.
            </p>
          </fieldset>
        )}
      </EstadoCatalogos>
    </DialogoFormulario>
  )
}

/** Cambia el periodo y el plazo de un encargo vivo, con la justificación que queda en su historial (AV-405). */
function DialogoReprogramar({
  encargo,
  onCerrar,
  onGuardado,
}: {
  encargo: EncargoCampo
  onCerrar: () => void
  onGuardado: () => void
}) {
  const directo = encargo.periodicidad === 'Directo'
  const [inicio, setInicio] = useState(encargo.fecha_inicio)
  const [fin, setFin] = useState(encargo.fecha_fin)
  const [plazo, setPlazo] = useState(encargo.plazo_previsto)
  const [justificacion, setJustificacion] = useState('')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const mutacion = useMutacionCampo()
  // En el encargo directo el periodo termina en el plazo.
  const finEfectivo = directo ? plazo : fin
  const hayCambios =
    inicio !== encargo.fecha_inicio ||
    finEfectivo !== encargo.fecha_fin ||
    plazo !== encargo.plazo_previsto ||
    Boolean(justificacion)

  function guardar() {
    const entrada = { fecha_inicio: inicio, fecha_fin: finEfectivo, plazo_previsto: plazo, justificacion }
    const problemas = validarReprogramacion(encargo, entrada)
    setErrores(problemas)
    const primero = Object.keys(problemas)[0]
    if (primero) {
      document.getElementById(`reprogramar-${primero}`)?.focus()
      return
    }
    void mutacion.enviar(
      () =>
        campoApi(`encargos/${encargo.id}/reprogramacion/`, {
          metodo: 'POST',
          cuerpo: {
            ...(directo ? {} : { fecha_inicio: inicio, fecha_fin: fin }),
            plazo_previsto: plazo,
            justificacion: justificacion.trim(),
          },
        }),
      onGuardado,
    )
  }

  return (
    <DialogoFormulario
      abierto
      titulo="Reprogramar encargo"
      descripcion={`${encargo.descripcion} · ${encargo.cuadrilla_nombre}`}
      textoConfirmar="Reprogramar"
      onEnviar={guardar}
      onCerrar={onCerrar}
      enviando={mutacion.enviando}
      error={mutacion.error}
      hayCambios={hayCambios}
    >
      <fieldset className={estilos.formulario} disabled={mutacion.enviando}>
        <div className={estilos.rejilla}>
          {!directo && (
            <>
              <CampoFormulario
                id="reprogramar-fecha_inicio"
                etiqueta="Inicio del periodo"
                type="date"
                obligatorio
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                error={errores.fecha_inicio}
              />
              <CampoFormulario
                id="reprogramar-fecha_fin"
                etiqueta="Fin del periodo"
                type="date"
                obligatorio
                value={fin}
                onChange={(e) => setFin(e.target.value)}
                error={errores.fecha_fin}
              />
            </>
          )}
          <CampoFormulario
            id="reprogramar-plazo_previsto"
            etiqueta="Plazo previsto"
            type="date"
            obligatorio
            value={plazo}
            onChange={(e) => setPlazo(e.target.value)}
            error={errores.plazo_previsto}
          />
        </div>
        <AreaTexto
          id="reprogramar-justificacion"
          etiqueta="Justificación"
          obligatorio
          maxLength={1000}
          value={justificacion}
          onChange={(e) => setJustificacion(e.target.value)}
          error={errores.justificacion}
        />
        <p className={estilos.ayuda}>
          Las actividades ya registradas deben quedar dentro del nuevo periodo. El cambio queda en el historial del
          encargo.
        </p>
      </fieldset>
    </DialogoFormulario>
  )
}

function DialogoSeguimiento({
  id,
  puedeCambiar,
  puedeCancelar,
  onCerrar,
  onGuardado,
}: {
  id: number
  puedeCambiar: boolean
  puedeCancelar: boolean
  onCerrar: () => void
  onGuardado: () => void
}) {
  const consulta = useConsulta(`encargo-seguimiento-${id}`, (signal) =>
    campoApi<EncargoCampo>(`encargos/${id}/`, { signal }),
  )
  const [estado, setEstado] = useState<EstadoEncargo | ''>('')
  const [observaciones, setObservaciones] = useState('')
  const mutacion = useMutacionCampo()
  const actual = consulta.datos
  const opciones: EstadoEncargo[] = []
  if (actual && puedeCambiar) opciones.push(...transiciones[actual.estado])
  if (actual && puedeCancelar && actual.estado !== 'Completado' && actual.estado !== 'Cancelado') {
    opciones.push('Cancelado')
  }
  const requiereMotivo = estado === 'Observado' || estado === 'Cancelado'

  function guardar() {
    if (!opciones.length) {
      onCerrar()
      return
    }
    if (!actual || !estado || !opciones.includes(estado)) {
      mutacion.setDetalle('Selecciona el nuevo estado')
      return
    }
    if (requiereMotivo && !observaciones.trim()) {
      mutacion.setDetalle(
        estado === 'Cancelado' ? 'Indica el motivo de la cancelación' : 'Indica el motivo de la observación',
      )
      return
    }
    void mutacion.enviar(
      () =>
        campoApi(`encargos/${id}/estado/`, {
          metodo: 'POST',
          cuerpo: { estado_anterior: actual.estado, estado, observaciones: observaciones.trim() },
        }),
      onGuardado,
    )
  }

  return (
    <DialogoFormulario
      abierto
      titulo="Seguimiento del encargo"
      textoConfirmar={opciones.length ? 'Guardar estado' : 'Cerrar'}
      onCerrar={onCerrar}
      onEnviar={guardar}
      error={mutacion.error}
      enviando={mutacion.enviando}
      hayCambios={Boolean(estado || observaciones)}
      conObligatorios={opciones.length > 0}
    >
      <EstadoCatalogos consulta={consulta}>
        {(encargo) => (
          <>
            <p>{encargo.descripcion}</p>
            <Estado tono={tonosEncargo[encargo.estado]} texto={encargo.estado} />
            {opciones.length > 0 && (
              <fieldset className={estilos.formulario} disabled={mutacion.enviando}>
                <Selector
                  id="nuevo-estado-encargo"
                  etiqueta="Nuevo estado"
                  obligatorio
                  valor={estado}
                  opcionTodos="Selecciona un estado"
                  opciones={opciones.map((valor) => ({ valor, texto: valor }))}
                  onCambiar={(valor) => setEstado(valor as EstadoEncargo | '')}
                />
                <AreaTexto
                  id="observaciones-estado-encargo"
                  etiqueta="Observaciones"
                  obligatorio={requiereMotivo}
                  maxLength={1000}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                />
              </fieldset>
            )}
            <h3>Historial de estados</h3>
            {encargo.historial_estados?.length ? (
              <ul>
                {encargo.historial_estados.map((cambio) => (
                  <li key={cambio.id}>
                    <strong>
                      {cambio.estado_anterior} → {cambio.estado_nuevo}
                    </strong>
                    <span className={estilos.secundario}>
                      {cambio.autor} · {formatearFechaHora(cambio.fecha)}
                    </span>
                    {cambio.observaciones && <p>{cambio.observaciones}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Sin cambios de estado registrados.</p>
            )}
            {Boolean(encargo.reprogramaciones?.length) && (
              <>
                <h3>Reprogramaciones</h3>
                <ul>
                  {encargo.reprogramaciones?.map((cambio) => (
                    <li key={cambio.id}>
                      <strong>
                        Plazo {formatearFecha(cambio.plazo_anterior)} → {formatearFecha(cambio.plazo_nuevo)}
                      </strong>
                      <span className={estilos.secundario}>
                        {cambio.autor} · {formatearFechaHora(cambio.fecha)}
                      </span>
                      <p>{cambio.justificacion}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </EstadoCatalogos>
    </DialogoFormulario>
  )
}
