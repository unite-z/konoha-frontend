/**
 * Cabecera de la revisión (RF-IA-001; mockup, pantalla 6): identifica la atención, el proveedor, el tipo de
 * servicio y el informe analizado con los datos de MOD-05, y permite descargar el documento analizado.
 * Si MOD-05 no responde, se muestran los números de la propuesta.
 */
import { useState } from 'react'
import AvisoEnLinea from '../../../../components/ui/AvisoEnLinea'
import Badge from '../../../../components/ui/Badge'
import Boton, { BotonEnlace } from '../../../../components/ui/Boton'
import Icono from '../../../../components/ui/Icono'
import { useConsulta } from '../../../../hooks/useConsulta'
import { rutaDetalleAtencion } from '../../../../router/rutasApp'
import { aErrorApi } from '../../../../services/api/cliente'
import { descargarDocumento } from '../../../../services/api/tercerizados'
import type { SugerenciaIA } from '../../../../types/ia'
import { insigniaSugerencia } from '../../../../utils/estados'
import { formatearFecha, formatearNumero, SIN_VALOR } from '../../../../utils/formato'
import estilos from './CabeceraPropuesta.module.css'
import { cargarInforme } from './consultasApoyo'
import { coberturaSugerencia } from './valoresCampo'

export default function CabeceraPropuesta({ sugerencia }: { sugerencia: SugerenciaIA }) {
  const { entrada, ia } = sugerencia.contenido
  const informe = useConsulta(`informe|${entrada.atencion_id}|${entrada.reporte_proveedor_id}|${entrada.archivo_id}`, (signal) =>
    cargarInforme(entrada.atencion_id, entrada.reporte_proveedor_id, entrada.archivo_id, signal),
  )
  const { atencion, reporte, documento } = informe.datos ?? { atencion: null, reporte: null, documento: null }
  const { conValor, total } = coberturaSugerencia(sugerencia)
  const [descargando, setDescargando] = useState(false)
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null)

  async function descargar() {
    if (!documento || !reporte || descargando) return
    setDescargando(true)
    setErrorDescarga(null)
    try {
      await descargarDocumento(reporte.atencion_id, reporte.id, documento.id, documento.archivo.nombre_original)
    } catch (causa) {
      setErrorDescarga(aErrorApi(causa).detalle)
    } finally {
      setDescargando(false)
    }
  }

  const datos: { etiqueta: string; valor: string }[] = [
    { etiqueta: 'Atención', valor: atencion?.codigo ?? `n.º ${entrada.atencion_id}` },
    ...(atencion
      ? [
          { etiqueta: 'Proveedor', valor: atencion.proveedor_nombre ?? SIN_VALOR },
          { etiqueta: 'Tipo de servicio', valor: atencion.tipo_servicio_nombre ?? SIN_VALOR },
        ]
      : []),
    {
      etiqueta: 'Informe',
      valor: reporte
        ? `Revisión ${reporte.revision} · recibido el ${formatearFecha(reporte.fecha_recepcion)}`
        : `Reporte n.º ${entrada.reporte_proveedor_id}`,
    },
    { etiqueta: 'Formato estándar', valor: `versión ${entrada.formato_version ?? SIN_VALOR}` },
    { etiqueta: 'Generada con', valor: `${ia.proveedor} · ${ia.modelo}` },
  ]

  return (
    <section className={estilos.cabecera} aria-label="Identificación de la propuesta">
      <div className={estilos.lineaTitulo}>
        <Badge {...insigniaSugerencia(sugerencia.estado, sugerencia.etiqueta_estado)} />
        {atencion && (
          <BotonEnlace to={rutaDetalleAtencion(atencion.id)} variante="terciario">
            Ver la atención en Servicios tercerizados
          </BotonEnlace>
        )}
      </div>
      <dl className={estilos.datos}>
        {datos.map((d) => (
          <div key={d.etiqueta}>
            <dt>{d.etiqueta}</dt>
            <dd>{d.valor}</dd>
          </div>
        ))}
      </dl>

      <div className={estilos.documento}>
        <span className={estilos.nombreDocumento}>
          <Icono nombre="documento" />
          <span>
            {documento?.archivo.nombre_original ?? `Informe final del proveedor · archivo n.º ${entrada.archivo_id}`}
          </span>
        </span>
        <span className={`${estilos.cobertura} cifra`}>
          Datos encontrados por la IA: {formatearNumero(conValor)} de {formatearNumero(total)}
        </span>
        {documento && (
          <Boton variante="secundario" cargando={descargando} onClick={() => void descargar()}>
            Descargar informe
          </Boton>
        )}
      </div>
      {errorDescarga && (
        <AvisoEnLinea tono="error" titulo="No se pudo descargar el informe">
          {errorDescarga}
        </AvisoEnLinea>
      )}
    </section>
  )
}
