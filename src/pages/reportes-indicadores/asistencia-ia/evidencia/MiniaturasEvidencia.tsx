/**
 * Fotografías analizadas (RF-IA-006): una tira de miniaturas, cada una con su calidad (Suficiente o Insuficiente, con
 * el motivo). Al pulsar, se abre a tamaño mayor en un diálogo navegable con teclado.
 */
// Excepción al sistema (AV-351): la miniatura pulsable es una imagen dentro de un botón, que Boton no admite.
import { useState } from 'react'
import Tarjeta from '@/components/ui/Tarjeta'
import DialogoDetalle from '@/components/ui/DialogoDetalle'
import Estado from '@/components/ui/Estado'
import EstadoCarga from '@/components/ui/EstadoCarga'
import Icono from '@/components/ui/Icono'
import type { FotografiaAnalizada } from '@/types/evidenciaFitosanitariaIa'
import { formatearNumero } from '@/utils/formato'
import estilos from './Evidencia.module.css'
import { useUrlFotografia } from './useUrlFotografia'

export interface MiniaturasEvidenciaProps {
  sugerenciaId: number
  fotografias: FotografiaAnalizada[]
  /** Código del ejemplar o de la atención, para el texto alternativo. */
  codigo: string
}

const calidad = (f: FotografiaAnalizada) =>
  f.calidad === 'Suficiente'
    ? { tono: 'exito' as const, texto: 'Calidad suficiente' }
    : { tono: 'error' as const, texto: 'Calidad insuficiente', ayuda: f.motivo_calidad ?? undefined }

function Imagen({ sugerenciaId, foto, alt, ampliada = false }: { sugerenciaId: number; foto: FotografiaAnalizada; alt: string; ampliada?: boolean }) {
  const { url, fallo } = useUrlFotografia(sugerenciaId, foto.archivo_id)
  if (url) return <img className={ampliada ? estilos.ampliada : estilos.imagen} src={url} alt={alt} />
  if (!fallo) return ampliada ? <EstadoCarga /> : <span className={estilos.marcador} aria-label={alt} />
  return (
    <span className={estilos.marcador} role="img" aria-label={alt}>
      <Icono nombre="image" />
      {foto.nombre === 'Fotografía de ejemplo' ? 'Fotografía de ejemplo' : 'Sin vista previa'}
    </span>
  )
}

export default function MiniaturasEvidencia({ sugerenciaId, fotografias, codigo }: MiniaturasEvidenciaProps) {
  const [abierta, setAbierta] = useState<number | null>(null)
  const alt = (i: number) => `Fotografía ${i + 1} de ${codigo}`
  const actual = abierta === null ? null : fotografias[abierta]

  return (
    <Tarjeta titulo="Fotografías analizadas" nivel={2} descripcion={`${formatearNumero(fotografias.length)} ${fotografias.length === 1 ? 'fotografía' : 'fotografías'}. Pulsa una para verla más grande.`}>
      <ul className={estilos.tira}>
        {fotografias.map((f, i) => (
          <li key={f.archivo_id} className={estilos.foto}>
            <button type="button" className={estilos.botonFoto} onClick={() => setAbierta(i)} aria-label={`Ampliar ${alt(i).toLowerCase()}`}>
              <Imagen sugerenciaId={sugerenciaId} foto={f} alt={alt(i)} />
            </button>
            <Estado {...calidad(f)} />
            {f.motivo_calidad && <span className={estilos.secundario}>{f.motivo_calidad}</span>}
          </li>
        ))}
      </ul>
      <DialogoDetalle
        abierto={actual !== null}
        titulo={abierta === null ? '' : alt(abierta)}
        descripcion={actual ? [actual.nombre, calidad(actual).texto, actual.motivo_calidad].filter(Boolean).join(' · ') : undefined}
        onCerrar={() => setAbierta(null)}
      >
        {actual && abierta !== null && <Imagen sugerenciaId={sugerenciaId} foto={actual} alt={alt(abierta)} ampliada />}
      </DialogoDetalle>
    </Tarjeta>
  )
}
