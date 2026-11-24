// RF-SER-001 y RF-SER-002 · Ficha del proveedor
/**
 * Ficha de un proveedor: datos, persona de contacto, vínculo con otras empresas y contratos asociados. El
 * jefe de sección puede habilitarlo o inhabilitarlo desde aquí; inhabilitado, no admite contratos ni
 * atenciones nuevos y lo ya registrado se conserva.
 */
import { useCallback, useState, type ReactNode } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import AvisoTemporal from '@/components/ui/AvisoTemporal'
import { BotonEnlace } from '@/components/ui/Boton'
import Estado from '@/components/ui/Estado'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoVacio from '@/components/ui/EstadoVacio'
import ListaDescripcion from '@/components/ui/ListaDescripcion'
import Tarjeta from '@/components/ui/Tarjeta'
import { puedeCambiarEstadoProveedor, puedeRegistrarProveedoresYContratos } from '@/config/permisosMaestros'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_TERCERIZADOS, RUTAS_TERCERIZADOS, rutaDetalleProveedor, rutaEditarProveedor } from '@/router/rutasApp'
import { obtenerProveedor } from '@/services/api/maestrosTercerizados'
import { usePermisos } from '@/sesion/ContextoSesion'
import type { ProveedorMaestro } from '@/types/maestrosTercerizados'
import { datosContacto, textoVinculo } from '@/utils/validacionMaestros'
import AccionEstadoProveedor from './AccionEstadoProveedor'
import ContratosDelProveedor from './ContratosDelProveedor'
import { avisoDeNavegacion, volverALista } from './filtrosMaestros'
import type { EstadoNavegacionProveedor } from './ListaProveedores'
import estilos from './Maestros.module.css'

/**
 * Vínculo con enlace a la ficha de la empresa relacionada («Subsidiaria de X»), para navegar entre ellas sin volver
 * a la lista. Conserva los filtros de la lista a los que vuelve la ficha.
 */
function Vinculo({ proveedor, volverA }: { proveedor: ProveedorMaestro; volverA: string }) {
  const texto = textoVinculo(proveedor)
  const { proveedor_relacionado_id: id, proveedor_relacionado_nombre: nombre } = proveedor
  if (!id || !nombre || !texto.endsWith(nombre)) return texto
  return (
    <>
      {texto.slice(0, -nombre.length)}
      <Link to={rutaDetalleProveedor(id)} state={{ volverA } satisfies EstadoNavegacionProveedor}>
        {nombre}
      </Link>
    </>
  )
}

function Ficha({
  proveedor,
  acciones,
  fallo,
  volverA,
}: {
  proveedor: ProveedorMaestro
  acciones: ReactNode
  fallo: string | null
  volverA: string
}) {
  const contacto = datosContacto(proveedor)
  const sinContacto = !contacto.nombre && !contacto.telefono && !contacto.correo
  return (
    <>
      <Tarjeta relleno="amplio" etiquetadaPor="titulo-proveedor">
        <div className={estilos.cabeceraFicha}>
          <div className={estilos.enLinea}>
            <h2 id="titulo-proveedor" className={estilos.tituloPrincipal}>
              {proveedor.razon_social}
            </h2>
            <Estado
              tono={proveedor.activo ? 'exito' : 'neutro'}
              texto={proveedor.activo ? 'Habilitado' : 'Inhabilitado'}
            />
          </div>
          {acciones}
        </div>
        {fallo && (
          <AvisoEnLinea tono="error" titulo="No se pudo cambiar el estado">
            {fallo}
          </AvisoEnLinea>
        )}
        {!proveedor.activo && (
          <AvisoEnLinea tono="advertencia" titulo="Proveedor inhabilitado">
            No se pueden registrar contratos ni atenciones nuevos con este proveedor. Lo ya registrado se conserva.
          </AvisoEnLinea>
        )}
      </Tarjeta>

      <Tarjeta titulo="Datos del proveedor" relleno="amplio">
        <ListaDescripcion
          elementos={[
            { etiqueta: 'RUC', valor: proveedor.ruc ? <span className="cifra">{proveedor.ruc}</span> : null },
            // Sin «Contratos»: el número ya está en «Contratos asociados», junto a la tabla.
            { etiqueta: 'Vínculo con otras empresas', valor: <Vinculo proveedor={proveedor} volverA={volverA} /> },
          ]}
        />
      </Tarjeta>

      <Tarjeta titulo="Persona de contacto" relleno="amplio">
        {/* Sin ningún dato, una frase en lugar de tres «—». */}
        {sinContacto ? (
          <p className={estilos.ayuda}>Sin persona de contacto registrada.</p>
        ) : (
          <ListaDescripcion
            elementos={[
              { etiqueta: 'Nombre', valor: contacto.nombre },
              { etiqueta: 'Teléfono', valor: contacto.telefono },
              { etiqueta: 'Correo', valor: contacto.correo },
            ]}
          />
        )}
      </Tarjeta>
    </>
  )
}

/**
 * Desde el vínculo se pasa de un proveedor a otro en la misma ruta: la clave remonta la ficha para que el aviso,
 * el fallo y la versión actualizada del proveedor anterior no se arrastren.
 */
export default function ProveedorDetallePage() {
  const { id } = useParams()
  return <FichaProveedor key={id} />
}

function FichaProveedor() {
  const { id: parametro } = useParams()
  const { state } = useLocation()
  const id = parametro && /^\d{1,9}$/.test(parametro) ? Number(parametro) : null
  const volverAQuery = volverALista(state)
  const volverA = RUTAS_TERCERIZADOS.proveedoresContratos + volverAQuery
  const permisos = usePermisos()

  const consulta = useConsulta(id === null ? null : `proveedor|${id}`, (signal) =>
    obtenerProveedor(id as number, signal),
  )
  // Última versión que devolvió el servidor al cambiar el estado o editar; vale mientras sea el mismo proveedor.
  const [actualizado, setActualizado] = useState<ProveedorMaestro | null>(null)
  const proveedor = actualizado && actualizado.id === consulta.datos?.id ? actualizado : consulta.datos
  const [aviso, setAviso] = useState<string | null>(() => avisoDeNavegacion(state))
  const [fallo, setFallo] = useState<string | null>(null)
  const cerrarAviso = useCallback(() => setAviso(null), [])

  usePaginaActual(
    proveedor ? proveedor.razon_social : 'Proveedor',
    [
      MIGAS_TERCERIZADOS.serviciosTercerizados,
      MIGAS_TERCERIZADOS.proveedoresContratos,
      { texto: proveedor ? proveedor.razon_social : 'Ficha' },
    ],
    undefined,
    // El nombre ya se ve en la tarjeta de la ficha, junto con el estado y las acciones: el título
    // de la cabecera quedaría repetido. Se mantiene para lectores de pantalla y la pestaña del navegador.
    { tituloOculto: true },
  )

  function alCambiarEstado(nuevo: ProveedorMaestro) {
    setActualizado(nuevo)
    setFallo(null)
    setAviso(nuevo.activo ? 'Proveedor habilitado.' : 'Proveedor inhabilitado.')
  }

  let contenido
  if (id === null || (consulta.estado === 'error' && consulta.error?.estado === 404)) {
    contenido = (
      <EstadoVacio
        titulo="No existe este proveedor"
        descripcion="Revisa el enlace o búscalo en la lista."
        accion={
          <BotonEnlace to={RUTAS_TERCERIZADOS.proveedoresContratos} variante="secundario">
            Ir a proveedores y contratos
          </BotonEnlace>
        }
      />
    )
  } else if (consulta.estado === 'error' && !proveedor) {
    contenido = (
      <EstadoError
        titulo="No pudimos cargar el proveedor"
        descripcion={consulta.error?.detalle ?? ''}
        onReintentar={consulta.reintentar}
      />
    )
  } else if (!proveedor) {
    contenido = consulta.cargaVisible ? <EstadoCarga forma="pagina" /> : null
  } else {
    contenido = (
      <>
        <Ficha
          proveedor={proveedor}
          fallo={fallo}
          volverA={volverAQuery}
          acciones={
            puedeCambiarEstadoProveedor(permisos) && (
              <div className={estilos.enLinea}>
                <BotonEnlace
                  to={rutaEditarProveedor(proveedor.id)}
                  variante="secundario"
                  state={{ volverA: volverAQuery } satisfies EstadoNavegacionProveedor}
                >
                  Editar
                </BotonEnlace>
                <AccionEstadoProveedor proveedor={proveedor} onCambiado={alCambiarEstado} onFallo={setFallo} />
              </div>
            )
          }
        />
        <ContratosDelProveedor
          key={proveedor.id}
          proveedor={proveedor}
          volverA={volverAQuery}
          puedeRegistrar={puedeRegistrarProveedoresYContratos(permisos)}
        />
      </>
    )
  }

  return (
    <div className={estilos.pagina}>
      <div>
        <BotonEnlace to={volverA} variante="terciario">
          Volver a proveedores
        </BotonEnlace>
      </div>
      {contenido}
      <AvisoTemporal mensaje={aviso} onCerrar={cerrarAviso} />
    </div>
  )
}
