// RF-IA-002 · HU-MOD06-011 · CP-TR-MOD06-011 · RN-IA-001
/**
 * Detalle de un hallazgo de inconsistencia (página `/:id`, como las demás revisiones de Asistencia IA).
 *
 * - Panel azul «Sugerencia de la IA»: tipo, confianza, el dato observado y la explicación (criterio 1).
 * - Registros implicados (en duplicados, lado a lado), la propuesta de revisión y el contexto de la IA.
 * - «Aceptar propuesta» o «Descartar», con confirmación (criterio 2). Aceptar no modifica el registro oficial: el
 *   hallazgo queda registrado para corregirlo en su módulo (criterio 3).
 *
 * Solo el jefe de sección decide (ROLES_VALIDAR_IA); los demás lo ven sin acciones.
 */
import { useCallback, useState } from 'react'
import { useLocation, useParams } from 'react-router'
import AvisoDatosSimulados from '../../../components/reportes-indicadores/AvisoDatosSimulados'
import BloqueContextoIA from '../../../components/reportes-indicadores/BloqueContextoIA'
import AvisoEnLinea, { type TonoAviso } from '../../../components/ui/AvisoEnLinea'
import AvisoTemporal from '../../../components/ui/AvisoTemporal'
import Badge from '../../../components/ui/Badge'
import Boton, { BotonEnlace } from '../../../components/ui/Boton'
import CampoFormulario, { AreaTexto } from '../../../components/ui/CampoFormulario'
import DialogoConfirmacion from '../../../components/ui/DialogoConfirmacion'
import EstadoCarga from '../../../components/ui/EstadoCarga'
import EstadoError from '../../../components/ui/EstadoError'
import EstadoVacio from '../../../components/ui/EstadoVacio'
import Icono from '../../../components/ui/Icono'
import ListaDescripcion from '../../../components/ui/ListaDescripcion'
import { puede, ROLES_VALIDAR_IA } from '../../../config/permisos'
import { useConsulta } from '../../../hooks/useConsulta'
import { usePaginaActual } from '../../../hooks/usePaginaActual'
import { MIGAS, RUTAS } from '../../../router/rutasApp'
import { aErrorApi } from '../../../services/api/cliente'
import { aceptarInconsistencia, descartarInconsistencia, obtenerInconsistencia } from '../../../services/api/inconsistenciasIa'
import { useRolActual } from '../../../sesion/ContextoSesion'
import type { SugerenciaInconsistencia } from '../../../types/inconsistenciasIa'
import { formatearFechaHora, SIN_VALOR } from '../../../utils/formato'
import {
  ETIQUETA_CONJUNTO,
  insigniaConfianza,
  insigniaEstadoHallazgo,
  insigniaTipoHallazgo,
  textoDatoObservado,
} from '../../../utils/inconsistenciasIa'
import estilos from '../reportes/Reportes.module.css'
import type { EstadoNavegacionRevision } from './ExtraccionReporteProveedorPage'
import estilosHallazgo from './inconsistencias/Inconsistencias.module.css'
import RegistrosImplicados from './inconsistencias/RegistrosImplicados'

/** SUPUESTO (pendiente de confirmar con el backend): aceptar no modifica el registro oficial desde MOD-06. */
const EFECTO_ACEPTAR =
  'Al aceptar, el hallazgo queda registrado para su corrección. El registro original no cambia hasta que se corrija en su módulo.'

export default function RevisionInconsistenciaPage() {
  const { id } = useParams()
  const idNumero = Number(id)
  const idValido = Number.isInteger(idNumero) && idNumero > 0
  const location = useLocation()
  const navegacion = (location.state ?? null) as EstadoNavegacionRevision | null
  const rutaBandeja = `${RUTAS.inconsistenciasIa}${navegacion?.volverA ?? ''}`
  const rol = useRolActual()
  const puedeDecidir = rol !== null && puede(rol, ROLES_VALIDAR_IA)

  usePaginaActual(`Hallazgo n.º ${id}`, [
    MIGAS.reportesIndicadores,
    MIGAS.asistenciaIa,
    { ...MIGAS.inconsistenciasIa, ruta: rutaBandeja },
    { texto: `Hallazgo n.º ${id}` },
  ])

  const consulta = useConsulta<SugerenciaInconsistencia>(idValido ? `inconsistencia|${idNumero}` : null, (signal) =>
    obtenerInconsistencia(idNumero, signal),
  )
  const hallazgo = consulta.datos

  const [valorFinal, setValorFinal] = useState('')
  const [comentario, setComentario] = useState('')
  const [motivo, setMotivo] = useState('')
  const [dialogo, setDialogo] = useState<'aceptar' | 'descartar' | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [avisoAccion, setAvisoAccion] = useState<{ tono: TonoAviso; texto: string } | null>(null)
  const [avisoTemporal, setAvisoTemporal] = useState<string | null>(null)
  const cerrarAvisoTemporal = useCallback(() => setAvisoTemporal(null), [])

  const volver = (
    <BotonEnlace to={rutaBandeja} variante="terciario">
      Volver a la bandeja
    </BotonEnlace>
  )

  if (!idValido || consulta.error?.estado === 404) {
    return <EstadoVacio titulo="Hallazgo no encontrado" descripcion={consulta.error?.detalle} accion={volver} />
  }
  if (consulta.estado === 'error' && consulta.error) {
    return (
      <div className={estilos.pagina}>
        <div>{volver}</div>
        <EstadoError titulo="No se pudo cargar el hallazgo" descripcion={consulta.error.detalle} onReintentar={consulta.reintentar} />
      </div>
    )
  }
  if (!hallazgo) return consulta.cargaVisible ? <EstadoCarga forma="pagina" /> : null

  const { contenido } = hallazgo
  const { propuesta } = contenido
  const pendiente = hallazgo.estado === 'Propuesta'
  const editable = pendiente && puedeDecidir
  const conValor = propuesta.campo !== null
  const conservar = contenido.registros.find((r) => r.registro_id === propuesta.registro_conservar_id)

  async function ejecutar(accion: () => Promise<SugerenciaInconsistencia>, texto: string) {
    if (enviando) return
    setEnviando(true)
    setAvisoAccion(null)
    try {
      await accion()
      setDialogo(null)
      setAvisoTemporal(texto)
      consulta.reintentar()
    } catch (causa) {
      const error = aErrorApi(causa)
      setDialogo(null)
      setAvisoAccion({ tono: error.estado === 409 ? 'advertencia' : 'error', texto: error.detalle })
      if (error.estado === 409) consulta.reintentar()
    } finally {
      setEnviando(false)
    }
  }

  const aceptar = () =>
    void ejecutar(
      () =>
        aceptarInconsistencia(hallazgo.id, {
          ...(valorFinal.trim() ? { valor_final: valorFinal.trim() } : {}),
          ...(comentario.trim() ? { comentario: comentario.trim() } : {}),
        }),
      'Propuesta aceptada',
    )
  const descartar = () => void ejecutar(() => descartarInconsistencia(hallazgo.id, motivo.trim() || null), 'Hallazgo descartado')

  return (
    <div className={estilos.pagina}>
      <div>{volver}</div>
      <AvisoDatosSimulados />

      <section className={`${estilosHallazgo.panel} ${estilosHallazgo.panelIa}`} aria-labelledby="titulo-sugerencia">
        <span id="titulo-sugerencia" className={estilosHallazgo.etiquetaIa}>
          <Icono nombre="destello" tamano="sm" /> Sugerencia de la IA
        </span>
        <span className={estilosHallazgo.insignias}>
          <Badge {...insigniaTipoHallazgo(contenido.tipo_hallazgo)} />
          <Badge {...insigniaConfianza(contenido.confianza)} />
          <Badge {...insigniaEstadoHallazgo(hallazgo.estado)} />
        </span>
        <ListaDescripcion
          elementos={[
            { etiqueta: 'Dato observado', valor: <span className={estilosHallazgo.valorDestacado}>{textoDatoObservado(contenido)}</span>, ancho: true },
            { etiqueta: 'Conjunto', valor: ETIQUETA_CONJUNTO[contenido.conjunto] },
            { etiqueta: 'Detectado', valor: formatearFechaHora(hallazgo.fecha_creacion) },
            { etiqueta: 'Explicación', valor: contenido.explicacion, ancho: true },
          ]}
        />
      </section>

      <section className={estilos.seccion} aria-labelledby="titulo-registros">
        <h2 id="titulo-registros" className={estilos.tituloSeccion}>
          Registros implicados
        </h2>
        <RegistrosImplicados registros={contenido.registros} conservarId={propuesta.registro_conservar_id} />
      </section>

      <section className={estilosHallazgo.panel} aria-labelledby="titulo-propuesta">
        <h2 id="titulo-propuesta" className={estilos.tituloSeccion}>
          Propuesta de revisión
        </h2>
        <p>{propuesta.descripcion}</p>
        {conValor && (
          <p className={estilosHallazgo.cambio}>
            <span className={estilosHallazgo.secundario}>{propuesta.campo}:</span>
            <span>{contenido.valor_observado ?? SIN_VALOR}</span>
            <span aria-hidden="true">→</span>
            <span className="sr-only">se propone cambiar a</span>
            <strong>{propuesta.valor_propuesto ?? 'Completar el valor'}</strong>
          </p>
        )}
        {conservar && (
          <p className={estilosHallazgo.cambio}>
            <Badge tono="exito" texto={`Conservar ${conservar.codigo ?? conservar.etiqueta}`} />
          </p>
        )}
      </section>

      <BloqueContextoIA contexto={contenido} tituloFaltantes="Faltan datos para revisar con seguridad" />

      {hallazgo.estado !== 'Propuesta' && (
        <AvisoEnLinea
          tono={hallazgo.estado === 'Validada' ? 'exito' : 'info'}
          titulo={`${hallazgo.estado === 'Validada' ? 'Propuesta aceptada' : 'Hallazgo descartado'} el ${formatearFechaHora(hallazgo.fecha_validacion)}`}
        >
          {contenido.decision?.valor_final && <p>Valor final: {contenido.decision.valor_final}</p>}
          {contenido.decision?.comentario && <p>Comentario: {contenido.decision.comentario}</p>}
          {hallazgo.estado === 'Validada' && <p>{EFECTO_ACEPTAR}</p>}
        </AvisoEnLinea>
      )}
      {pendiente && !puedeDecidir && <AvisoEnLinea tono="info">Solo la jefatura de sección puede aceptar o descartar este hallazgo</AvisoEnLinea>}
      {avisoAccion && <AvisoEnLinea tono={avisoAccion.tono}>{avisoAccion.texto}</AvisoEnLinea>}

      {editable && (
        <section className={estilosHallazgo.panel} aria-labelledby="titulo-decision">
          <h2 id="titulo-decision" className={estilos.tituloSeccion}>
            Tu decisión
          </h2>
          <p className={estilosHallazgo.secundario}>{EFECTO_ACEPTAR}</p>
          {conValor && (
            <CampoFormulario
              id="valor-final"
              etiqueta={`Valor final de ${propuesta.campo}`}
              ayuda={propuesta.valor_propuesto ? `Opcional. Si lo dejas vacío, se usa «${propuesta.valor_propuesto}»` : 'Opcional'}
              value={valorFinal}
              onChange={(e) => setValorFinal(e.target.value)}
            />
          )}
          <AreaTexto id="comentario-decision" etiqueta="Comentario" ayuda="Opcional" maxLength={1000} rows={2} value={comentario} onChange={(e) => setComentario(e.target.value)} />
          <div className={estilosHallazgo.acciones}>
            <Boton variante="primario" onClick={() => setDialogo('aceptar')}>
              Aceptar propuesta
            </Boton>
            <Boton variante="secundario" onClick={() => setDialogo('descartar')}>
              Descartar
            </Boton>
          </div>
        </section>
      )}

      <DialogoConfirmacion
        abierto={dialogo === 'aceptar'}
        titulo="Aceptar propuesta"
        consecuencia={EFECTO_ACEPTAR}
        textoConfirmar="Aceptar propuesta"
        cargando={enviando}
        onConfirmar={aceptar}
        onCancelar={() => setDialogo(null)}
      />
      <DialogoConfirmacion
        abierto={dialogo === 'descartar'}
        titulo="Descartar hallazgo"
        consecuencia="El hallazgo se marcará como descartado. Ningún registro cambia."
        textoConfirmar="Descartar"
        cargando={enviando}
        onConfirmar={descartar}
        onCancelar={() => setDialogo(null)}
      >
        <AreaTexto id="motivo-descarte" etiqueta="Motivo" ayuda="Opcional" maxLength={1000} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      </DialogoConfirmacion>

      <AvisoTemporal mensaje={avisoTemporal} onCerrar={cerrarAvisoTemporal} />
    </div>
  )
}
