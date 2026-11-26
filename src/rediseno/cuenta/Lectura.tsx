/**
 * Configuración › Lectura (P-16): tamaño del texto, guardado en este navegador. Es un elemento del prototipo sin
 * requisito detrás: va el último y se puede quitar de `SECCIONES_CONFIGURACION` sin tocar nada más.
 */
import { useState } from 'react'
import GrupoOpciones, { type OpcionGrupo } from '@/design-system/GrupoOpciones'
import { transicionar } from '../base/movimiento'
import { guardarTamanoLectura, leerTamanoLectura, type TamanoLectura } from './tamanoLectura'
import estilos from './Configuracion.module.css'

const OPCIONES: OpcionGrupo<TamanoLectura>[] = [
  { valor: 'normal', texto: 'Normal' },
  { valor: 'grande', texto: 'Grande' },
  { valor: 'muy-grande', texto: 'Muy grande' },
]

export default function Lectura() {
  const [tamano, setTamano] = useState<TamanoLectura>(leerTamanoLectura)
  return (
    <div className={estilos.campos}>
      <GrupoOpciones
        etiqueta="Tamaño del texto"
        opciones={OPCIONES}
        valor={tamano}
        onCambiar={(nuevo) => {
          setTamano(nuevo)
          transicionar(() => guardarTamanoLectura(nuevo))
        }}
        segmentado
      />
      <p className={estilos.ayuda}>Solo se guarda en este navegador.</p>
    </div>
  )
}
