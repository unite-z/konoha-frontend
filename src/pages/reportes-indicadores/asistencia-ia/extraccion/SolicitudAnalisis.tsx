/**
 * Solicitud de análisis con IA (RF-IA-001) en dos pasos: buscar la atención y elegir su informe.
 *
 * - Paso 1: atenciones de MOD-05 con estado «Reporte adjunto» (las únicas con informe), con búsqueda por
 *   código, proveedor, tipo de servicio, orden de compra o descripción (búsqueda `q` del servidor).
 * - Paso 2: informes (revisiones) de la atención; se marca el más reciente y se avisa si ya tiene propuesta.
 * - Alternativa: escribir el número del reporte (también si MOD-05 no está disponible para el rol).
 * - 400 del back-end junto al campo o en un aviso; 503 ofrece «Registrar manualmente» en MOD-05.
 */
import { useState, type FormEvent } from 'react'
import AsistentePasos from '../../../../components/ui/AsistentePasos'
import AvisoEnLinea from '../../../../components/ui/AvisoEnLinea'
import Badge from '../../../../components/ui/Badge'
import Boton from '../../../../components/ui/Boton'
import CampoFormulario, { LeyendaObligatorio } from '../../../../components/ui/CampoFormulario'
import EstadoCarga from '../../../../components/ui/EstadoCarga'
import EstadoVacio from '../../../../components/ui/EstadoVacio'
import Icono from '../../../../components/ui/Icono'
import { useConsulta } from '../../../../hooks/useConsulta'
import { aErrorApi } from '../../../../services/api/cliente'
import { solicitarExtraccion } from '../../../../services/api/ia'
import { listarAtenciones } from '../../../../services/api/tercerizados'
import type { SugerenciaIA } from '../../../../types/ia'
import type { Atencion } from '../../../../types/tercerizados'
import { formatearFecha, formatearNumero, SIN_VALOR } from '../../../../utils/formato'
import { cargarReportes, propuestasPorReporte, tieneInformeFinal } from './consultasApoyo'
import estilos from './SolicitudAnalisis.module.css'

const POR_PAGINA = 25 // Paginación de MOD-05.
const ID_CAMPO_REPORTE = 'reporte-proveedor'
const ID_BUSQUEDA = 'buscar-atencion'
const MENSAJE_FALTA_REPORTE = 'Indica el número del reporte del proveedor que quieres analizar'
const MENSAJE_ENTERO = 'Usa un número entero positivo'
const PASOS = ['Elige la atención', 'Elige el informe']

export interface SolicitudAnalisisProps {
  onCreada: (sugerencia: SugerenciaIA) => void
  onAbrirPropuesta: (sugerencia: SugerenciaIA) => void
  onCancelar: () => void
}

function validarFormato(texto: string): string | undefined {
  if (texto.trim() === '') return undefined // la obligatoriedad se comprueba al enviar
  return /^\d+$/.test(texto.trim()) && Number(texto) >= 1 ? undefined : MENSAJE_ENTERO
}

export default function SolicitudAnalisis({ onCreada, onAbrirPropuesta, onCancelar }: SolicitudAnalisisProps) {
  const [modo, setModo] = useState<'buscar' | 'manual'>('buscar')
  const [atencion, setAtencion] = useState<Atencion | null>(null)
  const [reporteElegido, setReporteElegido] = useState<number | null>(null)
  const [borradorBusqueda, setBorradorBusqueda] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const [numero, setNumero] = useState('')
  const [errorCampo, setErrorCampo] = useState<string | undefined>()
  const [analizando, setAnalizando] = useState(false)
  const [errorAnalisis, setErrorAnalisis] = useState<{ estado: number; detalle: string } | null>(null)
  const [mostrarManual, setMostrarManual] = useState(false)

  const atenciones = useConsulta(
    modo === 'buscar' && !atencion ? `atenciones|${busqueda}|${pagina}` : null,
    (signal) => listarAtenciones({ q: busqueda || undefined, estado: 'Reporte adjunto' }, pagina, signal),
  )

  const informes = useConsulta(atencion ? `informes|${atencion.id}` : null, async (signal) => {
    const reportes = await cargarReportes(atencion?.id ?? 0, signal)
    const propuestas = await propuestasPorReporte(
      reportes.map((r) => r.id),
      signal,
    )
    return { reportes, propuestas }
  })
  const reportes = informes.datos?.reportes ?? []
  const elegido = reporteElegido ?? reportes[0]?.id ?? null

  async function analizar(reporteId: number) {
    if (analizando) return
    setAnalizando(true)
    setErrorAnalisis(null)
    setMostrarManual(false)
    try {
      onCreada(await solicitarExtraccion(reporteId))
    } catch (causa) {
      const errorApi = aErrorApi(causa)
      const mensajeCampo = errorApi.errores_campo.reporte_proveedor_id?.[0]
      if (errorApi.estado === 400 && mensajeCampo && modo === 'manual') {
        setErrorCampo(mensajeCampo)
        document.getElementById(ID_CAMPO_REPORTE)?.focus()
      } else {
        setErrorAnalisis({ estado: errorApi.estado, detalle: mensajeCampo ?? errorApi.detalle })
      }
      setAnalizando(false)
    }
  }

  function enviarManual(evento: FormEvent) {
    evento.preventDefault()
    const texto = numero.trim()
    const error = texto === '' ? MENSAJE_FALTA_REPORTE : validarFormato(texto)
    setErrorCampo(error)
    if (error) {
      document.getElementById(ID_CAMPO_REPORTE)?.focus()
      return
    }
    void analizar(Number(texto))
  }

  function buscar(evento: FormEvent) {
    evento.preventDefault()
    setBusqueda(borradorBusqueda.trim())
    setPagina(1)
  }

  function elegirAtencion(a: Atencion) {
    setAtencion(a)
    setReporteElegido(null)
    setErrorAnalisis(null)
  }

  function volverABuscar() {
    setAtencion(null)
    setReporteElegido(null)
    setErrorAnalisis(null)
  }

  const listaAtenciones = atenciones.datos?.results ?? []
  const totalAtenciones = atenciones.datos?.count ?? 0

  const pasoAtencion = (
    <>
      <form className={estilos.busqueda} role="search" onSubmit={buscar}>
        <CampoFormulario
          id={ID_BUSQUEDA}
          etiqueta="Buscar atención"
          ayuda="Código, proveedor, tipo de servicio, orden de compra o descripción"
          type="search"
          autoComplete="off"
          value={borradorBusqueda}
          onChange={(e) => setBorradorBusqueda(e.target.value)}
        />
        <div className={estilos.accionBusqueda}>
          <Boton type="submit" variante="secundario" cargando={atenciones.estado === 'cargando' && atenciones.cargaVisible}>
            Buscar
          </Boton>
        </div>
      </form>

      {atenciones.estado === 'error' && atenciones.error ? (
        <AvisoEnLinea
          tono="error"
          titulo="No se pudieron cargar las atenciones"
          accion={{ texto: 'Escribir el número del reporte', onClick: () => setModo('manual') }}
        >
          {atenciones.error.detalle}
        </AvisoEnLinea>
      ) : atenciones.cargaVisible && !atenciones.datos ? (
        <EstadoCarga forma="tabla" />
      ) : atenciones.datos && listaAtenciones.length === 0 ? (
        <EstadoVacio
          nivel={3}
          titulo="Sin atenciones con informe"
          descripcion={
            busqueda
              ? 'Ninguna atención con informe adjunto coincide con la búsqueda. Prueba con otras palabras.'
              : 'Todavía no hay atenciones con el informe del proveedor adjunto.'
          }
        />
      ) : (
        <>
          <p className={estilos.ayuda}>Atenciones con el informe del proveedor adjunto, de la más reciente a la más antigua.</p>
          <ul className={estilos.opciones} aria-label="Atenciones con informe">
            {listaAtenciones.map((a) => (
              <li key={a.id}>
                <button type="button" className={estilos.opcion} onClick={() => elegirAtencion(a)}>
                  <span className={estilos.textoOpcion}>
                    <span className={estilos.tituloOpcion}>{a.codigo}</span>
                    <span className={estilos.metaOpcion}>
                      {a.proveedor_nombre ?? SIN_VALOR} · {a.tipo_servicio_nombre ?? SIN_VALOR}
                    </span>
                    {a.descripcion && <span className={estilos.descripcionOpcion}>{a.descripcion}</span>}
                    <span className={estilos.metaOpcion}>Fin del servicio: {formatearFecha(a.fecha_hora_fin)}</span>
                  </span>
                  <Icono nombre="chevronDerecha" />
                </button>
              </li>
            ))}
          </ul>
          {totalAtenciones > POR_PAGINA && (
            <div className={estilos.paginacion}>
              <p className="cifra">
                Mostrando {formatearNumero((pagina - 1) * POR_PAGINA + 1)} a{' '}
                {formatearNumero(Math.min(totalAtenciones, pagina * POR_PAGINA))} de {formatearNumero(totalAtenciones)}
              </p>
              <div className={estilos.botonesPaginacion}>
                <Boton variante="secundario" compacto deshabilitado={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
                  Anterior
                </Boton>
                <Boton
                  variante="secundario"
                  compacto
                  deshabilitado={pagina * POR_PAGINA >= totalAtenciones}
                  onClick={() => setPagina((p) => p + 1)}
                >
                  Siguiente
                </Boton>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )

  const pasoInforme = atencion && (
    <>
      <div className={estilos.elegida}>
        <span>
          Atención <strong>{atencion.codigo}</strong> · {atencion.proveedor_nombre ?? SIN_VALOR} ·{' '}
          {atencion.tipo_servicio_nombre ?? SIN_VALOR}
        </span>
        <Boton variante="terciario" onClick={volverABuscar}>
          Cambiar atención
        </Boton>
      </div>

      {informes.estado === 'error' && informes.error ? (
        <AvisoEnLinea tono="error" titulo="No se pudieron cargar los informes" accion={{ texto: 'Reintentar', onClick: informes.reintentar }}>
          {informes.error.detalle}
        </AvisoEnLinea>
      ) : !informes.datos ? (
        informes.cargaVisible ? <EstadoCarga forma="tabla" /> : null
      ) : reportes.length === 0 ? (
        <EstadoVacio nivel={3} titulo="Sin informes" descripcion="Esta atención no tiene informes del proveedor." />
      ) : (
        <fieldset className={estilos.grupoInformes}>
          <legend className={estilos.leyendaGrupo}>Informe del proveedor</legend>
          <ul className={estilos.opciones}>
            {reportes.map((r, i) => {
              const propuestas = informes.datos?.propuestas.get(r.id) ?? []
              const activa = elegido === r.id
              return (
                <li key={r.id} className={`${estilos.informe} ${activa ? estilos.informeActivo : ''}`}>
                  <label className={estilos.etiquetaInforme}>
                    <input
                      type="radio"
                      name="informe-proveedor"
                      value={r.id}
                      checked={activa}
                      onChange={() => setReporteElegido(r.id)}
                    />
                    <span className={estilos.textoOpcion}>
                      <span className={estilos.lineaInsignias}>
                        <span className={estilos.tituloOpcion}>Revisión {r.revision}</span>
                        {i === 0 && <Badge tono="info" texto="Más reciente" />}
                        {propuestas.length > 0 && <Badge tono="advertencia" texto="Ya tiene propuesta" />}
                        {!tieneInformeFinal(r) && <Badge tono="advertencia" texto="Sin informe final" />}
                      </span>
                      <span className={estilos.metaOpcion}>
                        Recibido el {formatearFecha(r.fecha_recepcion)} ·{' '}
                        {r.documentos.length === 1 ? '1 documento' : `${formatearNumero(r.documentos.length)} documentos`} ·
                        Reporte n.º {r.id}
                      </span>
                      {r.resumen && <span className={estilos.descripcionOpcion}>{r.resumen}</span>}
                    </span>
                  </label>
                  {propuestas.length > 0 && (
                    <div className={estilos.verPropuesta}>
                      <Boton variante="terciario" onClick={() => onAbrirPropuesta(propuestas[0])}>
                        Ver propuesta n.º {propuestas[0].id}
                      </Boton>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </fieldset>
      )}

      {reportes.length > 0 && (
        <div className={estilos.acciones}>
          <Boton variante="primario" cargando={analizando} deshabilitado={elegido === null} onClick={() => elegido !== null && void analizar(elegido)}>
            Analizar informe
          </Boton>
        </div>
      )}
    </>
  )

  return (
    <section className={estilos.panel} aria-labelledby="titulo-analizar">
      <div className={estilos.cabecera}>
        <h2 id="titulo-analizar" className={estilos.titulo}>
          Analizar un informe
        </h2>
        <Boton variante="terciario" deshabilitado={analizando} onClick={onCancelar}>
          Cancelar
        </Boton>
      </div>

      {modo === 'buscar' ? (
        <>
          <AsistentePasos pasos={PASOS} actual={atencion ? 1 : 0} alcanzado={atencion ? 1 : 0} onIrA={(i) => i === 0 && volverABuscar()} />
          {atencion ? pasoInforme : pasoAtencion}
          <p className={estilos.alternativa}>
            ¿Conoces el número del reporte?{' '}
            <button type="button" className={estilos.enlace} onClick={() => setModo('manual')}>
              Escríbelo directamente
            </button>
          </p>
        </>
      ) : (
        <form className={estilos.manual} onSubmit={enviarManual} noValidate>
          <LeyendaObligatorio />
          <div className={estilos.filaManual}>
            <CampoFormulario
              id={ID_CAMPO_REPORTE}
              etiqueta="Reporte del proveedor (n.º)"
              ayuda="Número del reporte registrado en la atención tercerizada"
              obligatorio
              inputMode="numeric"
              autoComplete="off"
              value={numero}
              error={errorCampo}
              onChange={(e) => setNumero(e.target.value)}
              onBlur={(e) => setErrorCampo(validarFormato(e.target.value))}
              autoFocus
            />
            <div className={estilos.accionManual}>
              <Boton type="submit" variante="primario" cargando={analizando}>
                Analizar informe
              </Boton>
            </div>
          </div>
          <p className={estilos.alternativa}>
            <button type="button" className={estilos.enlace} onClick={() => setModo('buscar')}>
              Buscar la atención en su lugar
            </button>
          </p>
        </form>
      )}

      {analizando && <EstadoCarga forma="tarjetas" texto="Analizando el informe del proveedor…" retrasar />}

      {errorAnalisis && (
        <AvisoEnLinea
          tono="error"
          titulo="No se pudo analizar el informe"
          accion={
            errorAnalisis.estado === 503 ? { texto: 'Registrar manualmente', onClick: () => setMostrarManual(true) } : undefined
          }
        >
          {errorAnalisis.detalle}
        </AvisoEnLinea>
      )}
      {mostrarManual && <AvisoEnLinea tono="info">Registra los datos del informe en Servicios tercerizados</AvisoEnLinea>}
    </section>
  )
}
