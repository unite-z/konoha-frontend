// RF-SER-001 y RF-SER-002 · Proveedores y contratos
/**
 * Proveedores y contratos de servicios tercerizados (Guía Web 6: listado con filtros).
 *
 * - Dos pestañas, «Proveedores» y «Contratos»; la pestaña, los filtros y la página viven en la URL.
 * - Filtros y paginación del servidor (25 por página).
 * - Acción primaria («Registrar proveedor» / «Registrar contrato»): solo el jefe de sección.
 */
import { useCallback, useState } from 'react'
import { useLocation } from 'react-router'
import { BotonEnlace } from '../../../components/ui/Boton'
import AvisoTemporal from '../../../components/ui/AvisoTemporal'
import Pestanas from '../../../components/ui/Pestanas'
import { puedeRegistrarProveedoresYContratos } from '../../../config/permisosMaestros'
import { useFiltrosUrl } from '../../../hooks/useFiltrosUrl'
import { usePaginaActual } from '../../../hooks/usePaginaActual'
import { MIGAS_TERCERIZADOS, RUTAS_TERCERIZADOS } from '../../../router/rutasApp'
import { useSesionTercerizados } from '../../../sesion/ContextoSesionTercerizados'
import { avisoDeNavegacion, FILTROS_MAESTROS_VACIOS, type ClaveFiltroMaestros } from './filtrosMaestros'
import ListaContratos from './ListaContratos'
import ListaProveedores from './ListaProveedores'
import estilos from './Maestros.module.css'

const TITULO = 'Proveedores y contratos'

const PESTANAS = [
  { valor: 'proveedores', texto: 'Proveedores' },
  { valor: 'contratos', texto: 'Contratos' },
]

export default function ProveedoresContratosPage() {
  usePaginaActual(TITULO, [MIGAS_TERCERIZADOS.serviciosTercerizados, { texto: TITULO }])
  const { state } = useLocation()
  const { estado: sesion } = useSesionTercerizados()
  const puedeRegistrar = puedeRegistrarProveedoresYContratos(sesion.tipo === 'activa' ? sesion.usuario.rol : null)
  const [aviso, setAviso] = useState<string | null>(() => avisoDeNavegacion(state))
  const cerrarAviso = useCallback(() => setAviso(null), [])

  const { filtros, establecer } = useFiltrosUrl<ClaveFiltroMaestros>(FILTROS_MAESTROS_VACIOS)
  const pestana = filtros.pestana === 'contratos' ? 'contratos' : 'proveedores'

  return (
    <div className={estilos.pagina}>
      <AvisoTemporal mensaje={aviso} onCerrar={cerrarAviso} />
      <div className={estilos.barraAcciones}>
        <p className={estilos.descripcion}>Empresas que prestan servicios tercerizados y los contratos que los respaldan.</p>
        {puedeRegistrar && (
          <BotonEnlace
            to={pestana === 'contratos' ? RUTAS_TERCERIZADOS.nuevoContrato : RUTAS_TERCERIZADOS.nuevoProveedor}
            variante="primario"
          >
            {pestana === 'contratos' ? 'Registrar contrato' : 'Registrar proveedor'}
          </BotonEnlace>
        )}
      </div>

      <Pestanas
        etiqueta="Proveedores y contratos"
        pestanas={PESTANAS}
        valor={pestana}
        onCambiar={(valor) =>
          establecer({
            pestana: valor === 'proveedores' ? null : valor,
            q: null,
            estado: null,
            vinculo: null,
            vigencia: null,
            pagina: null,
          })
        }
      >
        <div className={estilos.pagina}>
          {pestana === 'contratos' ? (
            <ListaContratos filtros={filtros} establecer={establecer} puedeRegistrar={puedeRegistrar} />
          ) : (
            <ListaProveedores filtros={filtros} establecer={establecer} puedeRegistrar={puedeRegistrar} />
          )}
        </div>
      </Pestanas>
    </div>
  )
}
