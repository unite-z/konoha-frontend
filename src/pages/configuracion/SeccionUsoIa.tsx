/**
 * Configuración → Uso y costes de la IA (AV-396): cuánto cuesta, cuánto tarda y cuándo falla cada llamada de los siete
 * asistentes, por mes. El coste sale de los tokens y del precio vigente del modelo (USD por millón de tokens).
 */
import { useState } from 'react'
import BarraAvance from '@/design-system/BarraAvance'
import EstadoError from '@/design-system/EstadoError'
import Estado from '@/design-system/Estado'
import { GrupoChips } from '@/design-system/ChipsFiltro'
import FiltroPeriodo from '@/design-system/FiltroPeriodo'
import TablaDatos, { type ColumnaTabla } from '@/design-system/TablaDatos'
import Tarjeta from '@/design-system/Tarjeta'
import TarjetaIndicador, { FilaTarjetas } from '@/design-system/TarjetaIndicador'
import { useConsulta } from '@/hooks/useConsulta'
import { obtenerUsoIa } from '@/services/api/usoIa'
import type { UsoIa } from '@/types/ia'
import { hoyLima, instanteALocalLima } from '@/utils/instanteLima'
import estilos from './Configuracion.module.css'

export const NOMBRE_ASISTENTE: Record<string, string> = {
  extraccion: 'Extracción de informes',
  priorizacion: 'Prioridades de atención',
  inconsistencias: 'Revisión de inconsistencias',
  cronograma: 'Planificación asistida',
  estimacion: 'Estimación de recursos',
  clasificacion: 'Clasificación de incidencias',
  evidencia: 'Evidencia fitosanitaria',
}

/** `0,0042 US$` con dos cifras significativas si es menos de un céntimo. */
export function usd(valor: number | null): string {
  if (valor === null) return '—'
  const decimales = valor !== 0 && Math.abs(valor) < 0.01 ? 4 : 2
  return valor.toFixed(decimales).replace('.', ',') + ' US$'
}

function segundos(ms: number | null): string {
  return ms === null ? '—' : String(Math.round(ms / 100) / 10).replace('.', ',') + ' s'
}

function miles(n: number | null): string {
  return n === null ? '—' : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

const MESES = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sept.', 'oct.', 'nov.', 'dic.']

/** Este mes y los dos anteriores, en hora de Lima, para los atajos «Ver mes». */
export function mesesRecientes(hoy: string): { valor: string; texto: string; desde: string; hasta: string }[] {
  const [a, m] = hoy.split('-').map(Number)
  return [0, 1, 2].map((atras) => {
    const total = a * 12 + (m - 1) - atras
    const mes = `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
    const [desde, hasta] = rangoDelMes(mes)
    return {
      valor: mes,
      texto: atras === 0 ? 'Este mes' : `${MESES[total % 12]} ${Math.floor(total / 12)}`,
      desde,
      hasta,
    }
  })
}

function rangoDelMes(mes: string): [string, string] {
  const [a, m] = mes.split('-').map(Number)
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate() // fecha-lima-ok: solo cuenta los días del mes
  return [`${mes}-01`, `${mes}-${String(ultimo).padStart(2, '0')}`]
}

type FilaHistorial = UsoIa['historial'][number]
type FilaModelo = UsoIa['por_modelo'][number]

const COLUMNAS_MODELO: ColumnaTabla<FilaModelo>[] = [
  { clave: 'modelo', titulo: 'Modelo', render: (f) => `${f.proveedor} · ${f.modelo}` },
  { clave: 'llamadas', titulo: 'Llamadas', alineacion: 'derecha' },
  { clave: 'fallidas', titulo: 'Fallidas', alineacion: 'derecha' },
  { clave: 'duracion', titulo: 'Tiempo medio', alineacion: 'derecha', render: (f) => segundos(f.duracion_media_ms) },
  {
    clave: 'tokens',
    titulo: 'Tokens (entrada · salida)',
    alineacion: 'derecha',
    render: (f) => `${miles(f.tokens_entrada)} · ${miles(f.tokens_salida)}`,
  },
  { clave: 'coste', titulo: 'Coste', alineacion: 'derecha', render: (f) => usd(f.coste_usd) },
]

const COLUMNAS_HISTORIAL: ColumnaTabla<FilaHistorial>[] = [
  {
    clave: 'fecha',
    titulo: 'Fecha',
    render: (f) => (instanteALocalLima(f.solicitado_en) ?? '').replace('T', ' ').slice(0, 16),
  },
  { clave: 'asistente', titulo: 'Asistente', render: (f) => NOMBRE_ASISTENTE[f.asistente] ?? f.asistente },
  { clave: 'modelo', titulo: 'Modelo' },
  {
    clave: 'resultado',
    titulo: 'Resultado',
    multilinea: true,
    render: (f) =>
      f.correcto ? (
        <Estado tono="exito" texto="Correcta" />
      ) : (
        <Estado tono="error" texto="Fallida" ayuda={f.error ?? undefined} />
      ),
  },
  { clave: 'duracion', titulo: 'Tiempo', alineacion: 'derecha', render: (f) => segundos(f.duracion_ms) },
  { clave: 'coste', titulo: 'Coste', alineacion: 'derecha', render: (f) => usd(f.coste_usd) },
]

export default function SeccionUsoIa({ mesInicial }: { mesInicial?: string }) {
  const hoy = hoyLima()
  const meses = mesesRecientes(hoy)
  const [periodo, setPeriodo] = useState(() => {
    const [desde, hasta] = rangoDelMes(mesInicial ?? meses[0].valor)
    return { desde, hasta }
  })
  const { desde, hasta } = periodo
  const mesElegido = meses.find((x) => x.desde === desde && x.hasta === hasta)?.valor ?? ''
  const consulta = useConsulta(`uso-ia|${desde}|${hasta}`, (signal) => obtenerUsoIa(desde, hasta, signal))
  const uso = consulta.datos
  const t = uso?.totales

  return (
    <Tarjeta
      titulo="Uso y costes de la IA"
      descripcion="Cada llamada de los siete asistentes: cuánto cuesta, cuánto tarda y cuándo falla."
    >
      <div className={estilos.campos}>
        <div className={estilos.mesesRapidos}>
          <span className={estilos.rotulo}>Ver mes</span>
          <GrupoChips
            etiqueta="Ver mes"
            opciones={meses.map((x) => ({ valor: x.valor, texto: x.texto }))}
            valor={mesElegido}
            onCambiar={(valor) => {
              const elegido = meses.find((x) => x.valor === valor)
              if (elegido) setPeriodo({ desde: elegido.desde, hasta: elegido.hasta })
            }}
          />
        </div>
        <FiltroPeriodo
          idBase="uso-ia"
          desde={desde}
          hasta={hasta}
          cargando={consulta.estado === 'cargando' && consulta.cargaVisible}
          onAplicar={setPeriodo}
        />
        {consulta.estado === 'error' && (
          <EstadoError
            titulo="No pudimos cargar el uso de la IA"
            descripcion={consulta.error?.detalle ?? ''}
            onReintentar={consulta.reintentar}
          />
        )}
        {t && uso && (
          <>
            <FilaTarjetas etiqueta="Resumen del periodo">
              <TarjetaIndicador
                etiqueta="Coste"
                valor={usd(t.coste_usd)}
                contexto={t.sin_coste > 0 ? `${t.sin_coste} llamadas sin precio` : 'Precio máximo de cada modelo'}
                nota="DeepSeek cobra la mitad fuera de su hora punta"
              />
              <TarjetaIndicador etiqueta="Llamadas" valor={miles(t.llamadas)} contexto={`${t.fallidas} fallidas`} />
              <TarjetaIndicador
                etiqueta="Tasa de error"
                valor={t.llamadas ? String(Math.round((t.fallidas / t.llamadas) * 100)) : '—'}
                unidad="%"
              />
              <TarjetaIndicador
                etiqueta="Tiempo de respuesta"
                valor={segundos(t.duracion_media_ms)}
                contexto={`El 95 % tarda menos de ${segundos(t.duracion_p95_ms)}`}
              />
            </FilaTarjetas>
            <section className={estilos.campos} aria-label="Llamadas por asistente">
              <p className={estilos.rotulo}>Llamadas por asistente</p>
              {uso.por_asistente.map((a) => (
                <BarraAvance
                  key={a.asistente}
                  etiqueta={NOMBRE_ASISTENTE[a.asistente] ?? a.asistente}
                  valor={a.llamadas}
                  maximo={Math.max(t.llamadas, 1)}
                  textoValor={`${a.llamadas} · ${usd(a.coste_usd)}`}
                  alerta={a.fallidas > 0}
                />
              ))}
            </section>
            <TablaDatos
              titulo="Por modelo"
              tituloVisible
              compacta
              columnas={COLUMNAS_MODELO}
              filas={uso.por_modelo}
              claveFila={(f) => f.proveedor + f.modelo}
            />
            <TablaDatos
              titulo="Últimas llamadas"
              tituloVisible
              compacta
              columnas={COLUMNAS_HISTORIAL}
              filas={uso.historial}
              claveFila={(f) => String(f.id)}
              vacio={{
                titulo: 'Sin llamadas a la IA este mes',
                descripcion: 'Aparecerán aquí al usar cualquier asistente.',
              }}
            />
          </>
        )}
      </div>
    </Tarjeta>
  )
}
