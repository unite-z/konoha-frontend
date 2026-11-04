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
import { Link } from 'react-router'
import Boton from '@/components/ui/Boton'
import CampoFormulario, { AreaTexto } from '@/components/ui/CampoFormulario'
import Casilla from '@/components/ui/Casilla'
import DialogoConfirmacion from '@/components/ui/DialogoConfirmacion'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import Estado from '@/components/ui/Estado'
import Icono from '@/components/ui/Icono'
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
import { EFECTO_RESTRICCION } from '../resumen/resumenPlanificacion'
import { textoVentana } from './programarCiclo'
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
  // Parte del tipo; el jefe la puede cambiar en esta restricción (AV-366).
  const [ruidososElegido, setRuidososElegido] = useState<boolean | null>(null)
  const soloRuidosos = ruidososElegido ?? tipo?.aplica_servicios_ruidosos ?? false
  const setSoloRuidosos = (valor: boolean) => setRuidososElegido(valor)
  const [duplicado, setDuplicado] = useState(false)

  const fechasValidas = /^\d{4}-\d{2}-\d{2}$/.test(borrador.fechaInicio) && /^\d{4}-\d{2}-\d{2}$/.test(borrador.fechaFin)
  const inicios = !fechasValidas ? [] : repite && dias.length > 0 && hasta ? fechasDeRepeticion(borrador.fechaInicio, hasta, dias) : [borrador.fechaInicio]
  const duracion = fechasValidas ? duracionRestriccion(borrador.fechaInicio, borrador.fechaFin) : 1
  const ruidosos = new Set(servicios.filter((s) => s.es_ruidoso).map((s) => s.id))
  const afectados =
    tipo && tipo.efecto !== 'Favorable'
      ? ciclosAfectados(ciclos.datos ?? [], inicios, duracion, soloRuidosos, (id) => ruidosos.has(id))
      : []

  async function guardar(forzar = false) {
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
          ...(tipo ? { aplica_servicios_ruidosos: soloRuidosos } : {}),
          ...(forzar ? { forzar: true } : {}),
        }),
      )
    } catch (causa) {
      const fallo = aErrorApi(causa)
      // AV-257: otra restricción con el mismo tipo, fecha y lugar. Se pregunta y se puede guardar igualmente.
      if (fallo.codigo === 'posible-duplicado') {
        setDuplicado(true)
        enCurso.current = false
        setEnviando(false)
        return
      }
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

  const resumenDuplicado = [
    borrador.descripcion.trim() || tipo?.nombre,
    repite && dias.length > 0 && hasta ? `${textoRepeticion(dias, inicios.length).split(' · ')[0].toLowerCase()} hasta el ${hasta.slice(8, 10)}/${hasta.slice(5, 7)}` : fechasValidas ? textoVentana({ inicio: borrador.fechaInicio, fin: borrador.fechaFin }) : null,
    lugar ? lugar.nombre : 'todo el campus',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
    <DialogoFormulario
      abierto
      ancho="lateral"
      titulo="Nueva restricción"
      textoConfirmar="Guardar restricción"
      enviando={enviando}
      hayCambios={JSON.stringify(borrador) !== JSON.stringify(inicial) || Boolean(lugar) || repite}
      error={error ?? (tipos.estado === 'error' ? { titulo: 'No se pudieron cargar los tipos', detalle: tipos.error?.detalle ?? '' } : null)}
      conObligatorios={false}
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
          onCambiar={(valor) => {
            cambiar('tipo', valor)
            setRuidososElegido(null)
          }}
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

      <div className={estilos.fechasPanel}>
        {fecha('fechaInicio', 'Desde')}
        {fecha('fechaFin', 'Hasta')}
      </div>

      <SelectorBuscable<AreaVerde>
        id="restriccion-lugar"
        etiqueta="Lugar"
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
            <Boton variante="fantasma" compacto icono="plus" className={estilos.enlaceAccion} onClick={() => setConHorario(true)}>
              Añadir franja horaria
            </Boton>
          )}
          {!conNota && (
            <Boton variante="fantasma" compacto icono="plus" className={estilos.enlaceAccion} onClick={() => setConNota(true)}>
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

      {/* Como en Figma 364-2570: «Solo servicios ruidosos» parte del tipo y se puede cambiar (AV-366); la zona de alta
          actividad aún no tiene requisito ni ticket. */}
      <Casilla etiqueta="Solo servicios ruidosos" marcada={soloRuidosos} onCambiar={setSoloRuidosos} disabled={enviando || !tipo} />
      <div className={estilos.proximamente}>
        <Casilla etiqueta="Zona de alta actividad" marcada={false} onCambiar={() => {}} disabled />
        <Estado tono="neutro" texto="Próximamente" punto={false} />
      </div>
      <Casilla etiqueta="Se repite" marcada={repite} onCambiar={setRepite} disabled={enviando} />
      {repite && (
        <div className={estilos.bloqueAgenda}>
          <div className={estilos.repeticion}>
            <fieldset className={estilos.diasRepeticion} aria-describedby={errores.dias ? 'restriccion-dias-error' : undefined}>
              <legend className="sr-only">Días de la semana</legend>
              {DIAS_REPETICION.map((d) => {
                const elegido = dias.includes(d.valor)
                return (
                  <Boton
                    key={d.valor}
                    variante={elegido ? 'primario' : 'secundario'}
                    compacto
                    className={estilos.diaRepeticion}
                    aria-pressed={elegido}
                    deshabilitado={enviando}
                    onClick={() => setDias((previos) => (elegido ? previos.filter((x) => x !== d.valor) : [...previos, d.valor]))}
                  >
                    <span aria-hidden="true">{d.corto}</span>
                    <span className="sr-only">{d.nombre}</span>
                  </Boton>
                )
              })}
            </fieldset>
            <CampoFormulario id="restriccion-hasta" etiqueta="Hasta" obligatorio type="date" min={borrador.fechaInicio} value={hasta} onChange={(e) => setHasta(e.target.value)} error={errores.hasta} disabled={enviando} />
          </div>
          {errores.dias && (
            <p id="restriccion-dias-error" className={estilos.errorRepeticion}>
              {errores.dias}
            </p>
          )}
          {dias.length > 0 && inicios.length > 0 && <p className={estilos.detalle}>{textoRepeticion(dias, inicios.length)}</p>}
        </div>
      )}

      {afectados.length > 0 && (
        <>
          <AvisoEnLinea tono="advertencia" titulo={afectados.length === 1 ? 'Coincide con 1 ciclo programado' : `Coincide con ${afectados.length} ciclos programados`}>
            <ul className={estilos.listaAfectados}>
              {afectados.map((c) => (
                <li key={c.id}>
                  {c.servicio} · {textoVentana({ inicio: c.fecha_inicio_prevista, fin: c.fecha_fin_prevista })}
                </li>
              ))}
            </ul>
          </AvisoEnLinea>
          {/* «Revisar ciclo ›» bajo el aviso, como en Figma; con varios ciclos, uno por ciclo. */}
          <div className={estilos.accionesOpcionales}>
            {afectados.map((c) => (
              <Link key={c.id} to={rutaCiclo(c.id)} className={estilos.enlaceRuta}>
                {afectados.length === 1 ? 'Revisar ciclo' : `Revisar ${c.servicio}`}
                <Icono nombre="chevron-right" tamano="sm" />
              </Link>
            ))}
          </div>
        </>
      )}
    </DialogoFormulario>
    {duplicado && (
      <DialogoConfirmacion
        abierto
        titulo="Ya existe una restricción igual"
        consecuencia={resumenDuplicado}
        textoConfirmar="Guardar igualmente"
        cargando={enviando}
        onConfirmar={() => {
          setDuplicado(false)
          void guardar(true)
        }}
        onCancelar={() => setDuplicado(false)}
      />
    )}
    </>
  )
}
