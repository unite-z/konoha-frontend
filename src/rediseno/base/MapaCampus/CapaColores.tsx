/**
 * CapaColores (AV-426): colorea áreas del campus por clase sin regenerar el mapa base. El módulo pasa `clases`
 * (`mapa_id → clase`) y `colores` (`clase → token CSS`, p. ej. `--color-success`); los colores salen siempre de tokens y
 * siguen al tema. Memoriza ambos objetos (`useMemo`) o la capa se repinta en cada render.
 */
import { useEffect, useMemo } from 'react'
import { agruparPorClase } from './colores'
import { useMapa } from './contexto'

export interface CapaColoresProps {
  clases: Readonly<Record<string, string>>
  colores: Readonly<Record<string, string>>
}

export default function CapaColores({ clases, colores }: CapaColoresProps) {
  const mapa = useMapa()
  const grupos = useMemo(() => (mapa ? agruparPorClase(mapa.datos, clases, colores) : []), [mapa, clases, colores])
  const escena = mapa?.escena
  useEffect(() => {
    if (!escena || grupos.length === 0) return
    return escena.pintarAreas(grupos)
  }, [escena, grupos])
  return null
}
