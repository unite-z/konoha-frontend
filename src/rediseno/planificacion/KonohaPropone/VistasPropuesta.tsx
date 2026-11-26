/** Vistas Calendario y Lista por semanas de la propuesta, con las piezas actuales (en móvil, solo la lista). */
import { useState } from 'react'
import { useEsMovil } from '@/components/reportes-indicadores/useEsMovil'
import EstadoVacio from '@/design-system/EstadoVacio'
import Pestanas from '@/design-system/Pestanas'
import { useConsulta } from '@/hooks/useConsulta'
import FichaPropuesta from '@/pages/reportes-indicadores/asistencia-ia/cronograma/FichaPropuesta'
import ListaPorSemana from '@/pages/reportes-indicadores/asistencia-ia/cronograma/ListaPorSemana'
import VistaCalendario from '@/pages/reportes-indicadores/asistencia-ia/cronograma/VistaCalendario'
import { listarProgramacionExistente, programacionExistenteDisponible } from '@/services/api/cronogramaIa'
import type { PropuestaCronograma, SugerenciaCronograma } from '@/types/cronogramaIa'
import { textoPeriodoCorto } from '@/utils/cronogramaIa'
import estilos from './KonohaPropone.module.css'
import { textoValores } from './textoValores'

const noHacerNada = () => undefined

export default function VistasPropuesta({ sugerencia }: { sugerencia: SugerenciaCronograma }) {
  const esMovil = useEsMovil()
  const [vista, setVista] = useState('calendario')
  const [elegida, setElegida] = useState<string | null>(null)
  const { entrada, propuestas, restricciones, decision } = sugerencia.contenido
  const existentes = useConsulta(`rd-propuesta-existentes|${entrada.desde}|${entrada.hasta}`, (signal) =>
    listarProgramacionExistente(entrada.desde, entrada.hasta, signal),
  )
  const modo = sugerencia.estado === 'Propuesta' ? 'consulta' : 'final'
  const decisiones = Object.fromEntries(
    Object.entries(decision?.por_propuesta ?? {}).map(([clave, d]) => [
      clave,
      { accion: d.accion, valores: d.valores_finales },
    ]),
  )
  const ficha = (p: PropuestaCronograma) => (
    <FichaPropuesta
      key={p.clave}
      propuesta={p}
      modo={modo}
      final={decision?.por_propuesta[p.clave]}
      textoCambios={textoValores}
      onAccion={noHacerNada}
      onModificar={noHacerNada}
      onConfirma={noHacerNada}
    />
  )
  const lista = <ListaPorSemana propuestas={propuestas} renderFicha={ficha} />

  return (
    <div className={estilos.vistas}>
      <p className={estilos.periodo}>
        {propuestas.length} sugerencias para {textoPeriodoCorto(entrada.desde, entrada.hasta)}
      </p>
      {propuestas.length === 0 ? (
        <EstadoVacio
          nivel={3}
          titulo="No hay actividades pendientes en el periodo"
          descripcion="Puedes planificar de forma manual."
        />
      ) : esMovil ? (
        lista
      ) : (
        <Pestanas
          etiqueta="Vista de la propuesta"
          valor={vista}
          onCambiar={setVista}
          pestanas={[
            { valor: 'calendario', texto: 'Calendario' },
            { valor: 'lista', texto: 'Lista' },
          ]}
        >
          {vista === 'calendario' ? (
            <VistaCalendario
              desde={entrada.desde}
              hasta={entrada.hasta}
              propuestas={propuestas}
              existentes={existentes.datos ?? []}
              existentesDisponibles={programacionExistenteDisponible() && existentes.estado !== 'error'}
              restricciones={restricciones}
              decisiones={decisiones}
              elegida={elegida}
              onElegir={setElegida}
              renderFicha={ficha}
            />
          ) : (
            lista
          )}
        </Pestanas>
      )}
    </div>
  )
}
