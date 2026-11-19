// RF-INV-011 y RF-FIT-006 · Ficha del ejemplar marcado con atención especial
/**
 * Ejemplar, plaga recurrente, avance de las aplicaciones adicionales y su historial.
 *
 * - «Programar aplicación adicional»: solo mientras queden aplicaciones por programar (RN-010: una o dos al
 *   año, fijadas al marcar el ejemplar) y el seguimiento no esté cancelado.
 * - «Cancelar seguimiento»: error al marcar, o el riesgo ya no corresponde. Exige motivo (AV-154). No se borra:
 *   queda como histórico, con quién, cuándo y por qué lo canceló. Los tres roles del módulo lo hacen, igual que al marcar.
 */
import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import { nombreEjemplar } from '@/utils/nombreEjemplar'
import AvisoTemporal from '@/components/ui/AvisoTemporal'
import Boton, { BotonEnlace } from '@/components/ui/Boton'
import { AreaTexto } from '@/components/ui/CampoFormulario'
import DialogoConfirmacion from '@/components/ui/DialogoConfirmacion'
import Estado from '@/components/ui/Estado'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoVacio from '@/components/ui/EstadoVacio'
import ListaDescripcion from '@/components/ui/ListaDescripcion'
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
import Tarjeta from '@/components/ui/Tarjeta'
import { puedeMarcarAtencionEspecial } from '@/config/permisosMaestros'
import { puedeRegistrarAtencion } from '@/config/permisosTercerizados'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import {
  MIGAS_TERCERIZADOS,
  rutaDetalleAtencion,
  rutaProgramarAplicacionAdicional,
  RUTAS_TERCERIZADOS,
} from '@/router/rutasApp'
import { aErrorApi } from '@/services/api/cliente'
import { cancelarAtencionEspecial, obtenerAtencionEspecial } from '@/services/api/maestrosTercerizados'
import { usePermisos } from '@/sesion/ContextoSesion'
import type { AplicacionAdicional, AtencionEspecialDetalle } from '@/types/maestrosTercerizados'
import { formatearFecha, formatearFechaHora, SIN_VALOR } from '@/utils/formato'
import { textoAplicaciones } from '@/utils/validacionMaestros'
import estilos from './Maestros.module.css'

const COLUMNAS: ColumnaTabla<AplicacionAdicional>[] = [
  { clave: 'codigo', titulo: 'Atención', render: (a) => <Link to={rutaDetalleAtencion(a.id)}>{a.codigo}</Link> },
  { clave: 'estado', titulo: 'Estado', render: (a) => a.estado },
  {
    clave: 'fecha',
    titulo: 'Programada el',
    render: (a) => <span className="cifra">{formatearFechaHora(a.fecha_creacion)}</span>,
  },
]

export default function AtencionEspecialDetallePage() {
  const { id: parametro } = useParams()
  const id = parametro && /^\d{1,9}$/.test(parametro) ? Number(parametro) : null
  const permisos = usePermisos()
  const puedeProgramar = puedeRegistrarAtencion(permisos)
  const puedeCancelar = puedeMarcarAtencionEspecial(permisos)

  const consulta = useConsulta(id === null ? null : `atencion-especial|${id}`, (signal) =>
    obtenerAtencionEspecial(id as number, signal),
  )
  // Última versión que devolvió el servidor al cancelar; vale mientras sea el mismo ejemplar marcado.
  const [actualizado, setActualizado] = useState<AtencionEspecialDetalle | null>(null)
  const especial = actualizado && actualizado.id === consulta.datos?.id ? actualizado : consulta.datos
  const [aviso, setAviso] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [falloCancelar, setFalloCancelar] = useState<string | null>(null)
  const enCurso = useRef(false)

  async function cancelar() {
    if (enCurso.current || id === null) return
    if (!motivo.trim()) {
      setFalloCancelar('Escribe el motivo de la cancelación.')
      return
    }
    enCurso.current = true
    setEnviando(true)
    setFalloCancelar(null)
    try {
      setActualizado(await cancelarAtencionEspecial(id, { motivo: motivo.trim() }))
      setConfirmando(false)
      setMotivo('')
      setAviso('Seguimiento cancelado.')
    } catch (causa) {
      setFalloCancelar(aErrorApi(causa).detalle)
    } finally {
      enCurso.current = false
      setEnviando(false)
    }
  }

  usePaginaActual(especial ? nombreEjemplar(especial.ejemplar_codigo, especial.ejemplar_alias) : 'Atención especial', [
    MIGAS_TERCERIZADOS.serviciosTercerizados,
    MIGAS_TERCERIZADOS.controlFitosanitario,
    { texto: especial ? nombreEjemplar(especial.ejemplar_codigo, especial.ejemplar_alias) : 'Ficha' },
  ])

  let contenido
  if (id === null || (consulta.estado === 'error' && consulta.error?.estado === 404)) {
    contenido = (
      <EstadoVacio
        titulo="No existe este ejemplar marcado"
        descripcion="Revisa el enlace o búscalo en la lista."
        accion={
          <BotonEnlace to={RUTAS_TERCERIZADOS.controlFitosanitario} variante="secundario">
            Ir a control fitosanitario
          </BotonEnlace>
        }
      />
    )
  } else if (consulta.estado === 'error' && !especial) {
    contenido = (
      <EstadoError
        titulo="No pudimos cargar la ficha"
        descripcion={consulta.error?.detalle ?? ''}
        onReintentar={consulta.reintentar}
      />
    )
  } else if (!especial) {
    contenido = consulta.cargaVisible ? <EstadoCarga forma="pagina" /> : null
  } else {
    const puedenQuedar = especial.aplicaciones_realizadas < especial.aplicaciones_adicionales && !especial.cancelado
    const tonoEstado = especial.cancelado ? 'neutro' : especial.estado === 'Aplicaciones completas' ? 'exito' : 'info'
    contenido = (
      <>
        <Tarjeta relleno="amplio" etiquetadaPor="titulo-especial">
          <div className={estilos.cabeceraFicha}>
            <div className={estilos.enLinea}>
              <h2 id="titulo-especial" className={estilos.tituloPrincipal}>
                {nombreEjemplar(especial.ejemplar_codigo, especial.ejemplar_alias)}
              </h2>
              <Estado tono={tonoEstado} texto={especial.estado} />
            </div>
            <div className={estilos.enLinea}>
              {puedeProgramar && puedenQuedar && (
                <BotonEnlace to={rutaProgramarAplicacionAdicional(especial.id)} variante="secundario">
                  Programar aplicación adicional
                </BotonEnlace>
              )}
              {puedeCancelar && !especial.cancelado && (
                <Boton variante="secundario" onClick={() => setConfirmando(true)}>
                  Cancelar seguimiento
                </Boton>
              )}
            </div>
          </div>
        </Tarjeta>

        {especial.cancelado && (
          <AvisoEnLinea tono="info" titulo="Seguimiento cancelado">
            {especial.usuario_cancelacion_nombre} lo canceló el {formatearFecha(especial.fecha_cancelacion ?? '')}
            {especial.motivo_cancelacion ? `: «${especial.motivo_cancelacion}»` : '.'}
          </AvisoEnLinea>
        )}

        <Tarjeta titulo="Ejemplar y plaga" relleno="amplio">
          <ListaDescripcion
            elementos={[
              { etiqueta: 'Área verde', valor: especial.area_verde_nombre ?? SIN_VALOR },
              { etiqueta: 'Plaga recurrente', valor: especial.plaga_nombre },
              {
                etiqueta: 'Marcado',
                valor: `${especial.usuario_creacion_nombre ?? SIN_VALOR} · ${formatearFecha(especial.fecha_creacion)}`,
              },
              {
                etiqueta: 'Aplicaciones adicionales',
                valor: (
                  <span className="cifra">
                    {textoAplicaciones(especial.aplicaciones_realizadas, especial.aplicaciones_adicionales)}
                  </span>
                ),
              },
            ]}
          />
        </Tarjeta>

        <Tarjeta titulo={`Historial de aplicaciones (${especial.aplicaciones.length})`} relleno="amplio">
          <TablaDatos
            titulo="Aplicaciones adicionales"
            columnas={COLUMNAS}
            filas={especial.aplicaciones}
            claveFila={(a) => String(a.id)}
            estado="exito"
            vacio={{
              titulo: 'Aún no se programó ninguna aplicación adicional',
              descripcion: puedeProgramar ? 'Prográmala con el botón de arriba.' : SIN_VALOR,
            }}
          />
        </Tarjeta>
      </>
    )
  }

  return (
    <div className={estilos.pagina}>
      <div>
        <BotonEnlace to={RUTAS_TERCERIZADOS.controlFitosanitario} variante="terciario">
          Volver a control fitosanitario
        </BotonEnlace>
      </div>
      {contenido}
      <AvisoTemporal mensaje={aviso} onCerrar={() => setAviso(null)} />
      {especial && (
        <DialogoConfirmacion
          abierto={confirmando}
          titulo={`Cancelar seguimiento de «${nombreEjemplar(especial.ejemplar_codigo, especial.ejemplar_alias)}»`}
          consecuencia="No se podrán programar más aplicaciones adicionales. Lo ya registrado se conserva."
          textoConfirmar="Cancelar seguimiento"
          variante="destructivo"
          cargando={enviando}
          onConfirmar={() => void cancelar()}
          onCancelar={() => {
            setConfirmando(false)
            setMotivo('')
            setFalloCancelar(null)
          }}
        >
          <AreaTexto
            id="cancelar-especial-motivo"
            etiqueta="Motivo"
            ayuda="Por qué ya no se necesita el seguimiento; queda en el historial"
            required
            rows={2}
            value={motivo}
            maxLength={300}
            onChange={(e) => setMotivo(e.target.value)}
          />
          {falloCancelar && <AvisoEnLinea tono="error">{falloCancelar}</AvisoEnLinea>}
        </DialogoConfirmacion>
      )}
    </div>
  )
}
