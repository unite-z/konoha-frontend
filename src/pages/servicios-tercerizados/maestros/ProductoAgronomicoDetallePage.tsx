// RF-FIT-003 · Ficha del producto agronómico
/**
 * Ficha de un producto agronómico: principio activo, presentación y su estado. El jefe de sección puede
 * editarlo y habilitarlo o inhabilitarlo desde aquí.
 */
import { useState } from 'react'
import { useLocation, useParams } from 'react-router'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import AvisoTemporal from '@/components/ui/AvisoTemporal'
import { BotonEnlace } from '@/components/ui/Boton'
import Estado from '@/components/ui/Estado'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoVacio from '@/components/ui/EstadoVacio'
import ListaDescripcion from '@/components/ui/ListaDescripcion'
import Tarjeta from '@/components/ui/Tarjeta'
import { puedeAdministrarProductosAgronomicos } from '@/config/permisosMaestros'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_TERCERIZADOS, rutaEditarProductoAgronomico, RUTAS_TERCERIZADOS } from '@/router/rutasApp'
import { obtenerProductoAgronomico } from '@/services/api/maestrosTercerizados'
import { usePermisos } from '@/sesion/ContextoSesion'
import type { ProductoAgronomico } from '@/types/maestrosTercerizados'
import { SIN_VALOR } from '@/utils/formato'
import AccionEstadoProductoAgronomico from './AccionEstadoProductoAgronomico'
import { avisoDeNavegacion, volverALista } from './filtrosMaestros'
import estilos from './Maestros.module.css'

export default function ProductoAgronomicoDetallePage() {
  const { id: parametro } = useParams()
  const { state } = useLocation()
  const id = parametro && /^\d{1,9}$/.test(parametro) ? Number(parametro) : null
  const volverA = volverALista(state)
  const permisos = usePermisos()
  const puedeAdministrar = puedeAdministrarProductosAgronomicos(permisos)

  const consulta = useConsulta(id === null ? null : `producto-agronomico|${id}`, (signal) => obtenerProductoAgronomico(id as number, signal))
  // Última versión que devolvió el servidor al cambiar el estado; vale mientras sea el mismo producto.
  const [actualizado, setActualizado] = useState<ProductoAgronomico | null>(null)
  const producto = actualizado && actualizado.id === consulta.datos?.id ? actualizado : consulta.datos
  const [aviso, setAviso] = useState<string | null>(() => avisoDeNavegacion(state))
  const [falloEstado, setFalloEstado] = useState<string | null>(null)

  function alCambiarEstado(nuevo: ProductoAgronomico) {
    setActualizado(nuevo)
    setFalloEstado(null)
    setAviso(nuevo.activo ? 'Producto habilitado.' : 'Producto inhabilitado.')
  }

  usePaginaActual(producto ? producto.nombre : 'Producto agronómico', [
    MIGAS_TERCERIZADOS.serviciosTercerizados,
    MIGAS_TERCERIZADOS.productosAgronomicos,
    { texto: producto ? producto.nombre : 'Ficha' },
  ])

  let contenido
  if (id === null || (consulta.estado === 'error' && consulta.error?.estado === 404)) {
    contenido = (
      <EstadoVacio
        titulo="No existe este producto"
        descripcion="Revisa el enlace o búscalo en la lista."
        accion={
          <BotonEnlace to={RUTAS_TERCERIZADOS.productosAgronomicos} variante="secundario">
            Ir a productos agronómicos
          </BotonEnlace>
        }
      />
    )
  } else if (consulta.estado === 'error' && !producto) {
    contenido = (
      <EstadoError titulo="No pudimos cargar el producto" descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} />
    )
  } else if (!producto) {
    contenido = consulta.cargaVisible ? <EstadoCarga forma="pagina" /> : null
  } else {
    contenido = (
      <>
        <Tarjeta relleno="amplio" etiquetadaPor="titulo-producto">
          <div className={estilos.cabeceraFicha}>
            <div className={estilos.enLinea}>
              <h2 id="titulo-producto" className={estilos.tituloPrincipal}>
                {producto.nombre}
              </h2>
              <Estado tono={producto.activo ? 'exito' : 'neutro'} texto={producto.activo ? 'Habilitado' : 'Inhabilitado'} />
            </div>
            {puedeAdministrar && (
              <div className={estilos.enLinea}>
                <AccionEstadoProductoAgronomico producto={producto} onCambiado={alCambiarEstado} onFallo={setFalloEstado} />
                <BotonEnlace to={rutaEditarProductoAgronomico(producto.id)} variante="secundario" state={{ volverA }}>
                  Editar
                </BotonEnlace>
              </div>
            )}
          </div>
        </Tarjeta>

        {falloEstado && (
          <AvisoEnLinea tono="error" titulo="No se pudo cambiar el estado">
            {falloEstado}
          </AvisoEnLinea>
        )}
        {!producto.activo && (
          <AvisoEnLinea tono="advertencia" titulo="Producto inhabilitado">
            No se puede aplicar en atenciones nuevas. Lo ya registrado se conserva.
          </AvisoEnLinea>
        )}

        <Tarjeta titulo="Datos del producto" relleno="amplio">
          <ListaDescripcion
            elementos={[
              { etiqueta: 'Principio activo', valor: producto.principio_activo || SIN_VALOR },
              { etiqueta: 'Presentación', valor: producto.presentacion || SIN_VALOR },
            ]}
          />
        </Tarjeta>
      </>
    )
  }

  return (
    <div className={estilos.pagina}>
      <div>
        <BotonEnlace to={`${RUTAS_TERCERIZADOS.productosAgronomicos}${volverA}`} variante="terciario">
          Volver a productos agronómicos
        </BotonEnlace>
      </div>
      {contenido}
      <AvisoTemporal mensaje={aviso} onCerrar={() => setAviso(null)} />
    </div>
  )
}
