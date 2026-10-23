// RF-INV-011 · Marcar un ejemplar con atención especial
/**
 * Marca un ejemplar con plaga recurrente para que reciba aplicaciones adicionales (Guía Web 5.3).
 *
 * - Lo pueden hacer los tres roles del módulo (el back-end lo vuelve a comprobar).
 * - Obligatorios: ejemplar, plaga (del catálogo) y número de aplicaciones adicionales (una o dos al año).
 * - Un ejemplar se marca una sola vez: si ya lo está, el servidor responde 409 y se informa.
 */
import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import AvisoEnLinea from '../../../components/ui/AvisoEnLinea'
import Boton, { BotonEnlace } from '../../../components/ui/Boton'
import { LeyendaObligatorio, ResumenErrores, type ErrorResumen } from '../../../components/ui/CampoFormulario'
import EstadoVacio from '../../../components/ui/EstadoVacio'
import Selector from '../../../components/ui/Selector'
import SelectorBuscable from '../../../components/ui/SelectorBuscable'
import { puedeMarcarAtencionEspecial } from '../../../config/permisosMaestros'
import { useConsulta } from '../../../hooks/useConsulta'
import { usePaginaActual } from '../../../hooks/usePaginaActual'
import { MIGAS_TERCERIZADOS, RUTAS_TERCERIZADOS } from '../../../router/rutasApp'
import { listarPlagas, marcarAtencionEspecial } from '../../../services/api/maestrosTercerizados'
import { listarEjemplares, listarTodo } from '../../../services/api/tercerizados'
import { useSesionTercerizados } from '../../../sesion/ContextoSesionTercerizados'
import type { Ejemplar } from '../../../types/tercerizados'
import {
  BORRADOR_ESPECIAL_VACIO,
  OPCIONES_APLICACIONES,
  construirEspecial,
  hayErrores,
  validarEspecial,
  type BorradorEspecial,
  type ErroresEspecial,
} from '../../../utils/validacionMaestros'
import AvisoFallo from './AvisoFallo'
import { enfocar, interpretarFallo, type FalloRegistro } from './fallosRegistro'
import type { EstadoNavegacionMaestros } from './filtrosMaestros'
import estilos from './Maestros.module.css'

const TITULO = 'Marcar ejemplar con atención especial'

const IDS = { ejemplar: 'especial-ejemplar', plaga: 'especial-plaga', aplicaciones: 'especial-aplicaciones' } as const
const ORDEN: (keyof ErroresEspecial)[] = ['ejemplar', 'plaga', 'aplicaciones']

export default function MarcarEjemplarPage() {
  usePaginaActual(TITULO, [MIGAS_TERCERIZADOS.serviciosTercerizados, MIGAS_TERCERIZADOS.controlFitosanitario, { texto: 'Marcar ejemplar' }])
  const { estado: sesion } = useSesionTercerizados()
  const rol = sesion.tipo === 'activa' ? sesion.usuario.rol : null
  const navegar = useNavigate()

  const [borrador, setBorrador] = useState<BorradorEspecial>(BORRADOR_ESPECIAL_VACIO)
  // Tras el primer intento de guardar, los errores se recalculan en vivo al corregir.
  const [intentado, setIntentado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [fallo, setFallo] = useState<FalloRegistro | null>(null)
  const enCurso = useRef(false)

  const plagas = useConsulta('plagas-activas', (signal) => listarTodo((page) => listarPlagas({ activo: true, page }, signal)))
  const opcionesPlaga = [
    { valor: '', texto: 'Selecciona la plaga' },
    ...(plagas.datos?.resultados ?? []).map((p) => ({ valor: String(p.id), texto: p.nombre })),
  ]

  if (!puedeMarcarAtencionEspecial(rol)) {
    return (
      <EstadoVacio
        titulo="Tu usuario no tiene acceso a este módulo"
        descripcion="Pide al jefe de sección que revise tus roles."
        accion={
          <BotonEnlace to={RUTAS_TERCERIZADOS.controlFitosanitario} variante="secundario">
            Volver al control fitosanitario
          </BotonEnlace>
        }
      />
    )
  }

  const errores = intentado ? validarEspecial(borrador) : {}
  const resumen: ErrorResumen[] = ORDEN.filter((clave) => errores[clave]).map((clave) => ({
    idCampo: IDS[clave],
    mensaje: errores[clave] as string,
  }))

  function cambiar(cambios: Partial<BorradorEspecial>) {
    setBorrador((b) => ({ ...b, ...cambios }))
    setFallo(null)
  }

  async function guardar(evento?: FormEvent<HTMLFormElement>) {
    evento?.preventDefault()
    if (enCurso.current) return
    setIntentado(true)
    const nuevos = validarEspecial(borrador)
    const primero = ORDEN.find((clave) => nuevos[clave])
    if (primero) {
      enfocar(IDS[primero])
      return
    }
    enCurso.current = true
    setEnviando(true)
    setFallo(null)
    try {
      const creado = await marcarAtencionEspecial(construirEspecial(borrador))
      navegar(RUTAS_TERCERIZADOS.controlFitosanitario, {
        replace: true,
        state: { aviso: `Ejemplar ${creado.ejemplar_codigo} marcado con atención especial.` } satisfies EstadoNavegacionMaestros,
      })
    } catch (causa) {
      setFallo(interpretarFallo(causa, 'marcar el ejemplar'))
    } finally {
      enCurso.current = false
      setEnviando(false)
    }
  }

  return (
    <form className={estilos.formulario} onSubmit={guardar} noValidate aria-label={TITULO}>
      <p className={estilos.descripcion}>
        Marca los árboles con plaga recurrente para que no se pierdan entre los miles del catastro y reciban sus aplicaciones
        adicionales.
      </p>
      <LeyendaObligatorio />
      <ResumenErrores titulo={`Revisa ${resumen.length === 1 ? 'un campo' : `${resumen.length} campos`} antes de guardar`} errores={resumen} />

      <section className={estilos.grupo} aria-labelledby="titulo-datos-especial">
        <h2 id="titulo-datos-especial" className={estilos.tituloGrupo}>
          Datos de la atención especial
        </h2>
        <div className={estilos.cuadricula}>
          <SelectorBuscable<Ejemplar>
            id={IDS.ejemplar}
            etiqueta="Ejemplar"
            obligatorio
            ayuda="Busca por código o por área verde"
            error={errores.ejemplar}
            valor={borrador.ejemplar}
            claveDe={(e) => e.id}
            textoDe={(e) => e.codigo}
            detalleDe={(e) => e.area_verde_nombre ?? 'Sin área verde'}
            buscar={(q, signal) => listarEjemplares({ q: q || undefined }, signal)}
            onCambiar={(ejemplar) => cambiar({ ejemplar })}
          />
          <Selector
            id={IDS.plaga}
            etiqueta="Plaga recurrente"
            obligatorio
            ayuda="Se elige del catálogo de plagas"
            valor={borrador.plagaId}
            opciones={opcionesPlaga}
            error={errores.plaga}
            bloqueadoMotivo={plagas.estado === 'error' ? 'No se pudo cargar el catálogo de plagas. Recarga la página' : undefined}
            onCambiar={(valor) => cambiar({ plagaId: valor })}
          />
          <Selector
            id={IDS.aplicaciones}
            etiqueta="Aplicaciones adicionales"
            obligatorio
            ayuda="Una o dos al año"
            valor={borrador.aplicaciones}
            opciones={OPCIONES_APLICACIONES}
            error={errores.aplicaciones}
            onCambiar={(valor) => cambiar({ aplicaciones: valor })}
          />
        </div>
      </section>

      <AvisoEnLinea tono="info" titulo="Una tercera aplicación se tramita como extraordinaria">
        Un ejemplar con atención especial recibe una o dos aplicaciones adicionales al año; superarlas exige un motivo.
      </AvisoEnLinea>

      {fallo && (
        <AvisoFallo fallo={fallo} onReintentar={() => void guardar()} existente={{ titulo: 'Este ejemplar ya está marcado' }} />
      )}

      <div className={estilos.botones}>
        <Boton
          type="submit"
          variante="primario"
          cargando={enviando}
          deshabilitado={intentado && hayErrores(errores)}
          ayudaDeshabilitado="Completa los campos señalados para poder guardar"
          onClickDeshabilitado={() => void guardar()}
        >
          Marcar con atención especial
        </Boton>
        <BotonEnlace to={RUTAS_TERCERIZADOS.controlFitosanitario} variante="secundario">
          Cancelar
        </BotonEnlace>
      </div>
    </form>
  )
}
