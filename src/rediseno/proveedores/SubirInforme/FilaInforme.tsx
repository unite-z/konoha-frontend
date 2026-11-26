/**
 * Un informe de la lista (RD-56): su atención, si «coincide» o está «por revisar», subir el informe con el diálogo de
 * RD-54 (`DialogoReporte`), pedir la extracción y revisarla con `RevisionIa` dentro de la misma fila. El flujo de un
 * informe por atención se conserva: una atención con informe adjunto se analiza sin subir otro.
 *
 * Movimiento: la fila entra con un fundido y crece hasta ser el panel de revisión (mismo `view-transition-name`); con
 * «reducir movimiento», cambio directo.
 */
import { useRef, useState } from 'react'
import Boton from '@/design-system/Boton'
import Estado from '@/design-system/Estado'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import { PERMISO_SOLICITAR_IA } from '@/config/permisos'
import { tiene } from '@/config/permisosSesion'
import { disponibilidad } from '@/config/permisosTercerizados'
import { useConsulta } from '@/hooks/useConsulta'
import {
  cargarReportes,
  propuestasPorReporte,
} from '@/pages/reportes-indicadores/asistencia-ia/extraccion/informesAtencion'
import DialogoReporte from '@/pages/servicios-tercerizados/acciones/DialogoReporte'
import { estiloTransicion, fila, panel, transicionar } from '@/rediseno/base/movimiento'
import { aErrorApi } from '@/services/api/cliente'
import { solicitarExtraccion } from '@/services/api/ia'
import { listarReportes, obtenerAtencion } from '@/services/api/tercerizados'
import type { Atencion, ReporteProveedor } from '@/types/tercerizados'
import { SIN_VALOR } from '@/utils/formato'
import { asociar, motivoPorRevisar, tieneInformeAdjunto } from './asociacion'
import type { InformeEnCola } from './informes'
import RevisionExtraccion from './RevisionExtraccion'
import type { ResultadoRegistro } from './registroEnBloque'
import estilos from './SubirInforme.module.css'

export interface FilaInformeProps {
  informe: InformeEnCola
  permisos: readonly string[] | null
  abierto: boolean
  onAlternar: (clave: string, abrir: boolean) => void
  onExtraccion: (clave: string, extraccionId: number) => void
  onQuitar: (clave: string) => void
  resultado?: ResultadoRegistro
}

const TONO_RESULTADO = { registrado: 'exito', incompleto: 'aviso', 'sin-pendiente': 'neutro', fallo: 'error' } as const

export default function FilaInforme({
  informe,
  permisos,
  abierto,
  onAlternar,
  onExtraccion,
  onQuitar,
  resultado,
}: FilaInformeProps) {
  const { clave, atencionId, extraccionId } = informe
  const puedeSolicitar = tiene(permisos, PERMISO_SOLICITAR_IA)
  const consulta = useConsulta(`subir-informe-atencion|${atencionId}`, (signal) => obtenerAtencion(atencionId, signal))
  const [actualizada, setActualizada] = useState<Atencion | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [analizando, setAnalizando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [fallo, setFallo] = useState<{ detalle: string; reintento: () => void } | null>(null)
  const adjunto = useRef<ReporteProveedor | null>(null)

  const sinAtencion = consulta.error?.estado === 404
  const atencion = actualizada ?? consulta.datos
  const asociacion = asociar(sinAtencion ? null : atencion)

  /** Pide la extracción del informe; si ya tiene propuesta, abre esa en lugar de duplicarla. */
  const pedir = async (reporte: ReporteProveedor | null) => {
    setAnalizando(true)
    setFallo(null)
    try {
      const controlador = new AbortController()
      const reportes = reporte ? [reporte] : await cargarReportes(atencionId, controlador.signal)
      const elegido = reportes[0]
      if (!elegido) {
        setAviso('Esta atención no tiene informes del proveedor.')
        return
      }
      const previas = (await propuestasPorReporte([elegido.id], controlador.signal)).get(elegido.id) ?? []
      const propuesta = previas[0] ?? (await solicitarExtraccion(elegido.id))
      onExtraccion(clave, propuesta.id)
      setAviso(
        previas[0]
          ? `El informe ya tenía la propuesta n.º ${propuesta.id}.`
          : `Propuesta n.º ${propuesta.id} lista para revisar.`,
      )
      transicionar(() => onAlternar(clave, true))
    } catch (causa) {
      setFallo({ detalle: aErrorApi(causa).detalle, reintento: () => void pedir(reporte) })
    } finally {
      setAnalizando(false)
    }
  }

  const alAdjuntar = (mensaje: string) => {
    setSubiendo(false)
    if (!puedeSolicitar) {
      setAviso(`${mensaje}. Tu cuenta no puede pedir el análisis con Konoha.`)
      return
    }
    void (async () => {
      // El diálogo no siempre entrega la revisión: se lee la más reciente.
      const reporte =
        adjunto.current ??
        (await listarReportes(atencionId)
          .then((p) => p.results[0] ?? null)
          .catch(() => null))
      adjunto.current = null
      await pedir(reporte)
    })()
  }

  let cabecera
  if (consulta.error && !atencion && !sinAtencion) {
    cabecera =
      consulta.error.estado === 403 ? (
        <EstadoSinAcceso nivel={3} titulo="No puedes ver esta atención" />
      ) : (
        <EstadoError
          nivel={3}
          titulo="No pudimos cargar la atención"
          descripcion={consulta.error.detalle}
          onReintentar={consulta.reintentar}
        />
      )
  } else if (!atencion && !sinAtencion) {
    cabecera = consulta.cargaVisible ? <EstadoCarga forma="tabla" filas={1} /> : null
  } else {
    const puedeSubir =
      atencion !== null && asociacion === 'coincide' && disponibilidad('adjuntarReporte', permisos, atencion).visible
    const puedeAnalizar = atencion !== null && puedeSolicitar && extraccionId === null && tieneInformeAdjunto(atencion)
    cabecera = (
      <>
        <div className={estilos.principal}>
          <span className={estilos.codigo}>{atencion?.codigo ?? `Atención n.º ${atencionId}`}</span>
          <span className={estilos.secundario}>
            {atencion
              ? `${atencion.proveedor_nombre ?? SIN_VALOR} · ${atencion.tipo_servicio_nombre ?? SIN_VALOR}`
              : 'No se encontró la atención'}
          </span>
        </div>
        <div className={estilos.etiquetas}>
          {asociacion === 'coincide' ? (
            <Estado tono="exito" texto="Coincide" />
          ) : (
            <Estado tono="aviso" texto="Por revisar" />
          )}
          {extraccionId !== null && <Estado tono="info" texto={`Propuesta n.º ${extraccionId}`} />}
          {resultado && (
            <Estado
              tono={TONO_RESULTADO[resultado.estado]}
              texto={
                resultado.estado === 'registrado'
                  ? 'Registrada'
                  : resultado.estado === 'incompleto'
                    ? 'Sin registrar'
                    : resultado.estado === 'fallo'
                      ? 'Con error'
                      : 'Ya decidida'
              }
            />
          )}
        </div>
        <div className={estilos.accionesFila}>
          {puedeSubir && (
            <Boton
              variante={extraccionId === null ? 'primario' : 'secundario'}
              compacto
              onClick={() => setSubiendo(true)}
            >
              Subir informe
            </Boton>
          )}
          {puedeAnalizar && (
            <Boton
              variante={puedeSubir ? 'secundario' : 'primario'}
              compacto
              cargando={analizando}
              onClick={() => void pedir(null)}
            >
              Analizar el informe adjunto
            </Boton>
          )}
          {extraccionId !== null && (
            <Boton
              variante="primario"
              compacto
              aria-expanded={abierto}
              onClick={() => transicionar(() => onAlternar(clave, !abierto))}
            >
              {abierto ? 'Ocultar la revisión' : 'Revisar propuesta'}
            </Boton>
          )}
          <Boton
            variante="fantasma"
            compacto
            aria-label={`Quitar ${atencion?.codigo ?? `la atención n.º ${atencionId}`} de la lista`}
            onClick={() => onQuitar(clave)}
          >
            Quitar
          </Boton>
        </div>
      </>
    )
  }

  return (
    <li className={estilos.informe} style={abierto ? undefined : estiloTransicion(fila(clave))} /* estilo-calculado */>
      <div className={estilos.cabeceraInforme}>{cabecera}</div>
      {asociacion === 'por-revisar' && (atencion || sinAtencion) && (
        <p className={estilos.secundario} role="status">
          {motivoPorRevisar(sinAtencion ? null : atencion, atencionId)}
        </p>
      )}
      {resultado && <p className={estilos.secundario}>{resultado.detalle}</p>}
      {analizando && <EstadoCarga forma="tarjetas" texto="Analizando el informe del proveedor…" retrasar />}
      {aviso && !fallo && (
        <p className={estilos.secundario} role="status">
          {aviso}
        </p>
      )}
      {fallo && (
        <EstadoError
          nivel={3}
          titulo="No se pudo analizar el informe"
          descripcion={fallo.detalle}
          onReintentar={fallo.reintento}
        />
      )}
      {abierto && extraccionId !== null && (
        <div className={estilos.panel} style={estiloTransicion(panel(clave))} /* estilo-calculado */>
          <RevisionExtraccion key={informe.version} id={extraccionId} />
        </div>
      )}
      {atencion && (
        <DialogoReporte
          abierto={subiendo}
          atencion={atencion}
          onCerrar={() => setSubiendo(false)}
          onActualizada={setActualizada}
          onReporteAdjunto={(reporte) => {
            adjunto.current = reporte
          }}
          onExito={alAdjuntar}
        />
      )}
    </li>
  )
}
