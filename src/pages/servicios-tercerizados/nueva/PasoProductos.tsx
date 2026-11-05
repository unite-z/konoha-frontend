// RF-FIT-003 · Productos agronómicos aplicados (solo para control fitosanitario)
/**
 * Selección opcional de productos del catálogo para la atención, con la dosis como texto libre. Solo se
 * muestra cuando el servicio del contrato es «Control fitosanitario» (`NuevaAtencionPage`). El catálogo es
 * pequeño: se carga completo (como las unidades de medida) y se filtra en el cliente.
 */
import { useState } from 'react'
import Casilla from '@/components/ui/Casilla'
import CampoFormulario from '@/components/ui/CampoFormulario'
import Boton from '@/components/ui/Boton'
import EstadoVacio from '@/components/ui/EstadoVacio'
import Tarjeta from '@/components/ui/Tarjeta'
import type { ProductoAgronomico } from '@/types/maestrosTercerizados'
import { formatearNumero } from '@/utils/formato'
import { alternarProducto, type ProductoSeleccionado } from '@/utils/nuevaAtencion'
import estilos from './NuevaAtencion.module.css'

export interface PasoProductosProps {
  productos: ProductoSeleccionado[]
  onCambiar: (productos: ProductoSeleccionado[]) => void
  catalogo: ProductoAgronomico[]
}

export default function PasoProductos({ productos, onCambiar, catalogo }: PasoProductosProps) {
  const [texto, setTexto] = useState('')
  const q = texto.trim().toLowerCase()
  const filtrados = q ? catalogo.filter((p) => p.nombre.toLowerCase().includes(q)) : catalogo
  const elegidos = new Set(productos.map((p) => p.producto_id))

  function actualizar(producto_id: number, dosis: string) {
    onCambiar(productos.map((p) => (p.producto_id === producto_id ? { ...p, dosis } : p)))
  }

  return (
    <div className={estilos.columnasAlcances}>
      <Tarjeta titulo="Productos del catálogo (opcional)" relleno="amplio">
        <CampoFormulario
          id="buscar-producto"
          etiqueta="Buscar productos"
          type="search"
          ayuda="Por nombre. Solo productos habilitados."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        {catalogo.length === 0 ? (
          <EstadoVacio nivel={3} titulo="No hay productos habilitados en el catálogo" />
        ) : filtrados.length === 0 ? (
          <EstadoVacio nivel={3} titulo="Sin productos con esa búsqueda" />
        ) : (
          <ul className={estilos.listaOpciones}>
            {filtrados.map((p) => (
              <li key={p.id} className={estilos.opcionCasilla}>
                <Casilla
                  id={`opcion-producto-${p.id}`}
                  etiqueta={p.nombre}
                  ayuda={p.principio_activo || undefined}
                  marcada={elegidos.has(p.id)}
                  onCambiar={() => onCambiar(alternarProducto(productos, p))}
                />
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      <Tarjeta titulo={`Seleccionados (${formatearNumero(productos.length)})`} relleno="amplio">
        {productos.length === 0 ? (
          <p className={estilos.ayuda}>Aún no seleccionas productos. Es opcional: puedes registrar la atención sin ellos.</p>
        ) : (
          <ul className={estilos.seleccionados}>
            {productos.map((p) => (
              <li key={p.producto_id} className={estilos.seleccionado}>
                <div className={estilos.cabeceraSeleccionado}>
                  <strong>{p.nombre}</strong>
                  <Boton
                    variante="fantasma"
                    compacto
                    aria-label={`Quitar ${p.nombre}`}
                    onClick={() => onCambiar(productos.filter((x) => x.producto_id !== p.producto_id))}
                  >
                    Quitar
                  </Boton>
                </div>
                <CampoFormulario
                  id={`producto-${p.producto_id}-dosis`}
                  etiqueta="Dosis (opcional)"
                  maxLength={120}
                  placeholder="Ej.: 5 ml por litro"
                  value={p.dosis}
                  onChange={(e) => actualizar(p.producto_id, e.target.value)}
                />
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </div>
  )
}
