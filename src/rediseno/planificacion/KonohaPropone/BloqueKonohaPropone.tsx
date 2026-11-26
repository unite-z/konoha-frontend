/**
 * Bloque «Konoha propone» de Sectores (RD-33): la última propuesta de cronograma, «Generar propuesta» (con
 * `IA.PROPUESTA.PROPONER`), el historial por estado y periodo, y el panel de revisión (`?propuesta=<id>`).
 * El bloque crece hasta el panel: es un elemento compartido de la transición de vista.
 */
import { useState } from 'react'
import Boton from '@/design-system/Boton'
import Estado from '@/design-system/Estado'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import { insigniaAEstado } from '@/design-system/tonos'
import { PERMISO_CONSULTA_REPORTES, PERMISO_SOLICITAR_IA } from '@/config/permisos'
import { tiene } from '@/config/permisosSesion'
import { useConsulta } from '@/hooks/useConsulta'
import DialogoGenerarCronograma from '@/pages/reportes-indicadores/asistencia-ia/cronograma/DialogoGenerarCronograma'
import { listarCronogramas } from '@/services/api/cronogramaIa'
import { usePermisos } from '@/sesion/ContextoSesion'
import { textoPeriodoCorto } from '@/utils/cronogramaIa'
import { insigniaSugerencia } from '@/utils/estados'
import { formatearFechaHora } from '@/utils/formato'
import { useParametroPanel } from '@/rediseno/base/PanelLateral/useParametroPanel'
import { estiloTransicion, fila, transicionar } from '@/rediseno/base/movimiento'
import { PARAMETRO_PROPUESTA } from '@/rediseno/planificacion/enlaces'
import HistorialPropuestas from './HistorialPropuestas'
import estilos from './KonohaPropone.module.css'
import { NOMBRE_KONOHA_PROPONE } from './nombres'
import PanelRevisionCronograma from './PanelRevisionCronograma'

export default function BloqueKonohaPropone() {
  const permisos = usePermisos()
  const puedeVer = tiene(permisos, PERMISO_CONSULTA_REPORTES)
  const puedeGenerar = tiene(permisos, PERMISO_SOLICITAR_IA)
  const panel = useParametroPanel(PARAMETRO_PROPUESTA)
  const [generando, setGenerando] = useState(false)
  const [conHistorial, setConHistorial] = useState(false)
  const ultima = useConsulta(
    puedeVer ? 'rd-konoha-ultima' : null,
    (signal) => listarCronogramas({}, signal),
    (datos) => datos.results.length === 0,
  )
  if (!puedeVer) return null

  const abrir = (id: number) => transicionar(() => panel.abrir(String(id)))
  const idPanel = Number(panel.valor) || null
  const propuesta = ultima.datos?.results[0]

  let cuerpo
  if (ultima.error?.estado === 403) cuerpo = <EstadoSinAcceso nivel={3} titulo="No puedes ver las propuestas" />
  else if (ultima.error?.estado === 404)
    cuerpo = (
      <EstadoVacio
        nivel={3}
        titulo="Konoha aún no propone cronogramas"
        descripcion="Esta función no está disponible todavía en el servidor."
      />
    )
  else if (ultima.error && !ultima.datos)
    cuerpo = (
      <EstadoError
        nivel={3}
        titulo="No pudimos cargar la última propuesta"
        descripcion={ultima.error.detalle}
        onReintentar={ultima.reintentar}
      />
    )
  else if (!ultima.datos) cuerpo = ultima.cargaVisible ? <p role="status">Cargando la propuesta…</p> : null
  else if (!propuesta)
    cuerpo = (
      <EstadoVacio
        nivel={3}
        titulo="Aún no hay propuestas de cronograma"
        descripcion={puedeGenerar ? 'Genera una para empezar.' : 'Aparecerán aquí cuando se genere una.'}
      />
    )
  else
    cuerpo = (
      <div className={estilos.ultima}>
        <span className={estilos.textos}>
          <span className={estilos.titulo}>
            {textoPeriodoCorto(propuesta.contenido.entrada.desde, propuesta.contenido.entrada.hasta)}
          </span>
          <span className={estilos.detalle}>
            {propuesta.contenido.propuestas.length} sugerencias · generada el{' '}
            {formatearFechaHora(propuesta.fecha_creacion)}
          </span>
        </span>
        <Estado {...insigniaAEstado(insigniaSugerencia(propuesta.estado, propuesta.etiqueta_estado))} />
        <Boton variante="primario" compacto onClick={() => abrir(propuesta.id)}>
          {propuesta.estado === 'Propuesta' ? 'Revisar propuesta' : 'Ver propuesta'}
        </Boton>
      </div>
    )

  return (
    <>
      <section
        className={estilos.bloque}
        aria-labelledby="titulo-konoha-propone"
        style={idPanel === null ? estiloTransicion(fila(NOMBRE_KONOHA_PROPONE)) : undefined} /* estilo-calculado */
      >
        <div className={estilos.cabecera}>
          <h2 id="titulo-konoha-propone">Konoha propone</h2>
          {puedeGenerar && (
            <Boton variante="secundario" compacto icono="destello" onClick={() => setGenerando(true)}>
              Generar propuesta
            </Boton>
          )}
        </div>
        <p className={estilos.detalle}>Konoha sugiere un cronograma de ciclos. Nada se programa hasta que lo confirmes.</p>
        {cuerpo}
        <Boton
          variante="fantasma"
          compacto
          aria-expanded={conHistorial}
          onClick={() => transicionar(() => setConHistorial((valor) => !valor))}
        >
          {conHistorial ? 'Ocultar el historial' : 'Ver el historial de propuestas'}
        </Boton>
        {conHistorial && <HistorialPropuestas onAbrir={abrir} />}
      </section>
      {idPanel !== null && (
        <PanelRevisionCronograma id={idPanel} onCerrar={panel.cerrar} onCambio={ultima.reintentar} />
      )}
      <DialogoGenerarCronograma
        abierto={generando}
        onCerrar={() => setGenerando(false)}
        onCreada={(s) => {
          setGenerando(false)
          ultima.reintentar()
          abrir(s.id)
        }}
      />
    </>
  )
}
