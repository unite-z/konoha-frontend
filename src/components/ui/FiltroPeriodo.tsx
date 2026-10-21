/**
 * FiltroPeriodo: barra de filtros con periodo «Desde» y «Hasta» y la acción primaria «Aplicar filtros»
 * (Guía de Estilo Web, secciones 5.3 y 5.4).
 *
 * - Valida antes de llamar a `onAplicar`: sin la consulta a la API si hay errores, y el foco pasa al primer
 *   campo con error.
 * - Si el back-end devuelve un 400 de todos modos, la página pasa sus mensajes en `erroresServidor` y se
 *   muestran junto al campo.
 * - `children` añade controles a la misma barra (por ejemplo, selectores de filtros opcionales), que se
 *   aplican con el mismo botón.
 */
import { useState, type FormEvent, type ReactNode } from 'react'
import Boton from './Boton'
import CampoFormulario from './CampoFormulario'
import { validarPeriodo, type ErroresPeriodo } from './validacionPeriodo'
import estilos from './FiltroPeriodo.module.css'

export type { ErroresPeriodo } from './validacionPeriodo'

export interface FiltroPeriodoProps {
  desde: string
  hasta: string
  onAplicar: (periodo: { desde: string; hasta: string }) => void
  erroresServidor?: ErroresPeriodo
  /** Prefijo de los ids de los campos (el campo «Desde» es `${idBase}-desde`). */
  idBase?: string
  /** Bloquea el botón mientras se consulta. */
  cargando?: boolean
  children?: ReactNode
}

export default function FiltroPeriodo({
  desde,
  hasta,
  onAplicar,
  erroresServidor,
  idBase = 'periodo',
  cargando = false,
  children,
}: FiltroPeriodoProps) {
  const [borradorDesde, setBorradorDesde] = useState(desde)
  const [borradorHasta, setBorradorHasta] = useState(hasta)
  const [errores, setErrores] = useState<ErroresPeriodo>({})

  // Si el periodo cambia desde fuera (URL), el formulario lo refleja (ajuste durante el render).
  const [periodoOrigen, setPeriodoOrigen] = useState(`${desde}|${hasta}`)
  if (periodoOrigen !== `${desde}|${hasta}`) {
    setPeriodoOrigen(`${desde}|${hasta}`)
    setBorradorDesde(desde)
    setBorradorHasta(hasta)
    setErrores({})
  }

  const idDesde = `${idBase}-desde`
  const idHasta = `${idBase}-hasta`

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    const nuevos = validarPeriodo(borradorDesde, borradorHasta)
    setErrores(nuevos)
    if (nuevos.desde) {
      document.getElementById(idDesde)?.focus()
      return
    }
    if (nuevos.hasta) {
      document.getElementById(idHasta)?.focus()
      return
    }
    onAplicar({ desde: borradorDesde, hasta: borradorHasta })
  }

  const errorDesde = errores.desde ?? erroresServidor?.desde
  const errorHasta = errores.hasta ?? erroresServidor?.hasta

  return (
    <form className={estilos.barra} onSubmit={enviar} noValidate aria-label="Filtros del reporte">
      <div className={estilos.fecha}>
        <CampoFormulario
          id={idDesde}
          etiqueta="Desde"
          type="date"
          obligatorio
          value={borradorDesde}
          onChange={(e) => setBorradorDesde(e.target.value)}
          error={errorDesde}
        />
      </div>
      <div className={estilos.fecha}>
        <CampoFormulario
          id={idHasta}
          etiqueta="Hasta"
          type="date"
          obligatorio
          value={borradorHasta}
          min={borradorDesde || undefined}
          onChange={(e) => setBorradorHasta(e.target.value)}
          error={errorHasta}
        />
      </div>
      {children}
      <div className={estilos.accion}>
        <Boton type="submit" variante="primario" cargando={cargando}>
          Aplicar filtros
        </Boton>
      </div>
    </form>
  )
}
