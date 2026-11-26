/**
 * Informes del proveedor en la atención abierta (RD-54): «Adjuntar reporte», «Subsanar informe» y «Adjuntar nueva
 * revisión» (según el estado) abren `DialogoReporte` tal cual (varios archivos, envío idempotente y datos del formato
 * estándar del informe final, `DatosInformeFinal`). Debajo, las revisiones registradas y cuál es la vigente. Con
 * permiso de adjuntar, enlaza también a «Subir informe» con la atención ya elegida (punto de entrada de RD-56).
 *
 * Movimiento: el botón se transforma en el diálogo (mismo `view-transition-name`, que pasa del botón al diálogo
 * mientras está abierto) y vuelve al botón al cerrar; la revisión nueva entra en la lista con un fundido corto. Con
 * «reducir movimiento», cambio directo.
 */
import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react'
import Boton, { BotonEnlace } from '@/design-system/Boton'
import Estado from '@/design-system/Estado'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import { disponibilidad } from '@/config/permisosTercerizados'
import { useConsulta } from '@/hooks/useConsulta'
import DialogoReporte from '@/pages/servicios-tercerizados/acciones/DialogoReporte'
import { estiloTransicion, transicionar } from '@/rediseno/base/movimiento'
import { listarReportes } from '@/services/api/tercerizados'
import type { Atencion, ReporteProveedor } from '@/types/tercerizados'
import { formatearFecha, formatearNumero } from '@/utils/formato'
import { rutaSubirInforme } from '../enlaces'
import estilos from './Informes.module.css'
import { textoAdjuntar } from './textoInformes'

/** Nombre de transición compartido por el botón de adjuntar y el diálogo en el que se transforma. */
const NOMBRE_ADJUNTAR_INFORME = 'adjuntar-informe'

export interface InformesProps {
  atencion: Atencion
  permisos: readonly string[] | null
  /** Cambia al registrarse una revisión: recarga la lista. */
  version: number
  onActualizada: (atencion: Atencion) => void
  onReporteAdjunto: (reporte: ReporteProveedor | null) => void
  onExito: (mensaje: string) => void
}

export default function Informes({
  atencion,
  permisos,
  version,
  onActualizada,
  onReporteAdjunto,
  onExito,
}: InformesProps) {
  const [abierto, setAbierto] = useState(false)
  const contenedor = useRef<HTMLElement>(null)
  const idTitulo = useId()
  const adjuntar = disponibilidad('adjuntarReporte', permisos, atencion)
  const primera = atencion.estado === 'Ejecutado pendiente de reporte'

  const consulta = useConsulta(
    `informes|${atencion.id}|${atencion.estado}|${version}`,
    (signal) => listarReportes(atencion.id, 1, signal),
    (datos) => datos.results.length === 0,
  )

  // Mientras el diálogo está abierto lleva el nombre de transición que deja libre el botón.
  useLayoutEffect(() => {
    const dialogo = contenedor.current?.querySelector('dialog')
    if (!abierto || !dialogo) return
    dialogo.style.viewTransitionName = NOMBRE_ADJUNTAR_INFORME
    return () => {
      dialogo.style.viewTransitionName = ''
    }
  }, [abierto])

  const abrir = () => transicionar(() => setAbierto(true))
  const cerrar = useCallback(() => transicionar(() => setAbierto(false)), [])
  const alAdjuntar = useCallback(
    (mensaje: string) => {
      cerrar()
      onExito(mensaje)
    },
    [cerrar, onExito],
  )

  let lista
  if (consulta.estado === 'error' && consulta.error?.estado === 403) {
    lista = (
      <EstadoSinAcceso
        nivel={3}
        titulo="No puedes ver los informes"
        descripcion="El servidor no te permite consultar los informes de esta atención."
      />
    )
  } else if (consulta.estado === 'error') {
    lista = (
      <EstadoError
        nivel={3}
        titulo="No pudimos cargar los informes"
        descripcion={consulta.error?.detalle ?? ''}
        onReintentar={consulta.reintentar}
      />
    )
  } else if (consulta.estado === 'vacio') {
    lista = (
      <EstadoVacio
        nivel={3}
        icono="documento"
        titulo="Aún no hay informes"
        descripcion={
          adjuntar.visible
            ? 'Adjunta el informe final y la documentación cuando el proveedor los entregue.'
            : 'El proveedor entrega su informe final cuando termina el servicio.'
        }
      />
    )
  } else if (consulta.datos) {
    const revisiones = consulta.datos.results
    lista = (
      <ol className={estilos.lista} aria-label="Revisiones del informe">
        {revisiones.map((r, indice) => (
          <li key={r.id} className={estilos.revision}>
            <span className={estilos.numero}>Revisión {r.revision}</span>
            {indice === 0 ? <Estado tono="exito" texto="Vigente" /> : <Estado tono="neutro" texto="Anterior" />}
            <span className={estilos.detalle}>
              Recibida el {formatearFecha(r.fecha_recepcion)} · {formatearNumero(r.documentos.length)}{' '}
              {r.documentos.length === 1 ? 'documento' : 'documentos'}
              {r.usuario_creacion_nombre ? ` · ${r.usuario_creacion_nombre}` : ''}
              {r.datos_formato ? ' · con datos del formato estándar' : ''}
            </span>
          </li>
        ))}
      </ol>
    )
  } else {
    lista = consulta.cargaVisible ? <EstadoCarga forma="tabla" filas={2} /> : null
  }

  return (
    <section className={estilos.bloque} aria-labelledby={idTitulo} ref={contenedor}>
      <div className={estilos.cabecera}>
        <h3 id={idTitulo} className={estilos.titulo}>
          Informes del proveedor
        </h3>
        {consulta.datos && consulta.datos.count > 0 && (
          <span className={estilos.cuenta}>
            {formatearNumero(consulta.datos.count)} {consulta.datos.count === 1 ? 'revisión' : 'revisiones'}
          </span>
        )}
        {adjuntar.visible && (
          <span
            className={estilos.accion}
            style={abierto ? undefined : estiloTransicion(NOMBRE_ADJUNTAR_INFORME)} /* estilo-calculado */
          >
            <Boton variante={primera ? 'primario' : 'secundario'} onClick={abrir} deshabilitado={!adjuntar.habilitada}>
              {textoAdjuntar(atencion.estado)}
            </Boton>
          </span>
        )}
      </div>
      {lista}
      {adjuntar.visible && (
        <BotonEnlace to={rutaSubirInforme(atencion.id)} variante="enlace" className={estilos.enlace} viewTransition>
          Subir informe y extraer sus datos con Konoha
        </BotonEnlace>
      )}
      <DialogoReporte
        abierto={abierto}
        atencion={atencion}
        onCerrar={cerrar}
        onActualizada={onActualizada}
        onReporteAdjunto={onReporteAdjunto}
        onExito={alAdjuntar}
      />
    </section>
  )
}
