import { useState } from 'react'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import CampoFormulario, { AreaTexto } from '@/components/ui/CampoFormulario'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import Selector from '@/components/ui/Selector'
import { useConsulta } from '@/hooks/useConsulta'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import { conCache } from '@/sincronizacion/datosDescargados'
import { encolarActividad, esSinRed, partesDe } from './actividadSinConexion'
import { listarEjemplares } from '@/services/api/ejemplares'
import { campoApi, todosCampo } from '@/services/api/operacionCampo'
import type { EjemplarInventario } from '@/types/ejemplares'
import type {
  ActividadCampo,
  CatalogoCampo,
  CuadrillaCampo,
  ParteCampo,
  TipoActividadCampo,
} from '@/types/operacionCampo'
import { aInstanteLima, esLocalValido, hoyLima } from '@/utils/instanteLima'
import DialogoReportarIncidencia from '../incidencias/DialogoReportarIncidencia'
import { EstadoCatalogos } from './ComponentesCampo'
import { useMutacionCampo } from './useCampo'
import estilos from './OperacionCampo.module.css'

const SIN_CATASTRO = 'sin-catastro'

function nuevaClave(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

interface Props {
  onCerrar: () => void
  onGuardado: (actividad: ActividadCampo) => void
  onIncidencia: (aviso: string) => void
  /** Sin conexión (RF-T-012): la poda quedó en la cola con este UUID (su foto de evidencia puede colgar de él). */
  onEncolado?: (idCola: string) => void
}

export default function DialogoPodaMenor({ onCerrar, onGuardado, onIncidencia, onEncolado }: Props) {
  const usuarioId = useSesionActiva()?.usuario.id ?? null
  const [cuadrilla, setCuadrilla] = useState('')
  const [area, setArea] = useState('')
  const [ejemplar, setEjemplar] = useState('')
  const [fecha, setFecha] = useState(hoyLima())
  const [hora, setHora] = useState('08:00')
  const fechaHoraLocal = `${fecha}T${hora}`
  const [observaciones, setObservaciones] = useState('')
  const [mostrarErrores, setMostrarErrores] = useState(false)
  const [reportar, setReportar] = useState(false)
  const mutacion = useMutacionCampo()
  const catalogos = useConsulta('poda-menor-catalogos', (signal) => conCache('poda-menor-catalogos', async () => {
    const [cuadrillas, areas, tipos] = await Promise.all([
      todosCampo<CuadrillaCampo>('cuadrillas/', { activa: true }, signal),
      todosCampo<CatalogoCampo>('catalogos/areas-verdes/', { activo: true }, signal),
      todosCampo<TipoActividadCampo>('catalogos/tipos-actividad/', { activo: true }, signal),
    ])
    return {
      cuadrillas,
      areas,
      tipo: tipos.find((item) => item.nombre.toLocaleLowerCase('es') === 'poda menor') ?? null,
    }
  }))
  const ejemplares = useConsulta(
    area ? `poda-menor-ejemplares-${area}` : null,
    (signal) => conCache(`poda-menor-ejemplares-${area}`, () => listarEjemplares('', 1, signal, Number(area))),
    (items) => items.length === 0,
  )
  const seleccionado = (ejemplares.datos ?? []).find((item) => item.id === Number(ejemplar))
  const demasiadoAlto = (seleccionado?.altura_total_m ?? 0) >= 5
  const sinAltura = Boolean(seleccionado && seleccionado.altura_total_m === null)
  const areaNombre = catalogos.datos?.areas.find((item) => item.id === Number(area))?.nombre

  async function asegurarParte(): Promise<ParteCampo> {
    const existentes = await partesDe(cuadrilla, fecha)
    if (existentes.length > 0) return existentes[0]
    return campoApi<ParteCampo>('partes/', {
      metodo: 'POST',
      cuerpo: { cuadrilla_id: Number(cuadrilla), fecha },
      claveIdempotencia: nuevaClave(),
    })
  }

  function guardar() {
    setMostrarErrores(true)
    const tipoPoda = catalogos.datos?.tipo
    if (
      !cuadrilla ||
      !area ||
      !ejemplar ||
      !fecha ||
      fecha > hoyLima() ||
      !esLocalValido(fechaHoraLocal) ||
      demasiadoAlto ||
      sinAltura ||
      !tipoPoda
    )
      return
    let creada: ActividadCampo | null = null
    void mutacion.enviar(
      async () => {
        const datosPoda = {
          tipo_actividad_id: tipoPoda.id,
          clase_actividad_id: tipoPoda.clase_id,
          area_verde_id: Number(area),
          fecha_hora_actividad: aInstanteLima(fechaHoraLocal),
          observaciones: observaciones.trim(),
          ejemplar_id: ejemplar === SIN_CATASTRO ? null : Number(ejemplar),
          pendiente_vinculacion: ejemplar === SIN_CATASTRO,
        }
        // Sin conexión (RF-T-012): a la cola; la foto de evidencia se encola después colgando de ella.
        const aLaCola = async () => {
          if (usuarioId === null) return
          const id = await encolarActividad({
            cuadrillaId: Number(cuadrilla),
            fecha,
            cuerpo: datosPoda,
            descripcion: `Poda menor · ${areaNombre ?? ''}${seleccionado ? ` · ${seleccionado.codigo}` : ''} · ${fecha} ${hora}`,
            usuarioId,
          })
          onEncolado?.(id)
        }
        if (!navigator.onLine) return aLaCola()
        try {
          const parte = await asegurarParte()
          creada = await campoApi<ActividadCampo>('actividades/', {
            metodo: 'POST',
            claveIdempotencia: nuevaClave(),
            cuerpo: { parte_id: parte.id, ...datosPoda },
          })
        } catch (causa) {
          if (esSinRed(causa)) return aLaCola()
          throw causa
        }
      },
      () => {
        if (creada) onGuardado(creada)
      },
    )
  }

  if (reportar && seleccionado)
    return (
      <DialogoReportarIncidencia
        espacioInicial={areaNombre}
        ejemplarInicial={seleccionado.codigo}
        onCerrar={() => setReportar(false)}
        onEnviado={onIncidencia}
      />
    )

  return (
    <DialogoFormulario
      abierto
      titulo="Registrar poda menor"
      descripcion="Registra una poda de un árbol de menos de 5 m desde el parte de campo."
      textoConfirmar="Registrar poda y añadir foto"
      enviando={mutacion.enviando}
      error={mutacion.error}
      hayCambios={Boolean(cuadrilla || area || ejemplar || observaciones)}
      onCerrar={onCerrar}
      onEnviar={guardar}
      ancho="amplio"
    >
      <EstadoCatalogos consulta={catalogos}>
        {(datos) => (
          <fieldset className={estilos.formulario} disabled={mutacion.enviando}>
            {!datos.tipo && (
              <AvisoEnLinea tono="advertencia">
                No está disponible el tipo «Poda menor». Solicita al jefe de sección que revise el catálogo.
              </AvisoEnLinea>
            )}
            <div className={estilos.rejilla}>
              <Selector
                id="poda-cuadrilla"
                etiqueta="Cuadrilla"
                obligatorio
                valor={cuadrilla}
                opcionTodos="Selecciona una cuadrilla"
                opciones={datos.cuadrillas.map((item) => ({ valor: String(item.id), texto: item.nombre }))}
                onCambiar={setCuadrilla}
                error={mostrarErrores && !cuadrilla ? 'Selecciona una cuadrilla' : undefined}
              />
              <Selector
                id="poda-area"
                etiqueta="Espacio verde"
                obligatorio
                valor={area}
                opcionTodos="Selecciona un espacio"
                opciones={datos.areas.map((item) => ({ valor: String(item.id), texto: item.nombre }))}
                onCambiar={(valor) => {
                  setArea(valor)
                  setEjemplar('')
                }}
                error={mostrarErrores && !area ? 'Selecciona un espacio verde' : undefined}
              />
              <Selector
                id="poda-ejemplar"
                etiqueta="Árbol"
                obligatorio
                valor={ejemplar}
                opcionTodos={ejemplares.estado === 'cargando' ? 'Cargando árboles…' : 'Selecciona un árbol'}
                opciones={[
                  ...(ejemplares.datos ?? []).map((item: EjemplarInventario) => ({
                    valor: String(item.id),
                    texto: `${item.codigo} · ${item.altura_total_m === null ? 'altura pendiente' : `${item.altura_total_m} m`}`,
                  })),
                  { valor: SIN_CATASTRO, texto: 'Árbol no registrado en el catastro' },
                ]}
                onCambiar={setEjemplar}
                disabled={!area || ejemplares.estado === 'cargando'}
                bloqueadoMotivo={
                  ejemplares.estado === 'error' ? 'No se pudieron cargar los árboles' : undefined
                }
                error={
                  mostrarErrores && !ejemplar
                    ? 'Selecciona un árbol o indica que no está registrado'
                    : undefined
                }
              />
              <CampoFormulario
                id="poda-fecha"
                etiqueta="Fecha"
                type="date"
                obligatorio
                max={hoyLima()}
                value={fecha}
                onChange={(event) => setFecha(event.target.value)}
                error={
                  mostrarErrores && (!fecha || fecha > hoyLima())
                    ? 'Indica una fecha válida que no sea futura'
                    : undefined
                }
              />
              <CampoFormulario
                id="poda-hora"
                etiqueta="Hora"
                type="time"
                obligatorio
                value={hora}
                onChange={(event) => setHora(event.target.value)}
                error={
                  mostrarErrores && fecha && !esLocalValido(fechaHoraLocal) ? 'Indica la hora' : undefined
                }
              />
            </div>
            {ejemplares.estado === 'error' && (
              <AvisoEnLinea
                tono="advertencia"
                accion={{ texto: 'Reintentar', onClick: ejemplares.reintentar }}
              >
                No se pudieron cargar los árboles del espacio.
              </AvisoEnLinea>
            )}
            {ejemplares.estado === 'vacio' && (
              <AvisoEnLinea tono="info">
                No hay árboles registrados en este espacio. Puedes registrar la actividad como árbol no
                registrado.
              </AvisoEnLinea>
            )}
            {ejemplar === SIN_CATASTRO && (
              <AvisoEnLinea tono="info">
                La actividad se guardará sobre el espacio verde y quedará pendiente de vinculación al
                catastro.
              </AvisoEnLinea>
            )}
            {sinAltura && (
              <AvisoEnLinea tono="advertencia">
                Este árbol no tiene altura registrada. Actualiza el catastro antes de registrar la poda menor.
              </AvisoEnLinea>
            )}
            {demasiadoAlto && (
              <AvisoEnLinea
                tono="advertencia"
                accion={{ texto: 'Reportar incidencia', onClick: () => setReportar(true) }}
              >
                El árbol mide 5 m o más. La poda menor no está permitida; repórtalo para su evaluación.
              </AvisoEnLinea>
            )}
            <AreaTexto
              id="poda-observaciones"
              etiqueta="Observaciones"
              maxLength={1000}
              value={observaciones}
              onChange={(event) => setObservaciones(event.target.value)}
            />
          </fieldset>
        )}
      </EstadoCatalogos>
    </DialogoFormulario>
  )
}
