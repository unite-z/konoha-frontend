/**
 * Panel de capas del mapa de atenciones (Guía Web 5.8 y 6.1, patrón «Mapa con capas»): casillas por tipo de
 * atención con su total, filtro por tipo de uso y resumen de la atención seleccionada (CU-MOD06-003, paso 6),
 * con acceso a la atención y al historial del espacio (paso 7). Presentacional.
 */
import Badge from '../../../components/ui/Badge'
import Boton, { BotonEnlace } from '../../../components/ui/Boton'
import ListaDescripcion from '../../../components/ui/ListaDescripcion'
import Selector, { OPCION_TODOS } from '../../../components/ui/Selector'
import { rutaDetalleAtencion } from '../../../router/rutasApp'
import type { TipoAtencion, TotalTipoAtencion } from '../../../types/reportesGestion'
import { formatearFecha, formatearNumero, SIN_VALOR } from '../../../utils/formato'
import type { FilaMapa } from '../../../utils/mapaAtenciones'
import { insigniaEstadoAtencion, TIPOS_ATENCION } from '../../../utils/reportesGestion'
import estilos from './MapaAtenciones.module.css'

export interface PanelCapasProps {
  totales: TotalTipoAtencion[]
  visibles: ReadonlySet<TipoAtencion>
  onCambiarVisible: (tipo: TipoAtencion, visible: boolean) => void
  seleccionada: FilaMapa | null
  /** Filtra la pantalla por el espacio de la atención seleccionada. */
  onVerHistorial: (areaVerdeId: number) => void
}

/** «2 archivos», «1 archivo» o «Sin archivos». */
function textoEvidencias(n: number): string {
  if (n === 0) return 'Sin archivos'
  return `${formatearNumero(n)} ${n === 1 ? 'archivo' : 'archivos'}`
}

function Resumen({ fila, onVerHistorial }: { fila: FilaMapa; onVerHistorial: (areaVerdeId: number) => void }) {
  const areaVerdeId = fila.area_verde_id
  return (
    <>
      <div className={estilos.cabeceraSeleccion}>
        <span className="cifra">{fila.codigo}</span>
        <Badge {...insigniaEstadoAtencion(fila.estado)} />
      </div>
      <ListaDescripcion
        columnas="una"
        elementos={[
          { etiqueta: 'Tipo de atención', valor: fila.tipo_atencion },
          { etiqueta: 'Tipo de servicio', valor: fila.tipo_servicio },
          { etiqueta: 'Fecha', valor: formatearFecha(fila.fecha) },
          { etiqueta: 'Responsable', valor: fila.proveedor },
          { etiqueta: 'Evidencias disponibles', valor: textoEvidencias(fila.archivos_asociados) },
          { etiqueta: 'Espacio', valor: fila.espacio },
          { etiqueta: 'Ejemplar', valor: fila.ejemplar_codigo ?? SIN_VALOR },
          { etiqueta: 'Nivel de riesgo', valor: fila.es_riesgo ? 'Atención de riesgo' : 'Sin riesgo' },
          { etiqueta: 'Ubicación', valor: fila.con_ubicacion ? 'En el mapa' : 'Sin ubicación registrada' },
        ]}
      />
      <div className={estilos.acciones}>
        <BotonEnlace variante="secundario" to={rutaDetalleAtencion(fila.atencion_id)}>
          Ver atención
        </BotonEnlace>
        <Boton
          variante="terciario"
          deshabilitado={areaVerdeId === null}
          ayudaDeshabilitado="Esta atención no tiene espacio asociado"
          onClick={() => {
            if (areaVerdeId !== null) onVerHistorial(areaVerdeId)
          }}
        >
          Ver historial del espacio
        </Boton>
      </div>
    </>
  )
}

export default function PanelCapas({ totales, visibles, onCambiarVisible, seleccionada, onVerHistorial }: PanelCapasProps) {
  return (
    <aside className={estilos.panel} aria-labelledby="titulo-capas">
      <h2 id="titulo-capas" className={estilos.titulo}>
        Capas
      </h2>

      <fieldset className={estilos.grupo}>
        <legend className="sr-only">Tipos de atención visibles</legend>
        {TIPOS_ATENCION.map((tipo) => {
          const total = totales.find((t) => t.tipo_atencion === tipo)?.total
          return (
            <label key={tipo} className={estilos.casilla}>
              <input
                type="checkbox"
                checked={visibles.has(tipo)}
                onChange={(evento) => onCambiarVisible(tipo, evento.target.checked)}
              />
              <span>
                {tipo}
                {total !== undefined && <span className="cifra"> ({formatearNumero(total)})</span>}
              </span>
            </label>
          )
        })}
        <p className={estilos.ayuda}>Las casillas muestran u ocultan cada tipo en el mapa y en la lista</p>
      </fieldset>

      {/*
        TODO (cuando se fusione MOD-02): las opciones vendrán de `listarTiposUso` (services/api/inventario.ts de la
        rama mod02), se enviará `tipo_uso_id` y los polígonos se rellenarán por tipo de uso con color y patrón.
        Faltan los tokens de la guía (--web-map-institucional: #6A3D9A, --web-map-ornamental: #0F766E,
        --web-map-deportivo: #C2570C; el recreativo usa --green-500). MOD-02 usa --map-uso-*: hay que acordarlo.
      */}
      <Selector
        id="filtro-tipo-uso"
        etiqueta="Tipo de uso"
        valor=""
        opciones={[]}
        opcionTodos={OPCION_TODOS}
        bloqueadoMotivo="El tipo de uso de los espacios todavía no está disponible en el sistema"
        onCambiar={() => undefined}
      />

      <section className={estilos.seleccion} aria-labelledby="titulo-seleccion">
        <h3 id="titulo-seleccion" className={estilos.subtitulo}>
          Atención seleccionada
        </h3>
        {seleccionada ? (
          <Resumen fila={seleccionada} onVerHistorial={onVerHistorial} />
        ) : (
          <p className={estilos.ayuda}>Selecciona una atención en el mapa o en la lista para ver su resumen</p>
        )}
      </section>
    </aside>
  )
}
