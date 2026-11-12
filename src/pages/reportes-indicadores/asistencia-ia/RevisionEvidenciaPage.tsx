// RF-IA-006 · HU-MOD06-008 · CU-MOD06-008 · CP-TR-MOD06-008 · RN-IA-001
/**
 * Revisión de un análisis de evidencia fitosanitaria (sistema de diseño de Figma).
 *
 * - Cabecera con la planta y la insignia «Hipótesis: pendiente de validación técnica».
 * - Fotografías con su calidad; si no alcanza (A1), aviso con «Subir nuevas fotografías» y «Registrar evaluación
 *   manual».
 * - Hipótesis ordenadas por confianza, ninguna preseleccionada (criterios 1 y 2), y el contexto de la IA (criterio 5).
 * - «Tu validación técnica»: confirmar una hipótesis, otra categoría o «No es posible concluir» (A2). Solo se registra
 *   lo validado; la salida de la IA se conserva (criterio 4). Nunca se indica un tratamiento.
 *
 * Solo la jefatura de sección valida o descarta (PERMISO_VALIDAR_IA); los demás la ven sin acciones.
 */
import { useCallback, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import AvisoDatosSimulados from '@/components/reportes-indicadores/AvisoDatosSimulados'
import BloqueContextoIA from '@/components/reportes-indicadores/BloqueContextoIA'
import AvisoEnLinea, { type TonoAviso } from '@/components/ui/AvisoEnLinea'
import AvisoTemporal from '@/components/ui/AvisoTemporal'
import Boton, { BotonEnlace } from '@/components/ui/Boton'
import DialogoConfirmacion from '@/components/ui/DialogoConfirmacion'
import Estado from '@/components/ui/Estado'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoSinAcceso from '@/components/ui/EstadoSinAcceso'
import EstadoVacio from '@/components/ui/EstadoVacio'
import ListaDescripcion from '@/components/ui/ListaDescripcion'
import Tarjeta from '@/components/ui/Tarjeta'
import { puede, PERMISO_SOLICITAR_IA, PERMISO_VALIDAR_IA } from '@/config/permisos'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS, RUTAS, rutaRevisionEvidencia } from '@/router/rutasApp'
import { aErrorApi } from '@/services/api/cliente'
import { descartarEvidencia, obtenerAnalisisEvidencia, validarEvidencia } from '@/services/api/evidenciaFitosanitariaIa'
import { usePermisos } from '@/sesion/ContextoSesion'
import type { SugerenciaEvidencia } from '@/types/evidenciaFitosanitariaIa'
import {
  cuerpoValidacion,
  estadoEvidencia,
  FORMULARIO_VACIO,
  textoResultado,
  tituloEvidencia,
  type ErroresValidacion,
  type FormularioValidacion,
} from '@/utils/evidenciaFitosanitariaIa'
import { formatearFechaHora } from '@/utils/formato'
import estilos from '../reportes/Reportes.module.css'
import estilosIa from './AsistenciaIa.module.css'
import CabeceraEvidencia from './evidencia/CabeceraEvidencia'
import DialogoEvaluacionManual, { type ContextoManual } from './evidencia/DialogoEvaluacionManual'
import DialogoNuevoAnalisis, { type InicialNuevoAnalisis } from './evidencia/DialogoNuevoAnalisis'
import estilosEvidencia from './evidencia/Evidencia.module.css'
import MiniaturasEvidencia from './evidencia/MiniaturasEvidencia'
import TarjetasHipotesis from './evidencia/TarjetasHipotesis'
import ValidacionTecnica from './evidencia/ValidacionTecnica'
import type { EstadoNavegacionRevision } from './ExtraccionReporteProveedorPage'

const claveRevision = (s: SugerenciaEvidencia) => `${s.id}|${s.estado}|${s.fecha_modificacion ?? ''}`

export default function RevisionEvidenciaPage() {
  const { id } = useParams()
  const idNumero = Number(id)
  const idValido = Number.isInteger(idNumero) && idNumero > 0
  const location = useLocation()
  const navigate = useNavigate()
  const navegacion = (location.state ?? null) as EstadoNavegacionRevision | null
  const rutaLista = `${RUTAS.evidenciaFitosanitaria}${navegacion?.volverA ?? ''}`
  const permisos = usePermisos()
  const puedeValidar = puede(permisos, PERMISO_VALIDAR_IA)
  const puedeSolicitar = puede(permisos, PERMISO_SOLICITAR_IA)

  const consulta = useConsulta<SugerenciaEvidencia>(idValido ? `evidencia|${idNumero}` : null, (signal) => obtenerAnalisisEvidencia(idNumero, signal))
  const sugerencia = consulta.datos
  const tituloPagina = sugerencia ? `Análisis de ${tituloEvidencia(sugerencia.contenido)}` : `Análisis n.º ${id}`
  usePaginaActual(tituloPagina, [MIGAS.reportesIndicadores, MIGAS.asistenciaIa, { ...MIGAS.evidenciaFitosanitaria, ruta: rutaLista }, { texto: tituloPagina }])

  const [avisoTemporal, setAvisoTemporal] = useState<string | null>(navegacion?.aviso ?? null)
  const cerrarAvisoTemporal = useCallback(() => setAvisoTemporal(null), [])
  const [avisoAccion, setAvisoAccion] = useState<{ tono: TonoAviso; texto: string } | null>(null)
  const [dialogo, setDialogo] = useState<'registrar' | 'descartar' | null>(null)
  const [manual, setManual] = useState<ContextoManual | null>(null)
  const [nuevasFotos, setNuevasFotos] = useState<InicialNuevoAnalisis | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [revision, setRevision] = useState<{ clave: string; formulario: FormularioValidacion; errores: ErroresValidacion }>({
    clave: '',
    formulario: FORMULARIO_VACIO,
    errores: {},
  })
  if (sugerencia && revision.clave !== claveRevision(sugerencia)) {
    setRevision({ clave: claveRevision(sugerencia), formulario: FORMULARIO_VACIO, errores: {} })
  }

  const volver = (
    <BotonEnlace to={rutaLista} variante="fantasma" icono="chevron-left">
      Volver a la evidencia fitosanitaria
    </BotonEnlace>
  )

  if (!idValido || consulta.error?.estado === 404) {
    return <EstadoVacio titulo="Análisis no encontrado" descripcion={consulta.error?.detalle} accion={volver} />
  }
  if (consulta.error?.estado === 403) return <EstadoSinAcceso descripcion={consulta.error.detalle} />
  if (consulta.estado === 'error' && consulta.error) {
    return <EstadoError titulo="No se pudo cargar el análisis" descripcion={consulta.error.detalle} onReintentar={consulta.reintentar} />
  }
  if (!sugerencia) return consulta.cargaVisible ? <EstadoCarga forma="pagina" /> : null

  const { contenido } = sugerencia
  const pendiente = sugerencia.estado === 'Propuesta'
  const editable = pendiente && puedeValidar
  const titulo = tituloEvidencia(contenido)
  const contextoManual: ContextoManual = { ejemplar_id: contenido.atencion ? null : (contenido.ejemplar?.id ?? null), atencion_id: contenido.atencion?.id ?? null, texto: titulo }
  const { cuerpo, errores } = cuerpoValidacion(revision.formulario, contenido.hipotesis)
  const inicialFotos: InicialNuevoAnalisis = {
    paso: 1,
    sintomas: contenido.sintomas ?? '',
    ...(contenido.atencion && contenido.ejemplar
      ? { atencion: { id: contenido.atencion.id, ejemplar: contenido.ejemplar, plaga: contenido.atencion.codigo } }
      : contenido.ejemplar
        ? { ejemplar: contenido.ejemplar }
        : {}),
  }

  const cambiar = (cambio: Partial<FormularioValidacion>) => setRevision((r) => ({ ...r, formulario: { ...r.formulario, ...cambio }, errores: {} }))

  function intentarRegistrar() {
    if (cuerpo) {
      setDialogo('registrar')
      return
    }
    setRevision((r) => ({ ...r, errores }))
    window.setTimeout(() => document.getElementById('validacion-tecnica')?.scrollIntoView({ block: 'center' }), 0)
  }

  async function ejecutar(accion: () => Promise<SugerenciaEvidencia>, texto: string) {
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

  const irA = (s: SugerenciaEvidencia, aviso: string) => navigate(rutaRevisionEvidencia(s.id), { state: { aviso, volverA: navegacion?.volverA } })
  const { validacion } = contenido

  return (
    <div className={`${estilos.pagina} ${editable ? estilosIa.conBarraFija : ''}`}>
      <div>{volver}</div>
      <AvisoDatosSimulados />

      <CabeceraEvidencia
        contenido={contenido}
        fechaCreacion={sugerencia.fecha_creacion}
        insignias={
          <>
            <Estado {...estadoEvidencia(sugerencia.estado, validacion)} />
            {pendiente && <Estado tono="aviso" icono="triangle-alert" texto="Hipótesis: pendiente de validación técnica" />}
          </>
        }
      />

      {!contenido.calidad_suficiente && pendiente && (
        <AvisoEnLinea tono="advertencia" titulo="Las fotografías no tienen calidad suficiente para un análisis confiable">
          <ul className={estilosEvidencia.evidencias}>
            {contenido.fotografias
              .filter((f) => f.calidad === 'Insuficiente')
              .map((f, i) => (
                <li key={f.archivo_id}>{`Fotografía ${i + 1}: ${f.motivo_calidad ?? 'calidad insuficiente'}`}</li>
              ))}
          </ul>
          {(puedeSolicitar || puedeValidar) && (
            <span className={estilosEvidencia.acciones}>
              {puedeSolicitar && (
                <Boton variante="secundario" icono="camera" onClick={() => setNuevasFotos(inicialFotos)}>
                  Subir nuevas fotografías
                </Boton>
              )}
              {puedeValidar && (
                <Boton variante="fantasma" onClick={() => setManual(contextoManual)}>
                  Registrar evaluación manual
                </Boton>
              )}
            </span>
          )}
        </AvisoEnLinea>
      )}
      {contenido.contexto_reducido && pendiente && (
        <AvisoEnLinea tono="info">La especie no está identificada: las hipótesis se basan en menos contexto.</AvisoEnLinea>
      )}
      {sugerencia.estado === 'Validada' && validacion && (
        <AvisoEnLinea tono={validacion.resultado === 'NoConcluyente' ? 'info' : 'exito'} titulo={`${textoResultado(validacion)} · ${formatearFechaHora(sugerencia.fecha_validacion)}`}>
          {contenido.origen === 'manual'
            ? 'Evaluación registrada sin IA.'
            : 'Se registró la validación técnica. Las hipótesis originales de la IA se conservan abajo.'}{' '}
          No se indicó ningún tratamiento.
        </AvisoEnLinea>
      )}
      {sugerencia.estado === 'Rechazada' && (
        <AvisoEnLinea tono="info" titulo={`Análisis descartado el ${formatearFechaHora(sugerencia.fecha_validacion)}`}>
          No se registró ninguna categoría a partir de él.
        </AvisoEnLinea>
      )}
      {pendiente && !puedeValidar && <AvisoEnLinea tono="info">Solo la jefatura de sección puede validar o descartar este análisis</AvisoEnLinea>}
      {avisoAccion && <AvisoEnLinea tono={avisoAccion.tono}>{avisoAccion.texto}</AvisoEnLinea>}

      {validacion && (
        <Tarjeta titulo="Validación técnica" nivel={2}>
          <ListaDescripcion
            elementos={[
              { etiqueta: 'Resultado', valor: textoResultado(validacion) },
              { etiqueta: 'Validado por', valor: contenido.validada_por ?? 'Jefatura de sección' },
              { etiqueta: 'Fecha', valor: formatearFechaHora(sugerencia.fecha_validacion) },
              { etiqueta: 'Comentario técnico', valor: validacion.comentario ?? 'Sin comentario', ancho: true },
            ]}
          />
        </Tarjeta>
      )}

      {contenido.fotografias.length > 0 && <MiniaturasEvidencia sugerenciaId={sugerencia.id} fotografias={contenido.fotografias} codigo={contenido.ejemplar?.codigo ?? titulo} />}
      {contenido.hipotesis.length > 0 && <TarjetasHipotesis hipotesis={contenido.hipotesis} />}
      {contenido.origen === 'ia' && <BloqueContextoIA contexto={contenido} tituloFaltantes="Faltan datos para un análisis confiable" />}

      {editable && (
        <div id="validacion-tecnica">
          <Tarjeta titulo="Tu validación técnica" nivel={2} descripcion="Ninguna hipótesis está marcada: elige la que confirmas, otra categoría o «No es posible concluir».">
            <ValidacionTecnica idBase="validacion" hipotesis={contenido.hipotesis} formulario={revision.formulario} onCambiar={cambiar} errores={revision.errores} />
          </Tarjeta>
        </div>
      )}

      {editable && (
        <div className={estilosIa.barraFija}>
          <p className={estilosIa.textoBarra}>Esto no es un diagnóstico definitivo ni una indicación de tratamiento</p>
          <div className={estilosIa.acciones}>
            <Boton variante="fantasma" onClick={() => setManual(contextoManual)}>
              Registrar evaluación manual
            </Boton>
            <Boton variante="secundario" onClick={() => setDialogo('descartar')}>
              Descartar análisis
            </Boton>
            <Boton variante="primario" deshabilitado={!cuerpo} onClickDeshabilitado={intentarRegistrar} onClick={intentarRegistrar}>
              Registrar categoría validada
            </Boton>
          </div>
        </div>
      )}

      <DialogoConfirmacion
        abierto={dialogo === 'registrar'}
        titulo="Registrar categoría validada"
        consecuencia={`${cuerpo ? textoResultado(cuerpo) : ''}. Se conserva la salida de la IA para su trazabilidad. No se indicará ningún tratamiento.`}
        textoConfirmar="Registrar categoría validada"
        cargando={enviando}
        onConfirmar={() => cuerpo && void ejecutar(() => validarEvidencia(sugerencia.id, cuerpo), 'Validación técnica registrada')}
        onCancelar={() => setDialogo(null)}
      />
      <DialogoConfirmacion
        abierto={dialogo === 'descartar'}
        titulo="Descartar análisis"
        consecuencia="No se registrará ninguna categoría a partir de este análisis. Puedes pedir otro o registrar una evaluación manual."
        textoConfirmar="Descartar análisis"
        variante="destructivo"
        cargando={enviando}
        onConfirmar={() => void ejecutar(() => descartarEvidencia(sugerencia.id, null), 'Análisis descartado')}
        onCancelar={() => setDialogo(null)}
      />
      <DialogoEvaluacionManual
        contexto={manual}
        onCerrar={() => setManual(null)}
        onRegistrada={(s) => {
          setManual(null)
          irA(s, 'Evaluación registrada sin IA')
        }}
      />
      {nuevasFotos && (
        <DialogoNuevoAnalisis
          abierto
          inicial={nuevasFotos}
          onCerrar={() => setNuevasFotos(null)}
          onCreado={(s) => {
            setNuevasFotos(null)
            irA(s, 'Análisis generado: pendiente de validación técnica')
          }}
          onManual={(c) => {
            setNuevasFotos(null)
            setManual(c)
          }}
        />
      )}
      <AvisoTemporal mensaje={avisoTemporal} onCerrar={cerrarAvisoTemporal} />
    </div>
  )
}
