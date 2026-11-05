import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton from '@/components/ui/Boton'
import DialogoConfirmacion from '@/components/ui/DialogoConfirmacion'
import Estado from '@/components/ui/Estado'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import EstadoSinAcceso from '@/components/ui/EstadoSinAcceso'
import ListaDescripcion from '@/components/ui/ListaDescripcion'
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
import Tarjeta from '@/components/ui/Tarjeta'
import { PERMISOS, puede } from '@/config/permisosCore'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_INVENTARIO, RUTAS_INVENTARIO, rutaEditarCampanaPoda, rutaRegistrarPoda, rutaRendimientoCampana } from '@/router/rutasApp'
import { finalizarCampana, iniciarCampana, listarEjemplaresCampana, obtenerCampana, planificarCampana, retirarCampana } from '@/services/api/campanasPoda'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import type { CampanaPoda, EjemplarCampana } from '@/types/campanasPoda'
import { TEXTO_ESTADO_CAMPANA } from '@/utils/capacidadCampana'
import { formatearFecha } from '@/utils/formato'
import estilos from './CampanasPoda.module.css'

const POR_PAGINA = 25

const TONO_PODA = { Pendiente: 'neutro', Incompleta: 'aviso', Verificada: 'exito' } as const

const COLUMNAS: ColumnaTabla<EjemplarCampana>[] = [
  { clave: 'codigo', titulo: 'Código' },
  { clave: 'referencia_catastro', titulo: 'Referencia de catastro', render: (ejemplar) => ejemplar.referencia_catastro ?? '—' },
  { clave: 'especie_nombre_comun', titulo: 'Especie', render: (ejemplar) => ejemplar.especie_nombre_comun ?? 'Sin especie asignada' },
  { clave: 'ubicacion', titulo: 'Ubicación', render: (ejemplar) => ejemplar.ubicacion ?? 'Sin ubicación' },
  { clave: 'estado_intervencion', titulo: 'Poda', render: (ejemplar) => <Estado tono={TONO_PODA[ejemplar.estado_intervencion]} texto={ejemplar.estado_intervencion} /> },
]

const ACCIONES: Partial<Record<CampanaPoda['estado'], { texto: string; ejecutar: (id: number) => Promise<CampanaPoda>; aviso: string }>> = {
  Borrador: { texto: 'Planificar campaña', ejecutar: planificarCampana, aviso: 'Campaña planificada.' },
  Planificada: { texto: 'Autorizar ejecución', ejecutar: iniciarCampana, aviso: 'Ejecución autorizada.' },
  EnEjecucion: { texto: 'Finalizar campaña', ejecutar: finalizarCampana, aviso: 'Campaña finalizada.' },
}

export default function CampanaPodaDetallePage() {
  const id = Number(useParams().id)
  const navegar = useNavigate()
  const sesion = useSesionActiva()
  const puedePlanificar = puede(sesion, PERMISOS.planificarPoda)
  const puedeRegistrar = puede(sesion, PERMISOS.registrarPoda)
  const [pagina, setPagina] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [confirmarRetiro, setConfirmarRetiro] = useState(false)
  const consulta = useConsulta(`campana-poda|${id}`, (signal) => obtenerCampana(id, signal))
  const ejemplares = useConsulta(`campana-poda-ejemplares|${id}|${pagina}`, (signal) => listarEjemplaresCampana(id, { page: pagina }, signal))
  const campana = consulta.datos
  usePaginaActual(campana ? `Campaña · ${campana.nombre}` : 'Campaña', [MIGAS_INVENTARIO.areasVerdes, MIGAS_INVENTARIO.campanasPoda, { texto: campana?.nombre ?? 'Campaña' }])

  async function ejecutar(accion: () => Promise<unknown>, mensaje: string) {
    setError(null)
    setAviso(null)
    setGuardando(true)
    try {
      await accion()
      setAviso(mensaje)
      consulta.reintentar()
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo guardar el cambio.')
    } finally {
      setGuardando(false)
    }
  }

  async function retirar() {
    setError(null)
    setGuardando(true)
    try {
      await retirarCampana(id)
      navegar(RUTAS_INVENTARIO.campanasPoda)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo retirar la campaña.')
      setConfirmarRetiro(false)
      setGuardando(false)
    }
  }

  if (consulta.error?.estado === 403) return <EstadoSinAcceso descripcion={consulta.error.detalle} />
  if (consulta.estado === 'error' && !campana) {
    return <EstadoError titulo="No pudimos cargar la campaña" descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} />
  }
  if (!campana) return <EstadoCarga forma="tabla" texto="Cargando campaña…" retrasar />

  const accion = ACCIONES[campana.estado]
  const editable = campana.estado === 'Borrador' || campana.estado === 'Planificada'

  return (
    <div className={estilos.pagina}>
      {error && <AvisoEnLinea tono="error">{error}</AvisoEnLinea>}
      {aviso && <AvisoEnLinea tono="exito">{aviso}</AvisoEnLinea>}
      {campana.capacidad.excedida && (
        <AvisoEnLinea tono="advertencia" titulo="Revisar capacidad">
          {campana.total_ejemplares} ejemplares en {campana.capacidad.dias} días requieren {campana.capacidad.requerido_por_dia} al día; el objetivo es {campana.objetivo_diario}. Prioriza ejemplares o ajusta el periodo.
        </AvisoEnLinea>
      )}

      <Tarjeta titulo="Planificación" junto={<Estado tono={campana.estado === 'Borrador' ? 'neutro' : 'info'} texto={TEXTO_ESTADO_CAMPANA[campana.estado]} />} relleno="amplio">
        <ListaDescripcion elementos={[
          { etiqueta: 'Periodo', valor: `${formatearFecha(campana.fecha_inicio)} – ${formatearFecha(campana.fecha_fin)}` },
          { etiqueta: 'Clase', valor: campana.clase },
          campana.motivo_extraordinaria ? { etiqueta: 'Motivo extraordinario', valor: campana.motivo_extraordinaria, ancho: true } : null,
          { etiqueta: 'Objetivo', valor: `${campana.total_ejemplares} ejemplares` },
          { etiqueta: 'Objetivo diario', valor: `${campana.objetivo_diario} ejemplares por día` },
          { etiqueta: 'Capacidad estimada', valor: `${campana.capacidad.estimada} ejemplares en ${campana.capacidad.dias} días` },
          { etiqueta: 'Intervenidos verificables', valor: campana.avance.verificables },
          { etiqueta: 'Incompletos', valor: campana.avance.incompletos },
          { etiqueta: 'Avance', valor: `${campana.avance.porcentaje} %` },
        ]} />
      </Tarjeta>

      {(campana.estado === 'EnEjecucion' || campana.estado === 'Finalizada') && (
        <div className={estilos.acciones}>
          {puedeRegistrar && campana.estado === 'EnEjecucion' && <Boton variante="primario" onClick={() => navegar(rutaRegistrarPoda(id))}>Registrar intervención</Boton>}
          <Boton variante="secundario" onClick={() => navegar(rutaRendimientoCampana(id))}>Ver rendimiento</Boton>
        </div>
      )}

      {puedePlanificar && (accion || editable) && (
        <div className={estilos.acciones}>
          {accion && <Boton variante="primario" cargando={guardando} onClick={() => void ejecutar(() => accion.ejecutar(id), accion.aviso)}>{accion.texto}</Boton>}
          {editable && <Boton variante="secundario" deshabilitado={guardando} onClick={() => navegar(rutaEditarCampanaPoda(id))}>Editar</Boton>}
          {editable && <Boton variante="fantasma" deshabilitado={guardando} onClick={() => setConfirmarRetiro(true)}>Retirar campaña</Boton>}
        </div>
      )}

      <TablaDatos
        titulo="Ejemplares de la campaña"
        tituloVisible
        columnas={COLUMNAS}
        filas={ejemplares.datos?.results ?? []}
        claveFila={(ejemplar) => String(ejemplar.id)}
        estado={ejemplares.estado === 'error' ? 'error' : !ejemplares.datos ? 'cargando' : ejemplares.datos.results.length === 0 ? 'vacio' : 'exito'}
        vacio={{ titulo: 'Sin ejemplares', descripcion: 'Esta campaña aún no tiene ejemplares seleccionados.' }}
        error={{ titulo: 'No pudimos cargar los ejemplares', descripcion: ejemplares.error?.detalle ?? '', onReintentar: ejemplares.reintentar }}
        paginacionServidor={{ pagina, total: ejemplares.datos?.count ?? 0, porPagina: POR_PAGINA, onCambiarPagina: setPagina }}
      />

      <DialogoConfirmacion
        abierto={confirmarRetiro}
        titulo="Retirar campaña"
        consecuencia="La campaña dejará de aparecer y su año quedará libre para planificar otra."
        textoConfirmar="Retirar"
        variante="destructivo"
        cargando={guardando}
        onConfirmar={() => void retirar()}
        onCancelar={() => setConfirmarRetiro(false)}
      />
    </div>
  )
}
