import { useSearchParams } from 'react-router'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import { PERMISOS } from '@/config/permisosCore'
import { tiene } from '@/config/permisosSesion'
import { useConsulta } from '@/hooks/useConsulta'
import { rangoCiclos } from '@/pages/planificacion/ciclos/ciclos'
import { sumarDias } from '@/pages/planificacion/resumen/resumenPlanificacion'
import { listarAlertas, listarProgramaciones, listarRestricciones, listarServiciosPeriodicos } from '@/services/api/planificacion'
import { obtenerResumenSectores } from '@/services/api/resumenSectores'
import { usePermisos } from '@/sesion/ContextoSesion'
import { hoyLima } from '@/utils/instanteLima'
import { estiloTransicion, nombresTransicion, transicionar, useFocoConLaVista } from '../base/movimiento'
import AvanceCiclo from './AvanceCiclo'
import EstaSemana from './EstaSemana'
import NecesitaAtencion from './NecesitaAtencion'
import TablaSectores from './TablaSectores'
import { cicloInicial, ciclosElegibles, DIAS_AMPLIADOS } from './sectores'
import estilos from './Sectores.module.css'

/** Sectores (RD-28): entrada de Planificación. Avance del ciclo, tabla por sector, alertas y lo que viene. Solo lectura salvo para el jefe. */
export default function SectoresPage() {
  const permisos = usePermisos()
  const puedeConsultar = tiene(permisos, PERMISOS.consultarPlanificacion)
  const puedeEditar = tiene(permisos, PERMISOS.gestionarPlanificacion)
  const [parametros, setParametros] = useSearchParams()
  const foco = useFocoConLaVista<HTMLHeadingElement>()
  const hoy = hoyLima()
  const rango = rangoCiclos(hoy)
  const hasta = sumarDias(hoy, DIAS_AMPLIADOS)

  const programaciones = useConsulta(puedeConsultar ? `rd-programaciones:${rango.desde}` : null, (signal) => listarProgramaciones(rango.desde, rango.hasta, signal))
  const alertas = useConsulta(puedeConsultar ? 'rd-alertas' : null, listarAlertas)
  const servicios = useConsulta(puedeConsultar ? 'rd-servicios' : null, listarServiciosPeriodicos)
  const restricciones = useConsulta(puedeConsultar ? `rd-restricciones:${hoy}` : null, (signal) => listarRestricciones(hoy, hasta, signal))

  const pedido = Number(parametros.get('ciclo')) || null
  const elegibles = ciclosElegibles(programaciones.datos ?? [])
  const elegido = cicloInicial(elegibles, hoy, pedido)
  const resumen = useConsulta(puedeConsultar && elegido ? `rd-resumen-sectores:${elegido.id}` : null, (signal) => obtenerResumenSectores(elegido?.id ?? null, signal))
  // Sin `resumen-sectores/` en el servidor (404 que no es de un ciclo inexistente) la vista sigue sin la tabla por sector.
  const noDisponible = resumen.estado === 'error' && resumen.error?.estado === 404 && resumen.error.codigo !== 'ciclo-no-encontrado'
  const datosResumen = resumen.datos && resumen.datos.ciclo_id === elegido?.id ? resumen.datos : null

  if (!puedeConsultar) {
    return <EstadoSinAcceso titulo="No tienes acceso a Planificación" descripcion="Solicita el permiso de consulta de Planificación a una persona administradora." />
  }
  const sinAcceso = [programaciones, alertas, servicios, restricciones, resumen].some((c) => c.error?.estado === 403 && !c.datos)
  if (sinAcceso) return <EstadoSinAcceso titulo="No tienes acceso a Planificación" descripcion="El servidor no permite consultar la planificación con tu cuenta." />
  if (programaciones.estado === 'error' && !programaciones.datos) {
    return <EstadoError titulo="No pudimos cargar la planificación" descripcion={programaciones.error?.detalle ?? ''} onReintentar={programaciones.reintentar} />
  }
  if (!programaciones.datos) return programaciones.cargaVisible ? <EstadoCarga forma="pagina" texto="Cargando la planificación…" /> : null

  function elegir(id: number) {
    transicionar(() => {
      const nuevos = new URLSearchParams(parametros)
      nuevos.set('ciclo', String(id))
      setParametros(nuevos, { replace: true })
    })
  }

  return (
    <div className={estilos.pagina}>
      <header className={estilos.encabezado} style={estiloTransicion(nombresTransicion.encabezado)} /* estilo-calculado */>
        <h1 ref={foco} tabIndex={-1}>
          Sectores
        </h1>
        <p>{puedeEditar ? 'Avance del ciclo, alertas y lo que viene.' : 'Avance del ciclo, alertas y lo que viene, en solo lectura.'}</p>
      </header>
      <AvanceCiclo hoy={hoy} ciclos={elegibles} elegido={elegido} resumen={datosResumen} onElegir={elegir} />
      <TablaSectores
        consulta={{ ...resumen, datos: datosResumen }}
        sinCiclo={!elegido}
        noDisponible={noDisponible}
      />
      <div className={estilos.columnas}>
        <NecesitaAtencion alertas={alertas} servicios={servicios} programaciones={programaciones} puedeEditar={puedeEditar} />
        <EstaSemana hoy={hoy} programaciones={programaciones} restricciones={restricciones} />
      </div>
    </div>
  )
}
