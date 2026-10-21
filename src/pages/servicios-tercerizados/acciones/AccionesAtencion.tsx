// RF-SER-004, 005, 006 y 011 · Acciones de la ficha
/**
 * Botones de las acciones disponibles según rol y estado (`config/permisosTercerizados.ts`) y sus diálogos.
 * Una sola acción primaria: el siguiente paso del ciclo; las demás, secundarias. Lo que el estado aún no
 * permite se muestra deshabilitado con su motivo.
 *
 * Corregir origen y registrar el acuerdo de la unidad son exclusivos del jefe de sección.
 */
import { useId, useState } from 'react'
import Boton from '../../../components/ui/Boton'
import { disponibilidad } from '../../../config/permisosTercerizados'
import type { Atencion, ReporteProveedor, RolTercerizados } from '../../../types/tercerizados'
import DialogoAcuerdo from './DialogoAcuerdo'
import DialogoEjecucion from './DialogoEjecucion'
import DialogoOrdenCompra from './DialogoOrdenCompra'
import DialogoOrigen from './DialogoOrigen'
import DialogoReporte from './DialogoReporte'
import estilos from '../Tercerizados.module.css'

type Dialogo = 'ordenCompra' | 'inicio' | 'fin' | 'reporte' | 'origen' | 'acuerdo' | null

export interface AccionesAtencionProps {
  atencion: Atencion
  rol: RolTercerizados | null
  onActualizada: (atencion: Atencion) => void
  onExito: (mensaje: string) => void
  /** Se registró una revisión del reporte (la sección de documentos se recarga). */
  onReporteAdjunto: (reporte: ReporteProveedor | null) => void
}

export default function AccionesAtencion({ atencion, rol, onActualizada, onExito, onReporteAdjunto }: AccionesAtencionProps) {
  const [abierto, setAbierto] = useState<Dialogo>(null)
  const idMotivos = useId()

  const oc = disponibilidad('ordenCompra', rol, atencion)
  const inicio = disponibilidad('inicio', rol, atencion)
  const fin = disponibilidad('fin', rol, atencion)
  const reporte = disponibilidad('adjuntarReporte', rol, atencion)
  const origen = disponibilidad('corregirOrigen', rol, atencion)
  const acuerdo = disponibilidad('acuerdoUnidad', rol, atencion)
  const tieneOc = Boolean(atencion.numero_orden_compra)

  if (![oc, inicio, fin, reporte, origen, acuerdo].some((d) => d.visible)) return null

  const cerrar = () => setAbierto(null)
  const exito = (mensaje: string) => {
    setAbierto(null)
    onExito(mensaje)
  }
  const comunes = { atencion, onCerrar: cerrar, onActualizada, onExito: exito }
  // Motivos de las acciones deshabilitadas: debajo de los botones (no ensanchan la fila) y enlazados con ellos.
  const motivos = [
    { clave: 'fin', d: fin },
    { clave: 'reporte', d: reporte },
    { clave: 'inicio', d: inicio },
    { clave: 'oc', d: oc },
    { clave: 'origen', d: origen },
    { clave: 'acuerdo', d: acuerdo },
  ].filter(({ d }) => d.visible && !d.habilitada && d.motivo)
  const describir = (clave: string, habilitada: boolean) => (habilitada ? undefined : `${idMotivos}-${clave}`)

  // La primaria (siguiente paso del ciclo) va primero; luego las secundarias y al final las deshabilitadas.
  const botones = [
    { clave: 'fin', d: fin, texto: 'Registrar fin', dialogo: 'fin' as const, primaria: fin.habilitada },
    {
      clave: 'reporte',
      d: reporte,
      texto: atencion.estado === 'Reporte adjunto' ? 'Adjuntar nueva revisión' : 'Adjuntar reporte',
      dialogo: 'reporte' as const,
      // Primaria solo si aún falta el reporte; una nueva revisión es secundaria.
      primaria: reporte.habilitada && atencion.estado === 'Ejecutado pendiente de reporte',
    },
    { clave: 'inicio', d: inicio, texto: 'Registrar inicio', dialogo: 'inicio' as const, primaria: inicio.habilitada },
    {
      clave: 'oc',
      d: oc,
      texto: tieneOc ? 'Corregir orden de compra' : 'Registrar orden de compra',
      dialogo: 'ordenCompra' as const,
      primaria: oc.habilitada && !tieneOc,
    },
    { clave: 'origen', d: origen, texto: 'Corregir origen', dialogo: 'origen' as const, primaria: false },
    {
      clave: 'acuerdo',
      d: acuerdo,
      texto: atencion.acuerdo_unidad === null ? 'Registrar acuerdo de la unidad' : 'Actualizar acuerdo de la unidad',
      dialogo: 'acuerdo' as const,
      primaria: false,
    },
  ]
    .filter((b) => b.d.visible)
    .sort((a, b) => Number(b.primaria) - Number(a.primaria) || Number(b.d.habilitada) - Number(a.d.habilitada))

  return (
    <div className={estilos.acciones}>
      <div className={estilos.botonesAcciones} role="group" aria-label="Acciones de la atención">
        {botones.map((b) => (
          <Boton
            key={b.clave}
            variante={b.primaria ? 'primario' : 'secundario'}
            onClick={() => setAbierto(b.dialogo)}
            deshabilitado={!b.d.habilitada}
            aria-describedby={describir(b.clave, b.d.habilitada)}
          >
            {b.texto}
          </Boton>
        ))}
      </div>
      {motivos.length > 0 && (
        <ul className={estilos.motivosAcciones}>
          {motivos.map(({ clave, d }) => (
            <li key={clave} id={`${idMotivos}-${clave}`}>
              {d.motivo}
            </li>
          ))}
        </ul>
      )}

      <DialogoOrdenCompra abierto={abierto === 'ordenCompra'} {...comunes} />
      <DialogoEjecucion modo="inicio" abierto={abierto === 'inicio'} {...comunes} />
      <DialogoEjecucion modo="fin" abierto={abierto === 'fin'} {...comunes} />
      <DialogoReporte abierto={abierto === 'reporte'} {...comunes} onReporteAdjunto={onReporteAdjunto} />
      <DialogoOrigen abierto={abierto === 'origen'} {...comunes} />
      <DialogoAcuerdo abierto={abierto === 'acuerdo'} {...comunes} />
    </div>
  )
}
