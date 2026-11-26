/**
 * Panel del encargo abierto desde el calendario o la lista (`?encargo_id=`, RD-35). Pestañas «Detalle» (datos, «Ver
 * incidencia de origen» y «Mover» para la jefatura), «Seguimiento» (cambio de estado e historiales) y «Actividades».
 * «Editar» (jefatura) abre el formulario. La tarjeta del calendario crece hasta este panel (`fila(id)` → `panel(id)`)
 * y el cambio de estado anima la etiqueta con `transicionar()`.
 */
import { useState } from 'react'
import Boton, { BotonEnlace } from '@/design-system/Boton'
import CampoFormulario from '@/design-system/CampoFormulario'
import Estado from '@/design-system/Estado'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import Selector from '@/design-system/Selector'
import { PERMISOS } from '@/config/permisosCore'
import { tiene } from '@/config/permisosSesion'
import { useConsulta } from '@/hooks/useConsulta'
import { tonosEncargo } from '@/pages/operacion-campo/tonosEncargo'
import { rutaIncidencia } from '@/router/rutasApp'
import { usePermisos } from '@/sesion/ContextoSesion'
import type { CuadrillaCampo, EncargoCampo } from '@/types/operacionCampo'
import { formatearFecha } from '@/utils/formato'
import { puedeReprogramarEncargo } from '@/utils/operacionCampo'
import { estiloTransicion, panel, transicionar } from '@/rediseno/base/movimiento'
import PanelLateral from '@/rediseno/base/PanelLateral/PanelLateral'
import { obtenerEncargo } from '../Cuadrillas/api'
import { anclaDe, diferenciaDias, type MovimientoEncargo } from '../Cuadrillas/semana'
import ActividadesEncargo from './ActividadesEncargo'
import estilos from './Encargo.module.css'
import FormularioEncargo from './FormularioEncargo'
import SeguimientoEncargo from './SeguimientoEncargo'

/** Nombre de la etiqueta de estado: al cambiar de estado, la etiqueta vieja se funde con la nueva. */
const ETIQUETA_ESTADO = 'estado-encargo'

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
  /** El encargo cambió (estado o edición): la vista recarga sus datos y enseña el aviso. */
  onCambio: (mensaje: string) => void
}

function Mover({
  encargo,
  cuadrillas,
  onMover,
}: Pick<PanelEncargoProps, 'cuadrillas' | 'onMover'> & {
  encargo: EncargoCampo
}) {
  const ancla = anclaDe(encargo)
  const [dia, setDia] = useState(ancla)
  const [cuadrilla, setCuadrilla] = useState(String(encargo.cuadrilla_id))
  const opciones = cuadrillas.filter((c) => c.activa || c.id === encargo.cuadrilla_id)
  const movimiento = {
    dias: dia ? diferenciaDias(ancla, dia) : 0,
    cuadrillaId: Number(cuadrilla),
  }
  const hayCambio = Boolean(dia) && (movimiento.dias !== 0 || movimiento.cuadrillaId !== encargo.cuadrilla_id)
  return (
    <section className={estilos.seccion} aria-labelledby="mover-encargo">
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
        opciones={opciones.map((c) => ({
          valor: String(c.id),
          texto: c.nombre,
        }))}
        onCambiar={setCuadrilla}
      />
      <Boton deshabilitado={!hayCambio} onClick={() => onMover(encargo, movimiento)}>
        Mover
      </Boton>
    </section>
  )
}

function Detalle({
  encargo,
  cuadrillas,
  puedeMover,
  puedeVerIncidencia,
  onMover,
}: Pick<PanelEncargoProps, 'cuadrillas' | 'puedeMover' | 'puedeVerIncidencia' | 'onMover'> & {
  encargo: EncargoCampo
}) {
  return (
    <>
      <dl className={estilos.datos}>
        <dt>Descripción</dt>
        <dd>{encargo.descripcion}</dd>
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
            {encargo.fecha_reunion && (
              <>
                <dt>Reunión</dt>
                <dd>{formatearFecha(encargo.fecha_reunion)}</dd>
              </>
            )}
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
        <div className={estilos.seccion}>
          <BotonEnlace to={rutaIncidencia(encargo.incidencia_origen_id)} variante="secundario" icono="eye">
            Ver incidencia de origen
          </BotonEnlace>
        </div>
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
}

export default function PanelEncargo(props: PanelEncargoProps) {
  const { id, cargados, cuadrillas, puedeMover, puedeVerIncidencia, onCerrar, onMover, onCambio } = props
  const permisos = usePermisos()
  // Encargo recién guardado y la copia que tenía la vista entonces: manda hasta que la vista traiga otra más nueva.
  const [actualizado, setActualizado] = useState<{ antes: EncargoCampo | null; despues: EncargoCampo } | null>(null)
  const [editando, setEditando] = useState(false)
  const local = cargados?.find((e) => e.id === id) ?? null
  // Solo se pide aparte el encargo que no está en la semana cargada (enlace directo a otro periodo o desde la lista).
  const remoto = useConsulta(local || cargados === null ? null : `rd-encargo:${id}`, (signal) =>
    obtenerEncargo(id, signal),
  )
  const cargado = local ?? remoto.datos
  const vigente = actualizado?.despues.id === id && (cargado === null || cargado === actualizado.antes)
  const encargo = vigente ? actualizado.despues : cargado

  /** Tras guardar, se pide el encargo ya cambiado y su etiqueta de estado se anima al aparecer. */
  async function refrescar(mensaje: string) {
    try {
      const nuevo = await obtenerEncargo(id)
      transicionar(() => setActualizado({ antes: cargado, despues: nuevo }))
    } catch {
      // Sin el encargo nuevo se queda el anterior; la vista recarga la semana y lo corrige.
    }
    onCambio(mensaje)
  }

  let aviso
  if (!encargo) {
    if (remoto.estado === 'error') {
      const codigo = remoto.error?.estado
      aviso =
        codigo === 403 ? (
          <EstadoSinAcceso
            nivel={3}
            titulo="No puedes ver este encargo"
            descripcion="Tu cuenta no tiene acceso a él."
          />
        ) : codigo === 404 ? (
          <EstadoVacio
            nivel={3}
            titulo="No existe este encargo"
            descripcion="Revisa el enlace o búscalo en la lista."
          />
        ) : (
          <EstadoError
            nivel={3}
            titulo="No pudimos cargar el encargo"
            descripcion={remoto.error?.detalle ?? ''}
            onReintentar={remoto.reintentar}
          />
        )
    } else {
      aviso = <EstadoCarga forma="pagina" texto="Cargando el encargo…" />
    }
  }
  return (
    <PanelLateral
      abierto
      onCerrar={onCerrar}
      titulo={encargo ? `Encargo ${encargo.id}` : 'Encargo'}
      viewTransitionName={panel(id)}
      subtitulo={
        encargo && (
          <span style={estiloTransicion(ETIQUETA_ESTADO)} /* estilo-calculado */>
            {encargo.vencido ? (
              <Estado tono="error" texto="Vencido" />
            ) : (
              <Estado tono={tonosEncargo[encargo.estado]} texto={encargo.estado} />
            )}
          </span>
        )
      }
      pestanas={
        encargo
          ? [
              {
                valor: 'detalle',
                texto: 'Detalle',
                contenido: (
                  <Detalle
                    encargo={encargo}
                    cuadrillas={cuadrillas}
                    puedeMover={puedeMover}
                    puedeVerIncidencia={puedeVerIncidencia}
                    onMover={onMover}
                  />
                ),
              },
              {
                valor: 'seguimiento',
                texto: 'Seguimiento',
                contenido: <SeguimientoEncargo encargo={encargo} onEstadoCambiado={refrescar} />,
              },
              ...(tiene(permisos, PERMISOS.consultarPartes)
                ? [
                    {
                      valor: 'actividades',
                      texto: 'Actividades',
                      contenido: <ActividadesEncargo encargoId={id} />,
                    },
                  ]
                : []),
            ]
          : undefined
      }
      pie={
        encargo &&
        puedeMover && (
          <Boton variante="secundario" icono="pencil" onClick={() => setEditando(true)}>
            Editar
          </Boton>
        )
      }
    >
      {aviso}
      {encargo && editando && (
        <FormularioEncargo
          actual={encargo}
          onCerrar={() => setEditando(false)}
          onGuardado={() => {
            setEditando(false)
            void refrescar('El encargo se guardó correctamente.')
          }}
        />
      )}
    </PanelLateral>
  )
}
