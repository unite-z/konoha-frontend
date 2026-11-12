/**
 * «Reportar incidencia» en el móvil (AV-282, Figma 391-8394 y 391-8469; HU-020 y CU-020): tipo en chips, foto
 * obligatoria, espacio propuesto por la ubicación, ejemplar opcional y descripción. Es el panel lateral, que en el
 * móvil ocupa la pantalla.
 * - Antes de enviar busca una incidencia abierta igual: si la hay, la hoja «Ya hay una incidencia abierta» ofrece
 *   «Añadir a la existente» o «Reportar igualmente» (391-8469).
 * - Sin conexión, el reporte queda «Pendiente de enviar» en «Mis incidencias» y se envía al volver (394-9964).
 */
import { useEffect, useState } from 'react'
import CampoFormulario from '@/components/ui/CampoFormulario'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import GrupoOpciones from '@/components/ui/GrupoOpciones'
import Icono from '@/components/ui/Icono'
import Selector from '@/components/ui/Selector'
import ZonaCarga from '@/components/ui/ZonaCarga'
import { motivoSinEspacios } from './sinEspacios'
import { useConsulta } from '@/hooks/useConsulta'
import {
  buscarPosiblesDuplicados,
  obtenerCatalogosRegistro,
  registrarIncidencia,
  sumarReporte,
} from '@/services/api/incidencias'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import type { NuevaIncidencia, PosibleDuplicado } from '@/types/incidencias'
import { useEnLinea } from '@/hooks/useEnLinea'
import { textoDuplicado } from './misIncidencias'
import { anadirPendiente } from './reportesPendientes'
import estilos from './Incidencias.module.css'

/** Vista previa de la foto (sin `URL.createObjectURL`, por ejemplo en las pruebas, solo el icono). */
function useVistaPrevia(foto: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!foto || typeof URL.createObjectURL !== 'function') return
    const nueva = URL.createObjectURL(foto)
    setUrl(nueva)
    return () => {
      URL.revokeObjectURL(nueva)
      setUrl(null)
    }
  }, [foto])
  return url
}

export interface DialogoReportarIncidenciaProps {
  onCerrar: () => void
  /** Se envió, se sumó a otra o quedó pendiente: el aviso que muestra la lista. */
  onEnviado: (aviso: string) => void
  espacioInicial?: string
  ejemplarInicial?: string
}

export default function DialogoReportarIncidencia({
  onCerrar,
  onEnviado,
  espacioInicial,
  ejemplarInicial,
}: DialogoReportarIncidenciaProps) {
  const sesion = useSesionActiva()
  const enLinea = useEnLinea()
  const catalogos = useConsulta('incidencias-catalogos-registro', obtenerCatalogosRegistro)
  const [tipo, setTipo] = useState<string | null>(null)
  const [foto, setFoto] = useState<File | null>(null)
  const [espacioElegido, setEspacio] = useState<string | null>(espacioInicial ?? null)
  const [ejemplar, setEjemplar] = useState(ejemplarInicial ?? '')
  const [descripcion, setDescripcion] = useState('')
  const [mostrarErrores, setMostrarErrores] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<{ titulo: string; detalle: string } | null>(null)
  const [duplicado, setDuplicado] = useState<PosibleDuplicado | null>(null)
  const vistaPrevia = useVistaPrevia(foto)

  // El espacio entra con el que propone la ubicación hasta que se elige otro.
  const sugerido = catalogos.datos?.espacio_sugerido ?? ''
  const espacio = espacioElegido ?? sugerido
  const ejemplares = catalogos.datos?.espacios.find((e) => e.nombre === espacio)?.ejemplares ?? []
  const errores = {
    tipo: !tipo ? 'Elige el tipo.' : undefined,
    foto: !foto ? 'Añade una foto.' : undefined,
    espacio: !espacio ? 'Elige el espacio.' : undefined,
  }

  function cuerpo(): NuevaIncidencia {
    return {
      canal: 'App',
      tipo: tipo ?? '',
      reportado_por: { usuario_id: sesion?.usuario.id ?? 0 },
      espacio,
      ejemplar: ejemplar || null,
      descripcion: descripcion.trim(),
    }
  }

  async function registrar() {
    setEnviando(true)
    setError(null)
    try {
      const registrada = await registrarIncidencia(cuerpo(), foto)
      onEnviado(`${registrada.codigo} reportada`)
    } catch (causa) {
      setError({
        titulo: 'No se pudo enviar el reporte',
        detalle: causa instanceof Error ? causa.message : 'Inténtalo de nuevo.',
      })
      setEnviando(false)
    }
  }

  async function enviar() {
    setMostrarErrores(true)
    if (errores.tipo || errores.foto || errores.espacio) return
    if (!enLinea) {
      if (!sesion) return
      try {
        await anadirPendiente(cuerpo(), foto, sesion.usuario.id)
        onEnviado('Sin conexión: se enviará al reconectar')
      } catch {
        setError({
          titulo: 'No se pudo guardar el reporte',
          detalle: 'Este dispositivo no permite guardar datos sin conexión.',
        })
      }
      return
    }
    setEnviando(true)
    const parecidas = await buscarPosiblesDuplicados(tipo ?? '', espacio, ejemplar || null).catch(() => [])
    setEnviando(false)
    if (parecidas.length > 0) {
      setDuplicado(parecidas[0])
      return
    }
    await registrar()
  }

  async function anadirAExistente(existente: PosibleDuplicado) {
    setEnviando(true)
    try {
      await sumarReporte(existente.id, descripcion.trim(), foto)
      onEnviado(`Añadido a ${existente.codigo}`)
    } catch (causa) {
      setError({
        titulo: 'No se pudo añadir el reporte',
        detalle: causa instanceof Error ? causa.message : 'Inténtalo de nuevo.',
      })
      setEnviando(false)
      setDuplicado(null)
    }
  }

  return (
    <>
      <DialogoFormulario
        abierto
        ancho="lateral"
        titulo="Reportar incidencia"
        textoConfirmar="Enviar"
        conObligatorios={false}
        hayCambios={Boolean(tipo || foto || descripcion.trim())}
        enviando={enviando && !duplicado}
        error={error}
        onEnviar={() => void enviar()}
        onCerrar={onCerrar}
      >
        <GrupoOpciones
          etiqueta="Tipo"
          obligatorio
          chips
          opciones={(catalogos.datos?.tipos ?? []).map((t) => ({ valor: t, texto: t }))}
          valor={tipo}
          onCambiar={setTipo}
          error={mostrarErrores ? errores.tipo : undefined}
        />
        <div>
          <p className={estilos.rotuloCampo}>
            Foto <span className={estilos.asterisco}>*</span>
          </p>
          <div className={estilos.fotos}>
            {foto && (
              <span className={estilos.fotoElegida}>
                {vistaPrevia ? (
                  <img src={vistaPrevia} alt="Foto elegida" />
                ) : (
                  <Icono nombre="image" tamano="md" titulo="Foto elegida" />
                )}
              </span>
            )}
            <ZonaCarga
              miniatura
              multiple={false}
              acepta="image/*"
              textoBoton={foto ? 'Otra' : 'Foto'}
              ayuda=""
              error={mostrarErrores ? errores.foto : undefined}
              onArchivos={(archivos) => setFoto(archivos[0] ?? null)}
            />
          </div>
          {mostrarErrores && errores.foto && <p className={estilos.errorAccion}>{errores.foto}</p>}
        </div>
        <Selector
          id="reportar-espacio"
          etiqueta="Espacio"
          obligatorio
          valor={espacio}
          opcionTodos="Elige el espacio"
          opciones={(catalogos.datos?.espacios ?? []).map((e) => ({ valor: e.nombre, texto: e.nombre }))}
          onCambiar={(valor) => {
            setEspacio(valor)
            setEjemplar('')
          }}
          ayuda={espacio && espacio === sugerido ? 'Según tu ubicación' : undefined}
          error={mostrarErrores ? errores.espacio : undefined}
          bloqueadoMotivo={motivoSinEspacios(catalogos.datos?.espacios)}
        />
        <Selector
          id="reportar-ejemplar"
          etiqueta="Ejemplar"
          valor={ejemplar}
          opcionTodos="Sin ejemplar"
          opciones={ejemplares.map((e) => ({ valor: e, texto: e }))}
          onCambiar={setEjemplar}
        />
        <CampoFormulario
          id="reportar-descripcion"
          etiqueta="Descripción"
          value={descripcion}
          maxLength={300}
          onChange={(e) => setDescripcion(e.target.value)}
        />
      </DialogoFormulario>

      {duplicado && (
        <DialogoFormulario
          abierto
          ancho="hoja"
          accionesApiladas
          titulo="Ya hay una incidencia abierta"
          descripcion={textoDuplicado(duplicado)}
          textoConfirmar="Añadir a la existente"
          textoCancelar="Reportar igualmente"
          conObligatorios={false}
          enviando={enviando}
          onEnviar={() => void anadirAExistente(duplicado)}
          onCancelar={() => {
            setDuplicado(null)
            void registrar()
          }}
          onCerrar={() => setDuplicado(null)}
        >
          {null}
        </DialogoFormulario>
      )}
    </>
  )
}
