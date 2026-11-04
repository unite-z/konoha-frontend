/**
 * «Nuevo análisis» (RF-IA-006, CU-MOD06-008 pasos 1 a 4) en dos pasos:
 * 1. La planta: el ejemplar o la atención fitosanitaria especial, y los síntomas observados (opcional). Sin especie,
 *    se avisa de que el análisis tendrá menos contexto (A3).
 * 2. Las fotografías: de 1 a 5 imágenes, validadas antes de enviar y previsualizadas con «Quitar».
 * Si la IA no responde (E1), se ofrece «Registrar evaluación manual». Para reiniciarlo, el padre cambia su `key`.
 */
import { useState } from 'react'
import AsistentePasos from '@/components/ui/AsistentePasos'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton from '@/components/ui/Boton'
import { AreaTexto } from '@/components/ui/CampoFormulario'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import GrupoOpciones from '@/components/ui/GrupoOpciones'
import SelectorBuscable from '@/components/ui/SelectorBuscable'
import ZonaCarga from '@/components/ui/ZonaCarga'
import { aErrorApi, type ErrorApi } from '@/services/api/cliente'
import { buscarAtencionesEvidencia, buscarEjemplaresEvidencia, solicitarAnalisisEvidencia } from '@/services/api/evidenciaFitosanitariaIa'
import type { AtencionBuscable, EjemplarEvidencia, SugerenciaEvidencia } from '@/types/evidenciaFitosanitariaIa'
import { ACEPTA_IMAGENES, AYUDA_FOTOGRAFIAS, validarArchivosImagen } from '@/utils/evidenciaFitosanitariaIa'
import type { ContextoManual } from './DialogoEvaluacionManual'
import estilos from './Evidencia.module.css'

type Modo = 'ejemplar' | 'atencion'
const MODOS: { valor: Modo; texto: string; descripcion: string }[] = [
  { valor: 'ejemplar', texto: 'Ejemplar', descripcion: 'Busca el árbol o la planta por su código' },
  { valor: 'atencion', texto: 'Atención fitosanitaria especial', descripcion: 'Un ejemplar ya marcado con atención especial' },
]
const PASOS = ['La planta', 'Las fotografías']

/** Planta elegida al abrir (enlace profundo o «Subir nuevas fotografías»). */
export interface InicialNuevoAnalisis {
  ejemplar?: EjemplarEvidencia
  atencion?: AtencionBuscable
  sintomas?: string
  /** 1: abre directamente en las fotografías. */
  paso?: 0 | 1
}

export interface DialogoNuevoAnalisisProps {
  abierto: boolean
  inicial: InicialNuevoAnalisis | null
  onCerrar: () => void
  onCreado: (analisis: SugerenciaEvidencia) => void
  onManual: (contexto: ContextoManual) => void
}

const textoEjemplar = (e: EjemplarEvidencia) => `${e.codigo} · ${e.especie ?? 'especie no identificada'}`

export default function DialogoNuevoAnalisis({ abierto, inicial, onCerrar, onCreado, onManual }: DialogoNuevoAnalisisProps) {
  const [paso, setPaso] = useState<0 | 1>(inicial?.paso ?? 0)
  const [modo, setModo] = useState<Modo>(inicial?.atencion ? 'atencion' : 'ejemplar')
  const [ejemplar, setEjemplar] = useState<EjemplarEvidencia | null>(inicial?.ejemplar ?? null)
  const [atencion, setAtencion] = useState<AtencionBuscable | null>(inicial?.atencion ?? null)
  const [sintomas, setSintomas] = useState(inicial?.sintomas ?? '')
  const [fotos, setFotos] = useState<{ archivo: File; url: string }[]>([])
  const [rechazos, setRechazos] = useState<string[]>([])
  const [errores, setErrores] = useState<{ planta?: string; fotos?: string }>({})
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<ErrorApi | null>(null)

  const planta = modo === 'ejemplar' ? ejemplar : (atencion?.ejemplar ?? null)
  const iaNoDisponible = error?.estado === 503
  const contexto = (): ContextoManual | null =>
    planta
      ? { ejemplar_id: modo === 'ejemplar' ? planta.id : null, atencion_id: modo === 'atencion' ? (atencion?.id ?? null) : null, texto: textoEjemplar(planta) }
      : null

  function liberar() {
    for (const f of fotos) URL.revokeObjectURL(f.url)
  }

  function cerrar() {
    liberar()
    onCerrar()
  }

  function agregar(archivos: File[]) {
    const { aceptados, errores: nuevos } = validarArchivosImagen(archivos, fotos.length)
    setRechazos(nuevos)
    setErrores((e) => ({ ...e, fotos: undefined }))
    setFotos((actuales) => [...actuales, ...aceptados.map((archivo) => ({ archivo, url: URL.createObjectURL(archivo) }))])
  }

  function quitar(indice: number) {
    URL.revokeObjectURL(fotos[indice].url)
    setFotos((actuales) => actuales.filter((_, i) => i !== indice))
  }

  function irAFotos(): boolean {
    if (!planta) {
      setErrores({ planta: modo === 'ejemplar' ? 'Elige el ejemplar' : 'Elige la atención fitosanitaria' })
      document.getElementById('evidencia-planta')?.focus()
      return false
    }
    setErrores({})
    setPaso(1)
    return true
  }

  async function enviar() {
    if (paso === 0) {
      irAFotos()
      return
    }
    if (enviando || !planta) return
    if (fotos.length === 0) {
      setErrores({ fotos: 'Adjunta al menos una fotografía' })
      document.getElementById('evidencia-fotos')?.focus()
      return
    }
    setEnviando(true)
    setError(null)
    try {
      const datos = modo === 'ejemplar' ? { ejemplar_id: planta.id, sintomas } : { atencion_id: atencion?.id, sintomas }
      const creado = await solicitarAnalisisEvidencia(datos, fotos.map((f) => f.archivo))
      liberar()
      onCreado(creado)
    } catch (causa) {
      setError(aErrorApi(causa))
    } finally {
      setEnviando(false)
    }
  }

  const pasoPlanta = (
    <>
      <GrupoOpciones etiqueta="Qué quieres analizar" opciones={MODOS} valor={modo} onCambiar={(m) => {
          setModo(m)
          setErrores({})
        }}
      />
      {modo === 'ejemplar' ? (
        <SelectorBuscable<EjemplarEvidencia>
          id="evidencia-planta"
          etiqueta="Ejemplar"
          obligatorio
          valor={ejemplar}
          claveDe={(e) => e.id}
          textoDe={textoEjemplar}
          detalleDe={(e) => e.espacio ?? undefined}
          buscar={buscarEjemplaresEvidencia}
          onCambiar={setEjemplar}
          placeholder="Busca por código, especie o ubicación"
          error={errores.planta}
        />
      ) : (
        <SelectorBuscable<AtencionBuscable>
          id="evidencia-planta"
          etiqueta="Atención fitosanitaria especial"
          obligatorio
          valor={atencion}
          claveDe={(a) => a.id}
          textoDe={(a) => `${a.ejemplar.codigo} · ${a.plaga}`}
          detalleDe={(a) => a.ejemplar.espacio ?? undefined}
          buscar={buscarAtencionesEvidencia}
          onCambiar={setAtencion}
          placeholder="Busca por ejemplar o plaga"
          error={errores.planta}
        />
      )}
      {modo === 'ejemplar' && ejemplar && !ejemplar.especie && (
        <AvisoEnLinea tono="advertencia">Especie no identificada: el análisis tendrá menos contexto.</AvisoEnLinea>
      )}
      <AreaTexto
        id="evidencia-sintomas"
        etiqueta="Síntomas observados"
        ayuda="Opcional. Manchas, hojas secas, presencia de insectos…"
        rows={3}
        maxLength={1000}
        value={sintomas}
        onChange={(e) => setSintomas(e.target.value)}
      />
    </>
  )

  const pasoFotos = (
    <>
      <p className={estilos.secundario}>{planta && textoEjemplar(planta)}</p>
      <ZonaCarga
        id="evidencia-fotos"
        acepta={ACEPTA_IMAGENES}
        ayuda={AYUDA_FOTOGRAFIAS}
        textoBoton="Elegir fotografías"
        error={errores.fotos}
        deshabilitada={enviando}
        onArchivos={agregar}
      />
      {rechazos.length > 0 && (
        <ul className={estilos.errores} aria-live="polite">
          {rechazos.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      {fotos.length > 0 && (
        <ul className={estilos.elegidas} aria-label="Fotografías elegidas">
          {fotos.map((f, i) => (
            <li key={f.url} className={estilos.foto}>
              <span className={estilos.botonFoto}>
                <img className={estilos.imagen} src={f.url} alt={`Fotografía ${i + 1}: ${f.archivo.name}`} />
              </span>
              <span className={estilos.nombreFoto}>{f.archivo.name}</span>
              <Boton variante="fantasma" compacto icono="x" onClick={() => quitar(i)} deshabilitado={enviando}>
                Quitar
              </Boton>
            </li>
          ))}
        </ul>
      )}
      <div>
        <Boton variante="fantasma" icono="chevron-left" onClick={() => setPaso(0)} deshabilitado={enviando}>
          Volver a la planta
        </Boton>
      </div>
    </>
  )

  return (
    <DialogoFormulario
      abierto={abierto}
      titulo="Nuevo análisis de evidencia"
      descripcion="La IA propone hipótesis de afectación a partir de las fotografías. No es un diagnóstico ni indica un tratamiento."
      textoConfirmar={paso === 0 ? 'Continuar' : 'Analizar evidencia con IA'}
      enviando={enviando}
      hayCambios={planta !== null || fotos.length > 0 || sintomas !== ''}
      error={error && !iaNoDisponible ? { titulo: 'No se pudo analizar la evidencia', detalle: error.detalle } : null}
      ancho="amplio"
      conObligatorios
      onEnviar={() => void enviar()}
      onCerrar={cerrar}
    >
      <AsistentePasos pasos={PASOS} actual={paso} alcanzado={paso} onIrA={(i) => (i === 0 ? setPaso(0) : irAFotos())} />
      {iaNoDisponible && (
        <AvisoEnLinea
          tono="error"
          titulo="La IA no está disponible"
          accion={{
            texto: 'Registrar evaluación manual',
            onClick: () => {
              const c = contexto()
              if (c) onManual(c)
            },
          }}
        >
          {error?.detalle}
        </AvisoEnLinea>
      )}
      <div className={estilos.pila}>{paso === 0 ? pasoPlanta : pasoFotos}</div>
    </DialogoFormulario>
  )
}
