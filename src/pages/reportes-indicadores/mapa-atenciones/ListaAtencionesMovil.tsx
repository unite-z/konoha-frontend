/**
 * Lista de atenciones del mapa en móvil (RF-REP-007): una ficha por atención en lugar de la tabla, de 25 en 25.
 * «Ver resumen» la selecciona (como el clic en una fila) y lleva al resumen del panel de capas.
 */
import { useState } from 'react'
import { Link } from 'react-router'
import Badge from '../../../components/ui/Badge'
import Boton from '../../../components/ui/Boton'
import { rutaDetalleAtencion } from '../../../router/rutasApp'
import { formatearFecha, formatearNumero } from '../../../utils/formato'
import type { FilaMapa } from '../../../utils/mapaAtenciones'
import { insigniaEstadoAtencion } from '../../../utils/reportesGestion'
import estilos from './MapaAtenciones.module.css'

const POR_TANDA = 25

export interface ListaAtencionesMovilProps {
  filas: FilaMapa[]
  seleccion: string | null
  onSeleccionar: (clave: string) => void
}

export default function ListaAtencionesMovil({ filas, seleccion, onSeleccionar }: ListaAtencionesMovilProps) {
  const [visibles, setVisibles] = useState(POR_TANDA)
  const mostradas = filas.slice(0, visibles)

  function verResumen(clave: string) {
    onSeleccionar(clave)
    document.getElementById('titulo-seleccion')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <>
      <ul className={estilos.fichas} aria-label="Lista de atenciones">
        {mostradas.map((f) => (
          <li key={f.clave}>
            <article className={`${estilos.ficha} ${f.clave === seleccion ? estilos.fichaElegida : ''}`}>
              <div className={estilos.cabeceraFicha}>
                <Link to={rutaDetalleAtencion(f.atencion_id)} className={estilos.codigoFicha}>
                  {f.codigo}
                </Link>
                <Badge {...insigniaEstadoAtencion(f.estado)} />
              </div>
              <p className={estilos.metaFicha}>
                {f.tipo_atencion} · {f.tipo_servicio}
              </p>
              <p className={estilos.metaFicha}>
                {f.espacio}
                {f.ejemplar_codigo ? ` · Ejemplar ${f.ejemplar_codigo}` : ''} · {formatearFecha(f.fecha)}
              </p>
              <div className={estilos.pieFicha}>
                {f.con_ubicacion ? <Badge tono="info" texto="En el mapa" /> : <Badge tono="neutral" texto="Sin ubicación" />}
                <Boton variante="terciario" onClick={() => verResumen(f.clave)}>
                  Ver resumen
                </Boton>
              </div>
            </article>
          </li>
        ))}
      </ul>
      {filas.length > POR_TANDA && (
        <div className={estilos.pieLista}>
          <p className="cifra">
            Mostrando {formatearNumero(mostradas.length)} de {formatearNumero(filas.length)}
          </p>
          {mostradas.length < filas.length && (
            <Boton variante="secundario" onClick={() => setVisibles((n) => n + POR_TANDA)}>
              Mostrar más atenciones
            </Boton>
          )}
        </div>
      )}
    </>
  )
}
