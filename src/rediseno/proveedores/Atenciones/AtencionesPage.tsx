/**
 * Pestaña Atenciones (RD-51): bandeja completa con búsqueda y filtros en la URL. Fondo liso, sin mapa. La cabecera
 * no se mueve en las transiciones; la fila de la atención crece hasta ser su ficha (RD-53).
 */
import { BotonEnlace } from '@/design-system/Boton'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import { estiloTransicion, nombresTransicion, useFocoConLaVista } from '@/rediseno/base/movimiento'
import { usePermisos } from '@/sesion/ContextoSesion'
import { rutaSubirInforme } from '../enlaces'
import estilos from './Atenciones.module.css'
import Bandeja from './Bandeja'
import { puedeConsultarAtenciones } from './permisos'

export default function AtencionesPage() {
  const permisos = usePermisos()
  const encabezado = useFocoConLaVista<HTMLHeadingElement>()

  if (!puedeConsultarAtenciones(permisos)) {
    return (
      <div className={estilos.pagina}>
        <EstadoSinAcceso
          titulo="No puedes ver las atenciones"
          descripcion="Tu cuenta no tiene permiso para consultar atenciones de proveedores."
        />
      </div>
    )
  }

  return (
    <div className={estilos.pagina}>
      <header
        className={estilos.encabezado}
        style={estiloTransicion(nombresTransicion.encabezado)} /* estilo-calculado */
      >
        <div>
          <h1 ref={encabezado} tabIndex={-1} className={estilos.titulo}>
            Atenciones
          </h1>
          <p className={estilos.subtitulo}>Servicios tercerizados programados y extraordinarios, con su estado.</p>
        </div>
        <BotonEnlace to={rutaSubirInforme()} variante="primario">
          Subir informe
        </BotonEnlace>
      </header>
      <Bandeja modo="completa" />
    </div>
  )
}
