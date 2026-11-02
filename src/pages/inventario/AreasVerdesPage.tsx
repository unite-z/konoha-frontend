import { useState } from 'react'
import { BotonEnlace } from '../../components/ui/Boton'
import EstadoCarga from '../../components/ui/EstadoCarga'
import EstadoError from '../../components/ui/EstadoError'
import EstadoVacio from '../../components/ui/EstadoVacio'
import { useConsulta } from '../../hooks/useConsulta'
import { usePaginaActual } from '../../hooks/usePaginaActual'
import { MIGAS_INVENTARIO, RUTAS_INVENTARIO } from '../../router/rutasApp'
import { listarAreasVerdes } from '../../services/api/areasVerdes'
import estilos from './AreasVerdes.module.css'

export default function AreasVerdesPage() {
  usePaginaActual('Áreas verdes', [MIGAS_INVENTARIO.areasVerdes])
  const [busqueda, setBusqueda] = useState('')
  const consulta = useConsulta(`areas:${busqueda}`, (signal) => listarAreasVerdes(busqueda, signal))

  if (consulta.estado === 'error' && !consulta.datos) {
    return <EstadoError titulo="No pudimos cargar las áreas verdes" descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} />
  }
  if (!consulta.datos) return <EstadoCarga forma="tabla" />

  return (
    <div className={estilos.pagina}>
      <header className={estilos.cabecera}>
        <div><h2>Inventario de áreas verdes</h2><p>Consulta y registra los espacios verdes del campus.</p></div>
        <BotonEnlace to={RUTAS_INVENTARIO.nuevaArea} variante="primario">Registrar área</BotonEnlace>
      </header>
      <label className={estilos.busqueda}>
        Buscar por nombre
        <input type="search" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} />
      </label>
      {consulta.datos.results.length === 0 ? (
        <EstadoVacio titulo="Aún no hay áreas verdes" descripcion="Registra un área para iniciar el inventario del campus." />
      ) : (
        <ul className={estilos.lista}>
          {consulta.datos.results.map((area) => (
            <li key={area.id}>
              <strong>{area.nombre}</strong>
              <span>{area.lugar} · {area.superficie_m2} m²</span>
              <span>{area.tipo_cobertura_nombre ?? 'Sin cobertura'}</span>
              <span>{area.ubicacion}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
