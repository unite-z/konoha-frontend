/**
 * Cabecera de la revisión (RF-IA-001; mockup, pantalla 6): identifica la atención, el proveedor, el tipo de
 * servicio y el informe analizado con los datos de MOD-05 que devuelve la propuesta (AV-355), y permite descargar
 * el documento analizado. Si el back-end no los encontró, se muestran los números de la propuesta.
 */
import { useState } from 'react'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton, { BotonEnlace } from '@/components/ui/Boton'
import Icono from '@/components/ui/Icono'
import { rutaDetalleAtencion } from '@/router/rutasApp'
import { aErrorApi } from '@/services/api/cliente'
import { descargarDocumento } from '@/services/api/tercerizados'
import type { SugerenciaIA } from '@/types/ia'
import { insigniaSugerencia } from '@/utils/estados'
import { formatearFecha, formatearNumero, SIN_VALOR } from '@/utils/formato'
import estilos from './CabeceraPropuesta.module.css'
import { coberturaSugerencia } from './valoresCampo'
import Estado from '@/components/ui/Estado'
import { insigniaAEstado } from '@/components/ui/tonos'

export default function CabeceraPropuesta({ sugerencia }: { sugerencia: SugerenciaIA }) {
  const { entrada, ia } = sugerencia.contenido
  const atencion = sugerencia.atencion ?? null
  const reporte = sugerencia.informe ?? null
  const documento = reporte?.documento ?? null
  const { conValor, total } = coberturaSugerencia(sugerencia)
  const [descargando, setDescargando] = useState(false)
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null)

  async function descargar() {
    if (!documento || !reporte || descargando) return
    setDescargando(true)
    setErrorDescarga(null)
    try {
      await descargarDocumento(entrada.atencion_id, reporte.id, documento.id, documento.nombre)
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
          { etiqueta: 'Proveedor', valor: atencion.proveedor ?? SIN_VALOR },
          { etiqueta: 'Tipo de servicio', valor: atencion.tipo_servicio ?? SIN_VALOR },
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
        <Estado {...insigniaAEstado(insigniaSugerencia(sugerencia.estado, sugerencia.etiqueta_estado))} />
        {atencion && (
          <BotonEnlace to={rutaDetalleAtencion(atencion.id)} variante="fantasma">
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
            {documento?.nombre ?? `Informe final del proveedor · archivo n.º ${entrada.archivo_id}`}
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
