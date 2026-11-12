// RF-SER-001 y RF-SER-002 · Ficha del proveedor
/**
 * Ficha de un proveedor: datos, persona de contacto, vínculo con otras empresas y contratos asociados. El
 * jefe de sección puede habilitarlo o inhabilitarlo desde aquí; inhabilitado, no admite contratos ni
 * atenciones nuevos y lo ya registrado se conserva.
 */
import { useCallback, useState, type ReactNode } from 'react'
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
import { puedeCambiarEstadoProveedor, puedeRegistrarProveedoresYContratos } from '@/config/permisosMaestros'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_TERCERIZADOS, RUTAS_TERCERIZADOS, rutaEditarProveedor } from '@/router/rutasApp'
import { obtenerProveedor } from '@/services/api/maestrosTercerizados'
import { useRolTercerizados } from '@/sesion/ContextoSesion'
import type { ProveedorMaestro } from '@/types/maestrosTercerizados'
import { formatearNumero } from '@/utils/formato'
import { datosContacto, textoVinculo } from '@/utils/validacionMaestros'
import AccionEstadoProveedor from './AccionEstadoProveedor'
import ContratosDelProveedor from './ContratosDelProveedor'
import { avisoDeNavegacion, volverALista } from './filtrosMaestros'
import type { EstadoNavegacionProveedor } from './ListaProveedores'
import estilos from './Maestros.module.css'

function Ficha({ proveedor, acciones, fallo }: { proveedor: ProveedorMaestro; acciones: ReactNode; fallo: string | null }) {
  const contacto = datosContacto(proveedor)
  return (
    <>
      <Tarjeta relleno="amplio" etiquetadaPor="titulo-proveedor">
        <div className={estilos.cabeceraFicha}>
          <div className={estilos.enLinea}>
            <h2 id="titulo-proveedor" className={estilos.tituloPrincipal}>
              {proveedor.razon_social}
            </h2>
            <Estado tono={proveedor.activo ? 'exito' : 'neutro'} texto={proveedor.activo ? 'Habilitado' : 'Inhabilitado'} />
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
            { etiqueta: 'Contratos', valor: <span className="cifra">{formatearNumero(proveedor.contratos)}</span> },
            { etiqueta: 'Vínculo con otras empresas', valor: textoVinculo(proveedor) },
          ]}
        />
      </Tarjeta>

      <Tarjeta titulo="Persona de contacto" relleno="amplio">
        <ListaDescripcion
          elementos={[
            { etiqueta: 'Nombre', valor: contacto.nombre },
            { etiqueta: 'Teléfono', valor: contacto.telefono },
            { etiqueta: 'Correo', valor: contacto.correo },
          ]}
        />
      </Tarjeta>
    </>
  )
}

export default function ProveedorDetallePage() {
  const { id: parametro } = useParams()
  const { state } = useLocation()
  const id = parametro && /^\d{1,9}$/.test(parametro) ? Number(parametro) : null
  const volverAQuery = volverALista(state)
  const volverA = RUTAS_TERCERIZADOS.proveedoresContratos + volverAQuery
  const rol = useRolTercerizados()

  const consulta = useConsulta(id === null ? null : `proveedor|${id}`, (signal) => obtenerProveedor(id as number, signal))
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
          acciones={
            puedeCambiarEstadoProveedor(rol) && (
              <div className={estilos.enLinea}>
                <BotonEnlace to={rutaEditarProveedor(proveedor.id)} variante="secundario" state={{ volverA: volverAQuery } satisfies EstadoNavegacionProveedor}>
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
          puedeRegistrar={puedeRegistrarProveedoresYContratos(rol)}
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
