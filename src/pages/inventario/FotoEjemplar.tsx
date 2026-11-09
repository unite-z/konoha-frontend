import { useState } from 'react'
import { useConsulta } from '@/hooks/useConsulta'
import { listarAdjuntos, urlContenidoAdjunto } from '@/services/api/core'
import type { EjemplarInventario } from '@/types/ejemplares'
import estilos from './Catalogos.module.css'

export default function FotoEjemplar({ ejemplar, revision, miniatura = false }: {
  ejemplar: EjemplarInventario
  revision: number
  miniatura?: boolean
}) {
  const consulta = useConsulta(`foto-ejemplar:${ejemplar.id}:${revision}`,
    (signal) => listarAdjuntos('ejemplar', ejemplar.id, signal))
  const [imagenFallida, setImagenFallida] = useState<number | null>(null)
  const foto = consulta.datos?.find((adjunto) => adjunto.registro_id === ejemplar.id
    && (adjunto.tipo_mime === 'image/jpeg' || adjunto.tipo_mime === 'image/png'))
  const clase = miniatura ? estilos.miniaturaEjemplar : estilos.fotoEjemplar

  if (consulta.estado !== 'error' && foto && imagenFallida !== foto.id) {
    return <img className={clase} src={urlContenidoAdjunto(foto.id)}
      alt={`Fotografía de ${ejemplar.codigo}`} loading={miniatura ? 'lazy' : undefined}
      onError={() => setImagenFallida(foto.id)} />
  }

  const mensaje = consulta.estado === 'cargando' ? 'Cargando foto…'
    : consulta.error?.estado === 403 ? 'Foto sin acceso'
      : consulta.estado === 'error' || foto ? 'Foto no disponible' : 'Sin foto registrada'
  return <p className={`${clase} ${estilos.fotoVacia}`}>{mensaje}</p>
}
