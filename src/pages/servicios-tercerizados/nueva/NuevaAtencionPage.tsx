// RF-SER-003 y RF-SER-011 · Registrar una atención tercerizada
/**
 * Asistente de 3 pasos (Guía Web 5.13, figura 15): contrato y origen → espacios y ejemplares → revisión.
 *
 * - Solo el jefe de sección registra atenciones (el back-end lo vuelve a comprobar).
 * - No hay borradores en el servidor (TODO del plan): los datos viven en esta pantalla. Al salir con cambios
 *   se pide confirmar el descarte (navegación interna y cierre o recarga de la pestaña).
 * - Validación por paso al pulsar «Siguiente»; el foco va al primer campo con error.
 * - Envío no idempotente: un reintento puede duplicar la atención. Si se pierde la conexión al registrar, no se
 *   reintenta solo: se pide revisar la bandeja antes de volver a intentarlo.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useBlocker, useNavigate } from 'react-router'
import AsistentePasos from '../../../components/ui/AsistentePasos'
import AvisoEnLinea from '../../../components/ui/AvisoEnLinea'
import Boton, { BotonEnlace } from '../../../components/ui/Boton'
import { LeyendaObligatorio, ResumenErrores, type ErrorResumen } from '../../../components/ui/CampoFormulario'
import DialogoConfirmacion from '../../../components/ui/DialogoConfirmacion'
import EstadoVacio from '../../../components/ui/EstadoVacio'
import { puedeRegistrarAtencion } from '../../../config/permisosTercerizados'
import { useConsulta } from '../../../hooks/useConsulta'
import { usePaginaActual } from '../../../hooks/usePaginaActual'
import { MIGAS_TERCERIZADOS, RUTAS_TERCERIZADOS, rutaDetalleAtencion } from '../../../router/rutasApp'
import { aErrorApi } from '../../../services/api/cliente'
import {
  crearAtencion,
  listarAreasVerdes,
  listarTiposServicio,
  listarTodo,
  listarUnidadesMedida,
} from '../../../services/api/tercerizados'
import { useSesionTercerizados } from '../../../sesion/ContextoSesionTercerizados'
import { hoyLima } from '../../../utils/instanteLima'
import {
  BORRADOR_VACIO,
  construirEntrada,
  hayCambiosBorrador,
  hayErroresPaso2,
  pasoDeCampo,
  validarPaso1,
  validarPaso2,
  type BorradorAtencion,
  type ErroresPaso1,
  type ErroresPaso2,
} from '../../../utils/nuevaAtencion'
import { ID_LISTA_SELECCIONADOS, IDS_PASO1 } from './idsCampos'
import PasoAlcances from './PasoAlcances'
import PasoContratoOrigen from './PasoContratoOrigen'
import PasoRevision from './PasoRevision'
import estilos from './NuevaAtencion.module.css'

const TITULO = 'Nueva atención tercerizada'
const PASOS = ['Contrato y origen', 'Espacios y ejemplares', 'Revisión y registro']

/** Estado que recibe la ficha tras registrar (aviso de confirmación). */
export interface EstadoNavegacionRegistro {
  aviso: string
}

/** Nombre legible de un campo que rechace el servidor (sus mensajes pueden venir en inglés). */
const NOMBRE_CAMPO: Record<string, string> = {
  contrato_id: 'contrato',
  descripcion: 'descripción',
  origen: 'origen',
  unidad_solicitante_id: 'unidad solicitante',
  unidad_provisional: 'nombre de la unidad',
  es_riesgo: 'marca de riesgo',
  alcances: 'espacios y ejemplares',
}

function nombreCampo(campo: string): string {
  return NOMBRE_CAMPO[campo.split(/[.[]/)[0]] ?? campo
}

type ErrorRegistro =
  | { tipo: 'desconocido' }
  | { tipo: 'campos'; campos: string[] }
  | { tipo: 'mensaje'; titulo: string; detalle: string }

const ERRORES_PASO2_VACIOS: ErroresPaso2 = { porAlcance: {} }

function enfocar(id: string) {
  window.setTimeout(() => document.getElementById(id)?.focus(), 0)
}

export default function NuevaAtencionPage() {
  usePaginaActual(TITULO, [MIGAS_TERCERIZADOS.serviciosTercerizados, MIGAS_TERCERIZADOS.atenciones, { texto: 'Nueva' }])
  const { estado: sesion } = useSesionTercerizados()
  const rol = sesion.tipo === 'activa' ? sesion.usuario.rol : null
  const navegar = useNavigate()

  const [borrador, setBorrador] = useState<BorradorAtencion>(BORRADOR_VACIO)
  const [paso, setPaso] = useState(0)
  const [alcanzado, setAlcanzado] = useState(0)
  // Tras el primer intento de avanzar, los errores del paso se recalculan en vivo al corregir.
  const [intentado, setIntentado] = useState<[boolean, boolean]>([false, false])
  const [enviando, setEnviando] = useState(false)
  const [errorRegistro, setErrorRegistro] = useState<ErrorRegistro | null>(null)
  const enCurso = useRef(false)
  const registrada = useRef(false)

  // Catálogos pequeños para el formulario (servicio del contrato, unidades de medida y áreas del filtro).
  const tipos = useConsulta('tipos-servicio', (signal) => listarTodo((page) => listarTiposServicio({ page }, signal)))
  const unidades = useConsulta('unidades-medida', (signal) => listarTodo((page) => listarUnidadesMedida({ page }, signal)))
  const areas = useConsulta('areas-activas', (signal) => listarTodo((page) => listarAreasVerdes({ activo: true, page }, signal)))
  const servicio = tipos.datos?.resultados.find((t) => t.id === borrador.contrato?.tipo_servicio_id) ?? null

  const errores1: ErroresPaso1 = intentado[0] ? validarPaso1(borrador, hoyLima()) : {}
  const errores2: ErroresPaso2 = intentado[1] ? validarPaso2(borrador.alcances) : ERRORES_PASO2_VACIOS
  const hayCambios = hayCambiosBorrador(borrador)
  const bloqueo = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hayCambios && !registrada.current && currentLocation.pathname !== nextLocation.pathname,
  )

  // Cerrar o recargar la pestaña con cambios: aviso del navegador.
  useEffect(() => {
    if (!hayCambios) return
    const avisar = (evento: BeforeUnloadEvent) => {
      if (registrada.current) return
      evento.preventDefault()
    }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [hayCambios])

  const cambiar = useCallback((cambios: Partial<BorradorAtencion>) => {
    setBorrador((b) => ({ ...b, ...cambios }))
    setErrorRegistro(null)
  }, [])

  if (!puedeRegistrarAtencion(rol)) {
    return (
      <EstadoVacio
        titulo="Solo el jefe de sección registra atenciones"
        descripcion="Puedes consultar las atenciones y registrar la orden de compra, el inicio y el fin desde su ficha."
        accion={
          <BotonEnlace to={RUTAS_TERCERIZADOS.atenciones} variante="secundario">
            Ir a la bandeja
          </BotonEnlace>
        }
      />
    )
  }

  function irA(indice: number) {
    setPaso(indice)
    setAlcanzado((a) => Math.max(a, indice))
    window.scrollTo({ top: 0 })
  }

  /** Valida el paso actual; devuelve `true` si se puede avanzar. */
  function validarPasoActual(indice = paso): boolean {
    setIntentado((i) => (indice === 0 ? [true, i[1]] : indice === 1 ? [i[0], true] : i))
    if (indice === 0) {
      const nuevos = validarPaso1(borrador, hoyLima())
      const primero = (Object.keys(IDS_PASO1) as (keyof ErroresPaso1)[]).find((k) => nuevos[k])
      if (primero) {
        enfocar(IDS_PASO1[primero])
        return false
      }
      return true
    }
    if (indice === 1) {
      const nuevos = validarPaso2(borrador.alcances)
      if (hayErroresPaso2(nuevos)) {
        const clave = Object.keys(nuevos.porAlcance)[0]
        enfocar(nuevos.general ? ID_LISTA_SELECCIONADOS : `alcance-${clave.replace(':', '-')}-${nuevos.porAlcance[clave].metrado ? 'metrado' : 'unidad'}`)
        return false
      }
      return true
    }
    return true
  }

  function siguiente() {
    if (validarPasoActual()) irA(paso + 1)
  }

  async function registrar() {
    if (enCurso.current) return
    // Revalida todo: el usuario pudo editar un paso anterior desde la revisión.
    if (!validarPasoActual(0)) return irA(0)
    if (!validarPasoActual(1)) return irA(1)
    enCurso.current = true
    setEnviando(true)
    setErrorRegistro(null)
    try {
      const atencion = await crearAtencion(construirEntrada(borrador))
      registrada.current = true
      navegar(rutaDetalleAtencion(atencion.id), {
        replace: true,
        state: { aviso: 'Atención registrada. Queda pendiente la orden de compra de Logística.' } satisfies EstadoNavegacionRegistro,
      })
    } catch (causa) {
      const fallo = aErrorApi(causa)
      if (fallo.estado === 0) setErrorRegistro({ tipo: 'desconocido' })
      else if (fallo.estado === 403) {
        setErrorRegistro({ tipo: 'mensaje', titulo: 'Sin permiso', detalle: 'Tu usuario no puede registrar atenciones. Si cambiaron tus roles, vuelve a ingresar.' })
      } else if (Object.keys(fallo.errores_campo).length > 0) {
        setErrorRegistro({ tipo: 'campos', campos: Object.keys(fallo.errores_campo) })
      } else {
        setErrorRegistro({ tipo: 'mensaje', titulo: 'No se pudo registrar la atención', detalle: fallo.detalle })
      }
      enfocar('nueva-error-registro')
    } finally {
      enCurso.current = false
      setEnviando(false)
    }
  }

  const resumen: ErrorResumen[] =
    paso === 0
      ? (Object.keys(IDS_PASO1) as (keyof ErroresPaso1)[])
          .filter((k) => errores1[k])
          .map((k) => ({ idCampo: IDS_PASO1[k], mensaje: errores1[k] as string }))
      : []

  return (
    <div className={estilos.pagina}>
      <AsistentePasos pasos={PASOS} actual={paso} alcanzado={alcanzado} onIrA={(i) => (i < paso || validarPasoActual() ? irA(i) : undefined)} />

      <div className={estilos.contenedorPaso}>
        <h2 className="sr-only" aria-live="polite">
          Paso {paso + 1} de {PASOS.length}: {PASOS[paso]}
        </h2>
        {paso === 0 && <LeyendaObligatorio />}
        {paso === 0 && <ResumenErrores titulo={`Revisa ${resumen.length === 1 ? 'un campo' : `${resumen.length} campos`} antes de continuar`} errores={resumen} />}

        {paso === 0 && <PasoContratoOrigen borrador={borrador} cambiar={cambiar} errores={errores1} servicio={servicio} />}
        {paso === 1 && (
          <PasoAlcances
            alcances={borrador.alcances}
            onCambiar={(alcances) => cambiar({ alcances })}
            errores={errores2}
            unidadesMedida={unidades.datos?.resultados ?? []}
            areas={areas.datos?.resultados ?? []}
          />
        )}
        {paso === 2 && (
          <PasoRevision borrador={borrador} servicio={servicio} unidadesMedida={unidades.datos?.resultados ?? []} onEditar={irA} />
        )}

        {paso === 1 && (unidades.estado === 'error' || areas.estado === 'error') && (
          <AvisoEnLinea tono="advertencia" titulo="Faltan datos de apoyo" accion={{ texto: 'Reintentar', onClick: () => { unidades.reintentar(); areas.reintentar() } }}>
            No se pudieron cargar las unidades de medida o las áreas del filtro. Puedes seleccionar sin metrado o reintentar.
          </AvisoEnLinea>
        )}

        {paso === 2 && errorRegistro && (
          <div id="nueva-error-registro" tabIndex={-1} className={estilos.errorRegistro}>
            {errorRegistro.tipo === 'desconocido' ? (
              <AvisoEnLinea tono="advertencia" titulo="No pudimos confirmar el registro">
                <p>
                  Se perdió la conexión con el servidor y no sabemos si la atención se registró. Antes de reintentar, revisa
                  la bandeja para no duplicarla.
                </p>
                <p>
                  <a
                    href={`${RUTAS_TERCERIZADOS.atenciones}?q=${encodeURIComponent(borrador.descripcion.trim().slice(0, 100))}`}
                    target="_blank"
                    rel="noopener"
                  >
                    Revisar la bandeja en otra pestaña
                  </a>
                </p>
              </AvisoEnLinea>
            ) : errorRegistro.tipo === 'campos' ? (
              <AvisoEnLinea tono="error" titulo="El servidor rechazó algunos datos">
                <p>Revisa: {[...new Set(errorRegistro.campos.map(nombreCampo))].join(', ')}.</p>
                <p>
                  <Boton variante="terciario" compacto onClick={() => irA(Math.min(...errorRegistro.campos.map(pasoDeCampo)) - 1)}>
                    Ir al paso con datos por revisar
                  </Boton>
                </p>
              </AvisoEnLinea>
            ) : (
              <AvisoEnLinea tono="error" titulo={errorRegistro.titulo}>
                {errorRegistro.detalle}
              </AvisoEnLinea>
            )}
          </div>
        )}
      </div>

      <div className={estilos.navegacion}>
        {paso === 0 ? (
          <BotonEnlace to={RUTAS_TERCERIZADOS.atenciones} variante="terciario">
            Cancelar
          </BotonEnlace>
        ) : (
          <Boton variante="terciario" onClick={() => irA(paso - 1)} deshabilitado={enviando}>
            Atrás
          </Boton>
        )}
        {paso < PASOS.length - 1 ? (
          <Boton onClick={siguiente}>Siguiente</Boton>
        ) : (
          <Boton onClick={registrar} cargando={enviando}>
            {errorRegistro?.tipo === 'desconocido' ? 'Reintentar registro' : 'Registrar atención'}
          </Boton>
        )}
      </div>

      <DialogoConfirmacion
        abierto={bloqueo.state === 'blocked'}
        titulo="Descartar la nueva atención"
        consecuencia="Se perderán los datos ingresados: las atenciones no se guardan como borrador."
        textoConfirmar="Descartar y salir"
        variante="destructivo"
        onConfirmar={() => bloqueo.proceed?.()}
        onCancelar={() => bloqueo.reset?.()}
      />
    </div>
  )
}
