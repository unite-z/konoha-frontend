import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton from '@/components/ui/Boton'
import CampoFormulario, { AreaTexto } from '@/components/ui/CampoFormulario'
import Estado from '@/components/ui/Estado'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoSinAcceso from '@/components/ui/EstadoSinAcceso'
import ListaDescripcion from '@/components/ui/ListaDescripcion'
import Selector from '@/components/ui/Selector'
import TablaDatos from '@/components/ui/TablaDatos'
import Tarjeta from '@/components/ui/Tarjeta'
import { PERMISOS, puede } from '@/config/permisosCore'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_INVENTARIO, RUTAS_INVENTARIO, rutaFichaTecnicaEjemplar } from '@/router/rutasApp'
import { aErrorApi } from '@/services/api/cliente'
import { listarEjemplares } from '@/services/api/ejemplares'
import { cambiarFichaTecnica, obtenerFichaTecnica, registrarEvaluacion } from '@/services/api/fichaTecnica'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import type {
  CambioFichaTecnica,
  EstadoSaludEjemplar,
  EvaluacionEjemplar,
  FichaTecnicaEjemplar,
  MedidaEjemplar,
  OrigenEjemplar,
} from '@/types/fichaTecnica'
import { formatearFecha } from '@/utils/formato'
import { hoyLima } from '@/utils/instanteLima'
import estilos from './CampanasPoda.module.css'

const ORIGENES: OrigenEjemplar[] = ['Nativo', 'Introducido', 'Desconocido']
const ESTADOS_SALUD: EstadoSaludEjemplar[] = ['Bueno', 'Regular', 'Malo']

const MEDIDAS: { clave: MedidaEjemplar; etiqueta: string; max: string; step: string }[] = [
  { clave: 'altura_total_m', etiqueta: 'Altura total (m)', max: '9999.99', step: '0.01' },
  { clave: 'altura_fuste_m', etiqueta: 'Altura del fuste (m)', max: '9999.99', step: '0.01' },
  { clave: 'dap_cm', etiqueta: 'DAP (cm)', max: '99999.9', step: '0.1' },
  { clave: 'radio_copa_m', etiqueta: 'Radio de copa (m)', max: '999.99', step: '0.01' },
]

/** Criterios de la evaluación (Figma 33:4734, HU-MOD02-012). */
type Criterio =
  | 'enfermedades_plagas'
  | 'danos_mecanicos_zunchado'
  | 'inclinacion_ramas_secas'
  | 'cavidades_pudricion'
  | 'raices_expuestas'
  | 'interferencia_infraestructura'

const CRITERIOS: { clave: Criterio; etiqueta: string }[] = [
  { clave: 'enfermedades_plagas', etiqueta: 'Enfermedades o plagas' },
  { clave: 'danos_mecanicos_zunchado', etiqueta: 'Daños mecánicos o zunchado' },
  { clave: 'inclinacion_ramas_secas', etiqueta: 'Inclinación o ramas secas' },
  { clave: 'cavidades_pudricion', etiqueta: 'Cavidades o pudrición' },
  { clave: 'raices_expuestas', etiqueta: 'Raíces expuestas' },
  { clave: 'interferencia_infraestructura', etiqueta: 'Interferencia con infraestructura' },
]

type Hallazgos = Record<Criterio, string>
const SIN_TEXTO: Hallazgos = {
  enfermedades_plagas: '',
  danos_mecanicos_zunchado: '',
  inclinacion_ramas_secas: '',
  cavidades_pudricion: '',
  raices_expuestas: '',
  interferencia_infraestructura: '',
}

type Medidas = Record<MedidaEjemplar, string>
function medidasDe(ficha: FichaTecnicaEjemplar): Medidas {
  return {
    altura_total_m: ficha.altura_total_m ?? '',
    altura_fuste_m: ficha.altura_fuste_m ?? '',
    dap_cm: ficha.dap_cm ?? '',
    radio_copa_m: ficha.radio_copa_m ?? '',
  }
}

function resumenHallazgos(evaluacion: EvaluacionEjemplar): string {
  if (evaluacion.sin_hallazgos) return 'Sin hallazgos'
  return CRITERIOS.filter((c) => evaluacion[c.clave])
    .map((c) => `${c.etiqueta}: ${evaluacion[c.clave]}`)
    .join(' · ')
}

/** Datos dasométricos, origen y estado de salud; solo cambia lo editado. */
function DatosDasometricos({
  ficha,
  editable,
  alGuardar,
}: {
  ficha: FichaTecnicaEjemplar
  editable: boolean
  alGuardar: () => void
}) {
  const [medidas, setMedidas] = useState<Medidas>(() => medidasDe(ficha))
  const [origen, setOrigen] = useState<string>(ficha.origen ?? '')
  const [salud, setSalud] = useState<string>(ficha.estado_salud ?? '')
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const originales = medidasDe(ficha)
  const cambio: CambioFichaTecnica = {}
  const vaciar: MedidaEjemplar[] = []
  for (const { clave } of MEDIDAS) {
    const valor = medidas[clave].trim()
    if (valor === originales[clave]) continue
    if (valor) cambio[clave] = valor
    else vaciar.push(clave)
  }
  if (vaciar.length) cambio.vaciar = vaciar
  if (origen && origen !== (ficha.origen ?? '')) cambio.origen = origen as OrigenEjemplar
  if (salud && salud !== (ficha.estado_salud ?? '')) cambio.estado_salud = salud as EstadoSaludEjemplar
  const hayCambios = Object.keys(cambio).length > 0

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!hayCambios) return
    setError(null)
    setAviso(null)
    setGuardando(true)
    try {
      const actualizada = await cambiarFichaTecnica(ficha.id, cambio)
      setMedidas(medidasDe(actualizada))
      setAviso('Ficha técnica actualizada.')
      alGuardar()
    } catch (causa) {
      setError(aErrorApi(causa).detalle)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Tarjeta
      titulo="Datos dasométricos"
      descripcion="Medidas del ejemplar, origen y estado de salud general."
      junto={ficha.pendiente_medir ? <Estado tono="aviso" texto="Pendiente de medir" /> : undefined}
      relleno="amplio"
    >
      {error && <AvisoEnLinea tono="error">{error}</AvisoEnLinea>}
      {aviso && <AvisoEnLinea tono="exito">{aviso}</AvisoEnLinea>}
      {editable ? (
        <form className={estilos.pagina} onSubmit={(evento) => void guardar(evento)}>
          <div className={estilos.campos}>
            {MEDIDAS.map((medida) => (
              <CampoFormulario
                key={medida.clave}
                id={`ficha-${medida.clave}`}
                etiqueta={medida.etiqueta}
                type="number"
                min="0"
                max={medida.max}
                step={medida.step}
                value={medidas[medida.clave]}
                onChange={(evento) => setMedidas((actual) => ({ ...actual, [medida.clave]: evento.target.value }))}
              />
            ))}
            <Selector
              id="ficha-origen"
              etiqueta="Origen"
              valor={origen}
              onCambiar={setOrigen}
              opcionTodos="Sin registrar"
              opciones={ORIGENES.map((valor) => ({ valor, texto: valor }))}
            />
            <Selector
              id="ficha-estado-salud"
              etiqueta="Estado de salud"
              valor={salud}
              onCambiar={setSalud}
              opcionTodos="Sin registrar"
              opciones={ESTADOS_SALUD.map((valor) => ({ valor, texto: valor }))}
            />
          </div>
          <div className={estilos.acciones}>
            <Boton type="submit" variante="primario" cargando={guardando} deshabilitado={!hayCambios}>
              Guardar ficha técnica
            </Boton>
          </div>
        </form>
      ) : (
        <ListaDescripcion
          elementos={[
            ...MEDIDAS.map((m) => ({ etiqueta: m.etiqueta, valor: ficha[m.clave] ?? '—' })),
            { etiqueta: 'Origen', valor: ficha.origen ?? '—' },
            { etiqueta: 'Estado de salud', valor: ficha.estado_salud ?? '—' },
          ]}
        />
      )}
    </Tarjeta>
  )
}

/** Evaluación fitosanitaria y estructural (Figma 33:4734). No se edita: una corrección es otra evaluación. */
function NuevaEvaluacion({ ejemplarId, alGuardar }: { ejemplarId: number; alGuardar: () => void }) {
  const [fecha, setFecha] = useState(hoyLima())
  const [hallazgos, setHallazgos] = useState<Hallazgos>(SIN_TEXTO)
  const [manejo, setManejo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const conHallazgos = CRITERIOS.some((c) => hallazgos[c.clave].trim())

  async function guardar(sinHallazgos: boolean) {
    setError(null)
    setAviso(null)
    setGuardando(true)
    const texto = (valor: string) => valor.trim() || null
    try {
      await registrarEvaluacion(ejemplarId, {
        fecha,
        sin_hallazgos: sinHallazgos,
        enfermedades_plagas: sinHallazgos ? null : texto(hallazgos.enfermedades_plagas),
        danos_mecanicos_zunchado: sinHallazgos ? null : texto(hallazgos.danos_mecanicos_zunchado),
        inclinacion_ramas_secas: sinHallazgos ? null : texto(hallazgos.inclinacion_ramas_secas),
        cavidades_pudricion: sinHallazgos ? null : texto(hallazgos.cavidades_pudricion),
        raices_expuestas: sinHallazgos ? null : texto(hallazgos.raices_expuestas),
        interferencia_infraestructura: sinHallazgos ? null : texto(hallazgos.interferencia_infraestructura),
        manejo_recomendado: sinHallazgos ? null : texto(manejo),
      })
      setHallazgos(SIN_TEXTO)
      setManejo('')
      setAviso(sinHallazgos ? 'Evaluación guardada sin hallazgos.' : 'Evaluación guardada.')
      alGuardar()
    } catch (causa) {
      setError(aErrorApi(causa).detalle)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Tarjeta
      titulo="Evaluación fitosanitaria y estructural"
      descripcion="Describe lo observado en cada criterio y el manejo recomendado, o márcala sin hallazgos."
      relleno="amplio"
    >
      {error && <AvisoEnLinea tono="error">{error}</AvisoEnLinea>}
      {aviso && <AvisoEnLinea tono="exito">{aviso}</AvisoEnLinea>}
      <form
        className={estilos.pagina}
        onSubmit={(evento) => {
          evento.preventDefault()
          if (conHallazgos && manejo.trim()) void guardar(false)
        }}
      >
        <div className={estilos.campos}>
          <CampoFormulario
            id="evaluacion-fecha"
            etiqueta="Fecha de evaluación"
            type="date"
            max={hoyLima()}
            required
            value={fecha}
            onChange={(evento) => setFecha(evento.target.value)}
          />
        </div>
        <div className={estilos.campos}>
          {CRITERIOS.map((criterio) => (
            <AreaTexto
              key={criterio.clave}
              id={`evaluacion-${criterio.clave}`}
              etiqueta={criterio.etiqueta}
              maxLength={300}
              value={hallazgos[criterio.clave]}
              onChange={(evento) => setHallazgos((actual) => ({ ...actual, [criterio.clave]: evento.target.value }))}
            />
          ))}
        </div>
        <AreaTexto
          id="evaluacion-manejo"
          etiqueta="Manejo recomendado"
          maxLength={500}
          required={conHallazgos}
          value={manejo}
          onChange={(evento) => setManejo(evento.target.value)}
        />
        <div className={estilos.acciones}>
          <Boton
            type="submit"
            variante="primario"
            cargando={guardando}
            deshabilitado={!fecha || !conHallazgos || !manejo.trim()}
          >
            Guardar evaluación
          </Boton>
          <Boton
            type="button"
            variante="secundario"
            deshabilitado={guardando || !fecha || conHallazgos}
            onClick={() => void guardar(true)}
          >
            Sin hallazgos
          </Boton>
        </div>
      </form>
    </Tarjeta>
  )
}

/** Entrada desde el menú: busca el ejemplar y abre su ficha. */
function ElegirEjemplar() {
  const navegar = useNavigate()
  const [busqueda, setBusqueda] = useState('')
  const [termino, setTermino] = useState('')
  const [ejemplarId, setEjemplarId] = useState('')
  const ejemplares = useConsulta(`ficha-tecnica-ejemplares|${termino}`, (signal) =>
    listarEjemplares(termino, 1, signal),
  )

  if (ejemplares.error?.estado === 403) return <EstadoSinAcceso descripcion={ejemplares.error.detalle} />

  return (
    <form
      className={estilos.pagina}
      onSubmit={(evento) => {
        evento.preventDefault()
        if (ejemplarId) navegar(rutaFichaTecnicaEjemplar(Number(ejemplarId)))
      }}
    >
      <p className={estilos.descripcion}>
        Datos dasométricos, estado de salud y evaluaciones fitosanitarias y estructurales de cada ejemplar.
      </p>
      <Tarjeta titulo="Elegir ejemplar" relleno="amplio">
        <div className={estilos.busqueda} role="search" aria-label="Buscar ejemplares">
          <CampoFormulario
            id="buscar-ejemplar-ficha"
            etiqueta="Buscar por código o especie"
            type="search"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
          />
          <Boton type="button" variante="secundario" onClick={() => setTermino(busqueda.trim())}>
            Buscar
          </Boton>
        </div>
        {ejemplares.estado === 'error' && (
          <EstadoError
            titulo="No se pudieron cargar los ejemplares"
            descripcion={ejemplares.error?.detalle ?? ''}
            onReintentar={ejemplares.reintentar}
            nivel={3}
          />
        )}
        <div className={estilos.campos}>
          <Selector
            id="ejemplar-ficha"
            etiqueta="Ejemplar"
            valor={ejemplarId}
            onCambiar={setEjemplarId}
            opcionTodos="Selecciona un ejemplar"
            opciones={(ejemplares.datos ?? []).map((e) => ({
              valor: String(e.id),
              texto: `${e.codigo} · ${e.especie_nombre_comun ?? 'Especie sin asignar'}`,
            }))}
          />
        </div>
      </Tarjeta>
      <div className={estilos.acciones}>
        <Boton type="submit" variante="primario" deshabilitado={!ejemplarId}>
          Ver ficha técnica
        </Boton>
      </div>
    </form>
  )
}

export default function FichaTecnicaEjemplarPage() {
  const idRuta = useParams().id
  const id = Number(idRuta)
  const navegar = useNavigate()
  const sesion = useSesionActiva()
  const puedeRegistrar = puede(sesion, PERMISOS.registrarInventario)
  const consulta = useConsulta(idRuta ? `ficha-tecnica|${id}` : null, (signal) => obtenerFichaTecnica(id, signal))
  const ficha = consulta.datos?.id === id ? consulta.datos : null
  usePaginaActual(ficha ? `Ficha técnica · ${ficha.codigo}` : 'Ficha técnica', [
    MIGAS_INVENTARIO.areasVerdes,
    MIGAS_INVENTARIO.ejemplares,
    { texto: 'Ficha técnica' },
  ])

  if (!idRuta) return <ElegirEjemplar />

  if (consulta.error?.estado === 403) return <EstadoSinAcceso descripcion={consulta.error.detalle} />
  if (consulta.estado === 'error' && !ficha) {
    return (
      <EstadoError
        titulo="No pudimos cargar la ficha técnica"
        descripcion={consulta.error?.detalle ?? ''}
        onReintentar={consulta.reintentar}
      />
    )
  }
  if (!ficha) return <EstadoCarga forma="tabla" texto="Cargando ficha técnica…" retrasar />

  return (
    <div className={estilos.pagina}>
      <Tarjeta
        titulo={`Ejemplar ${ficha.codigo}`}
        junto={
          ficha.estado_salud ? (
            <Estado
              tono={ficha.estado_salud === 'Bueno' ? 'exito' : ficha.estado_salud === 'Regular' ? 'aviso' : 'error'}
              texto={`Salud: ${ficha.estado_salud}`}
            />
          ) : undefined
        }
        relleno="amplio"
      >
        <ListaDescripcion
          elementos={[
            { etiqueta: 'Especie', valor: ficha.especie_nombre_comun ?? 'Especie sin asignar' },
            !!ficha.especie_nombre_cientifico && {
              etiqueta: 'Nombre científico',
              valor: ficha.especie_nombre_cientifico,
            },
            !!ficha.especie_forma_biologica && { etiqueta: 'Forma biológica', valor: ficha.especie_forma_biologica },
            { etiqueta: 'Área verde', valor: ficha.area_verde_nombre ?? '—' },
            !!ficha.cuartel_nombre && { etiqueta: 'Cuartel', valor: ficha.cuartel_nombre },
          ]}
        />
      </Tarjeta>

      <DatosDasometricos key={ficha.id} ficha={ficha} editable={puedeRegistrar} alGuardar={consulta.reintentar} />

      {puedeRegistrar && <NuevaEvaluacion ejemplarId={ficha.id} alGuardar={consulta.reintentar} />}

      <TablaDatos
        titulo="Evaluaciones registradas"
        tituloVisible
        columnas={[
          { clave: 'fecha', titulo: 'Fecha', render: (fila) => formatearFecha(fila.fecha) },
          { clave: 'autor', titulo: 'Evaluó' },
          { clave: 'hallazgos', titulo: 'Hallazgos', render: resumenHallazgos },
          { clave: 'manejo', titulo: 'Manejo recomendado', render: (fila) => fila.manejo_recomendado ?? '—' },
        ]}
        filas={ficha.evaluaciones}
        claveFila={(fila) => String(fila.id)}
        vacio={{ titulo: 'Sin evaluaciones', descripcion: 'Este ejemplar aún no tiene evaluaciones registradas.' }}
      />

      <div className={estilos.acciones}>
        <Boton variante="secundario" onClick={() => navegar(RUTAS_INVENTARIO.fichaTecnica)}>
          Elegir otro ejemplar
        </Boton>
      </div>
    </div>
  )
}
