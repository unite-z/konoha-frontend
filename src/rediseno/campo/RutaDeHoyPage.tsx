// RF-COR-002, HU-011 y CU-011 · Ruta de hoy del capataz en el móvil (RD-69, V13)
/**
 * El corte en curso de la cuadrilla con su avance («28 de 45 jardines») y los jardines en dos pestañas, «Por cortar» y
 * «Marcados». Un toque en un jardín por cortar lo marca con la hora real y una clave de idempotencia; en uno marcado, o
 * si otro ya lo marcó (409 `ya-marcado`), abre la hoja «ya está marcado» con quién y cuándo y «Añadir observación».
 *
 * Sin conexión (Figma 353-2396): la marca queda «Sin sincronizar» con la hora real y su clave, una banda dice cuántas
 * faltan por enviar y, al volver la conexión, se envían solas. Las pendientes van a la cola común de RF-T-012 (AV-226):
 * sobreviven a cerrar la aplicación y se envían aunque esta pantalla no esté abierta. La ruta se lee también sin red
 * (la última descargada en este dispositivo). Fondo liso, sin mapa; la barra inferior es la de RD-04.
 */
import { WifiOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import AvisoTemporal from '@/design-system/AvisoTemporal'
import Boton from '@/design-system/Boton'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import { PERMISOS } from '@/config/permisosCore'
import { tiene } from '@/config/permisosSesion'
import { useConsulta } from '@/hooks/useConsulta'
import { useEnLinea } from '@/hooks/useEnLinea'
import HojaFueraDeRuta from '@/pages/corte/HojaFueraDeRuta'
import { textoSinConexion, textoYaEstabaMarcado, tituloJardin, type MarcaPendiente } from '@/pages/corte/rutaDeHoy'
import { ErrorApi } from '@/services/api/cliente'
import { marcarJardin, obtenerRutaDeHoy } from '@/services/api/corte'
import { usePermisos, useSesionActiva } from '@/sesion/ContextoSesion'
import { alResolverConflicto, encolar, nuevaClave, porSincronizar, useCola } from '@/sincronizacion/cola'
import { conCache, descargadoEn } from '@/sincronizacion/datosDescargados'
import type { JardinRuta } from '@/types/corte'
import { formatearFechaHora } from '@/utils/formato'
import { estiloTransicion, nombresTransicion, transicionar, useFocoConLaVista } from '../base/movimiento'
import { useParametroPanel } from '../base/PanelLateral/useParametroPanel'
import HojaJardin from './HojaJardin'
import ListaRuta from './ListaRuta'
import { PARAM_JARDIN } from './enlaces'
import estilos from './Campo.module.css'

export default function RutaDeHoyPage() {
  const permisos = usePermisos()
  const puede = tiene(permisos, PERMISOS.registrarCorte)
  const consulta = useConsulta(puede ? 'ruta-de-hoy' : null, (signal) =>
    conCache('ruta-de-hoy', () => obtenerRutaDeHoy(signal)),
  )
  const usuarioId = useSesionActiva()?.usuario.id ?? null
  const cola = useCola()
  const enLinea = useEnLinea()
  const hoja = useParametroPanel(PARAM_JARDIN)
  const encabezado = useFocoConLaVista<HTMLHeadingElement>()
  // Marcas hechas aquí, encima de la consulta hasta la siguiente.
  const [locales, setLocales] = useState<Record<number, JardinRuta>>({})
  const [enviando, setEnviando] = useState<number | null>(null)
  const [aviso, setAviso] = useState<{
    mensaje: string
    tono: 'exito' | 'error' | 'info'
  } | null>(null)
  // Clave de idempotencia de la marca fuera de ruta en curso (`null`: hoja cerrada).
  const [fueraDeRuta, setFueraDeRuta] = useState<string | null>(null)

  const servidor = consulta.datos?.ruta ?? null
  const ruta = servidor && {
    ...servidor,
    jardines: servidor.jardines.map((j) => locales[j.id] ?? j),
  }

  // Marcas de esta ruta que siguen en la cola común (las rechazadas se revisan en «Datos sin conexión»).
  const sinSincronizar: Record<number, MarcaPendiente> = {}
  for (const p of porSincronizar(cola, 'corte.marca')) {
    if (p.estado === 'rechazada' || p.carga.programacion_id !== servidor?.programacion_id) continue
    sinSincronizar[Number(p.carga.jardin_id)] = {
      marcado_en: String(p.carga.marcado_en),
      clave: p.id,
    }
  }
  const enCola = Object.keys(sinSincronizar).length

  // Cuando la cola termina de enviar marcas, se relee la ruta para ver quién y cuándo.
  const anteriorEnCola = useRef(enCola)
  const { reintentar } = consulta
  useEffect(() => {
    if (enLinea && enCola < anteriorEnCola.current) reintentar()
    anteriorEnCola.current = enCola
  }, [enCola, enLinea, reintentar])

  // Si al enviarla otro ya había marcado el jardín, se avisa («J-015 ya estaba marcado · J. Ramos, 10:18»).
  useEffect(
    () =>
      alResolverConflicto(({ pendiente }) => {
        if (pendiente.tipo !== 'corte.marca') return
        void obtenerRutaDeHoy()
          .then((datos) => {
            const actual = datos.ruta?.jardines.find((j) => j.id === Number(pendiente.carga.jardin_id))
            if (actual) setAviso({ mensaje: textoYaEstabaMarcado(actual), tono: 'info' })
          })
          .catch(() => undefined)
      }),
    [],
  )

  async function aLaCola(programacionId: number, jardin: JardinRuta, marca: MarcaPendiente) {
    if (usuarioId === null) return
    try {
      await encolar({
        id: marca.clave,
        tipo: 'corte.marca',
        carga: {
          programacion_id: programacionId,
          jardin_id: jardin.id,
          marcado_en: marca.marcado_en,
        },
        descripcion: `Marca de corte · ${tituloJardin(jardin)}`,
        usuario_id: usuarioId,
        creado_en: marca.marcado_en,
      })
    } catch {
      setAviso({
        mensaje: `No se pudo guardar la marca de ${jardin.codigo} en este dispositivo`,
        tono: 'error',
      })
    }
  }

  function abrirHoja(jardin: JardinRuta) {
    transicionar(() => hoja.abrir(String(jardin.id)))
  }

  /**
   * Envía una marca con conexión. Si se corta la red (`ErrorApi` con estado 0), pasa a la cola con la misma hora y
   * clave; si otro ya lo marcó (409), trae quién y cuándo y abre la hoja. Un 403 lo dice y no se reintenta.
   */
  async function enviar(programacionId: number, jardin: JardinRuta, marca: MarcaPendiente) {
    try {
      const marcado = await marcarJardin(programacionId, jardin.id, marca.marcado_en, marca.clave)
      setLocales((previas) => ({ ...previas, [jardin.id]: marcado }))
    } catch (causa) {
      if (causa instanceof ErrorApi && causa.estado === 0) {
        await aLaCola(programacionId, jardin, marca)
        return
      }
      if (causa instanceof ErrorApi && causa.codigo === 'ya-marcado') {
        const actual = (await obtenerRutaDeHoy().catch(() => null))?.ruta?.jardines.find((j) => j.id === jardin.id)
        if (!actual) return
        setLocales((previas) => ({ ...previas, [jardin.id]: actual }))
        abrirHoja(actual)
      } else if (causa instanceof ErrorApi && causa.estado === 403) {
        setAviso({
          mensaje: 'Tu cuenta no puede marcar jardines',
          tono: 'error',
        })
      } else {
        setAviso({
          mensaje: `No se pudo marcar ${jardin.codigo}`,
          tono: 'error',
        })
      }
    }
  }

  async function marcar(jardin: JardinRuta) {
    if (!ruta) return
    const marca = { marcado_en: new Date().toISOString(), clave: nuevaClave() } // fecha-lima-ok: instante absoluto (UTC), la hora real del toque
    if (!enLinea) {
      await aLaCola(ruta.programacion_id, jardin, marca)
      return
    }
    setEnviando(jardin.id)
    await enviar(ruta.programacion_id, jardin, marca)
    setEnviando(null)
  }

  if (!puede || (consulta.estado === 'error' && consulta.error?.estado === 403 && !consulta.datos)) {
    return (
      <div className={estilos.pagina}>
        <EstadoSinAcceso
          titulo="No tienes acceso a la ruta de hoy"
          descripcion="Tu cuenta no puede marcar jardines. Pide el permiso al jefe de sección."
        />
      </div>
    )
  }

  let contenido
  if (consulta.estado === 'error' && !consulta.datos) {
    contenido = (
      <EstadoError
        titulo="No pudimos cargar tu ruta"
        descripcion={consulta.error?.detalle ?? ''}
        onReintentar={consulta.reintentar}
      />
    )
  } else if (!consulta.datos) {
    contenido = consulta.cargaVisible ? <EstadoCarga forma="tarjetas" texto="Cargando tu ruta…" /> : null
  } else if (!ruta) {
    contenido = (
      <EstadoVacio
        titulo="Hoy no hay corte en tu cuadrilla"
        descripcion="Cuando el jefe de sección inicie un ciclo de corte, verás aquí tu ruta."
      />
    )
  } else {
    const descargada = descargadoEn('ruta-de-hoy')
    const sinConexion = !enLinea || enCola > 0
    contenido = (
      <>
        {sinConexion && (
          <div className={estilos.banda} role="status">
            <WifiOff size={16} aria-hidden="true" />
            <div>
              <p className={estilos.bandaTitulo}>{textoSinConexion(enCola, enLinea)}</p>
              {descargada && (
                <p className={estilos.bandaDetalle}>Ruta descargada el {formatearFechaHora(descargada)}</p>
              )}
            </div>
          </div>
        )}
        <ListaRuta
          ruta={ruta}
          abierto={hoja.valor === null ? null : Number(hoja.valor)}
          enviando={enviando}
          sinSincronizar={sinSincronizar}
          sinConexion={sinConexion}
          onMarcar={(jardin) => void marcar(jardin)}
          onAbrirMarcado={abrirHoja}
          onFueraDeRuta={() => setFueraDeRuta(nuevaClave())}
        />
      </>
    )
  }

  const avance = ruta ? ruta.jardines.filter((j) => j.estado === 'Cortado' || sinSincronizar[j.id]).length : 0
  return (
    <div className={estilos.pagina}>
      <header
        className={estilos.encabezado}
        style={estiloTransicion(nombresTransicion.encabezado)} /* estilo-calculado */
      >
        <h1 ref={encabezado} tabIndex={-1} className={estilos.titulo}>
          Ruta de hoy
        </h1>
        <Boton variante="fantasma" compacto icono="refresh" onClick={consulta.reintentar}>
          <span className="sr-only">Actualizar la ruta</span>
        </Boton>
      </header>
      {contenido}
      {ruta && hoja.valor !== null && (
        <HojaJardin
          key={hoja.valor}
          ruta={ruta}
          jardin={ruta.jardines.find((j) => String(j.id) === hoja.valor) ?? null}
          avance={avance}
          onCerrar={() => transicionar(hoja.cerrar)}
          onAnadida={(jardin) => {
            setAviso({
              mensaje: `Observación añadida a ${jardin.codigo}`,
              tono: 'exito',
            })
            hoja.cerrar()
          }}
        />
      )}
      {ruta && fueraDeRuta && (
        <HojaFueraDeRuta
          programacionId={ruta.programacion_id}
          clave={fueraDeRuta}
          onCerrar={() => setFueraDeRuta(null)}
          onMarcado={(jardin) => {
            setFueraDeRuta(null)
            setAviso({
              mensaje: `${jardin.codigo} marcado fuera de ruta`,
              tono: 'exito',
            })
          }}
        />
      )}
      <AvisoTemporal mensaje={aviso?.mensaje ?? null} tono={aviso?.tono} onCerrar={() => setAviso(null)} />
    </div>
  )
}
