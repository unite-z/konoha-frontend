/**
 * FichaEjemplar (RD-21): ficha de vidrio del ejemplar sobre el mapa 3D, sin cerrar el panel del área. Tres pestañas:
 * Datos (foto, identificación, edición con `PATCH` y accesos a otros módulos), Situación (cambio de situación y planta
 * muerta propuesta) e Historial (actividades, intervenciones y situación). «Editar ubicación» aparta la ficha y deja el
 * mapa a la herramienta de punto.
 *
 * Movimiento: la cámara se acerca al árbol al abrir y vuelve al área al cerrar («Atrás» quita `?ejemplar=` y deshace el
 * acercamiento: lo hace `MapaPage`). El marcador tocado y la ficha comparten `view-transition-name` (`panel(`ejemplar-<id>`)`). El foco
 * entra en la ficha (`VentanaFlotante`) y vuelve al marcador al cerrarla. Con «reducir movimiento», corte directo.
 */
import { useEffect, useRef, useState } from 'react'
import { PERMISOS } from '@/config/permisosCore'
import { tiene } from '@/config/permisosSesion'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import Pestanas from '@/design-system/Pestanas'
import type { ErrorApi } from '@/services/api/cliente'
import { usePermisos } from '@/sesion/ContextoSesion'
import type { EjemplarInventario } from '@/types/ejemplares'
import { nombreEjemplar } from '@/utils/nombreEjemplar'
import { useMapa } from '@/rediseno/base/MapaCampus/contexto'
import { lonLatAMetros } from '@/rediseno/base/MapaCampus/proyeccion'
import VentanaFlotante from '@/rediseno/base/VentanaFlotante/VentanaFlotante'
import { panel } from '@/rediseno/base/movimiento'
import AccesosEjemplar from './AccesosEjemplar'
import EditarUbicacion from './EditarUbicacion'
import PestanaDatos from './PestanaDatos'
import PestanaHistorialEjemplar from './PestanaHistorialEjemplar'
import PestanaSituacion from './PestanaSituacion'
import estilos from './FichaEjemplar.module.css'

type PestanaFicha = 'datos' | 'situacion' | 'historial'

const PESTANAS = [
  { valor: 'datos', texto: 'Datos' },
  { valor: 'situacion', texto: 'Situación' },
  { valor: 'historial', texto: 'Historial' },
]

/** Cuánto se acerca la cámara al árbol (factor sobre el zoom del área). */
const ACERCAMIENTO = 3

export interface FichaEjemplarProps {
  ejemplarId: number
  /**
   * Ejemplar tomado de la lista del área (o de la búsqueda). El servidor no tiene `GET ejemplares/{id}`: mientras esa
   * lista carga, falla o no lo trae, la ficha enseña su estado.
   */
  inicial: EjemplarInventario | null
  /** Estado de la lista de la que sale el ejemplar. */
  lista: { cargando: boolean; error: ErrorApi | null; reintentar: () => void }
  /** `&propuesta=muerto`: abre en Situación con la planta muerta por confirmar. */
  propuestaMuerto?: boolean
  onCerrar: () => void
  /** El ejemplar cambió en el servidor: la lista del área y los marcadores se refrescan. */
  onActualizado: (ejemplar: EjemplarInventario) => void
}

/** Pone un `view-transition-name` solo el tiempo que dura el cambio de vista y lo quita. */
function nombrarUnMomento(elemento: Element | null, nombre: string) {
  if (!(elemento instanceof HTMLElement) || !elemento.isConnected) return
  elemento.style.viewTransitionName = nombre
  setTimeout(() => elemento.style.removeProperty('view-transition-name'), 1000)
}

export default function FichaEjemplar({
  ejemplarId,
  inicial,
  lista,
  propuestaMuerto = false,
  onCerrar,
  onActualizado,
}: FichaEjemplarProps) {
  const permisos = usePermisos()
  const [pestana, setPestana] = useState<PestanaFicha>(propuestaMuerto ? 'situacion' : 'datos')
  const [editandoUbicacion, setEditandoUbicacion] = useState(false)
  const [actual, setActual] = useState<EjemplarInventario | null>(null)
  // El elemento que abrió la ficha (el marcador): al cerrar, el foco vuelve a él y es el otro extremo de la transición.
  const [origen] = useState(() => document.activeElement)
  const ejemplar = actual ?? inicial
  const nombre = panel(`ejemplar-${ejemplarId}`)

  // La cámara se acerca al árbol; al desmontar la ficha (cerrarla o «Atrás»), vuelve al área.
  const mapa = useMapa()
  const escena = mapa?.escena
  const proyeccion = mapa?.datos.proyeccion
  const lon = ejemplar?.longitud ?? null
  const lat = ejemplar?.latitud ?? null
  useEffect(() => {
    if (!escena || !proyeccion || lon === null || lat === null) return
    const { x, y } = lonLatAMetros(proyeccion, lon, lat)
    escena.enfocar(x, y, ACERCAMIENTO)
  }, [escena, proyeccion, lon, lat])
  // Al desmontar la ficha (cerrarla o «Atrás») el foco vuelve al marcador; la cámara la devuelve `MapaPage` al área.
  useEffect(
    () => () => {
      if (origen instanceof HTMLElement && origen.isConnected) origen.focus()
    },
    [origen],
  )
  function cerrar() {
    nombrarUnMomento(origen, nombre)
    onCerrar()
  }
  function guardado(nuevo: EjemplarInventario) {
    setActual(nuevo)
    onActualizado(nuevo)
  }

  const puedeEditar = tiene(permisos, PERMISOS.registrarInventario)
  const puedeCambiarSituacion = tiene(permisos, PERMISOS.gestionarCatalogos)

  return (
    <>
      <VentanaFlotante
        abierto={!editandoUbicacion}
        titulo={ejemplar ? nombreEjemplar(ejemplar.codigo, ejemplar.alias) : 'Ejemplar'}
        descripcion={ejemplar?.especie_nombre_cientifico ?? undefined}
        onCerrar={cerrar}
      >
        <ContenidoFicha nombreTransicion={nombre}>
          {!ejemplar ? (
            lista.error?.estado === 403 ? (
              <EstadoSinAcceso
                nivel={3}
                titulo="No puedes ver este ejemplar"
                descripcion="El servidor no te permite consultar el inventario."
              />
            ) : lista.error ? (
              <EstadoError
                nivel={3}
                titulo="No pudimos cargar el ejemplar"
                descripcion={lista.error.detalle || 'Revisa tu conexión e inténtalo de nuevo.'}
                onReintentar={lista.reintentar}
              />
            ) : lista.cargando ? (
              <EstadoCarga forma="tabla" texto="Cargando el ejemplar…" />
            ) : (
              <EstadoVacio
                nivel={3}
                titulo="No se encontró el ejemplar"
                descripcion="No está en el área abierta: puede que se haya movido a otra área o que el enlace no sea correcto."
              />
            )
          ) : (
            <>
              <Pestanas
                etiqueta="Secciones de la ficha del ejemplar"
                pestanas={PESTANAS}
                valor={pestana}
                onCambiar={(valor) => setPestana(valor as PestanaFicha)}
              >
                {pestana === 'datos' && (
                  <PestanaDatos
                    ejemplar={ejemplar}
                    puedeEditar={puedeEditar}
                    onActualizado={guardado}
                    onEditarUbicacion={() => setEditandoUbicacion(true)}
                  />
                )}
                {pestana === 'situacion' && (
                  <PestanaSituacion
                    ejemplar={ejemplar}
                    puedeCambiar={puedeCambiarSituacion}
                    propuestaMuerto={propuestaMuerto}
                    onActualizado={guardado}
                  />
                )}
                {pestana === 'historial' && <PestanaHistorialEjemplar ejemplarId={ejemplar.id} />}
              </Pestanas>
              <AccesosEjemplar ejemplar={ejemplar} permisos={permisos} />
            </>
          )}
        </ContenidoFicha>
      </VentanaFlotante>
      {editandoUbicacion && ejemplar && (
        <EditarUbicacion
          ejemplar={ejemplar}
          onCancelar={() => setEditandoUbicacion(false)}
          onGuardada={(nuevo) => {
            guardado(nuevo)
            setEditandoUbicacion(false)
          }}
        />
      )}
    </>
  )
}

/** Contenido de la ventana: le da al `<dialog>` el nombre de la transición compartida con el marcador. */
function ContenidoFicha({ nombreTransicion, children }: { nombreTransicion: string; children: React.ReactNode }) {
  const contenido = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const dialogo = contenido.current?.closest('dialog')
    dialogo?.style.setProperty('view-transition-name', nombreTransicion)
    return () => {
      dialogo?.style.removeProperty('view-transition-name')
    }
  }, [nombreTransicion])
  return (
    <div ref={contenido} className={estilos.contenido}>
      {children}
    </div>
  )
}
