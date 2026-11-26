import { useState } from 'react'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton from '@/components/ui/Boton'
import DialogoConfirmacion from '@/components/ui/DialogoConfirmacion'
import Selector from '@/components/ui/Selector'
import { asignarPoligonoMapa, revisarImpactoPoligono, type ImpactoPoligono } from '@/services/api/mapaAsignaciones'
import type { AreaVerde } from '@/types/areasVerdes'
import type { PoligonoMapaAsignado } from '@/types/mapaInventario'
import { idPoligono, type Poligono } from './mapaAreasVerdesUtils'
import estilos from './MapaAreasVerdesPage.module.css'

export function EditorVinculo({
  seleccionado,
  vinculo,
  areas,
  alGuardar,
}: {
  seleccionado: Poligono
  vinculo: PoligonoMapaAsignado | undefined
  areas: AreaVerde[]
  alGuardar: () => void
}) {
  const [borrador, setBorrador] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [impacto, setImpacto] = useState<ImpactoPoligono | null>(null)
  const [aviso, setAviso] = useState<{ tono: 'exito' | 'error'; texto: string } | null>(null)
  const vigente = String(vinculo?.area_verde_id ?? '')
  const valor = borrador ?? vigente

  async function guardar(confirmado?: ImpactoPoligono) {
    if (valor === vigente) return
    setGuardando(true)
    setAviso(null)
    try {
      const id = idPoligono(seleccionado)
      const destino = valor ? Number(valor) : null
      const revision = confirmado ?? (await revisarImpactoPoligono(id, destino))
      if (revision.conflictos.length) {
        const codigos = revision.conflictos.map(({ codigo }) => codigo).join(', ')
        setAviso({
          tono: 'error',
          texto: 'Revisa el área vinculada o la ubicación de estos ejemplares antes de guardar: ' + codigos,
        })
        return
      }
      if (!confirmado && revision.reasignables.length) {
        setImpacto(revision)
        return
      }
      const respuesta = await asignarPoligonoMapa(id, destino, revision)
      setImpacto(null)
      setBorrador(respuesta.area_verde_id === null ? '' : String(respuesta.area_verde_id))
      setAviso({
        tono: 'exito',
        texto: respuesta.area_verde_id ? 'Vínculo guardado.' : 'Se quitó el vínculo con el inventario.',
      })
      alGuardar()
    } catch (causa) {
      setImpacto(null)
      setAviso({ tono: 'error', texto: causa instanceof Error ? causa.message : 'No se pudo guardar el vínculo.' })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <div className={estilos.filaVinculo}>
        <Selector
          id="area-poligono"
          etiqueta="Cambiar área vinculada"
          valor={valor}
          disabled={guardando}
          onCambiar={setBorrador}
          opcionTodos="Sin vincular"
          opciones={areas.map((area) => ({ valor: String(area.id), texto: area.nombre + ' · ' + area.lugar }))}
        />
        <Boton
          variante="secundario"
          cargando={guardando}
          deshabilitado={valor === vigente}
          onClick={() => void guardar()}
        >
          Guardar vínculo
        </Boton>
      </div>
      {aviso && <AvisoEnLinea tono={aviso.tono}>{aviso.texto}</AvisoEnLinea>}
      <DialogoConfirmacion
        abierto={impacto !== null}
        titulo="Cambiar el vínculo del área del mapa"
        consecuencia="El área del mapa y los ejemplares indicados quedarán vinculados a la nueva ficha del inventario. Los ejemplares conservarán sus coordenadas."
        textoConfirmar="Confirmar reasignación"
        cargando={guardando}
        onConfirmar={() => {
          if (impacto) void guardar(impacto)
        }}
        onCancelar={() => setImpacto(null)}
      >
        {impacto && (
          <ul>
            {impacto.reasignables.map(({ id, codigo }) => (
              <li key={id}>{codigo}</li>
            ))}
          </ul>
        )}
      </DialogoConfirmacion>
    </>
  )
}
