// RF-PLA-004 y CU-007 · Ciclos (AV-269, Figma «Ciclos» 346-1032)
import { useState } from 'react'
import { useNavigate } from 'react-router'
import BarraAvance from '@/components/ui/BarraAvance'
import { BotonEnlace } from '@/components/ui/Boton'
import Estado from '@/components/ui/Estado'
import EstadoError from '@/components/ui/EstadoError'
import Pestanas from '@/components/ui/Pestanas'
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
import { puedeEditarPlanificacion } from '@/config/permisosPlanificacion'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import AccionesPagina from '@/layouts/LayoutOficina/AccionesPagina'
import { MIGAS_PLANIFICACION, RUTAS_PLANIFICACION, rutaCiclo } from '@/router/rutasApp'
import { listarProgramaciones } from '@/services/api/planificacion'
import { useRolTercerizados } from '@/sesion/ContextoSesion'
import type { Programacion } from '@/types/planificacion'
import { SIN_VALOR } from '@/utils/formato'
import { hoyLima } from '@/utils/instanteLima'
import { ESTADO_PROGRAMACION, periodoRestriccion } from '../resumen/resumenPlanificacion'
import estilos from './Ciclos.module.css'
import { PESTANAS_CICLOS, avanceCiclo, ciclosDePestana, contadoresCiclos, ordenarCiclos, rangoCiclos, type PestanaCiclos } from './ciclos'

export default function CiclosPage() {
  usePaginaActual('Ciclos', [MIGAS_PLANIFICACION.planificacion, { texto: 'Ciclos' }])
  const navegar = useNavigate()
  const hoy = hoyLima()
  const puedeEditar = puedeEditarPlanificacion(useRolTercerizados())
  const [pestana, setPestana] = useState<PestanaCiclos>('todos')
  const { desde, hasta } = rangoCiclos(hoy)
  const consulta = useConsulta(`ciclos:${desde}`, (signal) => listarProgramaciones(desde, hasta, signal))

  const columnas: ColumnaTabla<Programacion>[] = [
    { clave: 'ciclo', titulo: 'Ciclo', multilinea: true, render: (c) => c.servicio },
    { clave: 'proveedor', titulo: 'Proveedor', multilinea: true, render: (c) => c.proveedor ?? 'Personal propio' },
    { clave: 'fechas', titulo: 'Fechas', render: (c) => periodoRestriccion(c.fecha_inicio_prevista, c.fecha_fin_prevista) },
    {
      clave: 'avance',
      titulo: 'Avance',
      render: (c) => {
        const avance = avanceCiclo(c, hoy)
        if (avance === null) return SIN_VALOR
        return (
          <span className={estilos.avance}>
            <BarraAvance valor={avance} maximo={100} etiqueta={`Avance de ${c.servicio}`} textoValor={`${avance} %`} />
            <span className={estilos.porcentaje} aria-hidden="true">
              {avance} %
            </span>
          </span>
        )
      },
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      render: (c) => {
        const estado = ESTADO_PROGRAMACION[c.estado]
        return <Estado tono={estado.tono} texto={estado.texto} punto />
      },
    },
  ]

  if (consulta.estado === 'error' && !consulta.datos) {
    return <EstadoError titulo="No pudimos cargar los ciclos" descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} />
  }

  const ciclos = ordenarCiclos(consulta.datos ?? [])
  const contadores = contadoresCiclos(ciclos)
  const filas = ciclosDePestana(ciclos, pestana)

  return (
    <>
      {puedeEditar && (
        <AccionesPagina>
          <BotonEnlace to={`${RUTAS_PLANIFICACION.calendario}?programar=`} variante="primario" icono="plus-circle">
            Programar ciclo
          </BotonEnlace>
        </AccionesPagina>
      )}
      <Pestanas
        etiqueta="Estado de los ciclos"
        pestanas={PESTANAS_CICLOS.map((p) => ({ ...p, contador: contadores[p.valor] }))}
        valor={pestana}
        onCambiar={(valor) => setPestana(valor as PestanaCiclos)}
      >
        <TablaDatos
          titulo="Ciclos"
          columnas={columnas}
          filas={filas}
          claveFila={(c) => String(c.id)}
          onFilaClick={(c) => void navegar(rutaCiclo(c.id))}
          estado={!consulta.datos ? 'cargando' : 'exito'}
          vacio={{ titulo: 'Sin ciclos en esta pestaña', descripcion: 'Los ciclos que se programen aparecerán aquí.' }}
        />
      </Pestanas>
    </>
  )
}
