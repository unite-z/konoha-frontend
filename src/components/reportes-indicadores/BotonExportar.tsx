/**
 * BotonExportar (RF-REP-009, CU-MOD06-004): «Exportar» desde un reporte del MOD-06. Abre un diálogo con el
 * resumen de los filtros actuales y la elección del formato, y «Generar y descargar» crea el archivo con esos
 * mismos filtros (criterio 2).
 *
 * - Sin el permiso de exportar no se pinta (con datos simulados basta el de consulta: `puedeExportar`).
 * - Con `sinDatos`, deshabilitado con su motivo (A2).
 * - Volumen excedido (A1): aviso con «Cambiar a …»; otro error (E1): aviso y se puede reintentar.
 */
import { useState } from 'react'
import { puedeExportar } from '@/config/permisos'
import { useConsulta } from '@/hooks/useConsulta'
import { listarTiposExportables } from '@/services/api/exportaciones'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import type { FormatoSalida, ParametrosExportacion, TipoReporte } from '@/types/exportaciones'
import { clasificarErrorExportacion, formatoAlternativo, formatosPermitidos, TEXTO_FORMATO } from '@/utils/exportaciones'
import AvisoEnLinea from '../ui/AvisoEnLinea'
import AvisoTemporal from '../ui/AvisoTemporal'
import Boton from '../ui/Boton'
import DialogoFormulario from '../ui/DialogoFormulario'
import Icono from '../ui/Icono'
import AyudaEmergente from './AyudaEmergente'
import SelectorFormato from './SelectorFormato'
import { useGenerarExportacion } from './useGenerarExportacion'
import estilos from './BotonExportar.module.css'

const MOTIVO_SIN_DATOS = 'No hay datos para exportar con estos filtros'

export interface BotonExportarProps {
  tipo: TipoReporte
  /** Periodo y filtros de la consulta que se está viendo. */
  parametros: ParametrosExportacion
  /** Texto legible de esos filtros, para el resumen del diálogo. */
  resumen: string
  sinDatos: boolean
}

export default function BotonExportar({ tipo, parametros, resumen, sinDatos }: BotonExportarProps) {
  const sesion = useSesionActiva()
  const [abierto, setAbierto] = useState(false)
  const [formatoElegido, setFormatoElegido] = useState<FormatoSalida>('PDF')
  const [aviso, setAviso] = useState<string | null>(null)
  const { enviando, error, generar, limpiarError } = useGenerarExportacion()
  const tipos = useConsulta(abierto ? 'exportaciones-tipos' : null, listarTiposExportables)

  if (!puedeExportar(sesion)) return null

  const tipoExportable = tipos.datos?.find((t) => t.tipo === tipo)
  const formatos: FormatoSalida[] = tipoExportable ? formatosPermitidos(tipoExportable) : ['PDF', 'Excel']
  const formato = formatos.includes(formatoElegido) ? formatoElegido : (formatos[0] ?? 'PDF')
  const clase = error ? clasificarErrorExportacion(error) : null
  const alternativo = tipoExportable ? formatoAlternativo(tipoExportable, formato) : null

  function cerrar() {
    setAbierto(false)
    limpiarError()
  }

  async function enviar() {
    if (tipoExportable && !tipoExportable.disponible) return
    const reporte = await generar({ tipo, formato, parametros })
    if (!reporte) return
    setAbierto(false)
    setAviso(`Reporte generado: ${reporte.archivo?.nombre ?? reporte.etiqueta_tipo}`)
  }

  return (
    <>
      <span className={estilos.contenedor}>
        <Boton variante="secundario" deshabilitado={sinDatos} onClick={() => setAbierto(true)}>
          <Icono nombre="documento" /> Exportar
        </Boton>
        {sinDatos && <AyudaEmergente id={`exportar-${tipo}-sin-datos`} tema="la exportación" texto={MOTIVO_SIN_DATOS} />}
      </span>

      <DialogoFormulario
        abierto={abierto}
        titulo="Exportar reporte"
        descripcion={resumen}
        textoConfirmar="Generar y descargar"
        enviando={enviando}
        error={clase === 'general' || clase === 'campos' ? { titulo: 'No se pudo generar el reporte', detalle: error?.detalle ?? '' } : null}
        onEnviar={() => void enviar()}
        onCerrar={cerrar}
      >
        {tipoExportable && !tipoExportable.disponible ? (
          <AvisoEnLinea tono="info">{tipoExportable.motivo_no_disponible ?? 'Este reporte aún no se puede exportar'}</AvisoEnLinea>
        ) : (
          <SelectorFormato
            nombre={`exportar-${tipo}`}
            formatos={formatos}
            valor={formato}
            onCambiar={(nuevo) => {
              setFormatoElegido(nuevo)
              limpiarError()
            }}
          />
        )}
        {clase === 'volumen' && (
          <AvisoEnLinea
            tono="advertencia"
            titulo="El reporte es demasiado grande para este formato"
            accion={
              alternativo
                ? {
                    texto: `Cambiar a ${TEXTO_FORMATO[alternativo]}`,
                    onClick: () => {
                      setFormatoElegido(alternativo)
                      limpiarError()
                    },
                  }
                : undefined
            }
          >
            {error?.detalle} Para acotar los filtros, cierra este diálogo y cámbialos en el reporte.
          </AvisoEnLinea>
        )}
        {clase === 'sin-datos' && <AvisoEnLinea tono="info">{error?.detalle}</AvisoEnLinea>}
      </DialogoFormulario>

      <AvisoTemporal mensaje={aviso} onCerrar={() => setAviso(null)} />
    </>
  )
}
