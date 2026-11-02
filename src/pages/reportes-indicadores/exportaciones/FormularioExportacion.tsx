/**
 * «Generar reporte» (RF-REP-009): tipo de reporte, sus filtros, el formato y el resumen de lo que se exporta
 * (criterio 2). Solo se pintan los filtros que admite el tipo elegido. La acción primaria de la pantalla.
 *
 * Errores: los del periodo o el mes junto al campo (antes de enviar y si el backend responde 400); volumen
 * excedido (A1) con «Cambiar a …» y «Acotar filtros»; sin datos (A2); el resto (E1) con «Reintentar». Los filtros
 * se conservan siempre.
 */
import { useState, type FormEvent } from 'react'
import SelectorFormato from '../../../components/reportes-indicadores/SelectorFormato'
import { useCatalogosFiltros } from '../../../components/reportes-indicadores/useCatalogosFiltros'
import { useGenerarExportacion } from '../../../components/reportes-indicadores/useGenerarExportacion'
import AvisoEnLinea from '../../../components/ui/AvisoEnLinea'
import Boton from '../../../components/ui/Boton'
import CampoFormulario from '../../../components/ui/CampoFormulario'
import Selector, { OPCION_TODOS } from '../../../components/ui/Selector'
import { useConsulta } from '../../../hooks/useConsulta'
import { obtenerCatalogoServicios } from '../../../services/api/reportesGestion'
import type { FormatoSalida, ReporteGenerado, TipoExportable } from '../../../types/exportaciones'
import { OPCIONES_MODALIDAD } from '../../../utils/estados'
import {
  clasificarErrorExportacion,
  formatoAlternativo,
  formatosPermitidos,
  parametrosParaTipo,
  resumenExportacion,
  TEXTO_FORMATO,
  validarExportacion,
  type CampoExportacion,
  type FiltrosExportacion,
} from '../../../utils/exportaciones'
import estilos from './Exportaciones.module.css'

const ID = (campo: CampoExportacion) => `exportacion-${campo}`

/** Orden en que se enfocan los campos con error. */
const ORDEN_CAMPOS: CampoExportacion[] = ['mes', 'desde', 'hasta', 'tipo_servicio_id', 'proveedor_id', 'area_verde_id', 'modalidad']

export interface FormularioExportacionProps {
  tipos: TipoExportable[]
  /** Valores iniciales (de la URL, para que otras pantallas enlacen con el formulario precargado). */
  tipoInicial: string
  filtrosIniciales: FiltrosExportacion
  formatoInicial: string
  onGenerado: (reporte: ReporteGenerado) => void
}

export default function FormularioExportacion({ tipos, tipoInicial, filtrosIniciales, formatoInicial, onGenerado }: FormularioExportacionProps) {
  const inicial = tipos.find((t) => t.tipo === tipoInicial && t.disponible) ?? tipos.find((t) => t.disponible) ?? tipos[0]
  const [claveTipo, setClaveTipo] = useState(inicial?.tipo ?? '')
  const [filtros, setFiltros] = useState<FiltrosExportacion>(filtrosIniciales)
  const [formatoElegido, setFormatoElegido] = useState(formatoInicial)
  const [errores, setErrores] = useState<Partial<Record<CampoExportacion, string>>>({})
  const { enviando, error, generar, limpiarError } = useGenerarExportacion()

  const espacios = useCatalogosFiltros()
  const servicios = useConsulta('catalogo-servicios-tercerizados', obtenerCatalogoServicios)
  const opciones = (lista: { id: number; nombre: string }[] | undefined) =>
    (lista ?? []).map((e) => ({ valor: String(e.id), texto: e.nombre }))
  const bloqueoServicios = servicios.estado === 'error' ? 'No se pudo cargar la lista. Vuelve a intentarlo más tarde' : undefined

  const tipo = tipos.find((t) => t.tipo === claveTipo)
  if (!tipo) return null
  const formatos = formatosPermitidos(tipo)
  const formato: FormatoSalida = formatos.find((f) => f === formatoElegido) ?? formatos[0] ?? 'PDF'
  const parametros = parametrosParaTipo(tipo, filtros)
  const catalogos = {
    servicios: new Map((servicios.datos?.tipos_servicio ?? []).map((t) => [t.id, t.nombre])),
    proveedores: new Map((servicios.datos?.proveedores ?? []).map((p) => [p.id, p.nombre])),
    espacios: new Map(espacios.espacios.map((o) => [Number(o.valor), o.texto])),
  }
  const clase = error ? clasificarErrorExportacion(error) : null
  const alternativo = formatoAlternativo(tipo, formato)
  const admite = (filtro: TipoExportable['filtros'][number]) => tipo.filtros.includes(filtro)
  const erroresServidor = clase === 'campos' ? error?.errores_campo : undefined
  const errorDe = (campo: CampoExportacion) => errores[campo] ?? erroresServidor?.[campo]?.[0]

  function cambiar(campo: CampoExportacion, valor: string) {
    setFiltros((actual) => ({ ...actual, [campo]: valor }))
    setErrores((actual) => ({ ...actual, [campo]: undefined }))
    limpiarError()
  }

  function enfocarPrimerFiltro() {
    const campo = ORDEN_CAMPOS.find((c) => document.getElementById(ID(c)))
    if (campo) document.getElementById(ID(campo))?.focus()
  }

  async function enviar(evento?: FormEvent) {
    evento?.preventDefault()
    if (!tipo || !tipo.disponible || enviando) return
    const nuevos = validarExportacion(tipo, filtros)
    setErrores(nuevos)
    const primero = ORDEN_CAMPOS.find((c) => nuevos[c])
    if (primero) {
      document.getElementById(ID(primero))?.focus()
      return
    }
    const reporte = await generar({ tipo: tipo.tipo, formato, parametros })
    if (reporte) onGenerado(reporte)
  }

  return (
    <form className={estilos.formulario} onSubmit={(e) => void enviar(e)} noValidate aria-labelledby="titulo-generar">
      <h2 id="titulo-generar" className={estilos.tituloZona}>
        Generar reporte
      </h2>
      <div className={estilos.columnas}>
        <div className={estilos.columna}>
          <fieldset className={estilos.grupo}>
            <legend className={estilos.leyenda}>Tipo de reporte</legend>
            <ul className={estilos.tipos}>
              {tipos.map((t) => {
                const activo = t.tipo === claveTipo
                return (
                  <li key={t.tipo} className={`${estilos.tipo} ${activo ? estilos.tipoActivo : ''} ${t.disponible ? '' : estilos.tipoInactivo}`}>
                    <label className={estilos.etiquetaTipo}>
                      <input
                        type="radio"
                        name="exportacion-tipo"
                        value={t.tipo}
                        checked={activo}
                        disabled={!t.disponible}
                        onChange={() => {
                          setClaveTipo(t.tipo)
                          setErrores({})
                          limpiarError()
                        }}
                      />
                      <span className={estilos.textoTipo}>
                        <span className={estilos.nombreTipo}>{t.nombre}</span>
                        <span className={estilos.descripcionTipo}>{t.disponible ? t.descripcion : t.motivo_no_disponible}</span>
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </fieldset>
          <SelectorFormato
            nombre="exportacion"
            formatos={formatos}
            valor={formato}
            onCambiar={(nuevo) => {
              setFormatoElegido(nuevo)
              limpiarError()
            }}
          />
        </div>

        <div className={estilos.columna}>
          <p className={estilos.leyenda}>Periodo y filtros</p>
          {admite('mes') && (
            <CampoFormulario
              id={ID('mes')}
              etiqueta="Mes"
              type="month"
              obligatorio
              ayuda="Formato AAAA-MM"
              value={filtros.mes}
              error={errorDe('mes')}
              onChange={(e) => cambiar('mes', e.target.value)}
            />
          )}
          {admite('periodo') && (
            <div className={estilos.periodo}>
              <CampoFormulario id={ID('desde')} etiqueta="Desde" type="date" obligatorio value={filtros.desde} error={errorDe('desde')} onChange={(e) => cambiar('desde', e.target.value)} />
              <CampoFormulario id={ID('hasta')} etiqueta="Hasta" type="date" obligatorio value={filtros.hasta} error={errorDe('hasta')} onChange={(e) => cambiar('hasta', e.target.value)} />
            </div>
          )}
          {admite('tipo_servicio_id') && (
            <Selector id={ID('tipo_servicio_id')} etiqueta="Servicio" valor={filtros.tipo_servicio_id} opciones={opciones(servicios.datos?.tipos_servicio)} opcionTodos={OPCION_TODOS} bloqueadoMotivo={bloqueoServicios} onCambiar={(v) => cambiar('tipo_servicio_id', v)} />
          )}
          {admite('proveedor_id') && (
            <Selector id={ID('proveedor_id')} etiqueta="Proveedor" valor={filtros.proveedor_id} opciones={opciones(servicios.datos?.proveedores)} opcionTodos={OPCION_TODOS} bloqueadoMotivo={bloqueoServicios} onCambiar={(v) => cambiar('proveedor_id', v)} />
          )}
          {admite('area_verde_id') && (
            <Selector id={ID('area_verde_id')} etiqueta="Espacio" valor={filtros.area_verde_id} opciones={espacios.espacios} opcionTodos={OPCION_TODOS} ayuda={espacios.ayudaEspacios} bloqueadoMotivo={espacios.motivoBloqueoEspacios} onCambiar={(v) => cambiar('area_verde_id', v)} />
          )}
          {admite('modalidad') && (
            <Selector id={ID('modalidad')} etiqueta="Modalidad" valor={filtros.modalidad} opciones={OPCIONES_MODALIDAD} opcionTodos={OPCION_TODOS} onCambiar={(v) => cambiar('modalidad', v)} />
          )}
        </div>
      </div>

      <p className={estilos.resumen}>
        <span className={estilos.etiquetaResumen}>Se exportará:</span> {resumenExportacion(tipo, parametros, catalogos, formato)}
      </p>

      {clase === 'volumen' && (
        <div className={estilos.avisoAcciones}>
          <AvisoEnLinea
            tono="advertencia"
            titulo="El reporte es demasiado grande para este formato"
            accion={alternativo ? { texto: `Cambiar a ${TEXTO_FORMATO[alternativo]}`, onClick: () => { setFormatoElegido(alternativo); limpiarError() } } : undefined}
          >
            {error?.detalle}
          </AvisoEnLinea>
          <Boton variante="terciario" onClick={enfocarPrimerFiltro}>
            Acotar filtros
          </Boton>
        </div>
      )}
      {clase === 'sin-datos' && <AvisoEnLinea tono="info">{error?.detalle}</AvisoEnLinea>}
      {clase === 'general' && (
        <AvisoEnLinea tono="error" titulo="No se pudo generar el reporte" accion={{ texto: 'Reintentar', onClick: () => void enviar() }}>
          {error?.detalle}
        </AvisoEnLinea>
      )}

      <div className={estilos.accion}>
        <Boton type="submit" variante="primario" cargando={enviando}>
          Generar reporte
        </Boton>
      </div>
    </form>
  )
}
