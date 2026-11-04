/**
 * Tarjeta «Requerimiento a un proveedor» de una incidencia clasificada por la vía tercerizada (AV-284, Figma 389-7706
 * y 389-7903; AV-278): proveedor, contrato vigente, servicio, tipo de atención y, con ejemplar, «Crear también la
 * poda del ejemplar».
 *
 * Si el proveedor no tiene contrato aplicable, se avisa de que va como extraordinaria con orden de servicio y el
 * botón pasa a «Crear como extraordinaria» (389-7903).
 */
import { useState } from 'react'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton from '@/components/ui/Boton'
import Casilla from '@/components/ui/Casilla'
import GrupoOpciones from '@/components/ui/GrupoOpciones'
import Selector from '@/components/ui/Selector'
import Tarjeta from '@/components/ui/Tarjeta'
import { useConsulta } from '@/hooks/useConsulta'
import { crearRequerimiento, listarProveedoresIncidencia } from '@/services/api/incidencias'
import type { IncidenciaDetalle, TipoAtencion } from '@/types/incidencias'
import estilos from './Incidencias.module.css'

const TIPOS: { valor: TipoAtencion; texto: string }[] = [
  { valor: 'Programada', texto: 'Programada' },
  { valor: 'Extraordinaria', texto: 'Extraordinaria' },
]

export interface TarjetaRequerimientoProps {
  incidencia: IncidenciaDetalle
  onVolver: () => void
  onCreado: (incidencia: IncidenciaDetalle, aviso: string) => void
}

export default function TarjetaRequerimiento({ incidencia, onVolver, onCreado }: TarjetaRequerimientoProps) {
  const proveedores = useConsulta(`incidencia-proveedores:${incidencia.id}`, (signal) => listarProveedoresIncidencia(incidencia.id, signal))
  const [proveedorId, setProveedorId] = useState('')
  const [contratoId, setContratoId] = useState('')
  const [servicio, setServicio] = useState('')
  // Una incidencia urgente no espera a la próxima atención programada: por defecto, extraordinaria.
  const [tipo, setTipo] = useState<TipoAtencion>('Extraordinaria')
  const [crearPoda, setCrearPoda] = useState(Boolean(incidencia.ejemplar))
  const [mostrarErrores, setMostrarErrores] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const proveedor = proveedores.datos?.find((p) => String(p.id) === proveedorId)
  const contratos = (proveedor?.contratos ?? []).filter((c) => c.vigente)
  const sinContrato = Boolean(proveedor) && contratos.length === 0
  const contrato = contratos.find((c) => String(c.id) === contratoId)

  async function crear() {
    setMostrarErrores(true)
    if (!proveedor || (!sinContrato && !contrato)) return
    setEnviando(true)
    setError(null)
    try {
      const derivada = await crearRequerimiento(incidencia.id, {
        proveedor_id: proveedor.id,
        contrato_id: sinContrato ? null : (contrato?.id ?? null),
        servicio: sinContrato ? null : servicio || null,
        tipo_atencion: sinContrato ? 'Extraordinaria' : tipo,
        crear_poda: !sinContrato && Boolean(incidencia.ejemplar) && crearPoda,
      })
      onCreado(derivada, `Requerimiento creado para ${proveedor.razon_social}`)
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo crear el requerimiento.')
      setEnviando(false)
    }
  }

  return (
    <Tarjeta titulo="Requerimiento a un proveedor" nivel={2}>
      <div className={estilos.accion}>
        <div className={estilos.camposAccion}>
          <Selector
            id="requerimiento-proveedor"
            etiqueta="Proveedor"
            obligatorio
            valor={proveedorId}
            opcionTodos={proveedores.datos ? 'Elige el proveedor' : 'Cargando proveedores…'}
            opciones={(proveedores.datos ?? []).map((p) => ({ valor: String(p.id), texto: p.razon_social }))}
            onCambiar={(valor) => {
              setProveedorId(valor)
              const vigentes = proveedores.datos?.find((p) => String(p.id) === valor)?.contratos.filter((c) => c.vigente) ?? []
              setContratoId(vigentes.length === 1 ? String(vigentes[0].id) : '')
              setServicio(vigentes.length === 1 ? (vigentes[0].servicios[0] ?? '') : '')
            }}
            error={mostrarErrores && !proveedor ? 'Elige el proveedor.' : undefined}
          />
          {sinContrato ? (
            <AvisoEnLinea tono="advertencia" titulo="Sin contrato aplicable">
              Se tramitará como extraordinaria con orden de servicio.
            </AvisoEnLinea>
          ) : (
            proveedor && (
              <>
                <Selector
                  id="requerimiento-contrato"
                  etiqueta="Contrato"
                  obligatorio
                  valor={contratoId}
                  opcionTodos="Elige el contrato"
                  opciones={contratos.map((c) => ({ valor: String(c.id), texto: `${c.codigo} · vigente` }))}
                  onCambiar={setContratoId}
                  error={mostrarErrores && !contrato ? 'Elige el contrato.' : undefined}
                />
                <Selector
                  id="requerimiento-servicio"
                  etiqueta="Servicio"
                  valor={servicio}
                  opcionTodos="Elige el servicio"
                  opciones={(contrato?.servicios ?? []).map((s) => ({ valor: s, texto: s }))}
                  onCambiar={setServicio}
                />
                <GrupoOpciones etiqueta="Tipo de atención" obligatorio segmentado opciones={TIPOS} valor={tipo} onCambiar={setTipo} />
                {incidencia.ejemplar && (
                  <Casilla id="requerimiento-poda" etiqueta="Crear también la poda del ejemplar" marcada={crearPoda} onCambiar={setCrearPoda} />
                )}
              </>
            )
          )}
          {error && <p className={estilos.errorAccion}>{error}</p>}
        </div>
        <div className={`${estilos.pieAccion} ${estilos.pieDerecha}`}>
          <Boton variante="secundario" onClick={onVolver}>
            Volver
          </Boton>
          <Boton cargando={enviando} onClick={() => void crear()}>
            {sinContrato ? 'Crear como extraordinaria' : 'Crear requerimiento'}
          </Boton>
        </div>
      </div>
    </Tarjeta>
  )
}
