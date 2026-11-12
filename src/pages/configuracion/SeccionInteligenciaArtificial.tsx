/**
 * Configuración → Inteligencia artificial (AV-395): el proveedor y el modelo de los siete asistentes de IA. Solo la ve
 * quien tiene IA.PROPUESTA.VALIDAR, porque afecta a toda la sección. Las claves siguen en el servidor.
 */
import { useState } from 'react'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import Boton from '@/design-system/Boton'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import GrupoOpciones, { type OpcionGrupo } from '@/design-system/GrupoOpciones'
import Selector from '@/design-system/Selector'
import Tarjeta from '@/design-system/Tarjeta'
import { useConsulta } from '@/hooks/useConsulta'
import { aErrorApi } from '@/services/api/cliente'
import { cambiarConfiguracionIa, obtenerConfiguracionIa, probarConexionIa } from '@/services/api/configuracionIa'
import type { ConfiguracionIa, ProveedorIa, PruebaConexionIa } from '@/types/ia'
import estilos from './Configuracion.module.css'

/** Lo que cambia según el modelo, para elegir con conocimiento. */
const NOTAS_MODELO: Record<string, string> = {
  'deepseek-v4-pro': ' (no analiza fotos)',
}

function segundos(ms: number) {
  return String(Math.round(ms / 100) / 10).replace('.', ',') + ' s'
}

export default function SeccionInteligenciaArtificial() {
  const consulta = useConsulta('configuracion-ia', (signal) => obtenerConfiguracionIa(signal))
  const [local, setLocal] = useState<ConfiguracionIa | null>(null)
  const actual = local ?? consulta.datos ?? null
  const [proveedor, setProveedor] = useState<ProveedorIa | null>(null)
  const [modelo, setModelo] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [probando, setProbando] = useState(false)
  const [prueba, setPrueba] = useState<PruebaConexionIa | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!actual) {
    if (consulta.estado === 'error')
      return (
        <Tarjeta titulo="Inteligencia artificial">
          <EstadoError
            titulo="No pudimos cargar la configuración de la IA"
            descripcion={consulta.error?.detalle ?? ''}
            onReintentar={consulta.reintentar}
          />
        </Tarjeta>
      )
    return consulta.cargaVisible ? <EstadoCarga forma="tarjetas" /> : null
  }

  const elegido = proveedor ?? actual.proveedor
  const datosProveedor = actual.proveedores.find((p) => p.id === elegido)
  const modelos = datosProveedor?.modelos ?? []
  const modeloElegido =
    modelo && modelos.includes(modelo) ? modelo : elegido === actual.proveedor ? actual.modelo : modelos[0]
  const cambiado = elegido !== actual.proveedor || modeloElegido !== actual.modelo
  const opciones: OpcionGrupo<ProveedorIa>[] = actual.proveedores.map((p) => ({
    valor: p.id,
    texto: p.nombre,
    descripcion: p.clave_configurada ? undefined : 'Sin clave en el servidor',
  }))
  const nombreActual = actual.proveedores.find((p) => p.id === actual.proveedor)?.nombre ?? actual.proveedor

  async function guardar() {
    setGuardando(true)
    setError(null)
    try {
      setLocal(await cambiarConfiguracionIa({ proveedor: elegido, modelo: modeloElegido }))
      setProveedor(null)
      setModelo(null)
      setPrueba(null)
    } catch (e) {
      setError(aErrorApi(e).detalle)
    } finally {
      setGuardando(false)
    }
  }

  async function probar() {
    setProbando(true)
    setError(null)
    try {
      setPrueba(await probarConexionIa({ proveedor: elegido, modelo: modeloElegido }))
    } catch (e) {
      setError(aErrorApi(e).detalle)
    } finally {
      setProbando(false)
    }
  }

  return (
    <Tarjeta
      titulo="Inteligencia artificial"
      descripcion="El proveedor y el modelo que usan los siete asistentes de IA. El cambio afecta a toda la sección."
    >
      <div className={estilos.campos}>
        <p className={estilos.rotulo}>
          Ahora: {nombreActual} · {actual.modelo} (
          {actual.origen === 'configuracion' ? 'elegido aquí' : 'el del servidor'})
        </p>
        <GrupoOpciones
          etiqueta="Proveedor"
          opciones={opciones}
          valor={elegido}
          onCambiar={(p) => {
            setProveedor(p)
            setModelo(null)
            setPrueba(null)
          }}
          segmentado
        />
        <Selector
          id="configuracion-ia-modelo"
          etiqueta="Modelo"
          valor={modeloElegido}
          opciones={modelos.map((m) => ({ valor: m, texto: m + (NOTAS_MODELO[m] ?? '') }))}
          onCambiar={(m) => {
            setModelo(m)
            setPrueba(null)
          }}
        />
        {prueba && (
          <AvisoEnLinea
            tono={prueba.ok ? 'exito' : 'error'}
            titulo={prueba.ok ? `Responde en ${segundos(prueba.duracion_ms)}` : 'No responde'}
          >
            {prueba.ok ? `${prueba.proveedor} · ${prueba.modelo} está disponible.` : prueba.detalle}
          </AvisoEnLinea>
        )}
        {error && <AvisoEnLinea tono="error">{error}</AvisoEnLinea>}
        <div className={estilos.muestras}>
          <Boton onClick={guardar} cargando={guardando} deshabilitado={!cambiado}>
            Guardar
          </Boton>
          <Boton variante="secundario" onClick={probar} cargando={probando}>
            Probar conexión
          </Boton>
        </div>
      </div>
    </Tarjeta>
  )
}
