/**
 * «Konoha revisó la evidencia» (RD-55): el último análisis de evidencia fitosanitaria de una atención o de un ejemplar,
 * «Nuevo análisis» (de 1 a 5 fotos, `DialogoNuevoAnalisis`) y su revisión con `RevisionIa` y el adaptador de la
 * evidencia. Nunca indica un tratamiento. Pide `REP.INDICADOR.CONSULTAR` (el de los asistentes); solicitar análisis,
 * `IA.PROPUESTA.PROPONER`; validar, `IA.PROPUESTA.VALIDAR`.
 *
 * Movimiento: la revisión se despliega dentro del bloque con un fundido y las hipótesis entran en cascada corta. Con
 * «reducir movimiento», cambio directo.
 */
import { useCallback, useId, useMemo, useState } from 'react'
import AvisoTemporal from '@/design-system/AvisoTemporal'
import Boton from '@/design-system/Boton'
import Estado from '@/design-system/Estado'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import { PERMISO_CONSULTA_REPORTES, PERMISO_SOLICITAR_IA, PERMISO_VALIDAR_IA } from '@/config/permisos'
import { tiene } from '@/config/permisosSesion'
import { useConsulta } from '@/hooks/useConsulta'
import DialogoEvaluacionManual, {
  type ContextoManual,
} from '@/pages/reportes-indicadores/asistencia-ia/evidencia/DialogoEvaluacionManual'
import DialogoNuevoAnalisis, {
  type InicialNuevoAnalisis,
} from '@/pages/reportes-indicadores/asistencia-ia/evidencia/DialogoNuevoAnalisis'
import { transicionar } from '@/rediseno/base/movimiento'
import { buscarEjemplaresEvidencia } from '@/services/api/evidenciaFitosanitariaIa'
import { usePermisos } from '@/sesion/ContextoSesion'
import type { AtencionBuscable, SugerenciaEvidencia } from '@/types/evidenciaFitosanitariaIa'
import { estadoEvidencia, hipotesisPrincipal, tituloEvidencia } from '@/utils/evidenciaFitosanitariaIa'
import { formatearFechaHora, formatearNumero } from '@/utils/formato'
import estilos from './EvidenciaKonoha.module.css'
import RevisionEvidencia from './RevisionEvidencia'
import type { AccionesEvidencia } from './ResumenEvidencia'
import { ultimoAnalisis, type ObjetivoEvidencia } from './ultimoAnalisis'

export interface EvidenciaKonohaProps {
  objetivo: ObjetivoEvidencia
  /**
   * Planta de la atención para «Nuevo análisis» (la del alcance de la ficha). `null`: la atención no tiene ejemplar
   * en su alcance y no se ofrece. Sin ella (vista del ejemplar), se usa la del último análisis.
   */
  plantaAtencion?: AtencionBuscable | null
  /** Abre la revisión del último análisis al montar (`?evidencia=1`). */
  abiertoInicial?: boolean
  /** Sin permiso de entrada: `false` no pinta nada (la ficha); `true` muestra el estado «sin acceso» (la vista propia). */
  mostrarSinAcceso?: boolean
}

type Dialogo = { tipo: 'nuevo'; inicial: InicialNuevoAnalisis | null } | { tipo: 'manual'; contexto: ContextoManual }

/** Planta del análisis para el diálogo de nuevas fotos: la atención con su ejemplar, o el ejemplar. */
function inicialDe(s: SugerenciaEvidencia): InicialNuevoAnalisis {
  const { atencion, ejemplar, sintomas } = s.contenido
  const base: InicialNuevoAnalisis = { paso: 1, sintomas: sintomas ?? '' }
  if (atencion && ejemplar)
    return {
      ...base,
      atencion: { id: atencion.id, ejemplar, plaga: atencion.codigo },
    }
  return ejemplar ? { ...base, ejemplar } : base
}

function manualDe(s: SugerenciaEvidencia): ContextoManual {
  const { atencion, ejemplar } = s.contenido
  return {
    ejemplar_id: atencion ? null : (ejemplar?.id ?? null),
    atencion_id: atencion?.id ?? null,
    texto: tituloEvidencia(s.contenido),
  }
}

/** Busca el ejemplar por su id para abrir «Nuevo análisis» en las fotos; si no aparece, el diálogo parte de la planta. */
async function inicialDelEjemplar(id: number): Promise<InicialNuevoAnalisis | null> {
  try {
    const ejemplar = (await buscarEjemplaresEvidencia(String(id))).results.find((e) => e.id === id)
    return ejemplar ? { ejemplar, paso: 1 } : null
  } catch {
    return null
  }
}

export default function EvidenciaKonoha({
  objetivo,
  plantaAtencion,
  abiertoInicial = false,
  mostrarSinAcceso = false,
}: EvidenciaKonohaProps) {
  const permisos = usePermisos()
  const puedeVer = tiene(permisos, PERMISO_CONSULTA_REPORTES)
  const puedeSolicitar = tiene(permisos, PERMISO_SOLICITAR_IA)
  const puedeValidar = tiene(permisos, PERMISO_VALIDAR_IA)
  const idTitulo = useId()
  const [abierto, setAbierto] = useState(abiertoInicial)
  // Análisis elegido por la persona (el recién creado); sin él, el último de la lista.
  const [elegido, setElegido] = useState<number | null>(null)
  const [dialogo, setDialogo] = useState<Dialogo | null>(null)
  const [aperturas, setAperturas] = useState(0)
  const [aviso, setAviso] = useState<string | null>(null)
  const cerrarAviso = useCallback(() => setAviso(null), [])

  const ultima = useConsulta(
    puedeVer ? `evidencia-ultima|${objetivo.tipo}|${objetivo.id}` : null,
    (signal) => ultimoAnalisis(objetivo, signal),
    (datos) => datos === null,
  )
  const analisis = ultima.datos
  const idRevision = elegido ?? analisis?.id ?? null

  const abrirDialogo = useCallback((siguiente: Dialogo) => {
    setAperturas((n) => n + 1)
    setDialogo(siguiente)
  }, [])
  const releer = ultima.reintentar
  const alRegistrar = (s: SugerenciaEvidencia, mensaje: string) => {
    setDialogo(null)
    setAviso(mensaje)
    setElegido(s.id)
    releer()
    transicionar(() => setAbierto(true))
  }

  const acciones = useMemo<AccionesEvidencia>(
    () => ({
      puedeSolicitar,
      puedeValidar,
      nuevasFotos: (s) => abrirDialogo({ tipo: 'nuevo', inicial: inicialDe(s) }),
      registrarManual: (s) => abrirDialogo({ tipo: 'manual', contexto: manualDe(s) }),
    }),
    [puedeSolicitar, puedeValidar, abrirDialogo],
  )

  // En la atención, la planta es la de su alcance; en el ejemplar, la del último análisis o la que se encuentre.
  const sinPlanta = objetivo.tipo === 'atencion' && plantaAtencion === null
  const nuevoAnalisis = async () => {
    let inicial: InicialNuevoAnalisis | null
    if (objetivo.tipo === 'atencion') inicial = plantaAtencion ? { atencion: plantaAtencion, paso: 1 } : null
    else if (analisis?.contenido.ejemplar) inicial = { ejemplar: analisis.contenido.ejemplar, paso: 1 }
    else inicial = await inicialDelEjemplar(objetivo.id)
    abrirDialogo({ tipo: 'nuevo', inicial })
  }

  if (!puedeVer) {
    return mostrarSinAcceso ? (
      <EstadoSinAcceso
        titulo="No puedes ver el análisis"
        descripcion="Tu cuenta no tiene permiso para consultar los asistentes de IA."
      />
    ) : null
  }

  let cuerpo
  if (ultima.error?.estado === 403) cuerpo = <EstadoSinAcceso nivel={3} titulo="No puedes ver los análisis" />
  else if (ultima.error?.estado === 404)
    cuerpo = (
      <EstadoVacio
        nivel={3}
        titulo="Konoha aún no revisa evidencia"
        descripcion="Esta función no está disponible todavía en el servidor."
      />
    )
  else if (ultima.error && !analisis)
    cuerpo = (
      <EstadoError
        nivel={3}
        titulo="No pudimos cargar el último análisis"
        descripcion={ultima.error.detalle}
        onReintentar={ultima.reintentar}
      />
    )
  else if (!analisis && ultima.estado !== 'vacio')
    cuerpo = ultima.cargaVisible ? <p role="status">Cargando el análisis…</p> : null
  else if (!analisis)
    cuerpo = (
      <EstadoVacio
        nivel={3}
        titulo="Aún no se ha analizado la evidencia"
        descripcion={
          puedeSolicitar && !sinPlanta
            ? 'Sube de 1 a 5 fotos con «Nuevo análisis».'
            : 'Aparecerá aquí cuando se analice.'
        }
      />
    )
  else
    cuerpo = (
      <div className={estilos.ultima}>
        <span className={estilos.textos}>
          <span className={estilos.titulo}>{hipotesisPrincipal(analisis.contenido)}</span>
          <span className={estilos.detalle}>
            {formatearNumero(analisis.contenido.fotografias.length)} fotos · analizado el{' '}
            {formatearFechaHora(analisis.fecha_creacion)}
          </span>
        </span>
        <Estado {...estadoEvidencia(analisis.estado, analisis.contenido.validacion)} />
        <Boton
          variante="primario"
          compacto
          aria-expanded={abierto}
          onClick={() => transicionar(() => setAbierto((v) => !v))}
        >
          {abierto ? 'Ocultar el análisis' : analisis.estado === 'Propuesta' ? 'Revisar análisis' : 'Ver análisis'}
        </Boton>
      </div>
    )

  return (
    <section className={estilos.bloque} aria-labelledby={idTitulo}>
      <div className={estilos.cabecera}>
        <h2 id={idTitulo}>Konoha revisó la evidencia</h2>
        {puedeSolicitar && !sinPlanta && (
          <Boton variante="secundario" compacto icono="camera" onClick={() => void nuevoAnalisis()}>
            Nuevo análisis
          </Boton>
        )}
      </div>
      <p className={estilos.detalle}>
        Konoha sugiere posibles afectaciones a partir de las fotos. Son hipótesis: solo se registra la categoría que
        valides y nunca se indica un tratamiento.
      </p>
      {puedeSolicitar && sinPlanta && (
        <p className={estilos.detalle}>
          Esta atención no tiene un ejemplar en su alcance: analiza las fotos desde la ficha del ejemplar en el Mapa.
        </p>
      )}
      {cuerpo}
      {abierto && idRevision !== null && (
        <div className={estilos.despliegue}>
          <RevisionEvidencia id={idRevision} acciones={acciones} onCambio={releer} />
        </div>
      )}
      {dialogo?.tipo === 'nuevo' && (
        <DialogoNuevoAnalisis
          key={aperturas}
          abierto
          inicial={dialogo.inicial}
          onCerrar={() => setDialogo(null)}
          onCreado={(s) => alRegistrar(s, 'Análisis generado: pendiente de validación técnica')}
          onManual={(contexto) => abrirDialogo({ tipo: 'manual', contexto })}
        />
      )}
      <DialogoEvaluacionManual
        contexto={dialogo?.tipo === 'manual' ? dialogo.contexto : null}
        onCerrar={() => setDialogo(null)}
        onRegistrada={(s) => alRegistrar(s, 'Evaluación registrada sin IA')}
      />
      <AvisoTemporal mensaje={aviso} onCerrar={cerrarAviso} />
    </section>
  )
}
