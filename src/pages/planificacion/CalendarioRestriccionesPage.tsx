/**
 * HU-MOD03-003: calendario de restricciones por mes (lista ordenada por fecha).
 * Todos los roles consultan. El efecto se distingue con texto e icono, no solo con color.
 */
import { useState } from 'react'
import Badge from '../../components/ui/Badge'
import Boton from '../../components/ui/Boton'
import EstadoCarga from '../../components/ui/EstadoCarga'
import EstadoError from '../../components/ui/EstadoError'
import EstadoVacio from '../../components/ui/EstadoVacio'
import TablaDatos, { type ColumnaTabla } from '../../components/ui/TablaDatos'
import { useConsulta } from '../../hooks/useConsulta'
import { usePaginaActual } from '../../hooks/usePaginaActual'
import { MIGAS_PLANIFICACION } from '../../router/rutasApp'
import { listarRestricciones } from '../../services/api/planificacion'
import type { Restriccion } from '../../types/planificacion'
import {
  PRESENTACION_EFECTO,
  desplazarMes,
  mesDeFecha,
  nombreMes,
  ordenarRestricciones,
  rangoDelMes,
} from '../../utils/calendarioRestricciones'
import { formatearFecha } from '../../utils/formato'
import { hoyLima } from '../../utils/instanteLima'
import { textoHorario } from '../../utils/planificacion'
import estilos from './Planificacion.module.css'

function textoPeriodo(r: Restriccion): string {
  return r.fecha_inicio === r.fecha_fin
    ? formatearFecha(r.fecha_inicio)
    : `${formatearFecha(r.fecha_inicio)} a ${formatearFecha(r.fecha_fin)}`
}

const COLUMNAS: ColumnaTabla<Restriccion>[] = [
  { clave: 'periodo', titulo: 'Fecha', render: textoPeriodo },
  {
    clave: 'efecto',
    titulo: 'Efecto',
    render: (r) => {
      const { texto, tono, icono } = PRESENTACION_EFECTO[r.efecto]
      return <Badge tono={tono} texto={texto} icono={icono} />
    },
  },
  {
    clave: 'tipo',
    titulo: 'Tipo',
    multilinea: true,
    render: (r) => (r.aplica_servicios_ruidosos ? `${r.tipo} (servicios ruidosos)` : r.tipo),
  },
  { clave: 'horario', titulo: 'Horario', render: (r) => textoHorario(r.hora_inicio, r.hora_fin) },
  { clave: 'descripcion', titulo: 'Descripción', multilinea: true },
]

export default function CalendarioRestriccionesPage() {
  usePaginaActual('Calendario de restricciones', [MIGAS_PLANIFICACION.planificacion])
  const [mes, setMes] = useState(() => mesDeFecha(hoyLima()))
  const { desde, hasta } = rangoDelMes(mes)
  const consulta = useConsulta(
    `restricciones-${desde}`,
    (signal) => listarRestricciones(desde, hasta, signal),
    (restricciones) => restricciones.length === 0,
  )

  let contenido
  if (consulta.estado === 'error') {
    contenido = (
      <EstadoError
        titulo="No pudimos cargar las restricciones"
        descripcion={consulta.error?.detalle ?? ''}
        onReintentar={consulta.reintentar}
      />
    )
  } else if (consulta.estado === 'vacio') {
    contenido = <EstadoVacio titulo={`Sin restricciones en ${nombreMes(mes)}`} descripcion="Cambia de mes para ver otras fechas." />
  } else if (consulta.estado === 'exito' && consulta.datos) {
    contenido = (
      <TablaDatos
        titulo={`Restricciones de ${nombreMes(mes)}`}
        columnas={COLUMNAS}
        filas={ordenarRestricciones(consulta.datos)}
        claveFila={(r) => String(r.id)}
      />
    )
  } else {
    contenido = consulta.cargaVisible ? <EstadoCarga forma="tabla" /> : null
  }

  return (
    <div className={estilos.pagina}>
      <div className={estilos.navegacionMes}>
        <Boton variante="secundario" compacto onClick={() => setMes(desplazarMes(mes, -1))}>
          Mes anterior
        </Boton>
        <h2 className={estilos.tituloSeccion} aria-live="polite">
          {nombreMes(mes)}
        </h2>
        <Boton variante="secundario" compacto onClick={() => setMes(desplazarMes(mes, 1))}>
          Mes siguiente
        </Boton>
      </div>
      {contenido}
    </div>
  )
}
