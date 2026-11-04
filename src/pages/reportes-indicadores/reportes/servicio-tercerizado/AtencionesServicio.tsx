/**
 * Registros de origen del reporte por servicio (RF-REP-008): las atenciones del periodo, con enlace a su ficha de
 * MOD-05. En escritorio, una tabla (paginada en el cliente); en móvil, una ficha por atención, de 25 en 25.
 * Se usa en la pestaña «Atenciones» y en el diálogo «Ver detalles» de los gráficos.
 */
import { useState } from 'react'
import { Link } from 'react-router'
import { useEsMovil } from '@/components/reportes-indicadores/useEsMovil'
import Boton, { BotonEnlace } from '@/components/ui/Boton'
import EstadoVacio from '@/components/ui/EstadoVacio'
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
import { rutaDetalleAtencion } from '@/router/rutasApp'
import type { FilaAtencionServicio } from '@/types/reportesGestion'
import { formatearFechaHora, formatearNumero, SIN_VALOR } from '@/utils/formato'
import { insigniaEstadoAtencion, numeroDeDecimal } from '@/utils/reportesGestion'
import estilos from './ServicioTercerizado.module.css'
import Estado from '@/components/ui/Estado'
import { TONO_ESTADO, insigniaAEstado } from '@/components/ui/tonos'

const POR_TANDA = 25

const VACIO = { titulo: 'Sin atenciones', descripcion: 'No hay atenciones con este criterio.', nivel: 3 } as const

function textoMetrado(f: FilaAtencionServicio): string {
  const valor = numeroDeDecimal(f.metrado)
  return valor === null ? SIN_VALOR : `${formatearNumero(valor)} ${f.unidad ?? ''}`.trim()
}

function lugar(f: FilaAtencionServicio): string {
  return [f.espacio, f.ejemplar_codigo && `Ejemplar ${f.ejemplar_codigo}`].filter(Boolean).join(' · ') || SIN_VALOR
}

function Conformidad({ valor }: { valor: FilaAtencionServicio['conformidad'] }) {
  if (valor === null) return <>{SIN_VALOR}</>
  return <Estado tono={TONO_ESTADO[valor === 'Conforme' ? 'exito' : 'advertencia']} texto={valor} />
}

function Marcas({ fila }: { fila: FilaAtencionServicio }) {
  if (fila.con_evidencia && !fila.es_riesgo) return null
  return (
    <span className={estilos.marcas}>
      {!fila.con_evidencia && <Estado tono="aviso" texto="Sin evidencia" />}
      {fila.es_riesgo && <Estado tono="info" texto="Riesgo" />}
    </span>
  )
}

const COLUMNAS: ColumnaTabla<FilaAtencionServicio>[] = [
  {
    clave: 'codigo',
    titulo: 'Código',
    ordenable: true,
    render: (f) => <Link to={rutaDetalleAtencion(f.id)}>{f.codigo}</Link>,
  },
  { clave: 'clase', titulo: 'Clase', ordenable: true },
  {
    clave: 'estado',
    titulo: 'Estado',
    ordenable: true,
    valorOrden: (f) => f.etiqueta_estado,
    render: (f) => <Estado {...insigniaAEstado(insigniaEstadoAtencion(f.estado))} texto={f.etiqueta_estado} />,
  },
  { clave: 'espacio', titulo: 'Espacio o ejemplar', ordenable: true, multilinea: true, render: lugar },
  { clave: 'fecha_hora_inicio', titulo: 'Inicio', ordenable: true, render: (f) => formatearFechaHora(f.fecha_hora_inicio) },
  { clave: 'fecha_hora_fin', titulo: 'Fin', ordenable: true, render: (f) => formatearFechaHora(f.fecha_hora_fin) },
  {
    clave: 'metrado',
    titulo: 'Metrado',
    alineacion: 'derecha',
    ordenable: true,
    valorOrden: (f) => numeroDeDecimal(f.metrado),
    render: textoMetrado,
  },
  { clave: 'conformidad', titulo: 'Conformidad', ordenable: true, render: (f) => <Conformidad valor={f.conformidad} /> },
  { clave: 'documentos', titulo: 'Documentos', alineacion: 'derecha', ordenable: true, render: (f) => formatearNumero(f.documentos) },
  { clave: 'marcas', titulo: 'Marcas', render: (f) => <Marcas fila={f} /> },
]

function FichasAtenciones({ filas }: { filas: FilaAtencionServicio[] }) {
  const [visibles, setVisibles] = useState(POR_TANDA)
  const mostradas = filas.slice(0, visibles)
  return (
    <>
      <ul className={estilos.fichas} aria-label="Atenciones">
        {mostradas.map((f) => (
          <li key={f.id}>
            <article className={estilos.ficha}>
              <div className={estilos.cabeceraFicha}>
                <span className={estilos.codigoFicha}>{f.codigo}</span>
                <Estado {...insigniaAEstado(insigniaEstadoAtencion(f.estado))} texto={f.etiqueta_estado} />
              </div>
              <p className={estilos.metaFicha}>
                {f.clase} · {lugar(f)}
              </p>
              <p className={estilos.metaFicha}>
                {formatearFechaHora(f.fecha_hora_inicio)} – {formatearFechaHora(f.fecha_hora_fin)} · {textoMetrado(f)}
              </p>
              <div className={estilos.pieFicha}>
                <span className={estilos.marcas}>
                  {f.conformidad && <Conformidad valor={f.conformidad} />}
                  <Marcas fila={f} />
                  <span className={estilos.metaFicha}>{f.documentos === 1 ? '1 documento' : `${formatearNumero(f.documentos)} documentos`}</span>
                </span>
                <BotonEnlace to={rutaDetalleAtencion(f.id)} variante="fantasma">
                  Ver atención
                </BotonEnlace>
              </div>
            </article>
          </li>
        ))}
      </ul>
      {filas.length > POR_TANDA && (
        <div className={estilos.pieLista}>
          <p className="cifra">
            Mostrando {formatearNumero(mostradas.length)} de {formatearNumero(filas.length)}
          </p>
          {mostradas.length < filas.length && (
            <Boton variante="secundario" onClick={() => setVisibles((n) => n + POR_TANDA)}>
              Mostrar más atenciones
            </Boton>
          )}
        </div>
      )}
    </>
  )
}

export default function AtencionesServicio({ titulo, filas }: { titulo: string; filas: FilaAtencionServicio[] }) {
  const esMovil = useEsMovil()
  if (esMovil) return filas.length === 0 ? <EstadoVacio {...VACIO} /> : <FichasAtenciones filas={filas} />
  return (
    <TablaDatos
      titulo={titulo}
      columnas={COLUMNAS}
      filas={filas}
      claveFila={(f) => String(f.id)}
      ordenInicial={{ clave: 'fecha_hora_inicio', direccion: 'desc' }}
      vacio={VACIO}
    />
  )
}
