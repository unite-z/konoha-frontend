/**
 * «Registrar incidencia» desde la oficina, en nombre de otro (AV-285, Figma 394-8504; HU-020, AV-274): canal, tipo,
 * quién la reporta (usuario del sistema o persona externa con nombre y contacto), espacio, ejemplar, descripción y
 * foto. Se abre con «Reportar incidencia» de la bandeja.
 *
 * Antes de registrar busca una abierta del mismo tipo en el mismo ejemplar o espacio (HU-020, escenario 2), como el
 * reporte móvil: «Ya hay una incidencia abierta», con «Añadir a la existente» o «Registrar igualmente».
 */
import { useState } from 'react'
import CampoFormulario from '@/components/ui/CampoFormulario'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import GrupoOpciones from '@/components/ui/GrupoOpciones'
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
import type { CanalIncidencia, IncidenciaDetalle, PosibleDuplicado } from '@/types/incidencias'
import estilos from './Incidencias.module.css'
import { textoDuplicado } from './misIncidencias'

/** Canales de la oficina (el de la app es el del reporte móvil, AV-282). */
const CANALES: { valor: CanalIncidencia; texto: string }[] = [
  { valor: 'Telefono', texto: 'Teléfono' },
  { valor: 'WhatsApp', texto: 'WhatsApp' },
  { valor: 'Correo', texto: 'Correo' },
  { valor: 'Presencial', texto: 'En persona' },
  { valor: 'Web', texto: 'Web' },
]

type Reportante = 'usuario' | 'externa'

export interface DialogoRegistrarIncidenciaProps {
  onCerrar: () => void
  onRegistrada: (incidencia: IncidenciaDetalle) => void
  /** El reporte se sumó a una incidencia abierta igual, en lugar de crear otra. */
  onAnadida: (codigo: string) => void
}

export default function DialogoRegistrarIncidencia({
  onCerrar,
  onRegistrada,
  onAnadida,
}: DialogoRegistrarIncidenciaProps) {
  const catalogos = useConsulta('incidencias-catalogos-registro', obtenerCatalogosRegistro)
  const [canal, setCanal] = useState<CanalIncidencia>('Telefono')
  const [tipo, setTipo] = useState('')
  const [reportante, setReportante] = useState<Reportante>('externa')
  const [usuario, setUsuario] = useState('')
  const [nombre, setNombre] = useState('')
  const [contacto, setContacto] = useState('')
  const [espacio, setEspacio] = useState('')
  const [ejemplar, setEjemplar] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [foto, setFoto] = useState<File | null>(null)
  const [mostrarErrores, setMostrarErrores] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<{
    titulo: string
    detalle: string
  } | null>(null)
  const [duplicado, setDuplicado] = useState<PosibleDuplicado | null>(null)

  const ejemplares = catalogos.datos?.espacios.find((e) => e.nombre === espacio)?.ejemplares ?? []
  const errores = {
    tipo: !tipo ? 'Elige el tipo.' : undefined,
    usuario: reportante === 'usuario' && !usuario ? 'Elige quién la reporta.' : undefined,
    nombre: reportante === 'externa' && !nombre.trim() ? 'Escribe el nombre.' : undefined,
    espacio: !espacio ? 'Elige el espacio.' : undefined,
    descripcion: !descripcion.trim() ? 'Describe la incidencia.' : undefined,
  }
  const mostrar = (clave: keyof typeof errores) => (mostrarErrores ? errores[clave] : undefined)

  async function enviar() {
    setMostrarErrores(true)
    if (Object.values(errores).some(Boolean)) return
    setEnviando(true)
    setError(null)
    const parecidas = await buscarPosiblesDuplicados(tipo, espacio, ejemplar || null).catch(() => [])
    if (parecidas.length > 0) {
      setEnviando(false)
      setDuplicado(parecidas[0])
      return
    }
    await registrar()
  }

  async function anadirAExistente(existente: PosibleDuplicado) {
    setEnviando(true)
    try {
      await sumarReporte(existente.id, descripcion.trim(), foto)
      onAnadida(existente.codigo)
    } catch (causa) {
      setError({
        titulo: 'No se pudo añadir el reporte',
        detalle: causa instanceof Error ? causa.message : 'Inténtalo de nuevo.',
      })
      setEnviando(false)
      setDuplicado(null)
    }
  }

  async function registrar() {
    setEnviando(true)
    setError(null)
    try {
      const registrada = await registrarIncidencia(
        {
          canal,
          tipo,
          reportado_por:
            reportante === 'usuario'
              ? { usuario_id: Number(usuario) }
              : { nombre: nombre.trim(), contacto: contacto.trim() || null },
          espacio,
          ejemplar: ejemplar || null,
          descripcion: descripcion.trim(),
        },
        foto,
      )
      onRegistrada(registrada)
    } catch (causa) {
      setError({
        titulo: 'No se pudo registrar la incidencia',
        detalle: causa instanceof Error ? causa.message : 'Inténtalo de nuevo.',
      })
      setEnviando(false)
    }
  }

  return (
    <>
      <DialogoFormulario
        abierto
        ancho="medio"
        titulo="Registrar incidencia"
        textoConfirmar="Registrar"
        conObligatorios={false}
        hayCambios={Boolean(tipo || nombre || descripcion || foto)}
        enviando={enviando && !duplicado}
        error={error}
        onEnviar={() => void enviar()}
        onCerrar={onCerrar}
      >
        <div className={estilos.dosColumnas}>
          <Selector
            id="registrar-canal"
            etiqueta="Canal"
            obligatorio
            valor={canal}
            opciones={CANALES}
            onCambiar={(valor) => setCanal(valor as CanalIncidencia)}
          />
          <Selector
            id="registrar-tipo"
            etiqueta="Tipo"
            obligatorio
            valor={tipo}
            opcionTodos="Elige el tipo"
            opciones={(catalogos.datos?.tipos ?? []).map((t) => ({
              valor: t,
              texto: t,
            }))}
            onCambiar={setTipo}
            error={mostrar('tipo')}
          />
        </div>
        <GrupoOpciones<Reportante>
          etiqueta="Reportado por"
          obligatorio
          horizontal
          repartido
          opciones={[
            { valor: 'usuario', texto: 'Usuario del sistema' },
            { valor: 'externa', texto: 'Persona externa' },
          ]}
          valor={reportante}
          onCambiar={setReportante}
        />
        {reportante === 'externa' ? (
          <div className={estilos.dosColumnas}>
            <CampoFormulario
              id="registrar-nombre"
              etiqueta="Nombre"
              obligatorio
              value={nombre}
              maxLength={120}
              onChange={(e) => setNombre(e.target.value)}
              error={mostrar('nombre')}
            />
            <CampoFormulario
              id="registrar-contacto"
              etiqueta="Contacto"
              value={contacto}
              maxLength={120}
              onChange={(e) => setContacto(e.target.value)}
            />
          </div>
        ) : (
          <Selector
            id="registrar-usuario"
            etiqueta="Usuario"
            obligatorio
            valor={usuario}
            opcionTodos="Elige quién la reporta"
            opciones={(catalogos.datos?.usuarios ?? []).map((u) => ({
              valor: String(u.id),
              texto: u.nombre,
            }))}
            onCambiar={setUsuario}
            error={mostrar('usuario')}
          />
        )}
        <div className={estilos.dosColumnas}>
          <Selector
            id="registrar-espacio"
            etiqueta="Espacio"
            obligatorio
            valor={espacio}
            opcionTodos="Elige el espacio"
            opciones={(catalogos.datos?.espacios ?? []).map((e) => ({
              valor: e.nombre,
              texto: e.nombre,
            }))}
            onCambiar={(valor) => {
              setEspacio(valor)
              setEjemplar('')
            }}
            error={mostrar('espacio')}
            bloqueadoMotivo={motivoSinEspacios(catalogos.datos?.espacios)}
          />
          <Selector
            id="registrar-ejemplar"
            etiqueta="Ejemplar"
            valor={ejemplar}
            opcionTodos="Sin ejemplar"
            opciones={ejemplares.map((e) => ({ valor: e, texto: e }))}
            onCambiar={setEjemplar}
          />
        </div>
        <CampoFormulario
          id="registrar-descripcion"
          etiqueta="Descripción"
          obligatorio
          value={descripcion}
          maxLength={300}
          onChange={(e) => setDescripcion(e.target.value)}
          error={mostrar('descripcion')}
        />
        <ZonaCarga
          compacta
          multiple={false}
          acepta="image/*"
          textoBoton="Adjuntar foto"
          ayuda={foto?.name ?? ''}
          onArchivos={(archivos) => setFoto(archivos[0] ?? null)}
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
          textoCancelar="Registrar igualmente"
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
