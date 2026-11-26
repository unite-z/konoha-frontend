/**
 * Configuración del diseño nuevo (RD-64, M1-04): una sola pantalla con secciones, sobre fondo liso (sin mapa). Cada
 * sección sale solo con su permiso (`SECCIONES_CONFIGURACION`); la elegida va en `?seccion=`. Una sección que existe
 * pero no se puede ver (enlace directo) enseña «Sin acceso».
 *
 * Movimiento: la cabecera y el encabezado no se mueven; la lente de la pestaña activa se desliza hasta la nueva y el
 * contenido entra con un fundido corto. Con «reducir movimiento», el cambio es directo.
 */
import { useSearchParams } from 'react-router'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { usePermisos } from '@/sesion/ContextoSesion'
import { EnlaceTransicion, estiloTransicion, nombresTransicion, useFocoConLaVista } from '../base/movimiento'
import { PARAM_SECCION_CONFIGURACION, rutaConfiguracion } from './enlaces'
import { SECCIONES_CONFIGURACION, seccionVisible, type SeccionConfiguracion } from './secciones'
import estilos from './Configuracion.module.css'

const TITULO = 'Configuración'
/** Nombre propio de la lente de esta pantalla: la de la cabecera (`lente-pestanas`) no existe aquí. */
const LENTE = 'lente-configuracion'

export default function ConfiguracionPage({
  secciones = SECCIONES_CONFIGURACION,
}: {
  secciones?: readonly SeccionConfiguracion[]
}) {
  usePaginaActual(TITULO, [{ texto: TITULO }])
  const foco = useFocoConLaVista<HTMLHeadingElement>()
  const [parametros] = useSearchParams()
  const permisos = usePermisos() ?? []
  const visibles = secciones.filter((s) => seccionVisible(s, permisos))
  const pedida = secciones.find((s) => s.id === parametros.get(PARAM_SECCION_CONFIGURACION))
  const activa = pedida ?? visibles[0]
  const sinAcceso = activa !== undefined && !visibles.includes(activa)

  return (
    <div className={estilos.pagina}>
      <header
        className={estilos.encabezado}
        style={estiloTransicion(nombresTransicion.encabezado)} /* estilo-calculado */
      >
        <h1 ref={foco} tabIndex={-1} className={estilos.titulo}>
          {TITULO}
        </h1>
        <p className={estilos.ayuda}>Tu apariencia y tu cuenta en un solo lugar.</p>
      </header>
      {visibles.length === 0 ? (
        <EstadoVacio
          titulo="No hay nada que configurar"
          descripcion="Tu rol no incluye ninguna sección de configuración."
        />
      ) : (
        <>
          <nav aria-label="Secciones de configuración" className={estilos.pestanas}>
            {visibles.map((s) => {
              const actual = s === activa
              return (
                <EnlaceTransicion
                  key={s.id}
                  to={rutaConfiguracion(s.id)}
                  replace
                  className={estilos.pestana}
                  aria-current={actual ? 'page' : undefined}
                >
                  {actual && (
                    <span
                      className={estilos.lente}
                      aria-hidden="true"
                      style={estiloTransicion(LENTE)} /* estilo-calculado */
                    />
                  )}
                  <span className={estilos.textoPestana}>{s.etiqueta}</span>
                </EnlaceTransicion>
              )
            })}
          </nav>
          {sinAcceso ? (
            <EstadoSinAcceso
              titulo={`No tienes acceso a ${activa.etiqueta}`}
              descripcion="Tu rol no incluye esta sección. Si la necesitas, pide a la jefatura que revise tu rol."
            />
          ) : (
            activa && (
              <section key={activa.id} className={estilos.tarjeta} aria-labelledby={`configuracion-${activa.id}`}>
                <h2 id={`configuracion-${activa.id}`} className={estilos.tituloSeccion}>
                  {activa.etiqueta}
                </h2>
                <p className={estilos.ayuda}>{activa.descripcion}</p>
                <activa.Componente />
              </section>
            )
          )}
        </>
      )}
    </div>
  )
}
