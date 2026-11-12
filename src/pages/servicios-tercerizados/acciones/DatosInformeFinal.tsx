// RF-SER-009 · Datos del informe final según el formato estándar del tipo de servicio
/**
 * Sección del diálogo «Adjuntar reporte» que pide los datos mínimos del informe final (CU-MOD05-006, pasos 2 a 4).
 * Solo se muestra cuando algún documento es «Informe final» y el tipo de servicio tiene formato vigente.
 *
 * - Cada campo se pinta según su tipo de dato: número con teclado numérico, fecha, sí/no, texto o texto largo.
 * - Los campos `JSON` (por ejemplo, «Productos aplicados») son listas de filas: cada fila tiene sus datos y se
 *   agregan o quitan con un botón. Empiezan con una fila, para escribir directamente.
 * - Un indicador cuenta los obligatorios completos, para saber de un vistazo cuánto falta.
 * - Es un componente controlado: el diálogo guarda el borrador, valida al enviar y lleva el foco al primer error.
 */
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Badge from '@/components/ui/Badge'
import Boton from '@/components/ui/Boton'
import CampoFormulario, { AreaTexto } from '@/components/ui/CampoFormulario'
import GrupoOpciones from '@/components/ui/GrupoOpciones'
import Selector from '@/components/ui/Selector'
import type { CampoFormatoReporte, FormatoReporte, SubcampoFormato, TipoDatoFormato } from '@/types/tercerizados'
import {
  LARGO_MAXIMO_TEXTO,
  LARGO_MAXIMO_TEXTO_LARGO,
  MAXIMO_DECIMALES,
  MAXIMO_FILAS,
  avanceObligatorios,
  etiquetaSubcampo,
  filaVacia,
  idCampo,
  idSubcampo,
  type BorradorDatos,
  type ErroresDatos,
  type FilaBorrador,
  type ValorBorrador,
} from '@/utils/datosInformeFinal'
import { formatearNumero } from '@/utils/formato'
import estilos from './Acciones.module.css'

const OPCIONES_SI_NO = [
  { valor: 'si', texto: 'Sí' },
  { valor: 'no', texto: 'No' },
] as const

export interface DatosInformeFinalProps {
  formato: FormatoReporte
  borrador: BorradorDatos
  errores: ErroresDatos
  /** Revisión de la que vienen los datos propuestos, si se partió de una anterior. */
  revisionAnterior: number | null
  deshabilitado: boolean
  onCambiar: (nombreCampo: string, valor: ValorBorrador) => void
}

interface PropsControl {
  id: string
  etiqueta: string
  tipo: TipoDatoFormato
  obligatorio?: boolean
  ayuda?: string
  valor: string
  error?: string
  deshabilitado: boolean
  onCambiar: (valor: string) => void
}

/** Control de un dato simple según su tipo. */
function Control({ id, etiqueta, tipo, obligatorio, ayuda, valor, error, deshabilitado, onCambiar }: PropsControl) {
  if (tipo === 'Booleano')
    return (
      <GrupoOpciones
        idBase={id}
        etiqueta={etiqueta}
        obligatorio={obligatorio}
        opciones={[...OPCIONES_SI_NO]}
        valor={valor === 'si' || valor === 'no' ? valor : null}
        onCambiar={onCambiar}
        error={error}
        deshabilitado={deshabilitado}
        horizontal
        segmentado
      />
    )
  if (tipo === 'Texto largo')
    return (
      <AreaTexto
        id={id}
        etiqueta={etiqueta}
        obligatorio={obligatorio}
        ayuda={ayuda}
        maxLength={LARGO_MAXIMO_TEXTO_LARGO}
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        error={error}
        disabled={deshabilitado}
      />
    )
  return (
    <CampoFormulario
      id={id}
      etiqueta={etiqueta}
      obligatorio={obligatorio}
      ayuda={ayuda}
      type={tipo === 'Fecha' ? 'date' : 'text'}
      formato={tipo === 'Entero' ? 'entero' : tipo === 'Decimal' ? 'decimal' : undefined}
      decimales={tipo === 'Decimal' ? MAXIMO_DECIMALES : undefined}
      maxLength={tipo === 'Texto' ? LARGO_MAXIMO_TEXTO : undefined}
      value={valor}
      onChange={(e) => onCambiar(e.target.value)}
      error={error}
      disabled={deshabilitado}
    />
  )
}

/** Control de un dato dentro de una fila: los sí/no van como selector para que la fila no crezca. */
function ControlFila(props: PropsControl & { subcampo: SubcampoFormato }) {
  const { subcampo, ...control } = props
  if (subcampo.tipo_dato === 'Booleano')
    return (
      <Selector
        id={control.id}
        etiqueta={control.etiqueta}
        valor={control.valor}
        opciones={[...OPCIONES_SI_NO]}
        opcionTodos="Sin indicar"
        onCambiar={control.onCambiar}
        error={control.error}
        disabled={control.deshabilitado}
      />
    )
  return <Control {...control} tipo={subcampo.tipo_dato === 'Texto largo' ? 'Texto' : subcampo.tipo_dato} />
}

interface PropsLista {
  campo: CampoFormatoReporte
  indice: number
  filas: FilaBorrador[]
  errores: ErroresDatos
  deshabilitado: boolean
  onCambiar: (filas: FilaBorrador[]) => void
}

/** Campo `JSON`: lista de filas con un dato por subcampo. */
function Lista({ campo, indice, filas, errores, deshabilitado, onCambiar }: PropsLista) {
  const subcampos = campo.subcampos ?? []
  const idTitulo = `${idCampo(indice)}-titulo`
  const errorLista = errores[idCampo(indice)]

  function cambiarValor(clave: string, subcampo: string, valor: string) {
    onCambiar(filas.map((f) => (f.clave === clave ? { ...f, valores: { ...f.valores, [subcampo]: valor } } : f)))
  }

  function agregar() {
    const nueva = filaVacia()
    onCambiar([...filas, nueva])
    // Tras pintar la fila nueva, el foco va a su primer dato para seguir escribiendo.
    requestAnimationFrame(() => document.getElementById(idSubcampo(indice, nueva.clave, 0))?.focus())
  }

  function quitar(clave: string) {
    const restantes = filas.filter((f) => f.clave !== clave)
    onCambiar(restantes)
    requestAnimationFrame(() => document.getElementById(idCampo(indice))?.focus())
  }

  return (
    <section aria-labelledby={idTitulo} className={estilos.listaDatos}>
      <div className={estilos.cabeceraLista}>
        <h4 id={idTitulo} className={estilos.tituloLista}>
          {campo.nombre_campo}
          {campo.obligatorio && (
            <span className={estilos.asterisco} aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </h4>
        <span className={estilos.ayuda}>
          {filas.length === 1 ? '1 fila' : `${formatearNumero(filas.length)} filas`}
        </span>
      </div>
      {filas.length > 0 && (
        <ol className={estilos.filasDatos}>
          {filas.map((fila, posicion) => (
            <li key={fila.clave} className={estilos.filaDatos} aria-label={`${campo.nombre_campo}, fila ${posicion + 1}`}>
              <div className={estilos.camposFila}>
                {subcampos.map((sub, subindice) => {
                  const id = idSubcampo(indice, fila.clave, subindice)
                  return (
                    <ControlFila
                      key={sub.nombre}
                      id={id}
                      subcampo={sub}
                      etiqueta={etiquetaSubcampo(sub)}
                      tipo={sub.tipo_dato}
                      valor={fila.valores[sub.nombre] ?? ''}
                      error={errores[id]}
                      deshabilitado={deshabilitado}
                      onCambiar={(valor) => cambiarValor(fila.clave, sub.nombre, valor)}
                    />
                  )
                })}
              </div>
              <Boton
                variante="fantasma"
                compacto
                className={estilos.quitarFila}
                deshabilitado={deshabilitado}
                aria-label={`Quitar la fila ${posicion + 1} de ${campo.nombre_campo}`}
                onClick={() => quitar(fila.clave)}
              >
                Quitar
              </Boton>
            </li>
          ))}
        </ol>
      )}
      <div>
        <Boton
          id={idCampo(indice)}
          variante="secundario"
          icono="plus"
          deshabilitado={deshabilitado || filas.length >= MAXIMO_FILAS}
          aria-label={`Agregar fila a ${campo.nombre_campo}`}
          aria-describedby={errorLista ? `${idCampo(indice)}-error` : undefined}
          onClick={agregar}
        >
          Agregar fila
        </Boton>
      </div>
      {errorLista && (
        <p id={`${idCampo(indice)}-error`} className={estilos.error}>
          {errorLista}
        </p>
      )}
    </section>
  )
}

export default function DatosInformeFinal({ formato, borrador, errores, revisionAnterior, deshabilitado, onCambiar }: DatosInformeFinalProps) {
  const { completos, total } = avanceObligatorios(formato, borrador)
  const simples = formato.campos.map((campo, indice) => ({ campo, indice })).filter(({ campo }) => campo.tipo_dato !== 'JSON')
  const listas = formato.campos.map((campo, indice) => ({ campo, indice })).filter(({ campo }) => campo.tipo_dato === 'JSON')

  return (
    <section aria-labelledby="titulo-datos-informe" className={estilos.datosInforme}>
      <div className={estilos.cabeceraDatos}>
        <div className={estilos.textosDatos}>
          <h3 id="titulo-datos-informe" className={estilos.tituloDocumentos}>
            Datos del informe final
          </h3>
          <p className={estilos.ayuda}>
            Copia los datos tal como figuran en el informe del proveedor. Formato estándar de {formato.tipo_servicio_nombre} ·
            versión {formatearNumero(formato.version)}.
          </p>
        </div>
        {total > 0 && (
          <Badge
            tono={completos === total ? 'exito' : 'neutral'}
            texto={`${formatearNumero(completos)} de ${formatearNumero(total)} obligatorios`}
          />
        )}
      </div>

      {revisionAnterior !== null && (
        <AvisoEnLinea tono="info" compacto>
          Partimos de los datos de la revisión {formatearNumero(revisionAnterior)}. Corrige solo lo que cambió.
        </AvisoEnLinea>
      )}

      {simples.length > 0 && (
        <div className={estilos.camposDatos}>
          {simples.map(({ campo, indice }) => {
            const valor = borrador[campo.nombre_campo]
            return (
              <div key={campo.nombre_campo} className={campo.tipo_dato === 'Texto largo' ? estilos.campoAncho : undefined}>
                <Control
                  id={idCampo(indice)}
                  etiqueta={campo.nombre_campo}
                  tipo={campo.tipo_dato}
                  obligatorio={campo.obligatorio}
                  ayuda={campo.tipo_dato === 'Decimal' ? 'Solo el número, sin la unidad' : undefined}
                  valor={typeof valor === 'string' ? valor : ''}
                  error={errores[idCampo(indice)]}
                  deshabilitado={deshabilitado}
                  onCambiar={(nuevo) => onCambiar(campo.nombre_campo, nuevo)}
                />
              </div>
            )
          })}
        </div>
      )}

      {listas.map(({ campo, indice }) => {
        const valor = borrador[campo.nombre_campo]
        return (
          <Lista
            key={campo.nombre_campo}
            campo={campo}
            indice={indice}
            filas={Array.isArray(valor) ? valor : []}
            errores={errores}
            deshabilitado={deshabilitado}
            onCambiar={(filas) => onCambiar(campo.nombre_campo, filas)}
          />
        )
      })}
    </section>
  )
}
