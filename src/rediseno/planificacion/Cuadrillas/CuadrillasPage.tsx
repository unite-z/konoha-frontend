/**
 * Cuadrillas (RD-34): calendario semanal por cuadrilla con encargos arrastrables y vista «Lista». Fondo liso, sin mapa.
 * Mover un encargo de día abre `DialogoReprogramar` (justificación obligatoria); de cuadrilla, pide confirmación y usa
 * `PUT`. Solo quien gestiona cuadrillas mueve; el capataz ve la suya en lectura. El encargo abierto vive en `?encargo_id=`.
 */
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import AvisoTemporal from '@/design-system/AvisoTemporal'
import Boton from '@/design-system/Boton'
import DialogoConfirmacion from '@/design-system/DialogoConfirmacion'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import Pestanas from '@/design-system/Pestanas'
import { PERMISOS } from '@/config/permisosCore'
import { tiene } from '@/config/permisosSesion'
import { useConsulta } from '@/hooks/useConsulta'
import { DialogoReprogramar } from '@/pages/operacion-campo/DialogoReprogramar'
import { useMutacionCampo } from '@/pages/operacion-campo/useCampo'
import { sumarDias } from '@/pages/planificacion/resumen/resumenPlanificacion'
import { usePermisos } from '@/sesion/ContextoSesion'
import type { EncargoCampo } from '@/types/operacionCampo'
import { formatearFecha } from '@/utils/formato'
import { hoyLima } from '@/utils/instanteLima'
import { esJefeCampo, puedeReprogramarEncargo } from '@/utils/operacionCampo'
import { estiloTransicion, nombresTransicion, transicionar, useFocoConLaVista } from '@/rediseno/base/movimiento'
import { useParametroPanel } from '@/rediseno/base/PanelLateral/useParametroPanel'
import { cambiarDeCuadrilla, listarCuadrillas, listarEncargosDeSemana } from './api'
import CalendarioSemanal from './CalendarioSemanal'
import estilos from './Cuadrillas.module.css'
import ListaEncargos from './ListaEncargos'
import PanelEncargo from './PanelEncargo'
import { DIAS_SEMANA, fechasDesplazadas, hayMovimiento, semanaPedida, type MovimientoEncargo } from './semana'

export const PARAMETRO_ENCARGO = 'encargo_id'
const PARAMETRO_VISTA = 'vista'
const PARAMETRO_SEMANA = 'semana'

interface CambioDeCuadrilla {
  encargo: EncargoCampo
  movimiento: MovimientoEncargo
  nombre: string
}

export default function CuadrillasPage() {
  const permisos = usePermisos()
  const puedeVer = tiene(permisos, PERMISOS.consultarCuadrillas)
  const jefe = esJefeCampo(permisos)
  const [parametros, setParametros] = useSearchParams()
  const panel = useParametroPanel(PARAMETRO_ENCARGO)
  const foco = useFocoConLaVista<HTMLHeadingElement>()
  const mutacion = useMutacionCampo()
  const [version, setVersion] = useState(0)
  const [cancelados, setCancelados] = useState(0)
  const [aviso, setAviso] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState<CambioDeCuadrilla | null>(null)
  const [reprogramando, setReprogramando] = useState<{ encargo: EncargoCampo; dias: number } | null>(null)

  const hoy = hoyLima()
  const lunes = semanaPedida(parametros.get(PARAMETRO_SEMANA), hoy)
  const domingo = sumarDias(lunes, DIAS_SEMANA - 1)
  const vista = parametros.get(PARAMETRO_VISTA) === 'lista' ? 'lista' : 'semana'
  const idAbierto = /^\d{1,9}$/.test(panel.valor ?? '') ? Number(panel.valor) : null

  const cuadrillas = useConsulta(puedeVer ? 'rd-cuadrillas' : null, listarCuadrillas)
  const encargos = useConsulta(
    puedeVer && vista === 'semana' ? `rd-cuadrillas-semana:${lunes}:${version}` : null,
    (signal) => listarEncargosDeSemana(lunes, domingo, signal),
  )

  function cambiarParametros(cambios: Record<string, string | null>) {
    const nuevos = new URLSearchParams(parametros)
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor === null) nuevos.delete(clave)
      else nuevos.set(clave, valor)
    }
    setParametros(nuevos, { replace: true })
  }
  const irASemana = (fecha: string) => transicionar(() => cambiarParametros({ [PARAMETRO_SEMANA]: fecha }))
  const abrir = (id: number) => transicionar(() => panel.abrir(String(id)))
  const cancelarMovimiento = () => setCancelados((n) => n + 1)

  function pedirMovimiento(encargo: EncargoCampo, movimiento: MovimientoEncargo) {
    if (!jefe || !puedeReprogramarEncargo(encargo.estado)) return
    if (!hayMovimiento(encargo, movimiento)) return cancelarMovimiento()
    if (movimiento.cuadrillaId !== encargo.cuadrilla_id) {
      const nombre = cuadrillas.datos?.find((c) => c.id === movimiento.cuadrillaId)?.nombre ?? 'la cuadrilla elegida'
      setConfirmando({ encargo, movimiento, nombre })
    } else {
      setReprogramando({ encargo, dias: movimiento.dias })
    }
  }

  function confirmarCuadrilla() {
    if (!confirmando) return
    const { encargo, movimiento, nombre } = confirmando
    void mutacion.enviar(
      () => cambiarDeCuadrilla(encargo, movimiento.cuadrillaId),
      () => {
        setConfirmando(null)
        setVersion((v) => v + 1)
        setAviso(`El encargo pasó a ${nombre}.`)
        // Si además cambió de día, la reprogramación sigue pidiendo su justificación.
        if (movimiento.dias !== 0) {
          setReprogramando({
            encargo: { ...encargo, cuadrilla_id: movimiento.cuadrillaId, cuadrilla_nombre: nombre },
            dias: movimiento.dias,
          })
        }
      },
    )
  }

  if (!puedeVer) {
    return (
      <div className={estilos.pagina}>
        <EstadoSinAcceso
          titulo="No puedes ver las cuadrillas"
          descripcion="Tu cuenta no tiene permiso para consultar cuadrillas y encargos."
        />
      </div>
    )
  }

  const sinAcceso = [cuadrillas, encargos].some((c) => c.error?.estado === 403 && !c.datos)
  const conError = [cuadrillas, encargos].find((c) => c.estado === 'error' && !c.datos)
  const listaCuadrillas = cuadrillas.datos ?? []
  const listaEncargos = encargos.datos ?? []

  let calendario
  if (sinAcceso) {
    calendario = (
      <EstadoSinAcceso
        nivel={3}
        titulo="No puedes ver el calendario"
        descripcion="El servidor no permite consultar los encargos con tu cuenta."
      />
    )
  } else if (conError) {
    calendario = (
      <EstadoError
        nivel={3}
        titulo="No pudimos cargar el calendario"
        descripcion={conError.error?.detalle ?? ''}
        onReintentar={() => {
          cuadrillas.reintentar()
          encargos.reintentar()
        }}
      />
    )
  } else if (!cuadrillas.datos || !encargos.datos) {
    calendario = <EstadoCarga forma="tarjetas" texto="Cargando el calendario…" />
  } else if (listaEncargos.length === 0) {
    calendario = (
      <EstadoVacio
        nivel={3}
        titulo="No hay encargos esta semana"
        descripcion="Cuando haya encargos con periodo o plazo en estos días aparecerán en la fila de su cuadrilla."
      />
    )
  } else {
    calendario = (
      <div className={estilos.contenedorCalendario}>
        <CalendarioSemanal
          lunes={lunes}
          hoy={hoy}
          cuadrillas={listaCuadrillas}
          encargos={listaEncargos}
          puedeMover={jefe}
          abierto={idAbierto}
          onAbrir={abrir}
          onMover={pedirMovimiento}
          versionCancelada={cancelados}
        />
      </div>
    )
  }

  const navegacion = (
    <div className={estilos.navegacionSemana}>
      <Boton
        variante="secundario"
        compacto
        icono="chevron-left"
        onClick={() => irASemana(sumarDias(lunes, -DIAS_SEMANA))}
      >
        <span className="sr-only">Semana anterior</span>
      </Boton>
      <span className={estilos.rotuloSemana}>
        {formatearFecha(lunes)} — {formatearFecha(domingo)}
      </span>
      <Boton
        variante="secundario"
        compacto
        icono="chevron-right"
        onClick={() => irASemana(sumarDias(lunes, DIAS_SEMANA))}
      >
        <span className="sr-only">Semana siguiente</span>
      </Boton>
      <Boton variante="fantasma" compacto onClick={() => irASemana(hoy)}>
        Hoy
      </Boton>
    </div>
  )

  return (
    <div className={estilos.pagina}>
      <header
        className={estilos.encabezado}
        style={estiloTransicion(nombresTransicion.encabezado)} /* estilo-calculado */
      >
        <h1 ref={foco} tabIndex={-1}>
          Cuadrillas
        </h1>
        <p>
          {jefe
            ? 'Encargos de la semana por cuadrilla. Arrástralos a otro día o cuadrilla, o muévelos con Alt y las flechas.'
            : 'Encargos de la semana de tu cuadrilla, en solo lectura.'}
        </p>
      </header>
      {mutacion.error && <AvisoEnLinea tono="error">{mutacion.error.detalle}</AvisoEnLinea>}
      <div className={estilos.vistas}>
        <Pestanas
          etiqueta="Vista de los encargos"
          pestanas={[
            { valor: 'semana', texto: 'Semana' },
            { valor: 'lista', texto: 'Lista' },
          ]}
          valor={vista}
          onCambiar={(v) =>
            transicionar(() => cambiarParametros({ [PARAMETRO_VISTA]: v === 'lista' ? 'lista' : null }))
          }
          barra={vista === 'semana' ? navegacion : undefined}
        >
          {vista === 'semana' ? (
            <div className={estilos.vidrio}>{calendario}</div>
          ) : (
            <ListaEncargos key={version} abierto={idAbierto} onAbrir={abrir} />
          )}
        </Pestanas>
      </div>
      {idAbierto !== null && (
        <PanelEncargo
          id={idAbierto}
          cargados={listaEncargos}
          cuadrillas={listaCuadrillas}
          puedeMover={jefe}
          onCerrar={panel.cerrar}
          onMover={pedirMovimiento}
        />
      )}
      <DialogoConfirmacion
        abierto={confirmando !== null}
        titulo={`Pasar el encargo a ${confirmando?.nombre ?? ''}`}
        consecuencia="El encargo cambia de cuadrilla y de capataz responsable."
        textoConfirmar="Cambiar de cuadrilla"
        cargando={mutacion.enviando}
        onConfirmar={confirmarCuadrilla}
        onCancelar={() => {
          setConfirmando(null)
          cancelarMovimiento()
        }}
      />
      {reprogramando && (
        <DialogoReprogramar
          encargo={reprogramando.encargo}
          propuesta={fechasDesplazadas(reprogramando.encargo, reprogramando.dias)}
          onCerrar={() => {
            setReprogramando(null)
            cancelarMovimiento()
          }}
          onGuardado={() => {
            setReprogramando(null)
            setVersion((v) => v + 1)
            setAviso('El encargo se reprogramó correctamente.')
          }}
        />
      )}
      <AvisoTemporal mensaje={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}
