/**
 * Cuadrillas (RD-34): calendario semanal por cuadrilla con encargos arrastrables y vista «Lista». Fondo liso, sin mapa.
 * Mover un encargo de día abre `DialogoReprogramar` (justificación obligatoria); de cuadrilla, pide confirmación y usa
 * `PUT`. Solo quien gestiona cuadrillas mueve y registra encargos; el capataz ve la suya en lectura y cambia el estado de
 * los suyos desde el panel. El encargo abierto vive en `?encargo_id=` y el alta en `?encargo=nuevo&area=` (RD-35).
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
import FormularioEncargo from '../Encargo/FormularioEncargo'
import PanelEncargo from '../Encargo/PanelEncargo'
import { PARAMETRO_AREA_ENCARGO, PARAMETRO_ENCARGO, PARAMETRO_ENCARGO_NUEVO, VALOR_ENCARGO_NUEVO } from '../enlaces'
import { cambiarDeCuadrilla, listarCuadrillas, listarEncargosDeSemana } from './api'
import CalendarioSemanal from './CalendarioSemanal'
import estilos from './Cuadrillas.module.css'
import ListaEncargos from './ListaEncargos'
import { DIAS_SEMANA, fechasDesplazadas, hayMovimiento, semanaPedida, type MovimientoEncargo } from './semana'

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
  const puedeVerIncidencia =
    tiene(permisos, PERMISOS.consultarPlanificacion) && tiene(permisos, PERMISOS.registrarIncidencia)
  const [parametros, setParametros] = useSearchParams()
  const panel = useParametroPanel(PARAMETRO_ENCARGO)
  const foco = useFocoConLaVista<HTMLHeadingElement>()
  const mutacion = useMutacionCampo()
  const [version, setVersion] = useState(0)
  const [cancelados, setCancelados] = useState(0)
  const [aviso, setAviso] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState<CambioDeCuadrilla | null>(null)
  const [reprogramando, setReprogramando] = useState<{
    encargo: EncargoCampo
    dias: number
    pedido: number
  } | null>(null)

  const hoy = hoyLima()
  const lunes = semanaPedida(parametros.get(PARAMETRO_SEMANA), hoy)
  const domingo = sumarDias(lunes, DIAS_SEMANA - 1)
  const vista = parametros.get(PARAMETRO_VISTA) === 'lista' ? 'lista' : 'semana'
  const idAbierto = /^\d{1,9}$/.test(panel.valor ?? '') ? Number(panel.valor) : null
  const altaAbierta = jefe && parametros.get(PARAMETRO_ENCARGO_NUEVO) === VALOR_ENCARGO_NUEVO
  const areaPedida = /^\d{1,9}$/.test(parametros.get(PARAMETRO_AREA_ENCARGO) ?? '')
    ? Number(parametros.get(PARAMETRO_AREA_ENCARGO))
    : null

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
  const abrirAlta = () => transicionar(() => cambiarParametros({ [PARAMETRO_ENCARGO_NUEVO]: VALOR_ENCARGO_NUEVO }))
  const cerrarAlta = () =>
    cambiarParametros({
      [PARAMETRO_ENCARGO_NUEVO]: null,
      [PARAMETRO_AREA_ENCARGO]: null,
    })
  function encargoGuardado(guardado: Partial<EncargoCampo>) {
    setVersion((v) => v + 1)
    setAviso('El encargo se registró correctamente.')
    // Con el encargo nuevo a mano, su panel se abre solo; si el servidor no devuelve el id, se cierra el alta.
    cambiarParametros({
      [PARAMETRO_ENCARGO_NUEVO]: null,
      [PARAMETRO_AREA_ENCARGO]: null,
      ...(guardado.id ? { [PARAMETRO_ENCARGO]: String(guardado.id) } : {}),
    })
  }
  function encargoCambiado(mensaje: string) {
    setVersion((v) => v + 1)
    setAviso(mensaje)
  }

  function pedirMovimiento(encargo: EncargoCampo, movimiento: MovimientoEncargo) {
    if (!jefe || !puedeReprogramarEncargo(encargo.estado)) return
    if (!hayMovimiento(encargo, movimiento)) return cancelarMovimiento()
    if (movimiento.cuadrillaId !== encargo.cuadrilla_id) {
      const nombre = cuadrillas.datos?.find((c) => c.id === movimiento.cuadrillaId)?.nombre ?? 'la cuadrilla elegida'
      setConfirmando({ encargo, movimiento, nombre })
    } else {
      setReprogramando({ encargo, dias: movimiento.dias, pedido: Date.now() })
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
            encargo: {
              ...encargo,
              cuadrilla_id: movimiento.cuadrillaId,
              cuadrilla_nombre: nombre,
            },
            dias: movimiento.dias,
            pedido: Date.now(),
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
        <div className={estilos.barra}>
          <h1 ref={foco} tabIndex={-1}>
            Cuadrillas
          </h1>
          {jefe && (
            <Boton icono="plus" onClick={abrirAlta}>
              Encargo
            </Boton>
          )}
        </div>
        <p>
          {jefe
            ? 'Encargos de la semana por cuadrilla. Arrástralos a otro día o cuadrilla, o muévelos con Alt y las flechas.'
            : 'Encargos de la semana por cuadrilla, en solo lectura.'}
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
            transicionar(() =>
              cambiarParametros({
                [PARAMETRO_VISTA]: v === 'lista' ? 'lista' : null,
              }),
            )
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
          cargados={vista === 'semana' ? (encargos.datos ?? (encargos.estado === 'error' ? [] : null)) : []}
          cuadrillas={listaCuadrillas}
          puedeMover={jefe}
          puedeVerIncidencia={puedeVerIncidencia}
          onCerrar={panel.cerrar}
          onMover={pedirMovimiento}
          onCambio={encargoCambiado}
        />
      )}
      {altaAbierta && (
        <FormularioEncargo actual={null} areaInicial={areaPedida} onCerrar={cerrarAlta} onGuardado={encargoGuardado} />
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
          // Cada movimiento monta un diálogo nuevo: si el navegador lo cerró sin avisar (Escape repetido), no se reutiliza.
          key={reprogramando.pedido}
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
