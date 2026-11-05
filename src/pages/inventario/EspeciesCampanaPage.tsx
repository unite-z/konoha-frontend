import { useNavigate, useParams } from 'react-router'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton from '@/components/ui/Boton'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoSinAcceso from '@/components/ui/EstadoSinAcceso'
import EstadoVacio from '@/components/ui/EstadoVacio'
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
import Tarjeta from '@/components/ui/Tarjeta'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_INVENTARIO, rutaCampanaPoda } from '@/router/rutasApp'
import { consultarEspecies, obtenerCampana } from '@/services/api/campanasPoda'
import type { EspecieCampana } from '@/types/campanasPoda'
import { formatearFecha } from '@/utils/formato'
import estilos from './CampanasPoda.module.css'

const COLUMNAS: ColumnaTabla<EspecieCampana>[] = [
  { clave: 'nombre_comun', titulo: 'Especie', render: (especie) => especie.nombre_comun ?? especie.nombre_cientifico ?? 'Sin especie asignada' },
  { clave: 'atendidos', titulo: 'Atendidos', alineacion: 'derecha' },
  { clave: 'planificados', titulo: 'Planificados', alineacion: 'derecha' },
  { clave: 'incompletos', titulo: 'Sin fotografía', alineacion: 'derecha' },
]

export default function EspeciesCampanaPage() {
  const id = Number(useParams().id)
  const navegar = useNavigate()
  usePaginaActual('Especies atendidas en la campaña', [MIGAS_INVENTARIO.areasVerdes, MIGAS_INVENTARIO.campanasPoda, { texto: 'Especies atendidas' }])
  const campana = useConsulta(`campana-poda|${id}`, (signal) => obtenerCampana(id, signal))
  const consulta = useConsulta(`especies-campana|${id}`, (signal) => consultarEspecies(id, signal))

  if (consulta.error?.estado === 403) return <EstadoSinAcceso descripcion={consulta.error.detalle} />
  if (consulta.estado === 'error' && !consulta.datos) {
    return <EstadoError titulo="No pudimos cargar las especies" descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} />
  }
  const resumen = consulta.datos
  if (!resumen) return <EstadoCarga forma="tabla" texto="Cargando las especies…" retrasar />

  const datosCampana = campana.datos
  return (
    <div className={estilos.pagina}>
      <p className={estilos.descripcion}>Cada ejemplar cuenta una vez. Solo son atendidos los que tienen una poda con fotografía y sin anular; lo planificado sin ejecución no suma.</p>

      <Tarjeta titulo={datosCampana ? `Campaña · ${datosCampana.nombre}` : 'Campaña'} relleno="amplio">
        <p className={estilos.descripcion}>
          Planificados: {resumen.planificados} · Atendidos: {resumen.atendidos} · Sin fotografía: {resumen.incompletos}
          {datosCampana && ` · ${formatearFecha(datosCampana.fecha_inicio)} – ${formatearFecha(datosCampana.fecha_fin)}`}
        </p>
      </Tarjeta>

      {resumen.especies.length === 0 ? (
        <EstadoVacio titulo="Sin ejemplares" descripcion="Esta campaña no tiene ejemplares seleccionados." />
      ) : (
        <>
          {resumen.atendidos === 0 && (
            <AvisoEnLinea tono="info" titulo="Sin atenciones verificadas">
              Las cifras siguientes son solo la planificación; aún no hay podas con fotografía.
            </AvisoEnLinea>
          )}
          <TablaDatos
            titulo="Atendidos por especie"
            tituloVisible
            columnas={COLUMNAS}
            filas={resumen.especies}
            claveFila={(especie) => String(especie.especie_id ?? 'sin-especie')}
            estado="exito"
          />
        </>
      )}

      <div className={estilos.acciones}>
        <Boton variante="secundario" onClick={() => navegar(rutaCampanaPoda(id))}>Volver a la campaña</Boton>
      </div>
    </div>
  )
}
