import { useState } from 'react'
import { BotonEnlace } from '@/components/ui/Boton'
import CampoFormulario from '@/components/ui/CampoFormulario'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
import Tarjeta from '@/components/ui/Tarjeta'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import AccionesPagina from '@/layouts/LayoutOficina/AccionesPagina'
import { MIGAS_INVENTARIO, RUTAS_INVENTARIO } from '@/router/rutasApp'
import { listarAreasVerdes } from '@/services/api/areasVerdes'
import type { AreaVerde } from '@/types/areasVerdes'
import estilos from './AreasVerdes.module.css'

const COLUMNAS: ColumnaTabla<AreaVerde>[] = [
  { clave: 'nombre', titulo: 'Nombre', multilinea: true, render: (area) => area.nombre },
  { clave: 'lugar', titulo: 'Lugar', multilinea: true, render: (area) => area.lugar },
  { clave: 'superficie', titulo: 'Superficie', alineacion: 'derecha', render: (area) => `${area.superficie_m2} m²` },
  { clave: 'cobertura', titulo: 'Cobertura', render: (area) => area.tipo_cobertura_nombre ?? 'Sin cobertura' },
  { clave: 'ubicacion', titulo: 'Ubicación', multilinea: true, render: (area) => area.ubicacion },
]

export default function AreasVerdesPage() {
  usePaginaActual('Áreas verdes', [MIGAS_INVENTARIO.areasVerdes])
  const [busqueda, setBusqueda] = useState('')
  const consulta = useConsulta(`areas:${busqueda}`, (signal) => listarAreasVerdes(busqueda, signal))

  if (consulta.estado === 'error' && !consulta.datos) {
    return <EstadoError titulo="No pudimos cargar las áreas verdes" descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} />
  }
  if (!consulta.datos) return <EstadoCarga forma="tabla" />

  return (
    <>
      <AccionesPagina>
        <BotonEnlace to={RUTAS_INVENTARIO.mapa}>Ver mapa</BotonEnlace>
        <BotonEnlace to={RUTAS_INVENTARIO.nuevaArea} variante="primario">Registrar área</BotonEnlace>
      </AccionesPagina>
      <Tarjeta titulo="Inventario de áreas verdes" descripcion="Consulta y registra los espacios verdes del campus." relleno="amplio">
        <div className={estilos.busqueda}>
          <CampoFormulario id="busqueda-areas" etiqueta="Buscar por nombre" type="search" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} />
        </div>
        <TablaDatos
          titulo="Áreas verdes"
          columnas={COLUMNAS}
          filas={consulta.datos.results}
          claveFila={(area) => String(area.id)}
          vacio={{ titulo: 'Aún no hay áreas verdes', descripcion: 'Registra un área para iniciar el inventario del campus.' }}
        />
      </Tarjeta>
    </>
  )
}
