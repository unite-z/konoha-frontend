/**
 * Subir informe y extraer con IA (RD-56, P-14): se asocia cada informe a su atención («coincide» o «por revisar»), se
 * sube con el diálogo de RD-54, Konoha extrae sus datos y la persona los revisa con `RevisionIa`. «Registrar en
 * bloque» valida una a una las propuestas completas. Debajo, el historial de extracciones por estado. Entrada:
 * `/proveedores/informes/subir?atencion_id=<id>`. Pide `REP.INDICADOR.CONSULTAR` (el de los asistentes). Fondo liso,
 * sin mapa.
 *
 * Movimiento: cada informe entra en la lista con un fundido y su fila crece hasta ser el panel de revisión; las
 * fichas entran en cascada corta. Con «reducir movimiento», cambio directo.
 */
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import Boton from '@/design-system/Boton'
import DialogoConfirmacion from '@/design-system/DialogoConfirmacion'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import { PERMISO_CONSULTA_REPORTES, PERMISO_VALIDAR_IA } from '@/config/permisos'
import { tiene } from '@/config/permisosSesion'
import HistorialKonoha from '@/rediseno/base/RevisionIa/HistorialKonoha'
import { estiloTransicion, nombresTransicion, useFocoConLaVista } from '@/rediseno/base/movimiento'
import { usePermisos } from '@/sesion/ContextoSesion'
import { PARAM_ATENCION } from '../enlaces'
import AnadirInforme from './AnadirInforme'
import { crearAdaptadorHistorial } from './adaptadorHistorial'
import FilaInforme from './FilaInforme'
import { leerAtencionId, nuevoInforme, type InformeEnCola } from './informes'
import RevisionExtraccion from './RevisionExtraccion'
import { registrarEnBloque, type ResultadoRegistro } from './registroEnBloque'
import estilos from './SubirInforme.module.css'

const adaptadorHistorial = crearAdaptadorHistorial((entrada) => <RevisionExtraccion id={entrada.id} />)

export default function SubirInformePage() {
  const permisos = usePermisos()
  if (!tiene(permisos, PERMISO_CONSULTA_REPORTES)) {
    return (
      <div className={estilos.pagina}>
        <EstadoSinAcceso
          titulo="No puedes subir informes"
          descripcion="Tu cuenta no tiene permiso para consultar los asistentes de IA."
        />
      </div>
    )
  }
  return <Contenido permisos={permisos} />
}

function Contenido({ permisos }: { permisos: readonly string[] | null }) {
  const encabezado = useFocoConLaVista<HTMLHeadingElement>()
  const [consulta] = useSearchParams()
  const atencionUrl = leerAtencionId(consulta.get(PARAM_ATENCION))
  const [informes, setInformes] = useState<InformeEnCola[]>(() => (atencionUrl ? [nuevoInforme(atencionUrl)] : []))
  const [vista, setVista] = useState(atencionUrl)
  const [abierta, setAbierta] = useState<string | null>(null)
  const [resultados, setResultados] = useState<Record<string, ResultadoRegistro>>({})
  const [confirmando, setConfirmando] = useState(false)
  const [registrando, setRegistrando] = useState(false)
  const puedeValidar = tiene(permisos, PERMISO_VALIDAR_IA)

  // Otra `?atencion_id=` con la vista abierta añade esa atención (patrón de ajuste durante el render).
  if (atencionUrl !== vista) {
    setVista(atencionUrl)
    if (atencionUrl !== null && !informes.some((i) => i.atencionId === atencionUrl)) {
      setInformes([...informes, nuevoInforme(atencionUrl)])
    }
  }

  const enLista = useMemo(() => new Set(informes.map((i) => i.atencionId)), [informes])
  const conPropuesta = informes.filter((i) => i.extraccionId !== null)

  const anadir = (atencionId: number) => {
    if (enLista.has(atencionId)) return
    setInformes((previos) => [...previos, nuevoInforme(atencionId)])
  }
  const quitar = (clave: string) => {
    setInformes((previos) => previos.filter((i) => i.clave !== clave))
    setAbierta((actual) => (actual === clave ? null : actual))
  }
  const asignar = (clave: string, extraccionId: number) =>
    setInformes((previos) => previos.map((i) => (i.clave === clave ? { ...i, extraccionId } : i)))
  const alternar = (clave: string, abrir: boolean) => setAbierta(abrir ? clave : null)

  const registrar = async () => {
    setRegistrando(true)
    try {
      const ids = conPropuesta.flatMap((i) => (i.extraccionId === null ? [] : [i.extraccionId]))
      const hechos = await registrarEnBloque(ids)
      const porClave: Record<string, ResultadoRegistro> = {}
      for (const i of conPropuesta) {
        const r = i.extraccionId === null ? undefined : hechos.get(i.extraccionId)
        if (r) porClave[i.clave] = r
      }
      setResultados(porClave)
      // Las revisiones abiertas vuelven a leer la propuesta ya decidida.
      setInformes((previos) =>
        previos.map((i) => (porClave[i.clave]?.estado === 'registrado' ? { ...i, version: i.version + 1 } : i)),
      )
    } finally {
      setRegistrando(false)
      setConfirmando(false)
    }
  }

  const resumen = Object.values(resultados)
  const registradas = resumen.filter((r) => r.estado === 'registrado').length

  return (
    <div className={estilos.pagina}>
      <header
        className={estilos.encabezado}
        style={estiloTransicion(nombresTransicion.encabezado)} /* estilo-calculado */
      >
        <div>
          <h1 ref={encabezado} tabIndex={-1} className={estilos.titulo}>
            Subir informe
          </h1>
          <p className={estilos.subtitulo}>
            Sube el informe del proveedor, deja que Konoha extraiga sus datos y revísalos antes de registrarlos.
          </p>
        </div>
      </header>

      <section className={estilos.seccion} aria-labelledby="subir-informe-lista">
        <div className={estilos.cabeceraSeccion}>
          <h2 id="subir-informe-lista" className={estilos.tituloSeccion}>
            Informes a procesar
          </h2>
          {puedeValidar && conPropuesta.length > 0 && (
            <Boton variante="primario" cargando={registrando} onClick={() => setConfirmando(true)}>
              Registrar en bloque
            </Boton>
          )}
        </div>
        {resumen.length > 0 && (
          <AvisoEnLinea
            tono={registradas === resumen.length ? 'exito' : 'info'}
            titulo="Resultado del registro en bloque"
          >
            {registradas} de {resumen.length} propuestas registradas. El detalle de cada informe está en su fila.
          </AvisoEnLinea>
        )}
        {informes.length === 0 ? (
          <EstadoVacio
            nivel={3}
            titulo="Aún no hay informes en la lista"
            descripcion="Añade una atención que espere su informe para subirlo y extraer sus datos."
          />
        ) : (
          <ul className={estilos.lista} aria-label="Informes a procesar">
            {informes.map((informe) => (
              <FilaInforme
                key={informe.clave}
                informe={informe}
                permisos={permisos}
                abierto={abierta === informe.clave}
                onAlternar={alternar}
                onExtraccion={asignar}
                onQuitar={quitar}
                resultado={resultados[informe.clave]}
              />
            ))}
          </ul>
        )}
      </section>

      <AnadirInforme enLista={enLista} onAnadir={anadir} />

      <section className={estilos.seccion} aria-labelledby="subir-informe-historial">
        <h2 id="subir-informe-historial" className={estilos.tituloSeccion}>
          Historial de extracciones
        </h2>
        <HistorialKonoha adaptador={adaptadorHistorial} />
      </section>

      <DialogoConfirmacion
        abierto={confirmando}
        titulo="Registrar en bloque"
        consecuencia="Se validarán una a una las propuestas completas, aceptando todos sus datos. Las incompletas se quedan para revisarlas."
        textoConfirmar="Registrar en bloque"
        cargando={registrando}
        onConfirmar={() => void registrar()}
        onCancelar={() => setConfirmando(false)}
      />
    </div>
  )
}
