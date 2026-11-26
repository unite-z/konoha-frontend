import { useState } from 'react'
import { useInRouterContext } from 'react-router'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import { BotonEnlace } from '@/design-system/Boton'
import GrupoOpciones, { type OpcionGrupo } from '@/design-system/GrupoOpciones'
import { RUTA_REDISENO } from '../prefijo'
import { useDisenoNuevo } from '../usarDisenoNuevo'

const OPCIONES: OpcionGrupo<'si' | 'no'>[] = [
  { valor: 'si', texto: 'Encendido' },
  { valor: 'no', texto: 'Apagado' },
]

/** Interruptor «Diseño nuevo» de Configuración › Apariencia. «Sin elegir» no marca ninguna opción. */
export default function InterruptorDisenoNuevo() {
  const { estado, elegir } = useDisenoNuevo()
  const enRouter = useInRouterContext()
  const [sinGuardar, setSinGuardar] = useState(false)
  const valor = estado === 'sinElegir' ? null : estado === 'encendido' ? 'si' : 'no'

  return (
    <>
      <GrupoOpciones
        etiqueta="Diseño nuevo"
        opciones={OPCIONES}
        valor={valor}
        onCambiar={(v) => elegir(v === 'si').then(() => setSinGuardar(false), () => setSinGuardar(true))}
        segmentado
      />
      {sinGuardar && (
        <AvisoEnLinea tono="advertencia">
          No pudimos guardarlo en tu cuenta: se aplicó solo en este navegador.
        </AvisoEnLinea>
      )}
      {enRouter && (
        <div>
          <BotonEnlace to={RUTA_REDISENO} variante="secundario">
            Abrir el diseño nuevo
          </BotonEnlace>
        </div>
      )}
    </>
  )
}
