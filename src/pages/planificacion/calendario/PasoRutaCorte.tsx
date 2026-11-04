/**
 * Paso «Ruta» de «Programar ciclo» para el corte de césped (AV-270 y AV-259, Figma 372-5523): la ruta de MOD-02 que
 * se copia al programar, con cada zona y sus jardines. Se pueden quitar zonas de la ruta o añadir las que están fuera
 * de ella; «Ajustar» lleva al mapa de MOD-02, donde se define la ruta. Si el servicio va fuera de frecuencia, lo avisa.
 */
import { Link } from 'react-router'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Casilla from '@/components/ui/Casilla'
import EstadoCarga from '@/components/ui/EstadoCarga'
import { RUTAS_INVENTARIO } from '@/router/rutasApp'
import type { RutaCorte } from '@/types/corte'
import { jardines } from '../ciclos/corte'
import estilos from './Calendario.module.css'

export interface PasoRutaCorteProps {
  ruta: RutaCorte | undefined
  error: string | null
  zonas: string[]
  onCambiar: (zona: string, incluida: boolean) => void
}

/** Jardines de las zonas elegidas («Ruta de jardines · 45»). */
export function jardinesElegidos(ruta: RutaCorte, zonas: string[]): number {
  return ruta.zonas.filter((z) => zonas.includes(z.zona)).reduce((suma, z) => suma + z.jardines, 0)
}

export default function PasoRutaCorte({ ruta, error, zonas, onCambiar }: PasoRutaCorteProps) {
  if (error) {
    return (
      <AvisoEnLinea tono="error" titulo="No se pudo cargar la ruta">
        {error}
      </AvisoEnLinea>
    )
  }
  if (!ruta) return <EstadoCarga texto="Cargando la ruta…" />
  return (
    <div className={estilos.pasoPanel}>
      {ruta.fuera_de_frecuencia && (
        <AvisoEnLinea tono="error" titulo="Fuera de frecuencia">
          Han pasado {ruta.fuera_de_frecuencia.dias_desde_ultimo} días desde el último ciclo (máximo {ruta.fuera_de_frecuencia.maximo_dias}).
        </AvisoEnLinea>
      )}
      <div className={estilos.bloqueAgenda}>
        <div className={estilos.cabeceraRuta}>
          <span className={estilos.rotuloConflictos}>Ruta de jardines · {jardinesElegidos(ruta, zonas)}</span>
          <Link to={RUTAS_INVENTARIO.mapa} className={estilos.enlaceRuta}>
            Ajustar
          </Link>
        </div>
        <ul className={estilos.zonasRuta}>
          {ruta.zonas.map((zona) => (
            <li key={zona.zona} className={estilos.zonaRuta}>
              <Casilla
                id={`ruta-${zona.zona}`}
                etiqueta={zona.zona}
                marcada={zonas.includes(zona.zona)}
                onCambiar={(incluida) => onCambiar(zona.zona, incluida)}
              />
              <span className={estilos.detalle}>{zona.en_ruta ? jardines(zona.jardines) : 'Fuera de esta ruta'}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className={estilos.detalle}>Ruta de MOD-02 · Áreas verdes y mapa</p>
    </div>
  )
}
