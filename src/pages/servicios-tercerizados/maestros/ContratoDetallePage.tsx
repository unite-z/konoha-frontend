// RF-SER-002 · Ficha del contrato
/**
 * Ficha de un contrato: proveedor, servicio, costo, frecuencia, vigencia y condiciones. El jefe de sección
 * puede editarlo desde aquí; el monto solo lo ve el jefe (RNF-008, igual que en la lista).
 */
import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import AvisoTemporal from '@/components/ui/AvisoTemporal'
import { BotonEnlace } from '@/components/ui/Boton'
import Estado from '@/components/ui/Estado'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoVacio from '@/components/ui/EstadoVacio'
import ListaDescripcion from '@/components/ui/ListaDescripcion'
import Tarjeta from '@/components/ui/Tarjeta'
import { puedeRegistrarProveedoresYContratos } from '@/config/permisosMaestros'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_TERCERIZADOS, rutaDetalleProveedor, rutaEditarContrato, RUTAS_TERCERIZADOS } from '@/router/rutasApp'
import { obtenerContrato } from '@/services/api/maestrosTercerizados'
import { useRolTercerizados } from '@/sesion/ContextoSesion'
import { formatearFecha } from '@/utils/formato'
import { textoMonto } from '@/utils/validacionMaestros'
import AtencionesDelContrato from './AtencionesDelContrato'
import { avisoDeNavegacion, volverAContrato, type EstadoNavegacionContrato } from './filtrosMaestros'
import type { EstadoNavegacionProveedor } from './ListaProveedores'
import estilos from './Maestros.module.css'

export default function ContratoDetallePage() {
  const { id: parametro } = useParams()
  const { state } = useLocation()
  const id = parametro && /^\d{1,9}$/.test(parametro) ? Number(parametro) : null
  // Ruta completa (ficha del proveedor de origen), consulta hacia la lista, o nada.
  const volverAOrigen = volverAContrato(state)
  // Sin origen (llegada directa), «volver» va a la pestaña de contratos, no a la de proveedores.
  const volverA = volverAOrigen.startsWith('/')
    ? volverAOrigen
    : volverAOrigen
      ? RUTAS_TERCERIZADOS.proveedoresContratos + volverAOrigen
      : `${RUTAS_TERCERIZADOS.proveedoresContratos}?pestana=contratos`
  const rol = useRolTercerizados()

  const consulta = useConsulta(id === null ? null : `contrato|${id}`, (signal) => obtenerContrato(id as number, signal))
  const contrato = consulta.datos
  const [aviso, setAviso] = useState<string | null>(() => avisoDeNavegacion(state))
  const cerrarAviso = () => setAviso(null)

  usePaginaActual(
    contrato ? contrato.numero : 'Contrato',
    [
      MIGAS_TERCERIZADOS.serviciosTercerizados,
      MIGAS_TERCERIZADOS.proveedoresContratos,
      { texto: contrato ? contrato.numero : 'Ficha' },
    ],
    undefined,
    // El número ya se ve en la tarjeta de la ficha, junto con el estado y la acción de editar.
    { tituloOculto: true },
  )

  let contenido
  if (id === null || (consulta.estado === 'error' && consulta.error?.estado === 404)) {
    contenido = (
      <EstadoVacio
        titulo="No existe este contrato"
        descripcion="Revisa el enlace o búscalo en la lista."
        accion={
          <BotonEnlace to={`${RUTAS_TERCERIZADOS.proveedoresContratos}?pestana=contratos`} variante="secundario">
            Ir a proveedores y contratos
          </BotonEnlace>
        }
      />
    )
  } else if (consulta.estado === 'error' && !contrato) {
    contenido = (
      <EstadoError titulo="No pudimos cargar el contrato" descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} />
    )
  } else if (!contrato) {
    contenido = consulta.cargaVisible ? <EstadoCarga forma="pagina" /> : null
  } else {
    contenido = (
      <>
        <Tarjeta relleno="amplio" etiquetadaPor="titulo-contrato">
          <div className={estilos.cabeceraFicha}>
            <div className={estilos.enLinea}>
              <h2 id="titulo-contrato" className={estilos.tituloPrincipal}>
                {contrato.numero}
              </h2>
              <Estado
                tono={contrato.vigente ? 'exito' : 'aviso'}
                texto={contrato.vigente ? 'Vigente' : 'Vencido'}
                ayuda={contrato.vigente ? undefined : 'Se conserva como histórico: no se puede usar en nuevas atenciones'}
              />
            </div>
            {puedeRegistrarProveedoresYContratos(rol) && (
              <BotonEnlace
                to={rutaEditarContrato(contrato.id)}
                variante="secundario"
                state={{ volverA: volverAOrigen } satisfies EstadoNavegacionContrato}
              >
                Editar
              </BotonEnlace>
            )}
          </div>
        </Tarjeta>

        <div className={estilos.columnas}>
          <Tarjeta titulo="Proveedor y servicio" relleno="amplio">
            <ListaDescripcion
              elementos={[
                {
                  etiqueta: 'Proveedor',
                  valor: (
                    <Link to={rutaDetalleProveedor(contrato.proveedor_id)} state={{ volverA: '' } satisfies EstadoNavegacionProveedor}>
                      {contrato.proveedor_nombre}
                    </Link>
                  ),
                  ancho: true,
                },
                { etiqueta: 'Tipo de servicio', valor: contrato.tipo_servicio_nombre },
                { etiqueta: 'Área o metrado estimado', valor: contrato.area_metrado_estimado },
              ]}
            />
          </Tarjeta>

          <Tarjeta titulo="Costo y frecuencia" relleno="amplio">
            <ListaDescripcion
              elementos={[
                { etiqueta: 'Monto fijo', valor: <span className="cifra">{textoMonto(contrato.monto_fijo)}</span> },
                { etiqueta: 'Frecuencia pactada', valor: contrato.frecuencia_pactada },
              ]}
            />
          </Tarjeta>
        </div>

        <Tarjeta titulo="Vigencia y condiciones" relleno="amplio">
          <ListaDescripcion
            elementos={[
              { etiqueta: 'Inicio de la vigencia', valor: <span className="cifra">{formatearFecha(contrato.vigencia_inicio)}</span> },
              { etiqueta: 'Fin de la vigencia', valor: <span className="cifra">{formatearFecha(contrato.vigencia_fin)}</span> },
              { etiqueta: 'Condiciones', valor: contrato.condiciones, ancho: true },
            ]}
          />
        </Tarjeta>

        <AtencionesDelContrato contrato={contrato} />
      </>
    )
  }

  return (
    <div className={estilos.pagina}>
      <div>
        <BotonEnlace to={volverA} variante="terciario">
          Volver a contratos
        </BotonEnlace>
      </div>
      {contenido}
      <AvisoTemporal mensaje={aviso} onCerrar={cerrarAviso} />
    </div>
  )
}
