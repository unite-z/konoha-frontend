/**
 * Poda a demanda por planta muerta (AV-312, RF-POD-005): propone registrar el ejemplar como muerto con la
 * situación del ejemplar de AV-303. No cambia nada por sí sola: lo confirma quien gestiona el inventario.
 */
import { useState } from 'react'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import Boton from '@/design-system/Boton'
import CampoFormulario, { AreaTexto } from '@/design-system/CampoFormulario'
import Tarjeta from '@/design-system/Tarjeta'
import { PERMISOS, puede } from '@/config/permisosCore'
import { useConsulta } from '@/hooks/useConsulta'
import { aErrorApi } from '@/services/api/cliente'
import { cambiarSituacionEjemplar, listarEjemplarPorCodigo } from '@/services/api/ejemplares'
import { useSesionActiva } from '@/sesion/ContextoSesion'
import type { IntervencionPoda } from '@/types/intervencionesPoda'
import { formatearFecha } from '@/utils/formato'
import { hoyLima } from '@/utils/instanteLima'
import estilos from './CampanasPoda.module.css'

export default function PlantaMuertaEjemplar({ intervencion }: { intervencion: IntervencionPoda }) {
  const sesion = useSesionActiva()
  const puedeCambiar = puede(sesion, PERMISOS.gestionarCatalogos)
  const [version, setVersion] = useState(0)
  const consulta = useConsulta(`planta-muerta|${intervencion.ejemplar_codigo}|${version}`, (signal) =>
    listarEjemplarPorCodigo(intervencion.ejemplar_codigo, signal),
  )
  const ejemplar = consulta.datos?.find((e) => e.id === intervencion.ejemplar_id) ?? null
  const [abierto, setAbierto] = useState(false)
  const [fecha, setFecha] = useState(intervencion.fecha_ejecucion ?? hoyLima())
  const referencia = intervencion.atencion_codigo ? ` (atención ${intervencion.atencion_codigo})` : ''
  const [motivo, setMotivo] = useState(`Planta muerta: poda a demanda${referencia}`)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!ejemplar) return null

  if (ejemplar.situacion === 'muerto') {
    return (
      <AvisoEnLinea tono="exito" titulo="Ejemplar registrado como muerto">
        {ejemplar.codigo} consta como muerto
        {ejemplar.fecha_situacion ? ` desde el ${formatearFecha(ejemplar.fecha_situacion)}` : ''}.
      </AvisoEnLinea>
    )
  }
  if (ejemplar.situacion !== 'activo') return null

  async function registrar() {
    if (!fecha || !motivo.trim()) return
    setError(null)
    setGuardando(true)
    try {
      await cambiarSituacionEjemplar(intervencion.ejemplar_id, { situacion: 'muerto', fecha, motivo: motivo.trim() })
      setAbierto(false)
      setVersion((actual) => actual + 1)
    } catch (causa) {
      setError(aErrorApi(causa).detalle)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Tarjeta
      titulo="Planta muerta"
      descripcion={`La poda se pidió por planta muerta, pero ${ejemplar.codigo} sigue activo en el inventario.`}
      relleno="amplio"
    >
      {error && <AvisoEnLinea tono="error">{error}</AvisoEnLinea>}
      {!puedeCambiar ? (
        <p className={estilos.resumen}>
          Quien gestiona el inventario puede registrarlo como muerto desde aquí o desde la ficha del ejemplar.
        </p>
      ) : abierto ? (
        <div className={estilos.pagina}>
          <div className={estilos.campos}>
            <CampoFormulario
              id="fecha-planta-muerta"
              etiqueta="Fecha"
              type="date"
              max={hoyLima()}
              required
              value={fecha}
              onChange={(evento) => setFecha(evento.target.value)}
            />
          </div>
          <AreaTexto
            id="motivo-planta-muerta"
            etiqueta="Motivo"
            maxLength={300}
            required
            value={motivo}
            onChange={(evento) => setMotivo(evento.target.value)}
          />
          <div className={estilos.acciones}>
            <Boton
              variante="primario"
              cargando={guardando}
              deshabilitado={!fecha || !motivo.trim()}
              onClick={() => void registrar()}
            >
              Registrar como muerto
            </Boton>
            <Boton variante="fantasma" deshabilitado={guardando} onClick={() => setAbierto(false)}>
              Cancelar
            </Boton>
          </div>
        </div>
      ) : (
        <div className={estilos.acciones}>
          <Boton variante="secundario" onClick={() => setAbierto(true)}>
            Registrar el ejemplar como muerto
          </Boton>
        </div>
      )}
    </Tarjeta>
  )
}
