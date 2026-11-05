import { useState } from 'react'
import { useNavigate } from 'react-router'
import Boton from '@/components/ui/Boton'
import Estado from '@/components/ui/Estado'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoSinAcceso from '@/components/ui/EstadoSinAcceso'
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
import { PERMISOS, puede } from '@/config/permisosCore'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import AccionesPagina from '@/layouts/LayoutOficina/AccionesPagina'
import { MIGAS_INVENTARIO, RUTAS_INVENTARIO, rutaCampanaPoda } from '@/router/rutasApp'
import { listarCampanas } from '@/services/api/campanasPoda'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import type { CampanaPoda } from '@/types/campanasPoda'
import { TEXTO_ESTADO_CAMPANA } from '@/utils/capacidadCampana'
import { formatearFecha } from '@/utils/formato'
import estilos from './CampanasPoda.module.css'

const POR_PAGINA = 25

const COLUMNAS: ColumnaTabla<CampanaPoda>[] = [
  { clave: 'nombre', titulo: 'Campaña', render: (campana) => (campana.clase === 'Extraordinaria' ? `${campana.nombre} · Extraordinaria` : campana.nombre) },
  { clave: 'periodo', titulo: 'Periodo', render: (campana) => `${formatearFecha(campana.fecha_inicio)} – ${formatearFecha(campana.fecha_fin)}` },
  { clave: 'total_ejemplares', titulo: 'Ejemplares', alineacion: 'derecha' },
  { clave: 'estado', titulo: 'Estado', render: (campana) => <Estado tono={campana.estado === 'Borrador' ? 'neutro' : 'info'} texto={TEXTO_ESTADO_CAMPANA[campana.estado]} /> },
]

export default function CampanasPodaPage() {
  usePaginaActual('Campañas de poda', [MIGAS_INVENTARIO.areasVerdes, { texto: 'Campañas de poda' }])
  const navegar = useNavigate()
  const sesion = useSesionActiva()
  const [pagina, setPagina] = useState(1)
  const consulta = useConsulta(`campanas-poda|${pagina}`, (signal) => listarCampanas({ page: pagina }, signal))

  if (consulta.error?.estado === 403) return <EstadoSinAcceso descripcion={consulta.error.detalle} />
  if (consulta.estado === 'error' && !consulta.datos) {
    return <EstadoError titulo="No pudimos cargar las campañas" descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} />
  }
  if (!consulta.datos) return <EstadoCarga forma="tabla" texto="Cargando campañas…" retrasar />

  return (
    <div className={estilos.pagina}>
      {puede(sesion, PERMISOS.planificarPoda) && (
        <AccionesPagina>
          <Boton variante="primario" onClick={() => navegar(RUTAS_INVENTARIO.nuevaCampanaPoda)}>Planificar campaña</Boton>
        </AccionesPagina>
      )}
      <p className={estilos.descripcion}>Campaña anual de poda mayor durante el cierre del campus, con su periodo y su lista de ejemplares.</p>
      <TablaDatos
        titulo="Campañas de poda"
        columnas={COLUMNAS}
        filas={consulta.datos.results}
        claveFila={(campana) => String(campana.id)}
        estado={consulta.datos.results.length === 0 ? 'vacio' : 'exito'}
        vacio={{ titulo: 'Aún no hay campañas', descripcion: 'Las campañas planificadas aparecerán aquí.' }}
        onFilaClick={(campana) => navegar(rutaCampanaPoda(campana.id))}
        paginacionServidor={{ pagina, total: consulta.datos.count, porPagina: POR_PAGINA, onCambiarPagina: setPagina }}
      />
    </div>
  )
}
