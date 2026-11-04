// RF-T-009 · Importación repetible desde Excel (HU-MOD01-011)
/**
 * Asistente de tres pasos: carga, validación y resultado. Validar no toca datos oficiales: el backend clasifica cada
 * fila y solo las válidas se incorporan al confirmar. Cada tipo exige su permiso: la API responde 403 si falta.
 */
import { useState } from 'react'
import AsistentePasos from '../../components/ui/AsistentePasos'
import AvisoEnLinea from '../../components/ui/AvisoEnLinea'
import Boton from '../../components/ui/Boton'
import Estado, { type EstadoProps } from '../../components/ui/Estado'
import ListaDescripcion from '../../components/ui/ListaDescripcion'
import Selector from '../../components/ui/Selector'
import TablaDatos, { type ColumnaTabla } from '../../components/ui/TablaDatos'
import Tarjeta from '../../components/ui/Tarjeta'
import TarjetaIndicador from '../../components/ui/TarjetaIndicador'
import ZonaCarga from '../../components/ui/ZonaCarga'
import { useConsulta } from '../../hooks/useConsulta'
import { usePaginaActual } from '../../hooks/usePaginaActual'
import { MIGAS_CORE } from '../../router/rutasApp'
import { aErrorApi } from '../../services/api/cliente'
import { confirmarImportacion, listarFilasImportacion, validarImportacion } from '../../services/api/core'
import type { FilaImportacion, Importacion, ResultadoFilaImportacion, TipoImportacion } from '../../types/core'
import { formatearFechaHora, SIN_VALOR } from '../../utils/formato'
import estilos from './UsuariosRoles.module.css'

const TITULO = 'Importar información'
const PASOS = ['Carga', 'Validación', 'Resultado']
const FILAS_POR_PAGINA = 25

const TIPOS: { valor: TipoImportacion; texto: string; ayuda: string }[] = [
  { valor: 'catastro', texto: 'Catastro de ejemplares', ayuda: 'Permite altas y actualizaciones periódicas.' },
  { valor: 'inventario', texto: 'Inventario de áreas verdes', ayuda: 'Reconoce cada área por su nombre y lugar.' },
  { valor: 'partes', texto: 'Partes de mantenimiento', ayuda: 'Los participantes se registran en Operación de campo.' },
]

const TONO_RESULTADO: Record<ResultadoFilaImportacion, EstadoProps['tono']> = {
  Alta: 'info',
  Actualización: 'exito',
  'Sin cambios': 'neutro',
  Revisar: 'aviso',
  Error: 'error',
}

const COLUMNAS: ColumnaTabla<FilaImportacion>[] = [
  { clave: 'fila', titulo: 'Fila', alineacion: 'derecha' },
  { clave: 'codigo', titulo: 'Código', render: (f) => f.codigo ?? SIN_VALOR },
  {
    clave: 'resultado',
    titulo: 'Resultado',
    render: (f) => <Estado tono={TONO_RESULTADO[f.resultado]} texto={f.resultado} />,
  },
  { clave: 'detalle', titulo: 'Detalle', multilinea: true, render: (f) => f.detalle || SIN_VALOR },
]

function PasoValidacion({
  importacion,
  enviando,
  onConfirmar,
  onCambiarArchivo,
}: {
  importacion: Importacion
  enviando: boolean
  onConfirmar: () => void
  onCambiarArchivo: () => void
}) {
  const [pagina, setPagina] = useState(1)
  const consulta = useConsulta(`importacion-${importacion.id}-${pagina}`, (signal) =>
    listarFilasImportacion(importacion.id, pagina, signal),
  )
  const validas = importacion.altas + importacion.actualizaciones
  const sinIncorporar = importacion.errores + importacion.revisar

  return (
    <>
      <div className={estilos.indicadores}>
        <TarjetaIndicador etiqueta="Filas revisadas" valor={importacion.total} />
        <TarjetaIndicador etiqueta="Altas" valor={importacion.altas} />
        <TarjetaIndicador etiqueta="Actualizaciones" valor={importacion.actualizaciones} />
        <TarjetaIndicador etiqueta="Con errores o por revisar" valor={sinIncorporar} />
      </div>
      <TablaDatos
        titulo="Resultado de cada fila"
        columnas={COLUMNAS}
        filas={consulta.datos?.results ?? []}
        claveFila={(f) => String(f.fila)}
        estado={consulta.estado === 'error' ? 'error' : consulta.estado === 'cargando' && !consulta.datos ? 'cargando' : 'exito'}
        error={{ titulo: 'No se pudo cargar el informe', descripcion: consulta.error?.detalle ?? '', onReintentar: consulta.reintentar }}
        paginacionServidor={{
          pagina,
          total: consulta.datos?.count ?? 0,
          porPagina: FILAS_POR_PAGINA,
          onCambiarPagina: setPagina,
        }}
      />
      {sinIncorporar > 0 && <AvisoEnLinea tono="advertencia">Los registros con errores o por revisar no se incorporarán.</AvisoEnLinea>}
      <div className={estilos.acciones}>
        <Boton
          cargando={enviando}
          deshabilitado={validas === 0}
          ayudaDeshabilitado={validas === 0 ? 'No hay registros nuevos ni cambios que incorporar.' : undefined}
          onClick={onConfirmar}
        >
          Confirmar registros válidos
        </Boton>
        <Boton variante="secundario" onClick={onCambiarArchivo}>
          Cambiar archivo
        </Boton>
      </div>
    </>
  )
}

function PasoResultado({ importacion, onOtra }: { importacion: Importacion; onOtra: () => void }) {
  return (
    <>
      <AvisoEnLinea tono="exito" titulo="Importación finalizada">
        La información válida se ha incorporado.
      </AvisoEnLinea>
      <div className={estilos.indicadores}>
        <TarjetaIndicador etiqueta="Registros creados" valor={importacion.altas} />
        <TarjetaIndicador etiqueta="Registros actualizados" valor={importacion.actualizaciones} />
        <TarjetaIndicador etiqueta="Sin cambios" valor={importacion.sin_cambios} />
        <TarjetaIndicador etiqueta="Pendientes de corrección" valor={importacion.errores + importacion.revisar} />
      </div>
      <Tarjeta>
        <ListaDescripcion
          elementos={[
            { etiqueta: 'Archivo', valor: importacion.archivo },
            { etiqueta: 'Responsable', valor: importacion.usuario },
            { etiqueta: 'Fecha y hora', valor: formatearFechaHora(importacion.fecha_confirmacion ?? importacion.fecha_creacion) },
          ]}
        />
      </Tarjeta>
      <div className={estilos.acciones}>
        <Boton onClick={onOtra}>Realizar otra importación</Boton>
      </div>
    </>
  )
}

export default function ImportacionPage() {
  usePaginaActual(TITULO, [MIGAS_CORE.usuariosRoles, { texto: TITULO }])
  const [tipo, setTipo] = useState<TipoImportacion>('catastro')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [importacion, setImportacion] = useState<Importacion | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const paso = importacion === null ? 0 : importacion.estado === 'Validada' ? 1 : 2

  async function ejecutar(accion: () => Promise<Importacion>) {
    setEnviando(true)
    setError(null)
    try {
      setImportacion(await accion())
    } catch (causa) {
      setError(aErrorApi(causa).detalle)
    } finally {
      setEnviando(false)
    }
  }

  function reiniciar() {
    setImportacion(null)
    setArchivo(null)
    setError(null)
  }

  return (
    <div className={estilos.pagina}>
      <AsistentePasos pasos={PASOS} actual={paso} alcanzado={paso} onIrA={(indice) => indice === 0 && paso === 1 && reiniciar()} />
      {error && <AvisoEnLinea tono="error">{error}</AvisoEnLinea>}
      {paso === 0 && (
        <Tarjeta>
          <div className={estilos.pagina}>
            <Selector
              id="importacion-tipo"
              etiqueta="Tipo de información"
              valor={tipo}
              opciones={TIPOS.map(({ valor, texto }) => ({ valor, texto }))}
              onCambiar={(valor) => setTipo(valor as TipoImportacion)}
            />
            <ZonaCarga acepta=".xlsx" ayuda="Archivo .xlsx de hasta 10 MB." onArchivos={([elegido]) => elegido && setArchivo(elegido)} />
            {archivo && <p>Archivo elegido: {archivo.name}</p>}
            <p className={estilos.ayuda}>{TIPOS.find((t) => t.valor === tipo)?.ayuda}</p>
            <div className={estilos.acciones}>
              <Boton
                cargando={enviando}
                deshabilitado={archivo === null}
                ayudaDeshabilitado={archivo === null ? 'Elige un archivo para validarlo.' : undefined}
                onClick={() => archivo && void ejecutar(() => validarImportacion(tipo, archivo))}
              >
                Validar archivo
              </Boton>
            </div>
          </div>
        </Tarjeta>
      )}
      {paso === 1 && importacion && (
        <PasoValidacion
          importacion={importacion}
          enviando={enviando}
          onConfirmar={() => void ejecutar(() => confirmarImportacion(importacion.id))}
          onCambiarArchivo={reiniciar}
        />
      )}
      {paso === 2 && importacion && <PasoResultado importacion={importacion} onOtra={reiniciar} />}
    </div>
  )
}
