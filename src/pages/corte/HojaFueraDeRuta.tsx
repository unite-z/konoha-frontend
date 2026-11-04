/**
 * Hoja «Jardín fuera de ruta» (AV-271, Figma 375-6772, CU-MOD03-011 flujo 2b): el capataz cortó un jardín que no está
 * en la ruta. Lo busca en el maestro por código o nombre y lo marca con una nota obligatoria; queda pendiente de que el
 * jefe de sección lo incorpore.
 *
 * Supuesto (no lo definen los requisitos): se llega con «Añadir jardín fuera de ruta» en «Ruta de hoy», que busca en el
 * maestro de jardines. Lo debe validar Marcos.
 */
import { useState } from 'react'
import CampoFormulario from '@/components/ui/CampoFormulario'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import SelectorBuscable from '@/components/ui/SelectorBuscable'
import { buscarJardinesFueraDeRuta, marcarFueraDeRuta } from '@/services/api/corte'
import type { JardinMaestro } from '@/types/corte'

export interface HojaFueraDeRutaProps {
  programacionId: number
  /** Clave de idempotencia de esta marca (se genera al abrir la hoja). */
  clave: string
  onCerrar: () => void
  onMarcado: (jardin: JardinMaestro) => void
}

export default function HojaFueraDeRuta({ programacionId, clave, onCerrar, onMarcado }: HojaFueraDeRutaProps) {
  const [jardin, setJardin] = useState<JardinMaestro | null>(null)
  const [nota, setNota] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<{ titulo: string; detalle: string } | null>(null)

  async function marcar() {
    if (!jardin || !nota.trim()) return
    setEnviando(true)
    setError(null)
    try {
      await marcarFueraDeRuta(programacionId, { jardin_id: jardin.id, marcado_en: new Date().toISOString(), nota: nota.trim() }, clave)
      onMarcado(jardin)
    } catch (causa) {
      setError({ titulo: 'No se pudo marcar el jardín', detalle: causa instanceof Error ? causa.message : 'Inténtalo de nuevo.' })
      setEnviando(false)
    }
  }

  return (
    <DialogoFormulario
      abierto
      ancho="hoja"
      titulo="Jardín fuera de ruta"
      descripcion={jardin ? `${jardin.codigo} · ${jardin.nombre} no está en la ruta de hoy.` : 'Busca el jardín por su código o su nombre.'}
      textoConfirmar="Marcar con nota"
      conObligatorios={false}
      hayCambios={Boolean(jardin || nota.trim())}
      envioDeshabilitado={!jardin || !nota.trim()}
      enviando={enviando}
      error={error}
      onEnviar={() => void marcar()}
      onCerrar={onCerrar}
    >
      {!jardin && (
        <SelectorBuscable<JardinMaestro>
          id="fuera-de-ruta-jardin"
          etiqueta="Jardín"
          obligatorio
          valor={jardin}
          claveDe={(j) => j.id}
          textoDe={(j) => `${j.codigo} · ${j.nombre}`}
          detalleDe={(j) => j.zona}
          buscar={(texto, signal) => buscarJardinesFueraDeRuta(texto, signal)}
          onCambiar={setJardin}
          placeholder="Código o nombre del jardín"
        />
      )}
      {jardin && <CampoFormulario id="fuera-de-ruta-nota" etiqueta="Nota" obligatorio value={nota} maxLength={300} onChange={(e) => setNota(e.target.value)} />}
    </DialogoFormulario>
  )
}
