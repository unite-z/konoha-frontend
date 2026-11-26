/**
 * «Reportar incidencia» a pantalla completa en el móvil (RD-70, V14, HU-020 y CU-020): tipo en chips, foto
 * obligatoria, espacio propuesto por la ubicación, ejemplar opcional y descripción. Es el `PanelLateral` del diseño
 * nuevo (hoja inferior en móvil) y su apertura vive en la URL (`?reportar=1`).
 *
 * - Antes de enviar busca una incidencia abierta igual: si la hay, la hoja «Ya hay una incidencia abierta» ofrece
 *   «Añadir a la existente» o «Reportar igualmente».
 * - Sin conexión (o si se corta al enviar), el reporte queda en la cola común con su foto y su hora real y la lista lo
 *   enseña como «Pendiente de enviar».
 * - La clasificación por IA a partir de la foto queda fuera: el tipo se elige en chips (P-18).
 */
import { useState } from 'react'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import Boton from '@/design-system/Boton'
import CampoFormulario from '@/design-system/CampoFormulario'
import DialogoFormulario from '@/design-system/DialogoFormulario'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import GrupoOpciones from '@/design-system/GrupoOpciones'
import Icono from '@/design-system/Icono'
import Selector from '@/design-system/Selector'
import ZonaCarga from '@/design-system/ZonaCarga'
import { useConsulta } from '@/hooks/useConsulta'
import { useEnLinea } from '@/hooks/useEnLinea'
import { motivoSinEspacios } from '@/pages/incidencias/sinEspacios'
import { textoDuplicado } from '@/pages/incidencias/misIncidencias'
import { ErrorApi } from '@/services/api/cliente'
import {
  buscarPosiblesDuplicados,
  obtenerCatalogosRegistro,
  registrarIncidencia,
  sumarReporte,
} from '@/services/api/incidencias'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import { nuevaClave } from '@/sincronizacion/cola'
import { conCache } from '@/sincronizacion/datosDescargados'
import type { NuevaIncidencia, PosibleDuplicado } from '@/types/incidencias'
import { comprimirFotografia } from '@/utils/comprimirFotografia'
import { panel } from '@/rediseno/base/movimiento'
import PanelLateral from '@/rediseno/base/PanelLateral/PanelLateral'
import { encolarReporte } from './encolarReporte'
import { NOMBRE_REPORTAR } from './nombres'
import { useVistaPrevia } from './useVistaPrevia'
import estilos from './Incidencias.module.css'

export interface HojaReportarProps {
  onCerrar: () => void
  /** Se envió, se sumó a otra o quedó pendiente: el aviso que muestra la lista. */
  onEnviado: (aviso: string) => void
}

export default function HojaReportar({ onCerrar, onEnviado }: HojaReportarProps) {
  const sesion = useSesionActiva()
  const enLinea = useEnLinea()
  // Los catálogos se guardan en el dispositivo: sin red se puede reportar con los últimos descargados.
  const catalogos = useConsulta('incidencias-catalogos-registro', (signal) =>
    conCache('incidencias-catalogos-registro', () => obtenerCatalogosRegistro(signal)),
  )
  const [tipo, setTipo] = useState<string | null>(null)
  const [foto, setFoto] = useState<File | null>(null)
  const [espacioElegido, setEspacio] = useState<string | null>(null)
  const [ejemplar, setEjemplar] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [mostrarErrores, setMostrarErrores] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<{
    titulo: string
    detalle: string
  } | null>(null)
  const [duplicado, setDuplicado] = useState<PosibleDuplicado | null>(null)
  // Una clave por reporte: reenviarlo (red cortada, cola) no lo duplica.
  const [clave] = useState(nuevaClave)
  const vistaPrevia = useVistaPrevia(foto)

  /** Foto comprimida a JPEG (1600 px, `pwa-offline.md`); si el navegador no la lee, se envía tal cual. */
  async function elegirFoto(archivo: File | null) {
    if (!archivo) return setFoto(null)
    setFoto(archivo)
    const comprimida = await comprimirFotografia(archivo).catch(() => archivo)
    setFoto((actual) => (actual === archivo ? comprimida : actual))
  }

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

  async function aLaCola() {
    if (!sesion) return setEnviando(false)
    try {
      await encolarReporte(cuerpo(), foto, sesion.usuario.id, clave)
      onEnviado('Sin conexión: se enviará al reconectar')
    } catch {
      setError({
        titulo: 'No se pudo guardar el reporte',
        detalle: 'Este dispositivo no permite guardar datos sin conexión.',
      })
      setEnviando(false)
    }
  }

  async function registrar() {
    setEnviando(true)
    setError(null)
    try {
      const registrada = await registrarIncidencia(cuerpo(), foto, clave)
      onEnviado(`${registrada.codigo} reportada`)
    } catch (causa) {
      // Si la red se corta al enviar, el reporte pasa a la cola con la misma clave.
      if (causa instanceof ErrorApi && causa.estado === 0) return aLaCola()
      setError({
        titulo:
          causa instanceof ErrorApi && causa.estado === 403
            ? 'No tienes permiso para reportar'
            : 'No se pudo enviar el reporte',
        detalle: causa instanceof Error ? causa.message : 'Inténtalo de nuevo.',
      })
      setEnviando(false)
    }
  }

  async function enviar() {
    setMostrarErrores(true)
    if (errores.tipo || errores.foto || errores.espacio) return
    if (!enLinea) return aLaCola()
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

  let cuerpoHoja
  if (catalogos.estado === 'error' && !catalogos.datos) {
    cuerpoHoja = (
      <EstadoError
        nivel={3}
        titulo="No pudimos cargar las opciones del reporte"
        descripcion={catalogos.error?.detalle ?? ''}
        onReintentar={catalogos.reintentar}
      />
    )
  } else if (!catalogos.datos) {
    cuerpoHoja = catalogos.cargaVisible ? <EstadoCarga forma="tarjetas" texto="Cargando…" /> : null
  } else {
    cuerpoHoja = (
      <div className={estilos.formulario}>
        {!enLinea && (
          <AvisoEnLinea tono="advertencia" icono="wifi-off" compacto titulo="Sin conexión · se enviará al reconectar" />
        )}
        <GrupoOpciones
          etiqueta="Tipo"
          obligatorio
          chips
          opciones={catalogos.datos.tipos.map((t) => ({ valor: t, texto: t }))}
          valor={tipo}
          onCambiar={setTipo}
          error={mostrarErrores ? errores.tipo : undefined}
        />
        <div>
          <p className={estilos.rotulo}>
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
              onArchivos={(archivos) => void elegirFoto(archivos[0] ?? null)}
            />
          </div>
          {mostrarErrores && errores.foto && <p className={estilos.errorCampo}>{errores.foto}</p>}
        </div>
        <Selector
          id="reportar-espacio"
          etiqueta="Espacio"
          obligatorio
          valor={espacio}
          opcionTodos="Elige el espacio"
          opciones={catalogos.datos.espacios.map((e) => ({
            valor: e.nombre,
            texto: e.nombre,
          }))}
          onCambiar={(valor) => {
            setEspacio(valor)
            setEjemplar('')
          }}
          ayuda={espacio && espacio === sugerido ? 'Según tu ubicación' : undefined}
          error={mostrarErrores ? errores.espacio : undefined}
          bloqueadoMotivo={motivoSinEspacios(catalogos.datos.espacios)}
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
        {error && (
          <AvisoEnLinea tono="error" titulo={error.titulo}>
            {error.detalle}
          </AvisoEnLinea>
        )}
      </div>
    )
  }

  return (
    <>
      <PanelLateral
        abierto
        onCerrar={onCerrar}
        titulo="Reportar incidencia"
        viewTransitionName={panel(NOMBRE_REPORTAR)}
        editando={Boolean(tipo || foto || descripcion.trim())}
        pie={
          catalogos.datos ? (
            <Boton cargando={enviando && !duplicado} onClick={() => void enviar()}>
              Enviar
            </Boton>
          ) : undefined
        }
      >
        {cuerpoHoja}
      </PanelLateral>
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
