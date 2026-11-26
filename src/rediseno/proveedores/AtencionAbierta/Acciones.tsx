/**
 * Acciones de estado de la ficha (M5-05 a M5-07, M5-10 a M5-12). Cada una respeta el permiso y el estado
 * (`disponibilidad`, que el back-end vuelve a comprobar) y, si el estado aún no la permite, sale deshabilitada con
 * su motivo. Reutiliza los diálogos de `pages/servicios-tercerizados/acciones/`; «Aprobar» y «Pedir foto u
 * observar» son las dos salidas de la conformidad (RN-007: sin informe previo no hay decisión).
 */
import { useId, useState } from 'react'
import Boton from '@/design-system/Boton'
import { disponibilidad, type DisponibilidadAccion } from '@/config/permisosTercerizados'
import DialogoAcuerdo from '@/pages/servicios-tercerizados/acciones/DialogoAcuerdo'
import DialogoEjecucion from '@/pages/servicios-tercerizados/acciones/DialogoEjecucion'
import DialogoOrdenCompra from '@/pages/servicios-tercerizados/acciones/DialogoOrdenCompra'
import DialogoOrigen from '@/pages/servicios-tercerizados/acciones/DialogoOrigen'
import DialogoSeguridad from '@/pages/servicios-tercerizados/acciones/DialogoSeguridad'
import type { Atencion } from '@/types/tercerizados'
import { textoOrden } from '@/utils/estadosTercerizados'
import estilos from './AtencionAbierta.module.css'
import DialogoDecision from './DialogoDecision'

type Dialogo = 'seguridad' | 'ordenCompra' | 'inicio' | 'fin' | 'origen' | 'acuerdo' | 'aprobar' | 'observar' | null

export interface AccionesProps {
  atencion: Atencion
  permisos: readonly string[] | null
  onActualizada: (atencion: Atencion) => void
  onExito: (mensaje: string) => void
}

interface BotonAccion {
  clave: string
  d: DisponibilidadAccion
  texto: string
  dialogo: Exclude<Dialogo, null>
  primaria: boolean
}

export default function Acciones({ atencion, permisos, onActualizada, onExito }: AccionesProps) {
  const [abierto, setAbierto] = useState<Dialogo>(null)
  const idMotivos = useId()

  const seguridad = disponibilidad('seguridad', permisos, atencion)
  const oc = disponibilidad('ordenCompra', permisos, atencion)
  const inicio = disponibilidad('inicio', permisos, atencion)
  const fin = disponibilidad('fin', permisos, atencion)
  const origen = disponibilidad('corregirOrigen', permisos, atencion)
  const acuerdo = disponibilidad('acuerdoUnidad', permisos, atencion)
  const conformidad = disponibilidad('conformidad', permisos, atencion)
  const tieneOc = Boolean(atencion.numero_orden_compra)
  const tieneVerificacion = Boolean(atencion.verificaciones_seguridad?.length)
  // RN-007: sin informe previo no hay conformidad; lo dice el botón, no solo el servidor.
  const motivoDecision =
    !conformidad.habilitada && atencion.estado === 'Ejecutado pendiente de reporte'
      ? 'No hay conformidad sin informe previo: el proveedor debe entregar primero su informe.'
      : conformidad.motivo
  const decision: DisponibilidadAccion = { ...conformidad, motivo: motivoDecision }

  const todos: BotonAccion[] = [
    {
      clave: 'seguridad',
      d: seguridad,
      texto: tieneVerificacion ? 'Corregir verificación de seguridad' : 'Verificar seguridad',
      dialogo: 'seguridad',
      primaria: seguridad.habilitada && !tieneVerificacion,
    },
    { clave: 'fin', d: fin, texto: 'Registrar fin', dialogo: 'fin', primaria: fin.habilitada },
    { clave: 'inicio', d: inicio, texto: 'Registrar inicio', dialogo: 'inicio', primaria: inicio.habilitada },
    {
      clave: 'oc',
      d: oc,
      texto: `${tieneOc ? 'Corregir' : 'Registrar'} ${textoOrden(atencion.clase)}`,
      dialogo: 'ordenCompra',
      primaria: oc.habilitada && !tieneOc,
    },
    { clave: 'aprobar', d: decision, texto: 'Aprobar', dialogo: 'aprobar', primaria: decision.habilitada },
    { clave: 'observar', d: decision, texto: 'Pedir foto u observar', dialogo: 'observar', primaria: false },
    { clave: 'origen', d: origen, texto: 'Corregir origen', dialogo: 'origen', primaria: false },
    {
      clave: 'acuerdo',
      d: acuerdo,
      texto: atencion.acuerdo_unidad === null ? 'Registrar acuerdo de la unidad' : 'Actualizar acuerdo de la unidad',
      dialogo: 'acuerdo',
      primaria: false,
    },
  ]
  const botones = todos
    .filter((b) => b.d.visible)
    // La primaria (siguiente paso) primero; luego las habilitadas y al final las deshabilitadas.
    .sort((a, b) => Number(b.primaria) - Number(a.primaria) || Number(b.d.habilitada) - Number(a.d.habilitada))

  if (botones.length === 0) return null

  const cerrar = () => setAbierto(null)
  const exito = (mensaje: string) => {
    setAbierto(null)
    onExito(mensaje)
  }
  const comunes = { atencion, onCerrar: cerrar, onActualizada, onExito: exito }
  // Un motivo por texto: «Aprobar» y «Pedir foto u observar» comparten el suyo y lo citan ambos.
  const motivos = new Map<string, { id: string; acciones: string[] }>()
  for (const b of botones) {
    if (b.d.habilitada || !b.d.motivo) continue
    const previo = motivos.get(b.d.motivo)
    if (previo) previo.acciones.push(b.texto)
    else motivos.set(b.d.motivo, { id: `${idMotivos}-${b.clave}`, acciones: [b.texto] })
  }
  const idMotivo = (b: BotonAccion) => (!b.d.habilitada && b.d.motivo ? motivos.get(b.d.motivo)?.id : undefined)

  return (
    <div className={estilos.acciones}>
      <div className={estilos.botones} role="group" aria-label="Acciones de la atención">
        {botones.map((b) => (
          <Boton
            key={b.clave}
            variante={b.primaria ? 'primario' : 'secundario'}
            onClick={() => setAbierto(b.dialogo)}
            deshabilitado={!b.d.habilitada}
            aria-describedby={idMotivo(b)}
          >
            {b.texto}
          </Boton>
        ))}
      </div>
      {motivos.size > 0 && (
        <ul className={estilos.motivos}>
          {[...motivos].map(([motivo, { id, acciones }]) => (
            <li key={id} id={id}>
              <strong>{acciones.join(' y ')}:</strong> {motivo}
            </li>
          ))}
        </ul>
      )}

      <DialogoSeguridad abierto={abierto === 'seguridad'} {...comunes} />
      <DialogoOrdenCompra abierto={abierto === 'ordenCompra'} {...comunes} />
      <DialogoEjecucion modo="inicio" abierto={abierto === 'inicio'} {...comunes} />
      <DialogoEjecucion modo="fin" abierto={abierto === 'fin'} {...comunes} />
      <DialogoOrigen abierto={abierto === 'origen'} {...comunes} />
      <DialogoAcuerdo abierto={abierto === 'acuerdo'} {...comunes} />
      <DialogoDecision modo="aprobar" abierto={abierto === 'aprobar'} {...comunes} />
      <DialogoDecision modo="observar" abierto={abierto === 'observar'} {...comunes} />
    </div>
  )
}
