/**
 * Panel «Nueva restricción» (AV-268, Figma 364-2570; HU-MOD03-003). Sustituye al diálogo antiguo:
 * - tipo con su nivel (aviso, prohibición o favorable) y si solo afecta a los servicios ruidosos (lo decide el tipo);
 * - fechas, lugar opcional (sin lugar, todo el campus), franja horaria y nota opcionales;
 * - «Se repite»: días de la semana y hasta cuándo, con el número de fechas que genera (máximo 200);
 * - aviso con los ciclos programados o en curso que coinciden, calculado aquí con `GET programaciones/`.
 * El aviso de duplicado y los ciclos afectados del backend llegan con AV-257; «Zona de alta actividad», más adelante.
 */
import { useRef, useState } from 'react'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton, { BotonEnlace } from '@/components/ui/Boton'
import CampoFormulario, { AreaTexto } from '@/components/ui/CampoFormulario'
import Casilla from '@/components/ui/Casilla'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import Estado from '@/components/ui/Estado'
import Selector from '@/components/ui/Selector'
import SelectorBuscable from '@/components/ui/SelectorBuscable'
import { useConsulta } from '@/hooks/useConsulta'
import { rutaCiclo } from '@/router/rutasApp'
import { listarAreasVerdes } from '@/services/api/areasVerdes'
import { aErrorApi } from '@/services/api/cliente'
import { crearRestriccion, listarProgramaciones, listarTiposRestriccion } from '@/services/api/planificacion'
import type { AreaVerde } from '@/types/areasVerdes'
import type { Restriccion, ServicioPeriodico } from '@/types/planificacion'
import { hoyLima } from '@/utils/instanteLima'
import { validarRestriccion, type BorradorRestriccion, type ErroresRestriccion } from '@/utils/validacionPlanificacion'
import { rangoCiclos } from '../ciclos/ciclos'
import { EFECTO_RESTRICCION, periodoRestriccion } from '../resumen/resumenPlanificacion'
import estilos from './Calendario.module.css'
import { DIAS_REPETICION, ciclosAfectados, duracionRestriccion, errorRepeticion, fechasDeRepeticion, textoRepeticion } from './nuevaRestriccion'

export interface PanelNuevaRestriccionProps {
  /** Fecha sugerida para el inicio y el fin (`AAAA-MM-DD`). */
  fechaInicial: string
  servicios: ServicioPeriodico[]
  onCerrar: () => void
  onCreadas: (restricciones: Restriccion[]) => void
}

const CAMPOS_API: Record<string, keyof BorradorRestriccion> = {
  tipo_restriccion_id: 'tipo',
  fecha_inicio: 'fechaInicio',
  fecha_fin: 'fechaFin',
  hora_inicio: 'horaInicio',
  hora_fin: 'horaFin',
  descripcion: 'descripcion',
}

type Errores = ErroresRestriccion & { dias?: string; hasta?: string }

export default function PanelNuevaRestriccion({ fechaInicial, servicios, onCerrar, onCreadas }: PanelNuevaRestriccionProps) {
  const inicial: BorradorRestriccion = { tipo: '', fechaInicio: fechaInicial, fechaFin: fechaInicial, horaInicio: '', horaFin: '', descripcion: '' }
  const [borrador, setBorrador] = useState(inicial)
  const [lugar, setLugar] = useState<AreaVerde | null>(null)
  const [conHorario, setConHorario] = useState(false)
  const [conNota, setConNota] = useState(false)
  const [repite, setRepite] = useState(false)
  const [dias, setDias] = useState<number[]>([])
  const [hasta, setHasta] = useState('')
  const [errores, setErrores] = useState<Errores>({})
  const [error, setError] = useState<{ titulo: string; detalle: string } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const enCurso = useRef(false)

  const tipos = useConsulta('tipos-restriccion', listarTiposRestriccion)
  const { desde, hasta: hastaCiclos } = rangoCiclos(hoyLima())
  const ciclos = useConsulta(`ciclos:${desde}`, (signal) => listarProgramaciones(desde, hastaCiclos, signal))
  const tipo = tipos.datos?.find((t) => String(t.id) === borrador.tipo)

  const fechasValidas = /^\d{4}-\d{2}-\d{2}$/.test(borrador.fechaInicio) && /^\d{4}-\d{2}-\d{2}$/.test(borrador.fechaFin)
  const inicios = !fechasValidas ? [] : repite && dias.length > 0 && hasta ? fechasDeRepeticion(borrador.fechaInicio, hasta, dias) : [borrador.fechaInicio]
  const duracion = fechasValidas ? duracionRestriccion(borrador.fechaInicio, borrador.fechaFin) : 1
  const ruidosos = new Set(servicios.filter((s) => s.es_ruidoso).map((s) => s.id))
  const afectados =
    tipo && tipo.efecto !== 'Favorable'
      ? ciclosAfectados(ciclos.datos ?? [], inicios, duracion, tipo.aplica_servicios_ruidosos, (id) => ruidosos.has(id))
      : []

  async function guardar() {
    if (enCurso.current) return
    const { errores: locales, entrada } = validarRestriccion(borrador)
    const repeticion = repite ? errorRepeticion(borrador.fechaInicio, hasta, dias) : undefined
    const todos: Errores = { ...locales, ...(repeticion ? { [repeticion.campo]: repeticion.mensaje } : {}) }
    setErrores(todos)
    setError(null)
    if (!entrada || repeticion) return
    enCurso.current = true
    setEnviando(true)
    try {
      onCreadas(
        await crearRestriccion({
          ...entrada,
          ...(lugar ? { area_verde_id: lugar.id } : {}),
          ...(repite ? { recurrencia: { dias_semana: [...dias].sort(), hasta } } : {}),
        }),
      )
    } catch (causa) {
      const fallo = aErrorApi(causa)
      const delServidor: Errores = {}
      for (const [campoApi, mensajes] of Object.entries(fallo.errores_campo)) {
        const campo = CAMPOS_API[campoApi]
        if (campo && mensajes.length) delServidor[campo] = mensajes.join('. ')
      }
      if (fallo.codigo === 'periodo-invalido') delServidor.fechaFin = fallo.detalle
      if (fallo.codigo === 'recurrencia-invalida') delServidor.hasta = fallo.detalle
      setErrores(delServidor)
      if (Object.keys(delServidor).length === 0) setError({ titulo: fallo.estado === 403 ? 'Sin permiso' : 'No se pudo guardar', detalle: fallo.detalle })
      enCurso.current = false
      setEnviando(false)
    }
  }

  const cambiar = (clave: keyof BorradorRestriccion, valor: string) => setBorrador((b) => ({ ...b, [clave]: valor }))
  const fecha = (clave: 'fechaInicio' | 'fechaFin', etiqueta: string) => (
    <CampoFormulario id={`restriccion-${clave}`} etiqueta={etiqueta} obligatorio type="date" value={borrador[clave]} onChange={(e) => cambiar(clave, e.target.value)} error={errores[clave]} disabled={enviando} />
  )
  const hora = (clave: 'horaInicio' | 'horaFin', etiqueta: string) => (
    <CampoFormulario id={`restriccion-${clave}`} etiqueta={etiqueta} type="time" value={borrador[clave]} onChange={(e) => cambiar(clave, e.target.value)} error={errores[clave]} disabled={enviando} />
  )
  const nivel = tipo ? EFECTO_RESTRICCION[tipo.efecto] : null

  return (
    <DialogoFormulario
      abierto
      ancho="lateral"
      titulo="Nueva restricción"
      textoConfirmar="Guardar restricción"
      enviando={enviando}
      hayCambios={JSON.stringify(borrador) !== JSON.stringify(inicial) || Boolean(lugar) || repite}
      error={error ?? (tipos.estado === 'error' ? { titulo: 'No se pudieron cargar los tipos', detalle: tipos.error?.detalle ?? '' } : null)}
      onEnviar={() => void guardar()}
      onCerrar={onCerrar}
    >
      <div className={estilos.tipoConNivel}>
        <Selector
          id="restriccion-tipo"
          etiqueta="Tipo"
          obligatorio
          valor={borrador.tipo}
          opcionTodos="Elige un tipo"
          opciones={(tipos.datos ?? []).map((t) => ({ valor: String(t.id), texto: t.nombre }))}
          onCambiar={(valor) => cambiar('tipo', valor)}
          error={errores.tipo}
          disabled={enviando}
        />
        {nivel && (
          <div className={estilos.nivel}>
            <span className={estilos.detalle}>Nivel</span>
            <Estado tono={nivel.tono} texto={nivel.texto} punto />
          </div>
        )}
      </div>
      {tipo?.aplica_servicios_ruidosos && <p className={estilos.detalle}>Este tipo solo afecta a los servicios ruidosos.</p>}

      <div className={estilos.fechasPanel}>
        {fecha('fechaInicio', 'Desde')}
        {fecha('fechaFin', 'Hasta')}
      </div>

      <SelectorBuscable<AreaVerde>
        id="restriccion-lugar"
        etiqueta="Lugar"
        ayuda="Sin lugar, la restricción es de todo el campus."
        valor={lugar}
        claveDe={(a) => a.id}
        textoDe={(a) => a.nombre}
        detalleDe={(a) => a.lugar}
        buscar={(texto, signal) => listarAreasVerdes(texto, signal)}
        onCambiar={setLugar}
        placeholder="Busca un área verde"
      />

      {(!conHorario || !conNota) && (
        <div className={estilos.accionesOpcionales}>
          {!conHorario && (
            <Boton variante="fantasma" compacto icono="plus" onClick={() => setConHorario(true)}>
              Añadir franja horaria
            </Boton>
          )}
          {!conNota && (
            <Boton variante="fantasma" compacto icono="plus" onClick={() => setConNota(true)}>
              Añadir nota
            </Boton>
          )}
        </div>
      )}
      {conHorario && (
        <div className={estilos.fechasPanel}>
          {hora('horaInicio', 'Hora de inicio')}
          {hora('horaFin', 'Hora de fin')}
        </div>
      )}
      {conNota && (
        <AreaTexto id="restriccion-descripcion" etiqueta="Nota" maxLength={200} value={borrador.descripcion} onChange={(e) => cambiar('descripcion', e.target.value)} error={errores.descripcion} disabled={enviando} />
      )}

      <Casilla etiqueta="Se repite" marcada={repite} onCambiar={setRepite} disabled={enviando} />
      {repite && (
        <div className={estilos.bloqueAgenda}>
          <fieldset className={estilos.diasRepeticion} aria-describedby={errores.dias ? 'restriccion-dias-error' : undefined}>
            <legend className={estilos.detalle}>Días de la semana</legend>
            {DIAS_REPETICION.map((d) => (
              <Casilla
                key={d.valor}
                etiqueta={d.nombre}
                marcada={dias.includes(d.valor)}
                onCambiar={(marcada) => setDias((previos) => (marcada ? [...previos, d.valor] : previos.filter((x) => x !== d.valor)))}
                disabled={enviando}
              />
            ))}
          </fieldset>
          {errores.dias && (
            <p id="restriccion-dias-error" className={estilos.errorRepeticion}>
              {errores.dias}
            </p>
          )}
          <CampoFormulario id="restriccion-hasta" etiqueta="Se repite hasta" obligatorio type="date" min={borrador.fechaInicio} value={hasta} onChange={(e) => setHasta(e.target.value)} error={errores.hasta} disabled={enviando} />
          {dias.length > 0 && inicios.length > 0 && <p className={estilos.detalle}>{textoRepeticion(dias, inicios.length)}</p>}
        </div>
      )}

      {afectados.length > 0 && (
        <AvisoEnLinea tono="advertencia" titulo={afectados.length === 1 ? 'Coincide con 1 ciclo programado' : `Coincide con ${afectados.length} ciclos programados`}>
          <ul className={estilos.listaAfectados}>
            {afectados.map((c) => (
              <li key={c.id}>
                {c.servicio} · {periodoRestriccion(c.fecha_inicio_prevista, c.fecha_fin_prevista)}{' '}
                <BotonEnlace to={rutaCiclo(c.id)} variante="fantasma" compacto>
                  Revisar ciclo
                </BotonEnlace>
              </li>
            ))}
          </ul>
        </AvisoEnLinea>
      )}
    </DialogoFormulario>
  )
}
