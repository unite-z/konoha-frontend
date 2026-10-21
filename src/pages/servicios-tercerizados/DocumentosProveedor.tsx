// RF-SER-006 · Consulta del reporte y la documentación del proveedor
/**
 * Revisiones del reporte del proveedor, de la más reciente a la más antigua. Cada carga es una revisión
 * completa; las anteriores se conservan. Descarga autenticada de cada documento.
 *
 * Tiene su propio estado de carga, vacío y error: si falla, el resto de la ficha sigue disponible.
 * TODO (paso 7 del plan): «Adjuntar reporte» (nueva revisión).
 */
import { useState } from 'react'
import Badge from '../../components/ui/Badge'
import Boton from '../../components/ui/Boton'
import AvisoEnLinea from '../../components/ui/AvisoEnLinea'
import EstadoCarga from '../../components/ui/EstadoCarga'
import EstadoError from '../../components/ui/EstadoError'
import EstadoVacio from '../../components/ui/EstadoVacio'
import Icono from '../../components/ui/Icono'
import ListaDescripcion from '../../components/ui/ListaDescripcion'
import TablaDatos, { type ColumnaTabla } from '../../components/ui/TablaDatos'
import { useConsulta } from '../../hooks/useConsulta'
import { aErrorApi } from '../../services/api/cliente'
import { descargarDocumento, listarReportes } from '../../services/api/tercerizados'
import type { Alcance, Atencion, DocumentoReporte, ReporteProveedor } from '../../types/tercerizados'
import { textoAlcance, textoCategoria } from '../../utils/estadosTercerizados'
import { formatearFecha, formatearFechaHora, formatearTamanoArchivo, SIN_VALOR } from '../../utils/formato'
import estilos from './Tercerizados.module.css'

interface Descarga {
  enCurso: number | null
  error: { documento: string; detalle: string } | null
}

function RevisionReporte({
  reporte,
  vigente,
  alcances,
  descarga,
  onDescargar,
}: {
  reporte: ReporteProveedor
  vigente: boolean
  alcances: Map<number, Alcance>
  descarga: Descarga
  onDescargar: (reporte: ReporteProveedor, documento: DocumentoReporte) => void
}) {
  const columnas: ColumnaTabla<DocumentoReporte>[] = [
    { clave: 'categoria', titulo: 'Categoría', render: (d) => textoCategoria(d.categoria) },
    {
      clave: 'alcance',
      titulo: 'Espacio o ejemplar',
      multilinea: true,
      render: (d) => {
        if (!d.alcance_id) return SIN_VALOR
        const alcance = alcances.get(d.alcance_id)
        return alcance ? textoAlcance(alcance) : `Alcance n.º ${d.alcance_id}`
      },
    },
    {
      clave: 'archivo',
      titulo: 'Archivo',
      multilinea: true,
      render: (d) => (
        <span className={estilos.nombreArchivo}>
          <Icono nombre="documento" />
          <span>
            {d.archivo.nombre_original}
            <br />
            <span className={estilos.ayuda}>{formatearTamanoArchivo(d.archivo.tamano_bytes)}</span>
          </span>
        </span>
      ),
    },
    { clave: 'descripcion', titulo: 'Descripción', multilinea: true, render: (d) => d.descripcion || SIN_VALOR },
    {
      clave: 'accion',
      titulo: 'Acción',
      render: (d) => (
        <Boton
          variante="terciario"
          compacto
          cargando={descarga.enCurso === d.id}
          deshabilitado={descarga.enCurso !== null && descarga.enCurso !== d.id}
          onClick={() => onDescargar(reporte, d)}
          aria-label={`Descargar ${d.archivo.nombre_original}`}
        >
          Descargar
        </Boton>
      ),
    },
  ]

  return (
    <article className={estilos.revision} aria-labelledby={`revision-${reporte.id}`}>
      <div className={estilos.cabeceraSeccion}>
        <h3 id={`revision-${reporte.id}`} className={estilos.tituloSeccion}>
          Revisión {reporte.revision}
        </h3>
        {vigente ? <Badge tono="exito" texto="Vigente" /> : <Badge tono="neutral" texto="Anterior" />}
      </div>
      <ListaDescripcion
        elementos={[
          { etiqueta: 'Recepción del informe', valor: formatearFecha(reporte.fecha_recepcion) },
          { etiqueta: 'Registrada por', valor: reporte.usuario_creacion_nombre },
          { etiqueta: 'Fecha de registro', valor: formatearFechaHora(reporte.fecha_creacion) },
          Boolean(reporte.resumen) && {
            etiqueta: 'Resumen',
            valor: <span className={estilos.textoLargo}>{reporte.resumen}</span>,
            ancho: true,
          },
        ]}
      />
      <TablaDatos
        titulo={`Documentos de la revisión ${reporte.revision}`}
        columnas={columnas}
        filas={reporte.documentos}
        claveFila={(d) => String(d.id)}
        compacta
      />
    </article>
  )
}

export default function DocumentosProveedor({ atencion }: { atencion: Atencion }) {
  const consulta = useConsulta(
    `reportes|${atencion.id}|${atencion.estado}`,
    (signal) => listarReportes(atencion.id, 1, signal),
    (datos) => datos.results.length === 0,
  )
  // Revisiones de páginas posteriores (más antiguas), cargadas a pedido.
  const [anteriores, setAnteriores] = useState<{ clave: string; reportes: ReporteProveedor[]; siguiente: number | null }>({
    clave: '',
    reportes: [],
    siguiente: null,
  })
  const [cargandoMas, setCargandoMas] = useState(false)
  const [errorMas, setErrorMas] = useState<string | null>(null)
  const [descarga, setDescarga] = useState<Descarga>({ enCurso: null, error: null })

  const alcances = new Map(atencion.alcances.map((a) => [a.id, a]))
  const primera = consulta.datos?.results ?? []
  const claveDatos = consulta.datos ? `${consulta.datos.count}|${primera[0]?.id ?? ''}` : ''
  // Si la primera página cambia (nueva revisión), se descartan las páginas anteriores ya cargadas.
  const extra =
    claveDatos && anteriores.clave === claveDatos
      ? anteriores
      : { clave: claveDatos, reportes: [] as ReporteProveedor[], siguiente: consulta.datos?.next ? 2 : null }
  const siguiente = extra.siguiente
  const reportes = [...primera, ...extra.reportes]

  async function cargarMas() {
    if (!siguiente || cargandoMas) return
    setCargandoMas(true)
    setErrorMas(null)
    try {
      const pagina = await listarReportes(atencion.id, siguiente)
      setAnteriores({ clave: claveDatos, reportes: [...extra.reportes, ...pagina.results], siguiente: pagina.next ? siguiente + 1 : null })
    } catch (causa) {
      setErrorMas(aErrorApi(causa).detalle)
    } finally {
      setCargandoMas(false)
    }
  }

  async function descargar(reporte: ReporteProveedor, documento: DocumentoReporte) {
    if (descarga.enCurso !== null) return
    setDescarga({ enCurso: documento.id, error: null })
    try {
      await descargarDocumento(atencion.id, reporte.id, documento.id, documento.archivo.nombre_original)
      setDescarga({ enCurso: null, error: null })
    } catch (causa) {
      setDescarga({ enCurso: null, error: { documento: documento.archivo.nombre_original, detalle: aErrorApi(causa).detalle } })
    }
  }

  let contenido
  if (consulta.estado === 'cargando' || consulta.estado === 'inactivo') {
    contenido = consulta.cargaVisible ? <EstadoCarga forma="tabla" filas={3} /> : null
  } else if (consulta.estado === 'error') {
    contenido = (
      <EstadoError
        nivel={3}
        titulo="No pudimos cargar los documentos"
        descripcion={consulta.error?.detalle ?? ''}
        onReintentar={consulta.reintentar}
      />
    )
  } else if (consulta.estado === 'vacio') {
    const terminada = atencion.estado === 'Ejecutado pendiente de reporte' || atencion.estado === 'Reporte adjunto'
    contenido = (
      <EstadoVacio
        nivel={3}
        icono="documento"
        titulo="Aún no hay reporte del proveedor"
        descripcion={
          terminada
            ? 'El servicio terminó: el reporte se adjunta cuando el proveedor entregue su informe final.'
            : 'El proveedor entrega su informe final cuando termina el servicio.'
        }
      />
    )
  } else {
    contenido = (
      <>
        {descarga.error && (
          <AvisoEnLinea
            tono="error"
            titulo={`No se pudo descargar «${descarga.error.documento}»`}
            accion={{ texto: 'Cerrar aviso', onClick: () => setDescarga({ enCurso: null, error: null }) }}
          >
            {descarga.error.detalle}
          </AvisoEnLinea>
        )}
        <div className={estilos.seccion}>
          {reportes.map((reporte, indice) => (
            <RevisionReporte
              key={reporte.id}
              reporte={reporte}
              vigente={indice === 0}
              alcances={alcances}
              descarga={descarga}
              onDescargar={descargar}
            />
          ))}
        </div>
        {errorMas && (
          <AvisoEnLinea tono="error" titulo="No pudimos cargar más revisiones">
            {errorMas}
          </AvisoEnLinea>
        )}
        {siguiente && (
          <div>
            <Boton variante="secundario" cargando={cargandoMas} onClick={cargarMas}>
              Ver revisiones anteriores
            </Boton>
          </div>
        )}
      </>
    )
  }

  return (
    <section className={estilos.superficie} aria-labelledby="titulo-documentos">
      <div className={estilos.cabeceraSeccion}>
        <h2 id="titulo-documentos" className={estilos.tituloSeccion}>
          Reporte y documentos del proveedor
        </h2>
        {consulta.datos && consulta.datos.count > 0 && (
          <span className={estilos.ayuda}>
            {consulta.datos.count} {consulta.datos.count === 1 ? 'revisión' : 'revisiones'}
          </span>
        )}
      </div>
      {contenido}
    </section>
  )
}
