// RF-T-010 · Consulta de información centralizada (HU-MOD01-012)
/**
 * Jardines, especies, sectores y servicios en un solo lugar, sin consolidar Drives a mano. Cada tipo se
 * lee del módulo dueño; si aún no está disponible, se dice así en lugar de mostrar datos inventados.
 */
import { useState, type FormEvent } from 'react'
import Badge from '../../components/ui/Badge'
import Boton from '../../components/ui/Boton'
import CampoFormulario from '../../components/ui/CampoFormulario'
import EstadoVacio from '../../components/ui/EstadoVacio'
import Pestanas from '../../components/ui/Pestanas'
import TablaDatos, { type ColumnaTabla } from '../../components/ui/TablaDatos'
import { useConsulta } from '../../hooks/useConsulta'
import { useFiltrosUrl } from '../../hooks/useFiltrosUrl'
import { usePaginaActual } from '../../hooks/usePaginaActual'
import { MIGAS_CORE } from '../../router/rutasApp'
import { buscarEnRepositorio } from '../../services/api/core'
import type { ElementoRepositorio, TipoRepositorio } from '../../types/core'
import { formatearNumero } from '../../utils/formato'
import estilos from '../usuarios-roles/UsuariosRoles.module.css'

const TITULO = 'Repositorio'

const TIPOS: { valor: TipoRepositorio; texto: string }[] = [
  { valor: 'jardin', texto: 'Jardines' },
  { valor: 'especie', texto: 'Especies' },
  { valor: 'sector', texto: 'Sectores' },
  { valor: 'servicio', texto: 'Servicios' },
]

const COLUMNAS: ColumnaTabla<ElementoRepositorio>[] = [
  { clave: 'nombre', titulo: 'Nombre', multilinea: true },
  { clave: 'detalle', titulo: 'Detalle', multilinea: true, render: (e) => e.detalle ?? '—' },
  { clave: 'modulo', titulo: 'Origen', render: (e) => <Badge tono="neutral" texto={e.modulo} /> },
]

export default function RepositorioPage() {
  usePaginaActual(TITULO, [MIGAS_CORE.repositorio])
  const { filtros, establecer } = useFiltrosUrl({ tipo: 'jardin', q: '', page: '1' })
  const tipo = (TIPOS.some((t) => t.valor === filtros.tipo) ? filtros.tipo : 'jardin') as TipoRepositorio
  const pagina = Math.max(1, Number(filtros.page) || 1)
  const [texto, setTexto] = useState(filtros.q)

  const consulta = useConsulta(
    JSON.stringify([tipo, filtros.q, pagina]),
    (signal) => buscarEnRepositorio(tipo, filtros.q, pagina, signal),
    (datos) => datos.results.length === 0,
  )
  const noDisponible = consulta.datos?.disponible === false
  const estadoTabla =
    consulta.estado === 'cargando' ? (consulta.cargaVisible || !consulta.datos ? 'cargando' : 'exito') : consulta.estado

  function buscar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    establecer({ q: texto.trim() || null, page: null })
  }

  return (
    <div className={estilos.pagina}>
      <p className={estilos.descripcion}>Información de la sección en un único lugar, leída de cada módulo responsable.</p>
      <Pestanas
        etiqueta="Tipo de información"
        pestanas={TIPOS}
        valor={tipo}
        onCambiar={(valor) => {
          setTexto('')
          establecer({ tipo: valor, q: null, page: null })
        }}
      >
        <form className={estilos.barraFiltros} role="search" onSubmit={buscar}>
          <CampoFormulario
            id="repositorio-q"
            etiqueta="Buscar por nombre"
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <Boton type="submit" variante="secundario">
            Buscar
          </Boton>
        </form>
        {noDisponible ? (
          <EstadoVacio
            titulo="Próximamente"
            descripcion="El módulo responsable de esta información aún no la ha publicado en el sistema."
          />
        ) : (
          <>
            <p className={`${estilos.resumenResultados} cifra`} aria-live="polite">
              {consulta.estado === 'exito' || consulta.estado === 'vacio'
                ? `${formatearNumero(consulta.datos?.count ?? 0)} resultados`
                : ''}
            </p>
            <TablaDatos
              titulo={TIPOS.find((t) => t.valor === tipo)?.texto ?? TITULO}
              columnas={COLUMNAS}
              filas={consulta.datos?.results ?? []}
              claveFila={(e) => `${e.modulo}-${e.id}`}
              estado={estadoTabla === 'inactivo' ? 'cargando' : estadoTabla}
              paginacionServidor={{
                pagina,
                total: consulta.datos?.count ?? 0,
                porPagina: 25,
                onCambiarPagina: (nueva) => establecer({ page: nueva > 1 ? String(nueva) : null }),
              }}
              vacio={{ titulo: filtros.q ? 'Sin resultados para esta búsqueda' : 'Aún no hay registros' }}
              error={{ titulo: 'No pudimos cargar el repositorio', descripcion: consulta.error?.detalle ?? '', onReintentar: consulta.reintentar }}
            />
          </>
        )}
      </Pestanas>
    </div>
  )
}
