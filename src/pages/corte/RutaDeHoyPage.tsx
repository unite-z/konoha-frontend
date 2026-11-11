// RF-COR-002, HU-011 y CU-011 · Ruta de hoy del capataz en el móvil (AV-271, Figma 353-2335 y 375-6817)
/**
 * El corte en curso de la cuadrilla con su avance («28 de 45 jardines») y los jardines en dos pestañas, «Por cortar» y
 * «Marcados». Un toque en un jardín por cortar lo marca con la hora real; en uno marcado, o si otro ya lo marcó (409
 * `ya-marcado`), abre la hoja «ya está marcado» con quién y cuándo y «Añadir observación».
 *
 * Sin conexión (Figma 353-2396): la marca queda «Sin sincronizar» con la hora real y su clave, una banda dice cuántas
 * faltan por enviar y, al volver la conexión, se envían solas. Si otro ya había marcado el jardín, un aviso lo dice
 * («J-015 ya estaba marcado · J. Ramos, 10:18»). Las pendientes viven en la pantalla: la cola persistente en IndexedDB
 * (que sobrevive a cerrar la aplicación) es la común de RF-T-012 (AV-226).
 */
import { useEffect, useRef, useState } from 'react'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import AvisoTemporal from '@/components/ui/AvisoTemporal'
import BarraAvance from '@/components/ui/BarraAvance'
import Boton from '@/components/ui/Boton'
import CampoFormulario from '@/components/ui/CampoFormulario'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoVacio from '@/components/ui/EstadoVacio'
import FilaChecklist from '@/components/ui/FilaChecklist'
import Pestanas from '@/components/ui/Pestanas'
import Tarjeta from '@/components/ui/Tarjeta'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import AccionMovil from '@/layouts/LayoutOficina/AccionMovil'
import { MIGAS_CORTE } from '@/router/rutasApp'
import { ErrorApi } from '@/services/api/cliente'
import { marcarJardin, obtenerRutaDeHoy, registrarObservacionJardin } from '@/services/api/corte'
import type { JardinRuta, RutaDeHoy } from '@/types/corte'
import HojaFueraDeRuta from './HojaFueraDeRuta'
import { detalleMarcado, detallePendiente, marcados, porCortar, textoSinConexion, textoYaEstabaMarcado, textoYaMarcado, tituloJardin, type MarcaPendiente } from './rutaDeHoy'
import { useEnLinea } from '@/hooks/useEnLinea'
import estilos from './RutaDeHoy.module.css'

function nuevaClave(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function ListaRuta({
  ruta,
  onMarcar,
  onAbrirMarcado,
  enviando,
  sinSincronizar,
  sinConexion,
  onFueraDeRuta,
}: {
  ruta: RutaDeHoy
  onMarcar: (jardin: JardinRuta) => void
  onAbrirMarcado: (jardin: JardinRuta) => void
  enviando: number | null
  /** Marcas hechas sin conexión, por jardín. */
  sinSincronizar: Record<number, MarcaPendiente>
  /** Sin conexión o con marcas por enviar: la banda y una sola lista, como en Figma 353-2396. */
  sinConexion: boolean
  /** «Añadir jardín fuera de ruta» (con conexión). */
  onFueraDeRuta: () => void
}) {
  const [pestana, setPestana] = useState('por-cortar')
  const enEspera = ruta.jardines.filter((j) => sinSincronizar[j.id])
  const pendientes = porCortar(ruta.jardines).filter((j) => !sinSincronizar[j.id])
  const hechos = marcados(ruta.jardines)
  const total = ruta.jardines.length
  const avance = hechos.length + enEspera.length

  return (
    <>
      <Tarjeta relleno="amplio">
        <div className={estilos.avance}>
          <p className={estilos.ciclo}>
            {ruta.servicio} · {ruta.codigo}
          </p>
          <p className={estilos.cifra}>
            <span className={estilos.numero}>
              {avance} de {total}
            </span>
            <span>jardines</span>
          </p>
          <BarraAvance valor={avance} maximo={total} etiqueta="Avance de la ruta" textoValor={`${avance} de ${total} jardines`} />
        </div>
      </Tarjeta>

      {sinConexion ? (
        <ul className={estilos.lista}>
          {enEspera.map((jardin) => (
            <li key={jardin.id}>
              <FilaChecklist titulo={tituloJardin(jardin)} detalle={detallePendiente(sinSincronizar[jardin.id])} estado="Sin sincronizar" deshabilitada onPulsar={() => undefined} />
            </li>
          ))}
          {pendientes.map((jardin) => (
            <li key={jardin.id}>
              <FilaChecklist titulo={tituloJardin(jardin)} detalle={jardin.zona} estado="Pendiente" onPulsar={() => onMarcar(jardin)} />
            </li>
          ))}
        </ul>
      ) : (
      <Pestanas
        etiqueta="Jardines de la ruta"
        valor={pestana}
        onCambiar={setPestana}
        ancho="completo"
        pestanas={[
          { valor: 'por-cortar', texto: 'Por cortar', contador: pendientes.length },
          { valor: 'marcados', texto: 'Marcados', contador: hechos.length },
        ]}
      >
        {pestana === 'por-cortar' ? (
          <>
            {pendientes.length === 0 ? (
              <EstadoVacio titulo="Ruta completa" descripcion="Todos los jardines de hoy están marcados." nivel={3} />
            ) : (
              <ul className={estilos.lista}>
                {pendientes.map((jardin) => (
                  <li key={jardin.id}>
                    <FilaChecklist titulo={tituloJardin(jardin)} detalle={jardin.zona} estado="Pendiente" deshabilitada={enviando === jardin.id} onPulsar={() => onMarcar(jardin)} />
                  </li>
                ))}
              </ul>
            )}
            {/* Supuesto de CU-011 2b (por validar): el acceso a «Jardín fuera de ruta», Figma 375-6772. */}
            <Boton variante="fantasma" icono="plus" onClick={onFueraDeRuta}>
              Añadir jardín fuera de ruta
            </Boton>
          </>
        ) : hechos.length === 0 ? (
          <EstadoVacio titulo="Sin marcas todavía" descripcion="Los jardines que marques aparecerán aquí." nivel={3} />
        ) : (
          <ul className={estilos.lista}>
            {hechos.map((jardin) => (
              <li key={jardin.id}>
                <FilaChecklist titulo={tituloJardin(jardin)} detalle={detalleMarcado(jardin)} estado="Marcado" onPulsar={() => onAbrirMarcado(jardin)} />
              </li>
            ))}
          </ul>
        )}
      </Pestanas>
      )}
    </>
  )
}

function HojaYaMarcado({ ruta, jardin, onCerrar, onAnadida }: { ruta: RutaDeHoy; jardin: JardinRuta; onCerrar: () => void; onAnadida: () => void }) {
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<{ titulo: string; detalle: string } | null>(null)

  async function anadir() {
    setEnviando(true)
    setError(null)
    try {
      await registrarObservacionJardin(ruta.programacion_id, jardin.id, texto.trim())
      onAnadida()
    } catch (causa) {
      setError({ titulo: 'No se pudo añadir la observación', detalle: causa instanceof Error ? causa.message : 'Inténtalo de nuevo.' })
      setEnviando(false)
    }
  }

  return (
    <DialogoFormulario
      abierto
      ancho="hoja"
      titulo={`${jardin.codigo} ya está marcado`}
      descripcion={textoYaMarcado(jardin)}
      textoConfirmar="Añadir observación"
      conObligatorios={false}
      hayCambios={Boolean(texto.trim())}
      envioDeshabilitado={!texto.trim()}
      enviando={enviando}
      error={error}
      onEnviar={() => void anadir()}
      onCerrar={onCerrar}
    >
      <CampoFormulario id="observacion-jardin" etiqueta="Observación" value={texto} maxLength={300} onChange={(e) => setTexto(e.target.value)} />
    </DialogoFormulario>
  )
}

export default function RutaDeHoyPage() {
  usePaginaActual('Ruta de hoy', [MIGAS_CORTE.corte, { texto: 'Ruta de hoy' }])
  const consulta = useConsulta('ruta-de-hoy', obtenerRutaDeHoy)
  // Marcas hechas aquí, encima de la consulta hasta la siguiente.
  const [locales, setLocales] = useState<Record<number, JardinRuta>>({})
  const [enviando, setEnviando] = useState<number | null>(null)
  const [abierto, setAbierto] = useState<JardinRuta | null>(null)
  const [aviso, setAviso] = useState<{ mensaje: string; tono: 'exito' | 'error' | 'info' } | null>(null)
  const enLinea = useEnLinea()
  const [sinSincronizar, setSinSincronizar] = useState<Record<number, MarcaPendiente>>({})
  const enviandoCola = useRef(false)
  // Clave de idempotencia de la marca fuera de ruta en curso (`null`: hoja cerrada).
  const [fueraDeRuta, setFueraDeRuta] = useState<string | null>(null)

  const servidor = consulta.datos?.ruta ?? null
  const ruta = servidor && { ...servidor, jardines: servidor.jardines.map((j) => locales[j.id] ?? j) }

  /**
   * Envía una marca. Sin red (`ErrorApi` con estado 0) la deja sin sincronizar; si otro ya lo marcó (409), trae quién y
   * cuándo y, si fue un toque, abre la hoja; si venía de la cola, lo avisa.
   */
  async function enviar(programacionId: number, jardin: JardinRuta, marca: MarcaPendiente, deLaCola: boolean) {
    const quitarDeCola = () =>
      setSinSincronizar((previas) => {
        const resto = { ...previas }
        delete resto[jardin.id]
        return resto
      })
    try {
      const marcado = await marcarJardin(programacionId, jardin.id, marca.marcado_en, marca.clave)
      setLocales((previas) => ({ ...previas, [jardin.id]: marcado }))
      quitarDeCola()
    } catch (causa) {
      if (causa instanceof ErrorApi && causa.estado === 0) {
        setSinSincronizar((previas) => ({ ...previas, [jardin.id]: marca }))
        return
      }
      quitarDeCola()
      if (causa instanceof ErrorApi && causa.codigo === 'ya-marcado') {
        const actual = (await obtenerRutaDeHoy().catch(() => null))?.ruta?.jardines.find((j) => j.id === jardin.id)
        if (!actual) return
        setLocales((previas) => ({ ...previas, [jardin.id]: actual }))
        if (deLaCola) setAviso({ mensaje: textoYaEstabaMarcado(actual), tono: 'info' })
        else setAbierto(actual)
      } else {
        setAviso({ mensaje: `No se pudo marcar ${jardin.codigo}`, tono: 'error' })
      }
    }
  }

  async function marcar(jardin: JardinRuta) {
    if (!ruta) return
    const marca = { marcado_en: new Date().toISOString(), clave: nuevaClave() }
    if (!enLinea) {
      setSinSincronizar((previas) => ({ ...previas, [jardin.id]: marca }))
      return
    }
    setEnviando(jardin.id)
    await enviar(ruta.programacion_id, jardin, marca, false)
    setEnviando(null)
  }

  // Al volver la conexión, se envían las marcas pendientes, una detrás de otra, con su hora y su clave.
  const idsEnCola = Object.keys(sinSincronizar).join(',')
  useEffect(() => {
    if (!enLinea || !servidor || !idsEnCola || enviandoCola.current) return
    enviandoCola.current = true
    const cola = Object.entries(sinSincronizar)
    void (async () => {
      for (const [id, marca] of cola) {
        const jardin = servidor.jardines.find((j) => j.id === Number(id))
        if (jardin) await enviar(servidor.programacion_id, jardin, marca, true)
      }
      enviandoCola.current = false
    })()
    // Solo al cambiar la conexión o la cola; `enviar` y `sinSincronizar` se leen en ese momento.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [enLinea, idsEnCola, servidor])

  let contenido
  if (consulta.estado === 'error' && !consulta.datos) {
    contenido = <EstadoError titulo="No pudimos cargar tu ruta" descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} />
  } else if (!consulta.datos) {
    contenido = consulta.cargaVisible ? <EstadoCarga forma="tarjetas" texto="Cargando tu ruta…" /> : null
  } else if (!ruta) {
    contenido = <EstadoVacio titulo="Hoy no hay corte en tu cuadrilla" descripcion="Cuando el jefe de sección inicie un ciclo de corte, verás aquí tu ruta." />
  } else {
    const enCola = Object.keys(sinSincronizar).length
    contenido = (
      <>
        {(!enLinea || enCola > 0) && (
          <AvisoEnLinea tono="advertencia" icono="wifi-off" compacto titulo={textoSinConexion(enCola, enLinea)} />
        )}
        <ListaRuta
          ruta={ruta}
          enviando={enviando}
          sinSincronizar={sinSincronizar}
          sinConexion={!enLinea || enCola > 0}
          onMarcar={(jardin) => void marcar(jardin)}
          onAbrirMarcado={setAbierto}
          onFueraDeRuta={() => setFueraDeRuta(nuevaClave())}
        />
      </>
    )
  }

  return (
    <div className={estilos.pagina}>
      <AccionMovil>
        <Boton variante="fantasma" compacto icono="refresh" onClick={consulta.reintentar}>
          <span className="sr-only">Actualizar la ruta</span>
        </Boton>
      </AccionMovil>
      {contenido}
      {ruta && abierto && (
        <HojaYaMarcado
          ruta={ruta}
          jardin={abierto}
          onCerrar={() => setAbierto(null)}
          onAnadida={() => {
            setAviso({ mensaje: `Observación añadida a ${abierto.codigo}`, tono: 'exito' })
            setAbierto(null)
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
            setAviso({ mensaje: `${jardin.codigo} marcado fuera de ruta`, tono: 'exito' })
          }}
        />
      )}
      <AvisoTemporal mensaje={aviso?.mensaje ?? null} tono={aviso?.tono} onCerrar={() => setAviso(null)} />
    </div>
  )
}
