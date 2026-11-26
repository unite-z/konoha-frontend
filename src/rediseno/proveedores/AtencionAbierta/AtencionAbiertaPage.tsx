/**
 * Atención abierta (RD-53): la ficha de una atención con sus acciones de estado. Fondo liso, sin mapa. El encabezado
 * lleva el nombre de transición de su fila en la bandeja (RD-51) y la línea de estados avanza con una transición corta
 * cuando el servidor confirma un cambio. La ficha es la de `pages/servicios-tercerizados/Ficha` (RD-91). Los informes
 * del proveedor (adjuntar, subsanar, revisiones) van en `Informes` (RD-54).
 */
import { useCallback, useState } from 'react'
import { useLocation, useParams, useSearchParams } from 'react-router'
import AvisoTemporal from '@/design-system/AvisoTemporal'
import { BotonEnlace } from '@/design-system/Boton'
import EstadoCarga from '@/design-system/EstadoCarga'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import Ficha from '@/pages/servicios-tercerizados/Ficha'
import { EnlaceTransicion, estiloTransicion, transicionar, useFocoConLaVista } from '@/rediseno/base/movimiento'
import { obtenerAtencion } from '@/services/api/tercerizados'
import { usePermisos } from '@/sesion/ContextoSesion'
import type { Atencion } from '@/types/tercerizados'
import { codigoCorto } from '@/utils/estadosTercerizados'
import { PARAM_EVIDENCIA, rutaAtenciones } from '../enlaces'
import { puedeConsultarAtenciones } from '../Atenciones/permisos'
import { nombreFilaAtencion } from '../Atenciones/nombres'
import type { EstadoNavegacionBandeja } from '../Atenciones/FilaAtencion'
import Acciones from './Acciones'
import EvidenciaKonoha from './EvidenciaKonoha'
import Informes from './Informes'
import estilos from './AtencionAbierta.module.css'

/** La versión más reciente entre la consultada y la recibida de una operación (misma atención). */
function masReciente(consultada: Atencion | null, local: Atencion | null): Atencion | null {
  if (!local || !consultada || local.id !== consultada.id) return consultada
  return Date.parse(local.fecha_modificacion) >= Date.parse(consultada.fecha_modificacion) ? local : consultada
}

/** Ruta de vuelta que dejó la fila (con sus filtros); sin ella, la bandeja sin filtros. */
function rutaVolver(estado: unknown): string {
  const volverA = (estado as Partial<EstadoNavegacionBandeja> | null)?.volverA
  return typeof volverA === 'string' && volverA.startsWith('/') ? volverA : rutaAtenciones()
}

export default function AtencionAbiertaPage() {
  const { id: parametro } = useParams()
  const { state } = useLocation()
  const [consultaUrl] = useSearchParams()
  const id = parametro && /^\d{1,9}$/.test(parametro) ? Number(parametro) : null
  const permisos = usePermisos()
  const puede = puedeConsultarAtenciones(permisos)
  const encabezado = useFocoConLaVista<HTMLHeadingElement>()

  const consulta = useConsulta(id === null || !puede ? null : `atencion|${id}`, (signal) =>
    obtenerAtencion(id as number, signal),
  )
  // Última versión recibida de una operación; se usa si es tan reciente como la consultada.
  const [local, setLocal] = useState<Atencion | null>(null)
  const atencion = masReciente(consulta.datos, local)
  const [aviso, setAviso] = useState<string | null>(() => (state as { aviso?: string } | null)?.aviso ?? null)
  // Sube al registrarse una revisión del informe: recarga la lista de revisiones y la sección de documentos.
  const [versionInformes, setVersionInformes] = useState(0)
  const alAdjuntarInforme = useCallback(() => setVersionInformes((v) => v + 1), [])
  const cerrarAviso = useCallback(() => setAviso(null), [setAviso])
  const alActualizar = useCallback((nueva: Atencion) => transicionar(() => setLocal(nueva)), [])

  const titulo = atencion ? `Atención ${codigoCorto(atencion.codigo)}` : 'Atención'
  usePaginaActual(titulo, [{ texto: 'Proveedores' }, { texto: 'Atenciones' }, { texto: titulo }])

  let contenido
  if (!puede) {
    contenido = (
      <EstadoSinAcceso
        titulo="No puedes ver esta atención"
        descripcion="Tu cuenta no tiene permiso para consultar atenciones de proveedores."
      />
    )
  } else if (id === null || (consulta.estado === 'error' && consulta.error?.estado === 404)) {
    contenido = (
      <EstadoVacio
        titulo="No existe esta atención"
        descripcion="Revisa el enlace o búscala en la bandeja."
        accion={
          <BotonEnlace to={rutaAtenciones()} variante="secundario">
            Ir a la bandeja
          </BotonEnlace>
        }
      />
    )
  } else if (consulta.estado === 'error' && consulta.error?.estado === 403) {
    contenido = (
      <EstadoSinAcceso
        titulo="No puedes ver esta atención"
        descripcion="El servidor no te permite consultarla. Si cambiaron tus roles, vuelve a ingresar."
      />
    )
  } else if (consulta.estado === 'error') {
    contenido = (
      <EstadoError
        titulo="No pudimos cargar la atención"
        descripcion={consulta.error?.detalle ?? ''}
        onReintentar={consulta.reintentar}
      />
    )
  } else if (!atencion) {
    contenido = consulta.cargaVisible ? <EstadoCarga forma="pagina" /> : null
  } else {
    contenido = (
      <div className={estilos.cuerpo}>
        <Ficha
          atencion={atencion}
          versionDocumentos={versionInformes}
          enfocarTitulo={false}
          acciones={
            <>
              <Informes
                atencion={atencion}
                permisos={permisos}
                version={versionInformes}
                onActualizada={alActualizar}
                onReporteAdjunto={alAdjuntarInforme}
                onExito={setAviso}
              />
              <EvidenciaKonoha
                objetivo={{ tipo: 'atencion', id: atencion.id }}
                abiertoInicial={consultaUrl.get(PARAM_EVIDENCIA) === '1'}
              />
              <Acciones atencion={atencion} permisos={permisos} onActualizada={alActualizar} onExito={setAviso} />
            </>
          }
        />
      </div>
    )
  }

  return (
    <div className={estilos.pagina}>
      <header
        className={estilos.encabezado}
        style={id === null ? undefined : estiloTransicion(nombreFilaAtencion(id))} /* estilo-calculado */
      >
        <div>
          <h1 ref={encabezado} tabIndex={-1} className={estilos.titulo}>
            {titulo}
          </h1>
          <EnlaceTransicion to={rutaVolver(state)} className={estilos.subtitulo}>
            Volver a la bandeja
          </EnlaceTransicion>
        </div>
      </header>
      {contenido}
      <AvisoTemporal mensaje={aviso} onCerrar={cerrarAviso} />
    </div>
  )
}
