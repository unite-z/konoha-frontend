/**
 * FiltroMes: barra de filtros de un reporte mensual, con el campo «Mes» (`AAAA-MM`) y la acción primaria
 * «Aplicar filtros» (Guía de Estilo Web, secciones 5.3 y 5.4).
 *
 * Existe porque `FiltroPeriodo` exige «Desde» y «Hasta», y un reporte mensual (RF-REP-005) pide un solo mes.
 * Tiene la misma forma y el mismo comportamiento:
 * - valida antes de llamar a `onAplicar`: con error no se consulta la API y el foco pasa al campo;
 * - si el back-end devuelve un 400 de todos modos, la página pasa su mensaje en `errorServidor`;
 * - `children` añade controles a la misma barra (por ejemplo, el selector de espacio).
 *
 * En los navegadores sin selector de mes, `type="month"` se comporta como un campo de texto: la ayuda indica el
 * formato.
 */
import { useState, type FormEvent, type ReactNode } from 'react'
import { validarMes } from '../../utils/reportesGestion'
import Boton from './Boton'
import CampoFormulario from './CampoFormulario'
import estilos from './FiltroMes.module.css'

export interface FiltroMesProps {
  mes: string
  onAplicar: (mes: string) => void
  /** Mensaje del back-end sobre el mes (`errores.mes`). */
  errorServidor?: string
  /** Prefijo del id del campo (el campo es `${idBase}-mes`). */
  idBase?: string
  /** Bloquea el botón mientras se consulta. */
  cargando?: boolean
  children?: ReactNode
}

export default function FiltroMes({ mes, onAplicar, errorServidor, idBase = 'filtro', cargando = false, children }: FiltroMesProps) {
  const [borrador, setBorrador] = useState(mes)
  const [error, setError] = useState<string | undefined>()

  // Si el mes cambia desde fuera (URL), el formulario lo refleja (ajuste durante el render).
  const [mesOrigen, setMesOrigen] = useState(mes)
  if (mesOrigen !== mes) {
    setMesOrigen(mes)
    setBorrador(mes)
    setError(undefined)
  }

  const idMes = `${idBase}-mes`

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    const nuevo = validarMes(borrador)
    setError(nuevo)
    if (nuevo) {
      document.getElementById(idMes)?.focus()
      return
    }
    onAplicar(borrador)
  }

  return (
    <form className={estilos.barra} onSubmit={enviar} noValidate aria-label="Filtros del reporte">
      <div className={estilos.campo}>
        <CampoFormulario
          id={idMes}
          etiqueta="Mes"
          type="month"
          obligatorio
          ayuda="Formato AAAA-MM"
          value={borrador}
          onChange={(e) => setBorrador(e.target.value)}
          error={error ?? errorServidor}
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
