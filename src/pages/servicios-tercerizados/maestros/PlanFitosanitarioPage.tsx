// RF-FIT-001 · Plan fitosanitario estacional
/**
 * Programa hasta cuatro aplicaciones fitosanitarias sobre el campus, una por estación (RN-010: una
 * aplicación por estación; los ejemplares con atención especial reciben sus adicionales aparte).
 *
 * - Solo el jefe de sección lo programa (el back-end lo vuelve a comprobar).
 * - Los espacios y ejemplares se eligen una sola vez y se repiten en cada aplicación que se programe.
 * - Si falta alguna estación, hace falta un motivo para confirmar igual (RN-010). El servidor también
 *   avisa si una fecha coincide con el calendario de restricciones de Planificación.
 * - Cada estación programada genera su propio requerimiento (atención), visible en la bandeja.
 */
import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton, { BotonEnlace } from '@/components/ui/Boton'
import CampoFormulario, { AreaTexto, LeyendaObligatorio, ResumenErrores, type ErrorResumen } from '@/components/ui/CampoFormulario'
import EstadoVacio from '@/components/ui/EstadoVacio'
import ListaDescripcion from '@/components/ui/ListaDescripcion'
import SelectorBuscable from '@/components/ui/SelectorBuscable'
import Tarjeta from '@/components/ui/Tarjeta'
import { puedeRegistrarAtencion } from '@/config/permisosTercerizados'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_TERCERIZADOS, RUTAS_TERCERIZADOS } from '@/router/rutasApp'
import PasoAlcances from '@/pages/servicios-tercerizados/nueva/PasoAlcances'
import { listarContratosMaestro, programarPlanFitosanitario } from '@/services/api/maestrosTercerizados'
import { listarAreasVerdes, listarTodo, listarUnidadesMedida } from '@/services/api/tercerizados'
import { usePermisos } from '@/sesion/ContextoSesion'
import type { ContratoMaestro } from '@/types/maestrosTercerizados'
import { SIN_VALOR } from '@/utils/formato'
import { hoyLima } from '@/utils/instanteLima'
import { hayErroresPaso2, validarPaso2, type ErroresPaso2 } from '@/utils/nuevaAtencion'
import {
  BORRADOR_PLAN_VACIO,
  construirPlan,
  ESTACIONES,
  estacionesProgramadas,
  validarPlan,
  type BorradorPlanFitosanitario,
} from '@/utils/planFitosanitario'
import { interpretarFallo, type FalloRegistro } from './fallosRegistro'
import AvisoFallo from './AvisoFallo'
import estilos from './Maestros.module.css'

const TITULO = 'Plan fitosanitario estacional'
const ERRORES_ALCANCES_VACIOS: ErroresPaso2 = { porAlcance: {} }

function detalleContrato(c: ContratoMaestro) {
  return c.proveedor_nombre ?? SIN_VALOR
}

export default function PlanFitosanitarioPage() {
  usePaginaActual(TITULO, [MIGAS_TERCERIZADOS.serviciosTercerizados, MIGAS_TERCERIZADOS.controlFitosanitario, { texto: 'Plan estacional' }])
  const permisos = usePermisos()
  const navegar = useNavigate()

  const [borrador, setBorrador] = useState<BorradorPlanFitosanitario>(BORRADOR_PLAN_VACIO)
  const [intentado, setIntentado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [fallo, setFallo] = useState<FalloRegistro | null>(null)
  const enCurso = useRef(false)

  const unidades = useConsulta('unidades-medida', (signal) => listarTodo((page) => listarUnidadesMedida({ page }, signal)))
  const areas = useConsulta('areas-activas', (signal) => listarTodo((page) => listarAreasVerdes({ activo: true, page }, signal)))

  if (!puedeRegistrarAtencion(permisos)) {
    return (
      <EstadoVacio
        titulo="Solo el jefe de sección programa el plan fitosanitario"
        descripcion="Puedes consultar los ejemplares con atención especial desde Control fitosanitario."
        accion={
          <BotonEnlace to={RUTAS_TERCERIZADOS.controlFitosanitario} variante="secundario">
            Ir a control fitosanitario
          </BotonEnlace>
        }
      />
    )
  }

  const errores = intentado ? validarPlan(borrador, hoyLima()) : {}
  const erroresAlcances = intentado ? validarPaso2(borrador.alcances) : ERRORES_ALCANCES_VACIOS
  const resumen: ErrorResumen[] = [
    errores.contrato && { idCampo: 'plan-contrato', mensaje: errores.contrato },
    errores.motivo && { idCampo: 'plan-motivo', mensaje: errores.motivo },
    erroresAlcances.general && { idCampo: 'lista-seleccionados', mensaje: erroresAlcances.general },
  ].filter((e): e is ErrorResumen => Boolean(e))
  const faltanEstaciones = estacionesProgramadas(borrador).length < ESTACIONES.length

  function cambiar(cambios: Partial<BorradorPlanFitosanitario>) {
    setBorrador((b) => ({ ...b, ...cambios }))
    setFallo(null)
  }

  async function confirmar(evento?: FormEvent<HTMLFormElement>) {
    evento?.preventDefault()
    if (enCurso.current) return
    setIntentado(true)
    const nuevosPlan = validarPlan(borrador, hoyLima())
    const nuevosAlcances = validarPaso2(borrador.alcances)
    if (nuevosPlan.contrato) return
    if (nuevosPlan.motivo || hayErroresPaso2(nuevosAlcances)) return
    enCurso.current = true
    setEnviando(true)
    setFallo(null)
    try {
      const creadas = await programarPlanFitosanitario(construirPlan(borrador))
      navegar(RUTAS_TERCERIZADOS.controlFitosanitario, {
        replace: true,
        state: {
          aviso: `Plan fitosanitario programado: ${creadas.length} ${creadas.length === 1 ? 'aplicación generada' : 'aplicaciones generadas'}.`,
        },
      })
    } catch (causa) {
      setFallo(interpretarFallo(causa, 'programar el plan fitosanitario'))
    } finally {
      enCurso.current = false
      setEnviando(false)
    }
  }

  return (
    <form className={estilos.formulario} onSubmit={confirmar} noValidate aria-label={TITULO}>
      <LeyendaObligatorio />
      <ResumenErrores titulo={`Revisa ${resumen.length === 1 ? 'un campo' : `${resumen.length} campos`} antes de confirmar`} errores={resumen} />

      <Tarjeta titulo="Contrato" relleno="amplio">
        <div className={estilos.cuadricula}>
          <SelectorBuscable<ContratoMaestro>
            id="plan-contrato"
            etiqueta="Contrato vigente de control fitosanitario"
            obligatorio
            ayuda={borrador.contrato ? undefined : 'Busca por número o proveedor. Solo se listan contratos vigentes hoy.'}
            error={errores.contrato}
            ocultarDetalleElegido
            valor={borrador.contrato}
            claveDe={(c) => c.id}
            textoDe={(c) => c.numero}
            detalleDe={detalleContrato}
            buscar={(q, signal) => listarContratosMaestro({ q: q || undefined, vigente: true }, 1, signal)}
            onCambiar={(contrato) => cambiar({ contrato })}
          />
        </div>
        {borrador.contrato && (
          <ListaDescripcion
            elementos={[
              { etiqueta: 'Proveedor', valor: borrador.contrato.proveedor_nombre },
              { etiqueta: 'Servicio', valor: borrador.contrato.tipo_servicio_nombre },
              {
                etiqueta: 'Vigencia',
                valor: `${borrador.contrato.vigencia_inicio} al ${borrador.contrato.vigencia_fin}`,
              },
            ]}
          />
        )}
      </Tarjeta>

      <Tarjeta titulo="Aplicaciones por estación" relleno="amplio">
        <div className={estilos.cuadricula}>
          {ESTACIONES.map((estacion) => (
            <CampoFormulario
              key={estacion}
              id={`plan-fecha-${estacion}`}
              etiqueta={estacion}
              ayuda="Opcional"
              type="date"
              value={borrador.fechas[estacion]}
              onChange={(e) => cambiar({ fechas: { ...borrador.fechas, [estacion]: e.target.value } })}
            />
          ))}
        </div>
        {faltanEstaciones && (
          <>
            <AvisoEnLinea tono="advertencia" titulo="El plan no cubre las cuatro estaciones">
              Según RN-010, el control fitosanitario se aplica en todo el campus una vez por estación. Indica el motivo
              para confirmar el plan igual.
            </AvisoEnLinea>
            <AreaTexto
              id="plan-motivo"
              etiqueta="Motivo"
              obligatorio
              rows={2}
              ayuda="Por qué queda alguna estación sin programar"
              value={borrador.motivo}
              onChange={(e) => cambiar({ motivo: e.target.value })}
              error={errores.motivo}
            />
          </>
        )}
      </Tarjeta>

      <PasoAlcances
        alcances={borrador.alcances}
        onCambiar={(alcances) => cambiar({ alcances })}
        errores={erroresAlcances}
        unidadesMedida={unidades.datos?.resultados ?? []}
        areas={areas.datos?.resultados ?? []}
      />

      {(unidades.estado === 'error' || areas.estado === 'error') && (
        <AvisoEnLinea
          tono="advertencia"
          titulo="Faltan datos de apoyo"
          accion={{
            texto: 'Reintentar',
            onClick: () => {
              unidades.reintentar()
              areas.reintentar()
            },
          }}
        >
          No se pudieron cargar las unidades de medida o las áreas del filtro. Puedes seleccionar sin metrado o reintentar.
        </AvisoEnLinea>
      )}

      {fallo && <AvisoFallo fallo={fallo} onReintentar={() => void confirmar()} />}

      <div className={estilos.botones}>
        <Boton type="submit" variante="primario" cargando={enviando}>
          Confirmar plan
        </Boton>
        <BotonEnlace to={RUTAS_TERCERIZADOS.controlFitosanitario} variante="secundario">
          Cancelar
        </BotonEnlace>
      </div>
    </form>
  )
}
