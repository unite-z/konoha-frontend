/**
 * «Reportes generados» (RF-REP-009): historial de `ReporteGenerado`, del más reciente al más antiguo, con su filtro
 * por tipo y su página en la URL. En escritorio una tabla con paginación del servidor; en móvil, fichas.
 * «Descargar» vuelve a bajar el archivo ya generado (no crea nada).
 */
import { useState } from 'react'
import { useEsMovil } from '@/components/reportes-indicadores/useEsMovil'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import AccionFila from '@/design-system/AccionFila'
import Boton from '@/components/ui/Boton'
import { GrupoChips } from '@/components/ui/ChipsFiltro'
import TablaDatos, { type ColumnaTabla, type EstadoTabla } from '@/components/ui/TablaDatos'
import type { ResultadoConsulta } from '@/hooks/useConsulta'
import { aErrorApi } from '@/services/api/cliente'
import { descargarExportacion } from '@/services/api/exportaciones'
import type { Paginado } from '@/types/comun'
import type { ReporteGenerado, TipoExportable } from '@/types/exportaciones'
import { TEXTO_FORMATO } from '@/utils/exportaciones'
import { formatearFechaHora, formatearNumero, formatearTamanoArchivo } from '@/utils/formato'
import estilos from './Exportaciones.module.css'
import Estado from '@/components/ui/Estado'

const POR_PAGINA = 25

export interface HistorialExportacionesProps {
  consulta: ResultadoConsulta<Paginado<ReporteGenerado>>
  tipos: TipoExportable[]
  tipo: string
  pagina: number
  onCambiarTipo: (tipo: string) => void
  onCambiarPagina: (pagina: number) => void
}

export default function HistorialExportaciones({
  consulta,
  tipos,
  tipo,
  pagina,
  onCambiarTipo,
  onCambiarPagina,
}: HistorialExportacionesProps) {
  const esMovil = useEsMovil()
  const [descargando, setDescargando] = useState<number | null>(null)
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null)

  async function descargar(reporte: ReporteGenerado) {
    setDescargando(reporte.id)
    setErrorDescarga(null)
    try {
      await descargarExportacion(reporte)
    } catch (fallo) {
      setErrorDescarga(aErrorApi(fallo).detalle)
    } finally {
      setDescargando(null)
    }
  }

  const etiquetaDescargar = (r: ReporteGenerado) =>
    `Descargar ${r.etiqueta_tipo} del ${formatearFechaHora(r.fecha_hora)}`

  const botonDescargar = (r: ReporteGenerado) => (
    <Boton
      variante="fantasma"
      cargando={descargando === r.id}
      deshabilitado={r.archivo === null}
      aria-label={etiquetaDescargar(r)}
      onClick={() => void descargar(r)}
    >
      Descargar
    </Boton>
  )

  const accionDescargar = (r: ReporteGenerado) => (
    <AccionFila
      icono="download"
      nombre="Descargar"
      etiqueta={etiquetaDescargar(r)}
      descripcion={r.archivo === null ? 'Sin archivo para descargar' : undefined}
      cargando={descargando === r.id}
      deshabilitado={r.archivo === null}
      onClick={() => void descargar(r)}
    />
  )

  const columnas: ColumnaTabla<ReporteGenerado>[] = [
    { clave: 'fecha_hora', titulo: 'Fecha y hora', render: (r) => formatearFechaHora(r.fecha_hora) },
    { clave: 'etiqueta_tipo', titulo: 'Tipo', multilinea: true },
    { clave: 'resumen_parametros', titulo: 'Periodo y filtros', multilinea: true },
    { clave: 'formato', titulo: 'Formato', render: (r) => <Estado tono="neutro" texto={TEXTO_FORMATO[r.formato]} /> },
    { clave: 'filas', titulo: 'Filas', alineacion: 'derecha', render: (r) => formatearNumero(r.filas) },
    { clave: 'usuario', titulo: 'Generado por' },
    {
      clave: 'tamano',
      titulo: 'Tamaño',
      alineacion: 'derecha',
      render: (r) => formatearTamanoArchivo(r.archivo?.tamano_bytes),
    },
    { clave: 'accion', titulo: 'Acción', render: accionDescargar },
  ]

  let estado: EstadoTabla | null = null
  if (consulta.estado === 'error') estado = 'error'
  else if (consulta.estado === 'cargando' && (consulta.cargaVisible || !consulta.datos))
    estado = consulta.cargaVisible ? 'cargando' : null
  else if (consulta.datos) estado = consulta.datos.count === 0 ? 'vacio' : 'exito'

  const reportes = consulta.datos?.results ?? []
  const total = consulta.datos?.count ?? 0
  const vacio = {
    titulo: tipo ? 'Sin reportes de este tipo' : 'Aún no se ha generado ningún reporte',
    descripcion: 'Los reportes que generes aparecerán aquí para volver a descargarlos.',
    nivel: 3 as const,
  }

  return (
    <section className={estilos.zona} aria-labelledby="titulo-generados">
      <h2 id="titulo-generados" className={estilos.tituloZona}>
        Reportes generados
      </h2>
      <GrupoChips
        etiqueta="Tipo de reporte"
        opciones={[{ valor: '', texto: 'Todos' }, ...tipos.map((t) => ({ valor: t.tipo, texto: t.nombre }))]}
        valor={tipo}
        onCambiar={onCambiarTipo}
      />
      {errorDescarga && (
        <AvisoEnLinea tono="error" titulo="No se pudo descargar el archivo">
          {errorDescarga}
        </AvisoEnLinea>
      )}
      {estado &&
        (esMovil && estado === 'exito' ? (
          <>
            <ul className={estilos.fichas} aria-label="Reportes generados">
              {reportes.map((r) => (
                <li key={r.id} className={estilos.ficha}>
                  <div className={estilos.cabeceraFicha}>
                    <span className={estilos.nombreTipo}>{r.etiqueta_tipo}</span>
                    <Estado tono="neutro" texto={TEXTO_FORMATO[r.formato]} />
                  </div>
                  <p className={estilos.metaFicha}>
                    {formatearFechaHora(r.fecha_hora)} · {r.usuario}
                  </p>
                  <p className={estilos.metaFicha}>{r.resumen_parametros}</p>
                  <div className={estilos.pieFicha}>
                    <span className={`${estilos.metaFicha} cifra`}>
                      {formatearNumero(r.filas)} filas · {formatearTamanoArchivo(r.archivo?.tamano_bytes)}
                    </span>
                    {botonDescargar(r)}
                  </div>
                </li>
              ))}
            </ul>
            {total > POR_PAGINA && (
              <div className={estilos.paginacionFichas}>
                <p className="cifra">
                  Página {formatearNumero(pagina)} de {formatearNumero(Math.ceil(total / POR_PAGINA))}
                </p>
                <Boton variante="secundario" deshabilitado={pagina <= 1} onClick={() => onCambiarPagina(pagina - 1)}>
                  Anterior
                </Boton>
                <Boton
                  variante="secundario"
                  deshabilitado={pagina * POR_PAGINA >= total}
                  onClick={() => onCambiarPagina(pagina + 1)}
                >
                  Siguiente
                </Boton>
              </div>
            )}
          </>
        ) : (
          <TablaDatos
            titulo="Reportes generados"
            columnas={columnas}
            filas={reportes}
            claveFila={(r) => String(r.id)}
            estado={estado}
            paginacionServidor={{ pagina, total, porPagina: POR_PAGINA, onCambiarPagina }}
            vacio={vacio}
            error={
              consulta.error
                ? {
                    titulo: 'No se pudieron cargar los reportes generados',
                    descripcion: consulta.error.detalle,
                    onReintentar: consulta.reintentar,
                  }
                : undefined
            }
          />
        ))}
    </section>
  )
}
