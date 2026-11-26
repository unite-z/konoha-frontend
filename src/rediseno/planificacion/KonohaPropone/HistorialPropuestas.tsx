/** Historial de propuestas de cronograma por estado y periodo (IA-16). */
import { useState } from 'react'
import Boton from '@/design-system/Boton'
import CampoFormulario from '@/design-system/CampoFormulario'
import Estado from '@/design-system/Estado'
import EstadoError from '@/design-system/EstadoError'
import EstadoSinAcceso from '@/design-system/EstadoSinAcceso'
import EstadoVacio from '@/design-system/EstadoVacio'
import Selector from '@/design-system/Selector'
import { insigniaAEstado } from '@/design-system/tonos'
import { useConsulta } from '@/hooks/useConsulta'
import { listarCronogramas } from '@/services/api/cronogramaIa'
import type { EstadoSugerencia } from '@/types/ia'
import { textoPeriodoCorto } from '@/utils/cronogramaIa'
import { insigniaSugerencia } from '@/utils/estados'
import estilos from './KonohaPropone.module.css'
import { enPeriodo } from './periodo'

const ESTADOS: { valor: EstadoSugerencia; texto: string }[] = [
  { valor: 'Propuesta', texto: 'Pendientes de revisión' },
  { valor: 'Validada', texto: 'Confirmadas' },
  { valor: 'Rechazada', texto: 'Descartadas' },
]
const POR_PAGINA = 25

export default function HistorialPropuestas({ onAbrir }: { onAbrir: (id: number) => void }) {
  const [estado, setEstado] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [pagina, setPagina] = useState(1)
  const estadoValido = ESTADOS.find((e) => e.valor === estado)?.valor
  const consulta = useConsulta(`rd-propuestas-historial|${estado}|${pagina}`, (signal) =>
    listarCronogramas({ estado: estadoValido, page: pagina }, signal),
  )
  const total = consulta.datos?.count ?? 0
  const filas = (consulta.datos?.results ?? []).filter((s) => enPeriodo(s, desde, hasta))

  let cuerpo
  if (consulta.error?.estado === 403) cuerpo = <EstadoSinAcceso nivel={3} titulo="No puedes ver el historial" />
  else if (consulta.error && !consulta.datos)
    cuerpo = (
      <EstadoError
        nivel={3}
        titulo="No pudimos cargar el historial"
        descripcion={consulta.error.detalle}
        onReintentar={consulta.reintentar}
      />
    )
  else if (!consulta.datos) cuerpo = consulta.cargaVisible ? <p role="status">Cargando el historial…</p> : null
  else if (filas.length === 0)
    cuerpo = (
      <EstadoVacio
        nivel={3}
        titulo="Sin propuestas con estos filtros"
        descripcion="Cambia el estado o el periodo para ver otras."
      />
    )
  else
    cuerpo = (
      <ul className={estilos.historial} aria-label="Propuestas anteriores">
        {filas.map((s) => (
          <li key={s.id} className={estilos.filaHistorial}>
            <span className={estilos.textos}>
              <span className={estilos.titulo}>
                {textoPeriodoCorto(s.contenido.entrada.desde, s.contenido.entrada.hasta)}
              </span>
              <span className={estilos.detalle}>
                {s.contenido.propuestas.length} sugerencias · propuesta n.º {s.id}
              </span>
            </span>
            <Estado {...insigniaAEstado(insigniaSugerencia(s.estado, s.etiqueta_estado))} />
            <Boton variante="secundario" compacto onClick={() => onAbrir(s.id)}>
              {s.estado === 'Propuesta' ? 'Revisar' : 'Ver'}
              <span className="sr-only"> propuesta n.º {s.id}</span>
            </Boton>
          </li>
        ))}
      </ul>
    )

  return (
    <div className={estilos.historialContenido}>
      <div className={estilos.filtros}>
        <Selector
          id="historial-estado"
          etiqueta="Estado"
          valor={estado}
          opciones={ESTADOS.map((e) => ({ valor: e.valor, texto: e.texto }))}
          opcionTodos="Todas"
          onCambiar={(valor) => {
            setEstado(valor)
            setPagina(1)
          }}
        />
        <CampoFormulario
          id="historial-desde"
          etiqueta="Desde"
          type="date"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
        />
        <CampoFormulario
          id="historial-hasta"
          etiqueta="Hasta"
          type="date"
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
        />
      </div>
      {cuerpo}
      {total > POR_PAGINA && (
        <div className={estilos.paginas}>
          <Boton variante="secundario" compacto deshabilitado={pagina <= 1} onClick={() => setPagina(pagina - 1)}>
            Anterior
          </Boton>
          <Boton
            variante="secundario"
            compacto
            deshabilitado={pagina * POR_PAGINA >= total}
            onClick={() => setPagina(pagina + 1)}
          >
            Siguiente
          </Boton>
        </div>
      )}
    </div>
  )
}
