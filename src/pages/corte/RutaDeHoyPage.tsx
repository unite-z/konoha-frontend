// RF-COR-002, HU-011 y CU-011 · Ruta de hoy del capataz en el móvil (AV-271, Figma 353-2335 y 375-6817)
/**
 * El corte en curso de la cuadrilla con su avance («28 de 45 jardines») y los jardines en dos pestañas, «Por cortar» y
 * «Marcados». Un toque en un jardín por cortar lo marca con la hora real; en uno marcado, o si otro ya lo marcó (409
 * `ya-marcado`), abre la hoja «ya está marcado» con quién y cuándo y «Añadir observación».
 *
 * El backend (AV-260) aún no existe: con datos simulados responde `services/simulados/corte.ts` (D9).
 */
import { useState } from 'react'
import AvisoDatosSimulados from '@/components/reportes-indicadores/AvisoDatosSimulados'
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
import { detalleMarcado, marcados, porCortar, textoYaMarcado, tituloJardin } from './rutaDeHoy'
import estilos from './RutaDeHoy.module.css'

function nuevaClave(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function ListaRuta({
  ruta,
  onMarcar,
  onAbrirMarcado,
  enviando,
}: {
  ruta: RutaDeHoy
  onMarcar: (jardin: JardinRuta) => void
  onAbrirMarcado: (jardin: JardinRuta) => void
  enviando: number | null
}) {
  const [pestana, setPestana] = useState('por-cortar')
  const pendientes = porCortar(ruta.jardines)
  const hechos = marcados(ruta.jardines)
  const total = ruta.jardines.length

  return (
    <>
      <Tarjeta relleno="amplio">
        <div className={estilos.avance}>
          <p className={estilos.ciclo}>
            {ruta.servicio} · {ruta.codigo}
          </p>
          <p className={estilos.cifra}>
            <span className={estilos.numero}>
              {hechos.length} de {total}
            </span>
            <span>jardines</span>
          </p>
          <BarraAvance valor={hechos.length} maximo={total} etiqueta="Avance de la ruta" textoValor={`${hechos.length} de ${total} jardines`} />
        </div>
      </Tarjeta>

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
          pendientes.length === 0 ? (
            <EstadoVacio titulo="Ruta completa" descripcion="Todos los jardines de hoy están marcados." nivel={3} />
          ) : (
            <ul className={estilos.lista}>
              {pendientes.map((jardin) => (
                <li key={jardin.id}>
                  <FilaChecklist titulo={tituloJardin(jardin)} detalle={jardin.zona} estado="Pendiente" deshabilitada={enviando === jardin.id} onPulsar={() => onMarcar(jardin)} />
                </li>
              ))}
            </ul>
          )
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
  const [aviso, setAviso] = useState<{ mensaje: string; tono: 'exito' | 'error' } | null>(null)

  const servidor = consulta.datos?.ruta ?? null
  const ruta = servidor && { ...servidor, jardines: servidor.jardines.map((j) => locales[j.id] ?? j) }

  async function marcar(jardin: JardinRuta) {
    if (!ruta) return
    setEnviando(jardin.id)
    try {
      const marcado = await marcarJardin(ruta.programacion_id, jardin.id, new Date().toISOString(), nuevaClave())
      setLocales((previas) => ({ ...previas, [jardin.id]: marcado }))
    } catch (causa) {
      if (causa instanceof ErrorApi && causa.codigo === 'ya-marcado') {
        // Otro lo marcó antes: se trae la ruta para saber quién y cuándo, y se ofrece la observación.
        const actual = (await obtenerRutaDeHoy().catch(() => null))?.ruta?.jardines.find((j) => j.id === jardin.id)
        if (actual) {
          setLocales((previas) => ({ ...previas, [jardin.id]: actual }))
          setAbierto(actual)
        }
      } else {
        setAviso({ mensaje: `No se pudo marcar ${jardin.codigo}`, tono: 'error' })
      }
    } finally {
      setEnviando(null)
    }
  }

  let contenido
  if (consulta.estado === 'error' && !consulta.datos) {
    contenido = <EstadoError titulo="No pudimos cargar tu ruta" descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} />
  } else if (!consulta.datos) {
    contenido = consulta.cargaVisible ? <EstadoCarga forma="tarjetas" texto="Cargando tu ruta…" /> : null
  } else if (!ruta) {
    contenido = <EstadoVacio titulo="Hoy no hay corte en tu cuadrilla" descripcion="Cuando el jefe de sección inicie un ciclo de corte, verás aquí tu ruta." />
  } else {
    contenido = <ListaRuta ruta={ruta} enviando={enviando} onMarcar={(jardin) => void marcar(jardin)} onAbrirMarcado={setAbierto} />
  }

  return (
    <div className={estilos.pagina}>
      <AccionMovil>
        <Boton variante="fantasma" compacto icono="refresh" onClick={consulta.reintentar}>
          <span className="sr-only">Actualizar la ruta</span>
        </Boton>
      </AccionMovil>
      <AvisoDatosSimulados />
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
      <AvisoTemporal mensaje={aviso?.mensaje ?? null} tono={aviso?.tono} onCerrar={() => setAviso(null)} />
    </div>
  )
}
