// RF-FIT-005 · Registrar una observación de plaga
/**
 * Observación de presencia de plaga en un espacio o un ejemplar (uno de los dos), que justifica una
 * aplicación o su intensidad.
 *
 * - Lo pueden hacer los tres roles del módulo (el back-end lo vuelve a comprobar).
 * - No se edita: una corrección se registra como una observación nueva, nunca sobrescribiendo la anterior.
 */
import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import CampoFormulario, { AreaTexto, LeyendaObligatorio, ResumenErrores, type ErrorResumen } from '@/components/ui/CampoFormulario'
import Boton, { BotonEnlace } from '@/components/ui/Boton'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Selector from '@/components/ui/Selector'
import SelectorBuscable from '@/components/ui/SelectorBuscable'
import Tarjeta from '@/components/ui/Tarjeta'
import { puedeRegistrarObservacionPlaga } from '@/config/permisosMaestros'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_TERCERIZADOS, RUTAS_TERCERIZADOS } from '@/router/rutasApp'
import { listarPlagas, registrarObservacionPlaga } from '@/services/api/maestrosTercerizados'
import { listarAreasVerdes, listarEjemplares, listarTodo } from '@/services/api/tercerizados'
import { useRolTercerizados } from '@/sesion/ContextoSesion'
import type { AreaVerde, Ejemplar } from '@/types/tercerizados'
import { hoyLima } from '@/utils/instanteLima'
import {
  BORRADOR_OBSERVACION_VACIO,
  construirObservacion,
  hayErrores,
  validarObservacion,
  type BorradorObservacion,
  type ErroresObservacion,
} from '@/utils/validacionMaestros'
import AvisoFallo from './AvisoFallo'
import { enfocar, interpretarFallo, type FalloRegistro } from './fallosRegistro'
import type { EstadoNavegacionMaestros } from './filtrosMaestros'
import estilos from './Maestros.module.css'

const TITULO = 'Registrar observación de plaga'

const IDS = { plaga: 'observacion-plaga', descripcion: 'observacion-descripcion', fecha: 'observacion-fecha' } as const
const ORDEN: (keyof ErroresObservacion)[] = ['destino', 'plaga', 'descripcion', 'fecha']

/** Id del selector visible para el destino elegido (área verde o ejemplar), para enfocar su error. */
function idDestino(tipo: BorradorObservacion['tipoDestino']): string {
  return tipo === 'area' ? 'observacion-area' : 'observacion-ejemplar'
}

export default function ObservacionPlagaNuevaPage() {
  usePaginaActual(TITULO, [MIGAS_TERCERIZADOS.serviciosTercerizados, MIGAS_TERCERIZADOS.controlFitosanitario, { texto: 'Registrar observación' }])
  const rol = useRolTercerizados()
  const navegar = useNavigate()
  const hoy = hoyLima()

  const [borrador, setBorrador] = useState<BorradorObservacion>({ ...BORRADOR_OBSERVACION_VACIO, fecha: hoy })
  // Tras el primer intento de guardar, los errores se recalculan en vivo al corregir.
  const [intentado, setIntentado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [fallo, setFallo] = useState<FalloRegistro | null>(null)
  const enCurso = useRef(false)

  const plagas = useConsulta('plagas-activas', (signal) => listarTodo((page) => listarPlagas({ activo: true, page }, signal)))
  const opcionesPlaga = [
    { valor: '', texto: 'Selecciona la plaga' },
    ...(plagas.datos?.resultados ?? []).map((p) => ({ valor: String(p.id), texto: p.nombre })),
  ]

  if (!puedeRegistrarObservacionPlaga(rol)) {
    return (
      <EstadoVacio
        titulo="Tu usuario no tiene acceso a este módulo"
        descripcion="Pide al jefe de sección que revise tus roles."
        accion={
          <BotonEnlace to={RUTAS_TERCERIZADOS.observacionesPlagas} variante="secundario">
            Volver a observaciones de plagas
          </BotonEnlace>
        }
      />
    )
  }

  const errores = intentado ? validarObservacion(borrador, hoy) : {}
  const resumen: ErrorResumen[] = ORDEN.filter((clave) => errores[clave]).map((clave) => ({
    idCampo: clave === 'destino' ? idDestino(borrador.tipoDestino) : IDS[clave],
    mensaje: errores[clave] as string,
  }))

  function cambiar(cambios: Partial<BorradorObservacion>) {
    setBorrador((b) => ({ ...b, ...cambios }))
    setFallo(null)
  }

  async function guardar(evento?: FormEvent<HTMLFormElement>) {
    evento?.preventDefault()
    if (enCurso.current) return
    setIntentado(true)
    const nuevos = validarObservacion(borrador, hoy)
    const primero = ORDEN.find((clave) => nuevos[clave])
    if (primero) {
      enfocar(primero === 'destino' ? idDestino(borrador.tipoDestino) : IDS[primero])
      return
    }
    enCurso.current = true
    setEnviando(true)
    setFallo(null)
    try {
      await registrarObservacionPlaga(construirObservacion(borrador))
      navegar(RUTAS_TERCERIZADOS.observacionesPlagas, {
        replace: true,
        state: { aviso: 'Observación registrada.' } satisfies EstadoNavegacionMaestros,
      })
    } catch (causa) {
      setFallo(interpretarFallo(causa, 'registrar la observación'))
    } finally {
      enCurso.current = false
      setEnviando(false)
    }
  }

  return (
    <form className={estilos.formulario} onSubmit={guardar} noValidate aria-label={TITULO}>
      <p className={estilos.descripcion}>
        Registra lo observado en campo: ayuda a decidir si corresponde una aplicación o a ajustar su intensidad. No sustituye
        la evaluación técnica.
      </p>
      <LeyendaObligatorio />
      <ResumenErrores titulo={`Revisa ${resumen.length === 1 ? 'un campo' : `${resumen.length} campos`} antes de guardar`} errores={resumen} />

      <Tarjeta titulo="Espacio o ejemplar observado" relleno="amplio">
        <div className={estilos.cuadricula}>
          <Selector
            id="observacion-tipo-destino"
            etiqueta="Tipo de destino"
            obligatorio
            valor={borrador.tipoDestino}
            opciones={[
              { valor: 'area', texto: 'Área verde' },
              { valor: 'ejemplar', texto: 'Ejemplar' },
            ]}
            onCambiar={(valor) => cambiar({ tipoDestino: valor === 'ejemplar' ? 'ejemplar' : 'area', area: null, ejemplar: null })}
          />
          {borrador.tipoDestino === 'area' ? (
            <SelectorBuscable<AreaVerde>
              id="observacion-area"
              etiqueta="Área verde"
              obligatorio
              ayuda="Busca por nombre. Solo áreas activas."
              error={errores.destino}
              valor={borrador.area}
              claveDe={(a) => a.id}
              textoDe={(a) => a.nombre}
              buscar={(q, signal) => listarAreasVerdes({ q: q || undefined, activo: true }, signal)}
              onCambiar={(area) => cambiar({ area })}
            />
          ) : (
            <SelectorBuscable<Ejemplar>
              id="observacion-ejemplar"
              etiqueta="Ejemplar"
              obligatorio
              ayuda="Busca por código o por área verde"
              error={errores.destino}
              valor={borrador.ejemplar}
              claveDe={(e) => e.id}
              textoDe={(e) => e.codigo}
              detalleDe={(e) => e.area_verde_nombre ?? 'Sin área verde'}
              buscar={(q, signal) => listarEjemplares({ q: q || undefined }, signal)}
              onCambiar={(ejemplar) => cambiar({ ejemplar })}
            />
          )}
        </div>
      </Tarjeta>

      <Tarjeta titulo="Observación" relleno="amplio">
        <div className={estilos.cuadricula}>
          <Selector
            id={IDS.plaga}
            etiqueta="Plaga observada"
            obligatorio
            ayuda="Se elige del catálogo de plagas"
            valor={borrador.plagaId}
            opciones={opcionesPlaga}
            error={errores.plaga}
            bloqueadoMotivo={plagas.estado === 'error' ? 'No se pudo cargar el catálogo de plagas. Recarga la página' : undefined}
            onCambiar={(valor) => cambiar({ plagaId: valor })}
          />
          <CampoFormulario
            id={IDS.fecha}
            etiqueta="Fecha de la observación"
            obligatorio
            type="date"
            max={hoy}
            error={errores.fecha}
            value={borrador.fecha}
            onChange={(e) => cambiar({ fecha: e.target.value })}
          />
        </div>
        <AreaTexto
          id={IDS.descripcion}
          etiqueta="Descripción"
          obligatorio
          ayuda="Qué se observó: síntomas, extensión, intensidad. Hasta 500 caracteres."
          error={errores.descripcion}
          value={borrador.descripcion}
          onChange={(e) => cambiar({ descripcion: e.target.value })}
        />
      </Tarjeta>

      {fallo && <AvisoFallo fallo={fallo} onReintentar={() => void guardar()} />}

      <div className={estilos.botones}>
        <Boton
          type="submit"
          variante="primario"
          cargando={enviando}
          deshabilitado={intentado && hayErrores(errores)}
          ayudaDeshabilitado="Completa los campos señalados para poder guardar"
          onClickDeshabilitado={() => void guardar()}
        >
          Registrar observación
        </Boton>
        <BotonEnlace to={RUTAS_TERCERIZADOS.observacionesPlagas} variante="secundario">
          Cancelar
        </BotonEnlace>
      </div>
    </form>
  )
}
