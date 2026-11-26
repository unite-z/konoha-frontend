/**
 * Ciclos (RD-29): selector de ciclos (±6 meses) con pestañas por estado y contador; cada fila abre el panel del
 * ciclo (`?ciclo=`). Fondo liso, sin mapa. Quien gestiona la planificación inicia, finaliza o cancela (con motivo)
 * desde la fila o el panel; el resto lo ve en lectura. La fecha real nunca es futura (`DialogoCambioCiclo`).
 */
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import AccionFila, { AccionesFila } from '@/design-system/AccionFila'
import AvisoTemporal from '@/design-system/AvisoTemporal'
import BarraAvance from '@/design-system/BarraAvance'
import Boton, { BotonEnlace } from '@/design-system/Boton'
import Estado from '@/design-system/Estado'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import Pestanas from '@/design-system/Pestanas'
import { PERMISOS } from '@/config/permisosCore'
import { tiene } from '@/config/permisosSesion'
import { useConsulta } from '@/hooks/useConsulta'
import DialogoCambioCiclo from '@/pages/planificacion/ciclos/DialogoCambioCiclo'
import {
  PESTANAS_CICLOS,
  avanceCiclo,
  ciclosDePestana,
  contadoresCiclos,
  fechasCiclo,
  ordenarCiclos,
  rangoCiclos,
  type PestanaCiclos,
} from '@/pages/planificacion/ciclos/ciclos'
import { accionesCiclo } from '@/pages/planificacion/ciclos/detalleCiclo'
import { esCorte } from '@/pages/planificacion/ciclos/corte'
import { ESTADO_PROGRAMACION } from '@/pages/planificacion/resumen/resumenPlanificacion'
import { listarProgramaciones, type CambioEstadoCiclo } from '@/services/api/planificacion'
import { usePermisos } from '@/sesion/ContextoSesion'
import type { Programacion } from '@/types/planificacion'
import { hoyLima } from '@/utils/instanteLima'
import { estiloTransicion, fila, nombresTransicion, transicionar, useFocoConLaVista } from '@/rediseno/base/movimiento'
import { useParametroPanel } from '@/rediseno/base/PanelLateral/useParametroPanel'
import { rutaPlanificacionProgramar } from '../enlaces'
import estilos from './Ciclos.module.css'
import PanelCiclo from './PanelCiclo'

const PARAMETRO_CICLO = 'ciclo'
const PARAMETRO_ESTADO = 'estado'
const PESTANA_POR_DEFECTO: PestanaCiclos = 'todos'

/** Iconos de las acciones de la fila; el motivo y la fecha se piden en el diálogo. */
const ICONO_ACCION: Record<CambioEstadoCiclo, 'check' | 'circle-check' | 'circle-x'> = {
  inicio: 'check',
  fin: 'circle-check',
  cancelacion: 'circle-x',
}

function pestanaPedida(valor: string | null): PestanaCiclos {
  return PESTANAS_CICLOS.find((p) => p.valor === valor)?.valor ?? PESTANA_POR_DEFECTO
}

export default function CiclosPage() {
  const permisos = usePermisos()
  const puedeConsultar = tiene(permisos, PERMISOS.consultarPlanificacion)
  const puedeEditar = tiene(permisos, PERMISOS.gestionarPlanificacion)
  const [parametros, setParametros] = useSearchParams()
  const panel = useParametroPanel(PARAMETRO_CICLO)
  const foco = useFocoConLaVista<HTMLHeadingElement>()
  const hoy = hoyLima()
  const { desde, hasta } = rangoCiclos(hoy)
  const [version, setVersion] = useState(0)
  const [cambio, setCambio] = useState<{ ciclo: Programacion; cambio: CambioEstadoCiclo } | null>(null)
  const [actualizado, setActualizado] = useState<Programacion | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const consulta = useConsulta(puedeConsultar ? `rd-ciclos:${desde}:${version}` : null, (signal) =>
    listarProgramaciones(desde, hasta, signal),
  )
  const pestana = pestanaPedida(parametros.get(PARAMETRO_ESTADO))
  const idAbierto = /^\d{1,9}$/.test(panel.valor ?? '') ? Number(panel.valor) : null

  if (!puedeConsultar) {
    return (
      <div className={estilos.pagina}>
        <EstadoSinAcceso
          titulo="No tienes acceso a los ciclos"
          descripcion="Solicita el permiso de consulta de Planificación a una persona administradora."
        />
      </div>
    )
  }

  // La respuesta del último cambio de estado vale hasta que la lista se vuelve a leer.
  const ciclos = ordenarCiclos(
    (consulta.datos ?? []).map((c) => (actualizado?.id === c.id ? { ...c, ...actualizado } : c)),
  )
  const contadores = contadoresCiclos(ciclos)
  const filas = ciclosDePestana(ciclos, pestana)

  function elegirPestana(valor: string) {
    transicionar(() => {
      const nuevos = new URLSearchParams(parametros)
      if (valor === PESTANA_POR_DEFECTO) nuevos.delete(PARAMETRO_ESTADO)
      else nuevos.set(PARAMETRO_ESTADO, valor)
      setParametros(nuevos, { replace: true })
    })
  }

  function cambiado(ciclo: Programacion, mensaje: string) {
    // La etiqueta de estado del panel se funde con la nueva; la lista y el historial se leen de nuevo.
    transicionar(() => {
      setActualizado(ciclo)
      setCambio(null)
      setAviso(mensaje)
      setVersion((v) => v + 1)
    })
  }

  /** Acciones de la fila; el corte en curso se cierra desde su panel, con la ruta y la limpieza a la vista. */
  function acciones(c: Programacion) {
    if (!puedeEditar || (c.estado === 'EnCurso' && esCorte(c.servicio))) return null
    const lista = accionesCiclo(c.estado)
    if (lista.length === 0) return null
    const nombre = c.codigo ?? c.servicio
    return (
      <AccionesFila>
        {lista.map((a) => (
          <AccionFila
            key={a.cambio}
            icono={ICONO_ACCION[a.cambio]}
            tono={a.cambio === 'cancelacion' ? 'peligro' : undefined}
            nombre={a.texto}
            etiqueta={`${a.texto} ${nombre}`}
            onClick={() => setCambio({ ciclo: c, cambio: a.cambio })}
          />
        ))}
      </AccionesFila>
    )
  }

  let lista
  if (consulta.error?.estado === 403 && !consulta.datos) {
    lista = (
      <EstadoSinAcceso
        nivel={3}
        titulo="No puedes ver los ciclos"
        descripcion="El servidor no permite consultar la planificación con tu cuenta."
      />
    )
  } else if (consulta.estado === 'error' && !consulta.datos) {
    lista = (
      <EstadoError
        nivel={3}
        titulo="No pudimos cargar los ciclos"
        descripcion={consulta.error?.detalle ?? ''}
        onReintentar={consulta.reintentar}
      />
    )
  } else if (!consulta.datos) {
    lista = consulta.cargaVisible ? <EstadoCarga forma="tarjetas" texto="Cargando los ciclos…" /> : null
  } else if (filas.length === 0) {
    lista = (
      <EstadoVacio
        nivel={3}
        titulo="Sin ciclos en esta pestaña"
        descripcion="Los ciclos programados, en curso o completados en los últimos y próximos seis meses aparecerán aquí."
      />
    )
  } else {
    lista = (
      <ul className={estilos.lista} aria-label="Ciclos">
        {filas.map((c) => {
          const avance = avanceCiclo(c, hoy)
          const estado = ESTADO_PROGRAMACION[c.estado]
          const nombre = c.codigo ?? c.servicio
          return (
            <li
              key={c.id}
              className={estilos.itemLista}
              data-abierto={idAbierto === c.id || undefined}
              style={idAbierto === c.id ? undefined : estiloTransicion(fila(`ciclo-${c.id}`))} // estilo-calculado
            >
              <div className={estilos.textos}>
                <Boton
                  variante="enlace"
                  onClick={() => transicionar(() => panel.abrir(String(c.id)))}
                  aria-label={`Abrir el ciclo ${nombre}`}
                >
                  {nombre}
                </Boton>
                {c.codigo && <span className={estilos.detalleFila}>{c.servicio}</span>}
              </div>
              <span className={estilos.detalleFila}>{c.proveedor ?? 'Personal propio'}</span>
              <span className={estilos.detalleFila}>{fechasCiclo(c.fecha_inicio_prevista, c.fecha_fin_prevista)}</span>
              <span className={estilos.avanceFila}>
                {avance === null ? (
                  <span className={estilos.detalleFila}>Sin avance</span>
                ) : (
                  <BarraAvance
                    valor={avance}
                    maximo={100}
                    etiqueta={`Avance de ${nombre}`}
                    textoValor={`${avance} %`}
                  />
                )}
              </span>
              <Estado tono={estado.tono} texto={estado.texto} punto={c.estado !== 'EnCurso'} />
              {acciones(c)}
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className={estilos.pagina}>
      <header
        className={estilos.encabezado}
        style={estiloTransicion(nombresTransicion.encabezado)} /* estilo-calculado */
      >
        <div className={estilos.barra}>
          <h1 ref={foco} tabIndex={-1}>
            Ciclos
          </h1>
          {puedeEditar && (
            <BotonEnlace to={rutaPlanificacionProgramar()} variante="primario" icono="plus-circle">
              Programar ciclo
            </BotonEnlace>
          )}
        </div>
        <p>
          {puedeEditar
            ? 'Ciclos de los últimos y próximos seis meses. Ábrelos para ver su avance y cambiar su estado.'
            : 'Ciclos de los últimos y próximos seis meses, en solo lectura.'}
        </p>
      </header>
      <div className={estilos.estados}>
        <Pestanas
          etiqueta="Estado de los ciclos"
          pestanas={PESTANAS_CICLOS.map((p) => ({ ...p, contador: consulta.datos ? contadores[p.valor] : undefined }))}
          valor={pestana}
          onCambiar={elegirPestana}
        >
          <div className={estilos.vidrio}>{lista}</div>
        </Pestanas>
      </div>
      {consulta.estado === 'error' && consulta.datos && (
        <EstadoError
          titulo="No pudimos actualizar los ciclos"
          descripcion={consulta.error?.detalle ?? ''}
          onReintentar={consulta.reintentar}
        />
      )}
      {idAbierto !== null && (
        <PanelCiclo
          id={idAbierto}
          hoy={hoy}
          deLista={ciclos.find((c) => c.id === idAbierto) ?? null}
          actualizado={actualizado}
          version={version}
          puedeEditar={puedeEditar}
          onCerrar={() => transicionar(panel.cerrar)}
          onAccion={(ciclo, tipo) => setCambio({ ciclo, cambio: tipo })}
        />
      )}
      {puedeEditar && cambio && (
        <DialogoCambioCiclo
          ciclo={cambio.ciclo}
          cambio={cambio.cambio}
          hoy={hoy}
          onCerrar={() => setCambio(null)}
          onCambiado={cambiado}
        />
      )}
      <AvisoTemporal mensaje={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}
