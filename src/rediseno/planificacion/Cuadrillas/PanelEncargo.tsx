/**
 * Panel del encargo abierto desde el calendario o la lista (`?encargo_id=`). Resume el encargo, ofrece «Mover» (la
 * alternativa de teclado al arrastre) y «Ver incidencia de origen» (M4-07). La tarjeta del calendario crece hasta este
 * panel (`fila(id)` → `panel(id)`); el alta, la edición y el seguimiento completos llegan con RD-35.
 */
import { useState } from 'react'
import Boton, { BotonEnlace } from '@/design-system/Boton'
import CampoFormulario from '@/design-system/CampoFormulario'
import Estado from '@/design-system/Estado'
import EstadoError from '@/design-system/EstadoError'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import Selector from '@/design-system/Selector'
import { useConsulta } from '@/hooks/useConsulta'
import { rutaIncidencia } from '@/router/rutasApp'
import { tonosEncargo } from '@/pages/operacion-campo/tonosEncargo'
import type { CuadrillaCampo, EncargoCampo } from '@/types/operacionCampo'
import { formatearFecha } from '@/utils/formato'
import { puedeReprogramarEncargo } from '@/utils/operacionCampo'
import { panel } from '@/rediseno/base/movimiento'
import PanelLateral from '@/rediseno/base/PanelLateral/PanelLateral'
import { obtenerEncargo } from './api'
import estilos from './Cuadrillas.module.css'
import { anclaDe, diferenciaDias, type MovimientoEncargo } from './semana'

export interface PanelEncargoProps {
  id: number
  /** Encargos de la semana; mientras se cargan (`null`) no se pide el encargo suelto. */
  cargados: EncargoCampo[] | null
  cuadrillas: CuadrillaCampo[]
  puedeMover: boolean
  /** Como en `/operacion-campo/encargos`: consultar planificación y registrar incidencias. */
  puedeVerIncidencia: boolean
  onCerrar: () => void
  onMover: (encargo: EncargoCampo, movimiento: MovimientoEncargo) => void
}

function Mover({
  encargo,
  cuadrillas,
  onMover,
}: Pick<PanelEncargoProps, 'cuadrillas' | 'onMover'> & { encargo: EncargoCampo }) {
  const ancla = anclaDe(encargo)
  const [dia, setDia] = useState(ancla)
  const [cuadrilla, setCuadrilla] = useState(String(encargo.cuadrilla_id))
  const opciones = cuadrillas.filter((c) => c.activa || c.id === encargo.cuadrilla_id)
  const movimiento = { dias: dia ? diferenciaDias(ancla, dia) : 0, cuadrillaId: Number(cuadrilla) }
  const hayCambio = Boolean(dia) && (movimiento.dias !== 0 || movimiento.cuadrillaId !== encargo.cuadrilla_id)
  return (
    <section className={estilos.mover} aria-labelledby="mover-encargo">
      <h3 id="mover-encargo">Mover</h3>
      <CampoFormulario
        id="mover-dia"
        etiqueta={encargo.periodicidad === 'Directo' ? 'Nuevo plazo' : 'Nuevo día de inicio'}
        type="date"
        value={dia}
        onChange={(e) => setDia(e.target.value)}
      />
      <Selector
        id="mover-cuadrilla"
        etiqueta="Cuadrilla"
        valor={cuadrilla}
        opciones={opciones.map((c) => ({ valor: String(c.id), texto: c.nombre }))}
        onCambiar={setCuadrilla}
      />
      <Boton deshabilitado={!hayCambio} onClick={() => onMover(encargo, movimiento)}>
        Mover
      </Boton>
    </section>
  )
}

export default function PanelEncargo(props: PanelEncargoProps) {
  const { id, cargados, cuadrillas, puedeMover, puedeVerIncidencia, onCerrar, onMover } = props
  const local = cargados?.find((e) => e.id === id) ?? null
  // Solo se pide aparte el encargo que no está en la semana cargada (enlace directo a otro periodo o desde la lista).
  const remoto = useConsulta(local || cargados === null ? null : `rd-encargo:${id}`, (signal) =>
    obtenerEncargo(id, signal),
  )
  const encargo = local ?? remoto.datos
  const nombre = encargo ? `Encargo ${encargo.id}` : 'Encargo'
  let cuerpo
  if (encargo) {
    cuerpo = (
      <>
        <dl className={estilos.datos}>
          <dt>Descripción</dt>
          <dd>{encargo.descripcion}</dd>
          <dt>Estado</dt>
          <dd>
            {encargo.vencido ? (
              <Estado tono="error" texto="Vencido" />
            ) : (
              <Estado tono={tonosEncargo[encargo.estado]} texto={encargo.estado} />
            )}
          </dd>
          <dt>Cuadrilla</dt>
          <dd>
            {encargo.cuadrilla_nombre} · {encargo.capataz_nombre}
          </dd>
          <dt>Actividad</dt>
          <dd>{encargo.tipo_actividad_nombre}</dd>
          <dt>Espacio</dt>
          <dd>{encargo.area_verde_nombre}</dd>
          <dt>Modalidad</dt>
          <dd>{encargo.periodicidad}</dd>
          {encargo.periodicidad !== 'Directo' && (
            <>
              <dt>Periodo</dt>
              <dd>
                {formatearFecha(encargo.fecha_inicio)} — {formatearFecha(encargo.fecha_fin)}
              </dd>
            </>
          )}
          <dt>Plazo previsto</dt>
          <dd>{formatearFecha(encargo.plazo_previsto)}</dd>
        </dl>
        {puedeVerIncidencia && encargo.incidencia_origen_id ? (
          // Hasta que Incidencias (RD-43) publique su `ruta*()`, la ruta actual redirige a `/n/incidencias?incidencia=`.
          <BotonEnlace to={rutaIncidencia(encargo.incidencia_origen_id)} variante="secundario" icono="eye">
            Ver incidencia de origen
          </BotonEnlace>
        ) : null}
        {puedeMover && puedeReprogramarEncargo(encargo.estado) && (
          <Mover
            key={`${encargo.id}:${encargo.cuadrilla_id}:${encargo.plazo_previsto}`}
            encargo={encargo}
            cuadrillas={cuadrillas}
            onMover={onMover}
          />
        )}
      </>
    )
  } else if (remoto.estado === 'error') {
    const estado = remoto.error?.estado
    cuerpo =
      estado === 403 ? (
        <EstadoSinAcceso nivel={3} titulo="No puedes ver este encargo" descripcion="Tu cuenta no tiene acceso a él." />
      ) : estado === 404 ? (
        <EstadoVacio nivel={3} titulo="No existe este encargo" descripcion="Revisa el enlace o búscalo en la lista." />
      ) : (
        <EstadoError
          nivel={3}
          titulo="No pudimos cargar el encargo"
          descripcion={remoto.error?.detalle ?? ''}
          onReintentar={remoto.reintentar}
        />
      )
  } else {
    cuerpo = <EstadoCarga forma="pagina" texto="Cargando el encargo…" />
  }
  return (
    <PanelLateral abierto onCerrar={onCerrar} titulo={nombre} viewTransitionName={panel(id)}>
      {cuerpo}
    </PanelLateral>
  )
}
