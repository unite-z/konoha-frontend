import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import Adjuntos from '@/components/core/Adjuntos'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton from '@/components/ui/Boton'
import DialogoConfirmacion from '@/components/ui/DialogoConfirmacion'
import Estado from '@/components/ui/Estado'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoSinAcceso from '@/components/ui/EstadoSinAcceso'
import CampoFormulario from '@/components/ui/CampoFormulario'
import ListaDescripcion from '@/components/ui/ListaDescripcion'
import Tarjeta from '@/components/ui/Tarjeta'
import { PERMISOS, puede } from '@/config/permisosCore'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_INVENTARIO, RUTAS_INVENTARIO, rutaCampanaPoda } from '@/router/rutasApp'
import { aErrorApi } from '@/services/api/cliente'
import { anularIntervencion, cambiarIntervencion, obtenerIntervencion } from '@/services/api/intervencionesPoda'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import { formatearFecha } from '@/utils/formato'
import { hoyLima } from '@/utils/instanteLima'
import { TEXTO_MOTIVO_PODA_ALTURA } from '@/utils/podaAltura'
import estilos from './CampanasPoda.module.css'
import PlantaMuertaEjemplar from './PlantaMuertaEjemplar'

export default function IntervencionPodaPage() {
  const id = Number(useParams().id)
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const errorFoto = (ubicacion.state as { errorFoto?: string } | null)?.errorFoto ?? null
  const sesion = useSesionActiva()
  const puedeRegistrar = puede(sesion, PERMISOS.registrarPoda)
  const [version, setVersion] = useState(0)
  const [confirmar, setConfirmar] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fechaEjecucion, setFechaEjecucion] = useState('')
  const consulta = useConsulta(`intervencion-poda|${id}|${version}`, (signal) => obtenerIntervencion(id, signal))
  const intervencion = consulta.datos
  const deAltura = intervencion?.categoria === 'AlturaDemanda'
  usePaginaActual(intervencion ? `Intervención · ${intervencion.ejemplar_codigo}` : 'Intervención', [
    MIGAS_INVENTARIO.areasVerdes,
    deAltura ? MIGAS_INVENTARIO.podaAltura : MIGAS_INVENTARIO.campanasPoda,
    { texto: 'Intervención' },
  ])

  async function registrarEjecucion() {
    if (!fechaEjecucion) return
    setError(null)
    setGuardando(true)
    try {
      await cambiarIntervencion(id, { fecha_ejecucion: fechaEjecucion })
      setVersion((actual) => actual + 1)
    } catch (causa) {
      setError(aErrorApi(causa).detalle)
    } finally {
      setGuardando(false)
    }
  }

  async function anular() {
    setError(null)
    setGuardando(true)
    try {
      await anularIntervencion(id)
      navegar(
        intervencion?.campana_id
          ? rutaCampanaPoda(intervencion.campana_id)
          : intervencion?.categoria === 'AlturaDemanda'
            ? RUTAS_INVENTARIO.podaAltura
            : RUTAS_INVENTARIO.campanasPoda,
      )
    } catch (causa) {
      setError(aErrorApi(causa).detalle)
      setConfirmar(false)
      setGuardando(false)
    }
  }

  if (consulta.error?.estado === 403) return <EstadoSinAcceso descripcion={consulta.error.detalle} />
  if (consulta.estado === 'error' && !intervencion) {
    return (
      <EstadoError
        titulo="No pudimos cargar la intervención"
        descripcion={consulta.error?.detalle ?? ''}
        onReintentar={consulta.reintentar}
      />
    )
  }
  if (!intervencion) return <EstadoCarga forma="tabla" texto="Cargando intervención…" retrasar />

  const verificada = intervencion.estado === 'Verificada'
  const solicitada = intervencion.estado === 'Solicitada'
  const tono = verificada ? 'exito' : solicitada ? 'info' : 'aviso'
  const cantidad = (valor: string | null) =>
    valor === null ? '—' : `${valor} ${intervencion.unidad_medida_simbolo ?? ''}`.trim()

  return (
    <div className={estilos.pagina}>
      {error && <AvisoEnLinea tono="error">{error}</AvisoEnLinea>}
      {errorFoto && !verificada && (
        <AvisoEnLinea tono="error" titulo="La intervención se guardó, pero no la fotografía">
          {errorFoto} Vuelve a adjuntarla abajo.
        </AvisoEnLinea>
      )}
      {verificada && (
        <AvisoEnLinea tono="exito" titulo="Intervención verificada">
          Fecha, foto y datos registrados. Queda en el historial del ejemplar
          {intervencion.campana_id ? ' y en el avance verificable de la campaña' : ''}.
        </AvisoEnLinea>
      )}
      {solicitada && (
        <AvisoEnLinea tono="info" titulo="Poda solicitada al proveedor">
          La atención ya está en Servicios tercerizados. Cuando el proveedor la ejecute, registra aquí la fecha y la
          fotografía.
        </AvisoEnLinea>
      )}
      {!verificada && !solicitada && (
        <AvisoEnLinea tono="advertencia" titulo="Falta la fotografía de evidencia">
          El registro se conserva como incompleto y queda fuera del conteo verificable. Añade la foto para completarlo.
        </AvisoEnLinea>
      )}

      <Tarjeta titulo="Detalle" junto={<Estado tono={tono} texto={intervencion.estado} />} relleno="amplio">
        <ListaDescripcion
          elementos={[
            { etiqueta: 'Ejemplar', valor: intervencion.ejemplar_codigo },
            { etiqueta: 'Fecha', valor: formatearFecha(intervencion.fecha_ejecucion) },
            { etiqueta: 'Tipo de poda', valor: intervencion.tipo_intervencion_nombre ?? '—' },
            // En la poda de altura los datos del corte solo se muestran si se registraron.
            deAltura && intervencion.reduccion_copa_pct === null
              ? null
              : {
                  etiqueta: 'Reducción de copa',
                  valor: intervencion.reduccion_copa_pct === null ? '—' : `${intervencion.reduccion_copa_pct} %`,
                },
            deAltura && intervencion.ramas_laterales_cortadas === null
              ? null
              : { etiqueta: 'Ramas laterales cortadas', valor: intervencion.ramas_laterales_cortadas ?? '—' },
            deAltura && intervencion.cantidad_solicitada === null
              ? null
              : { etiqueta: 'Cantidad solicitada', valor: cantidad(intervencion.cantidad_solicitada) },
            deAltura && intervencion.cantidad_ejecutada === null
              ? null
              : { etiqueta: 'Cantidad ejecutada', valor: cantidad(intervencion.cantidad_ejecutada) },
            { etiqueta: 'Prioridad', valor: intervencion.prioridad ?? '—' },
            intervencion.motivo ? { etiqueta: 'Motivo', valor: TEXTO_MOTIVO_PODA_ALTURA[intervencion.motivo] } : null,
            deAltura
              ? {
                  etiqueta: 'Altura de referencia',
                  valor:
                    intervencion.altura_referencia_m === null
                      ? 'Sin registrar'
                      : `${intervencion.altura_referencia_m} m`,
                }
              : null,
            intervencion.atencion_codigo
              ? {
                  etiqueta: 'Atención en Servicios tercerizados',
                  valor: `${intervencion.atencion_estado ?? 'Registrada'} · ${intervencion.atencion_codigo}`,
                  ancho: true,
                }
              : null,
            intervencion.justificacion
              ? { etiqueta: 'Por qué va al proveedor', valor: intervencion.justificacion, ancho: true }
              : null,
          ]}
        />
      </Tarjeta>

      {intervencion.motivo === 'PlantaMuerta' && <PlantaMuertaEjemplar intervencion={intervencion} />}

      {solicitada && puedeRegistrar && (
        <Tarjeta
          titulo="Registrar ejecución"
          descripcion="Cuando el proveedor termine, indica la fecha y añade la fotografía abajo."
          relleno="amplio"
        >
          <div className={estilos.busqueda}>
            <CampoFormulario
              id="fecha-ejecucion-altura"
              etiqueta="Fecha ejecutada"
              type="date"
              max={hoyLima()}
              value={fechaEjecucion}
              onChange={(evento) => setFechaEjecucion(evento.target.value)}
            />
            <Boton
              variante="primario"
              cargando={guardando}
              deshabilitado={!fechaEjecucion}
              onClick={() => void registrarEjecucion()}
            >
              Guardar fecha
            </Boton>
          </div>
        </Tarjeta>
      )}

      <Adjuntos
        entidad="intervencion"
        registroId={id}
        puedeAdjuntar={puedeRegistrar}
        onCambio={() => setVersion((actual) => actual + 1)}
      />

      <div className={estilos.acciones}>
        {intervencion.campana_id && (
          <Boton variante="primario" onClick={() => navegar(rutaCampanaPoda(intervencion.campana_id as number))}>
            Ver campaña
          </Boton>
        )}
        {puedeRegistrar && (
          <Boton variante="fantasma" deshabilitado={guardando} onClick={() => setConfirmar(true)}>
            Anular registro
          </Boton>
        )}
      </div>

      <DialogoConfirmacion
        abierto={confirmar}
        titulo="Anular registro"
        consecuencia="La poda dejará de contar en el avance de la campaña y en el historial del ejemplar."
        textoConfirmar="Anular"
        variante="destructivo"
        cargando={guardando}
        onConfirmar={() => void anular()}
        onCancelar={() => setConfirmar(false)}
      />
    </div>
  )
}
