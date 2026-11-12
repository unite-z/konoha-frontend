import { useRef, useState } from 'react'
import CampoFormulario, { AreaTexto } from '@/design-system/CampoFormulario'
import Selector from '@/design-system/Selector'
import DialogoFormulario from '@/design-system/DialogoFormulario'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import { useConsulta } from '@/hooks/useConsulta'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import { conCache } from '@/sincronizacion/datosDescargados'
import { encolarActividad, esSinRed, partesDe } from './actividadSinConexion'
import { campoApi, todosCampo } from '@/services/api/operacionCampo'
import { clasesActividadParaParte, listarTiposActividad } from '@/services/api/catalogoActividadesCampo'
import { ErrorApi, aErrorApi } from '@/services/api/cliente'
import type {
  ActividadCampo,
  CatalogoCampo,
  CuadrillaCampo,
  EncargoCampo,
  ParteCampo,
  UnidadMedidaCampo,
} from '@/types/operacionCampo'
import { aInstanteLima, esFuturo, esLocalValido, hoyLima } from '@/utils/instanteLima'
import { EstadoCatalogos } from './ComponentesCampo'
import { useMutacionCampo } from './useCampo'
import estilos from './OperacionCampo.module.css'

export default function DialogoNuevaActividad({
  onCerrar,
  onGuardado,
  onEncolado,
}: {
  onCerrar: () => void
  onGuardado: (a: ActividadCampo) => void
  /** Sin conexión (RF-T-012): la actividad quedó en la cola con este UUID. */
  onEncolado?: (idCola: string) => void
}) {
  const usuarioId = useSesionActiva()?.usuario.id ?? null
  const [cuadrilla, setCuadrilla] = useState(''),
    [tipo, setTipo] = useState(''),
    [area, setArea] = useState('')
  const [clase, setClase] = useState('')
  const [fechaSolicitud, setFechaSolicitud] = useState(''),
    [incidencia, setIncidencia] = useState('')
  const [superficie, setSuperficie] = useState(''),
    [solicitada, setSolicitada] = useState(''),
    [ejecutada, setEjecutada] = useState(''),
    [unidad, setUnidad] = useState(''),
    [tiempo, setTiempo] = useState('')
  const [fecha, setFecha] = useState(hoyLima()),
    [hora, setHora] = useState('08:00'),
    [encargo, setEncargo] = useState(''),
    [observaciones, setObservaciones] = useState('')
  const [cambios, setCambios] = useState(false),
    [errores, setErrores] = useState<Record<string, string>>({})
  const mutacion = useMutacionCampo()
  const intento = useRef<{ cuerpo: string; clave: string } | null>(null)
  // Con copia en el dispositivo para registrar sin conexión (RF-T-012).
  const catalogos = useConsulta('catalogos-actividad', (signal) =>
    conCache('catalogos-actividad', async () => {
      const [cuadrillas, tipos, areas, clases, unidades] = await Promise.all([
        todosCampo<CuadrillaCampo>('cuadrillas/', { activa: true }, signal),
        listarTiposActividad(true, signal),
        todosCampo<CatalogoCampo>('catalogos/areas-verdes/', { activo: true }, signal),
        clasesActividadParaParte(signal),
        todosCampo<UnidadMedidaCampo>('catalogos/unidades-medida/', {}, signal),
      ])
      return { cuadrillas, tipos, areas, clases, unidades }
    }),
  )
  const encargos = useConsulta(cuadrilla && fecha ? `encargos-actividad-${cuadrilla}-${fecha}` : null, (signal) =>
    conCache(`encargos-actividad-${cuadrilla}-${fecha}`, () =>
      todosCampo<EncargoCampo>('encargos/', { cuadrilla_id: cuadrilla, desde: fecha, hasta: fecha }, signal),
    ),
  )
  function cambiar(fn: () => void) {
    setCambios(true)
    setErrores({})
    fn()
  }
  async function asegurarParte(): Promise<ParteCampo> {
    const existentes = await partesDe(cuadrilla, fecha)
    if (existentes.length) return existentes[0]
    try {
      return await campoApi<ParteCampo>('partes/', {
        metodo: 'POST',
        cuerpo: { cuadrilla_id: Number(cuadrilla), fecha },
      })
    } catch (cause) {
      // Otra pestaña puede haber abierto el parte entre la consulta y el POST.
      if (aErrorApi(cause).estado === 409) {
        const nuevos = await todosCampo<ParteCampo>('partes/', { cuadrilla_id: cuadrilla, fecha })
        if (nuevos.length) return nuevos[0]
      }
      throw cause
    }
  }
  function guardar() {
    const errors: Record<string, string> = {}
    const fechaHoraLocal = `${fecha}T${hora}`
    if (!cuadrilla) errors.cuadrilla = 'Selecciona una cuadrilla'
    if (!tipo) errors.tipo = 'Selecciona una actividad'
    if (catalogos.datos?.clases.length && !clase) errors.clase = 'Selecciona una clase'
    if (!area) errors.area = 'Selecciona un espacio'
    if (!fecha || fecha > hoyLima()) errors.fecha = 'Selecciona una fecha válida que no sea futura'
    if (fechaSolicitud && fechaSolicitud > fecha)
      errors.fechaSolicitud = 'La solicitud no puede ser posterior a la actividad'
    if (
      incidencia &&
      (!Number.isSafeInteger(Number(incidencia.replace(',', '.'))) || Number(incidencia.replace(',', '.')) <= 0)
    )
      errors.incidencia = 'Indica un identificador de incidencia válido'
    if (incidencia && encargo) errors.incidencia = 'Selecciona una incidencia o un encargo de origen'
    for (const [campo, valor] of Object.entries({ superficie, solicitada, ejecutada }))
      if (valor && (!Number.isFinite(Number(valor.replace(',', '.'))) || Number(valor.replace(',', '.')) < 0))
        errors[campo] = 'Indica una cantidad no negativa'
    if (Boolean(solicitada || ejecutada) !== Boolean(unidad))
      errors.unidad = 'Las cantidades requieren una unidad de medida'
    if (tiempo && (!Number.isInteger(Number(tiempo)) || Number(tiempo) < 1 || Number(tiempo) > 1440))
      errors.tiempo = 'Indica entre 1 y 1440 minutos'
    if (!/^\d{2}:\d{2}$/.test(hora)) errors.hora = 'Indica la hora de la actividad'
    if (!errors.fecha && !errors.hora) {
      if (!esLocalValido(fechaHoraLocal)) errors.hora = 'Indica una fecha y hora válidas'
      else if (esFuturo(fechaHoraLocal)) errors.hora = 'La actividad no puede estar en el futuro'
    }
    setErrores(errors)
    if (Object.keys(errors).length) {
      document.getElementById(`nueva-actividad-${Object.keys(errors)[0]}`)?.focus()
      return
    }
    if (!catalogos.datos || catalogos.estado === 'error') {
      mutacion.setDetalle('Carga las opciones antes de registrar la actividad')
      return
    }
    void mutacion.enviar(
      async () => {
        const datosActividad = {
          clase_actividad_id: clase ? Number(clase) : null,
          tipo_actividad_id: Number(tipo),
          area_verde_id: Number(area),
          fecha_hora_actividad: aInstanteLima(fechaHoraLocal),
          fecha_solicitud: fechaSolicitud || null,
          incidencia_id: incidencia ? Number(incidencia.replace(',', '.')) : null,
          encargo_id: encargo ? Number(encargo) : null,
          superficie_m2: superficie ? Number(superficie.replace(',', '.')) : null,
          cantidad_solicitada: solicitada ? Number(solicitada.replace(',', '.')) : null,
          cantidad_ejecutada: ejecutada ? Number(ejecutada.replace(',', '.')) : null,
          unidad_medida_id: unidad ? Number(unidad) : null,
          tiempo_minutos: tiempo ? Number(tiempo) : null,
          observaciones,
        }
        // Sin conexión (RF-T-012): a la cola con su hora real; se envía sola al volver la red.
        const aLaCola = async () => {
          if (usuarioId === null) return
          const nombreTipo = catalogos.datos?.tipos.find((t) => t.id === Number(tipo))?.nombre ?? 'Actividad'
          const nombreArea = catalogos.datos?.areas.find((a) => a.id === Number(area))?.nombre ?? ''
          const id = await encolarActividad({
            cuadrillaId: Number(cuadrilla),
            fecha,
            cuerpo: datosActividad,
            descripcion: `${nombreTipo} · ${nombreArea} · ${fecha} ${hora}`,
            usuarioId,
          })
          onEncolado?.(id)
        }
        if (!navigator.onLine) return aLaCola()
        let parte: ParteCampo
        try {
          parte = await asegurarParte()
        } catch (causa) {
          if (esSinRed(causa)) return aLaCola()
          throw causa
        }
        if (parte.estado === 'Cerrado')
          throw new ErrorApi(
            409,
            'ParteCerrado',
            'El parte de esa cuadrilla está cerrado para la fecha seleccionada. No se pueden agregar actividades',
          )
        const cuerpo = { parte_id: parte.id, ...datosActividad }
        const firma = JSON.stringify(cuerpo)
        if (!intento.current || intento.current.cuerpo !== firma)
          intento.current = { cuerpo: firma, clave: crypto.randomUUID() }
        let actividad: ActividadCampo
        try {
          actividad = await campoApi<ActividadCampo>('actividades/', {
            metodo: 'POST',
            cuerpo,
            claveIdempotencia: intento.current.clave,
          })
        } catch (causa) {
          if (esSinRed(causa)) return aLaCola()
          throw causa
        }
        onGuardado(actividad)
      },
      () => {},
    )
  }
  return (
    <DialogoFormulario
      abierto
      titulo="Registrar actividad"
      descripcion="Registra la actividad realizada y luego selecciona los operarios participantes."
      textoConfirmar="Registrar y seleccionar operarios"
      onEnviar={guardar}
      onCerrar={onCerrar}
      error={mutacion.error}
      enviando={mutacion.enviando}
      hayCambios={cambios}
      ancho="amplio"
    >
      <EstadoCatalogos consulta={catalogos}>
        {(datos) => (
          <fieldset className={estilos.formulario} disabled={mutacion.enviando}>
            <div className={estilos.rejilla}>
              <Selector
                id="nueva-actividad-cuadrilla"
                etiqueta="Cuadrilla"
                obligatorio
                valor={cuadrilla}
                opcionTodos="Selecciona una cuadrilla"
                opciones={datos.cuadrillas.map((c) => ({ valor: String(c.id), texto: c.nombre }))}
                onCambiar={(v) =>
                  cambiar(() => {
                    setCuadrilla(v)
                    setEncargo('')
                  })
                }
                error={errores.cuadrilla}
              />
              <CampoFormulario
                id="nueva-actividad-fecha"
                etiqueta="Fecha de atención"
                type="date"
                obligatorio
                max={hoyLima()}
                value={fecha}
                onChange={(e) =>
                  cambiar(() => {
                    setFecha(e.target.value)
                    setEncargo('')
                  })
                }
                error={errores.fecha}
              />
              {datos.clases.length > 0 && (
                <Selector
                  id="nueva-actividad-clase"
                  etiqueta="Clase de actividad"
                  obligatorio
                  valor={clase}
                  opcionTodos="Selecciona una clase"
                  opciones={datos.clases.filter((c) => c.activo).map((c) => ({ valor: String(c.id), texto: c.nombre }))}
                  onCambiar={(v) =>
                    cambiar(() => {
                      setClase(v)
                      setTipo('')
                      setEncargo('')
                    })
                  }
                  error={errores.clase}
                />
              )}
              <Selector
                id="nueva-actividad-tipo"
                etiqueta="Tipo de actividad"
                obligatorio
                valor={tipo}
                opcionTodos="Selecciona una actividad"
                opciones={datos.tipos
                  .filter((t) => t.activo && (!datos.clases.length || t.clase_id === Number(clase)))
                  .map((t) => ({ valor: String(t.id), texto: t.nombre }))}
                onCambiar={(v) =>
                  cambiar(() => {
                    setTipo(v)
                    setEncargo('')
                  })
                }
                error={errores.tipo}
              />
              <Selector
                id="nueva-actividad-area"
                etiqueta="Espacio"
                obligatorio
                valor={area}
                opcionTodos="Selecciona un espacio"
                opciones={datos.areas.map((a) => ({ valor: String(a.id), texto: a.nombre }))}
                onCambiar={(v) =>
                  cambiar(() => {
                    setArea(v)
                    setEncargo('')
                  })
                }
                error={errores.area}
              />
              <CampoFormulario
                id="nueva-actividad-hora"
                etiqueta="Hora de la actividad"
                type="time"
                obligatorio
                value={hora}
                onChange={(e) => cambiar(() => setHora(e.target.value))}
                error={errores.hora}
              />
              <Selector
                id="nueva-actividad-encargo"
                etiqueta="Encargo de origen"
                valor={encargo}
                opcionTodos="Sin encargo asociado"
                opciones={(encargos.datos ?? [])
                  .filter(
                    (e) =>
                      e.estado !== 'Cancelado' &&
                      e.tipo_actividad_id === Number(tipo) &&
                      e.area_verde_id === Number(area),
                  )
                  .map((e) => ({ valor: String(e.id), texto: e.descripcion }))}
                onCambiar={(v) => cambiar(() => setEncargo(v))}
                ayuda="Se muestran los encargos que coinciden con la cuadrilla, fecha, actividad y espacio."
                disabled={encargos.estado === 'cargando'}
              />
              <CampoFormulario
                id="nueva-actividad-fechaSolicitud"
                etiqueta="Fecha de solicitud"
                type="date"
                max={fecha || hoyLima()}
                value={fechaSolicitud}
                onChange={(e) => cambiar(() => setFechaSolicitud(e.target.value))}
                error={errores.fechaSolicitud}
                ayuda="Opcional. No puede ser posterior a la fecha de atención."
              />
              <CampoFormulario
                id="nueva-actividad-incidencia"
                etiqueta="Identificador de incidencia de origen"
                formato="entero"
                value={incidencia}
                onChange={(e) => cambiar(() => setIncidencia(e.target.value))}
                error={errores.incidencia}
                ayuda="Opcional. Introduce una incidencia registrada; no puede combinarse con un encargo de origen."
              />
              <CampoFormulario
                id="nueva-actividad-superficie"
                etiqueta="Superficie intervenida (m²)"
                formato="decimal"
                decimales={2}
                value={superficie}
                onChange={(e) => cambiar(() => setSuperficie(e.target.value))}
                error={errores.superficie}
              />
              <CampoFormulario
                id="nueva-actividad-solicitada"
                etiqueta="Cantidad solicitada"
                formato="decimal"
                decimales={2}
                value={solicitada}
                onChange={(e) => cambiar(() => setSolicitada(e.target.value))}
                error={errores.solicitada}
              />
              <CampoFormulario
                id="nueva-actividad-ejecutada"
                etiqueta="Cantidad ejecutada"
                formato="decimal"
                decimales={2}
                value={ejecutada}
                onChange={(e) => cambiar(() => setEjecutada(e.target.value))}
                error={errores.ejecutada}
              />
              <Selector
                id="nueva-actividad-unidad"
                etiqueta="Unidad de medida"
                valor={unidad}
                opcionTodos="Sin unidad"
                opciones={datos.unidades.map((u) => ({
                  valor: String(u.id),
                  texto: `${u.nombre} (${u.simbolo})`,
                }))}
                onCambiar={(v) => cambiar(() => setUnidad(v))}
                error={errores.unidad}
              />
              <CampoFormulario
                id="nueva-actividad-tiempo"
                etiqueta="Tiempo empleado (minutos)"
                formato="entero"
                value={tiempo}
                onChange={(e) => cambiar(() => setTiempo(e.target.value))}
                error={errores.tiempo}
              />
            </div>
            {encargos.estado === 'error' && (
              <AvisoEnLinea tono="advertencia" accion={{ texto: 'Reintentar', onClick: encargos.reintentar }}>
                No se pudieron cargar los encargos. Puedes reintentar o registrar una actividad sin encargo asociado.
              </AvisoEnLinea>
            )}
            <AreaTexto
              id="nueva-actividad-observaciones"
              etiqueta="Observaciones"
              maxLength={1000}
              value={observaciones}
              onChange={(e) => cambiar(() => setObservaciones(e.target.value))}
            />
          </fieldset>
        )}
      </EstadoCatalogos>
    </DialogoFormulario>
  )
}
