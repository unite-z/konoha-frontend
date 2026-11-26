/**
 * Alta y edición del encargo (RD-35, M4-03 y M4-04): cuadrilla y capataz, actividad, espacio, modalidad (Semanal,
 * Quincenal o Directo con plazo) y descripción. `areaInicial` abre el alta con el espacio puesto (`?area=`). Sigue las
 * mismas reglas que `DialogoEncargo` (validación y campos de entrada), que no admite fijar el espacio al abrir.
 */
import { useState } from 'react'
import CampoFormulario, { AreaTexto } from '@/design-system/CampoFormulario'
import DialogoFormulario from '@/design-system/DialogoFormulario'
import Selector from '@/design-system/Selector'
import { useConsulta } from '@/hooks/useConsulta'
import { EstadoCatalogos } from '@/pages/operacion-campo/ComponentesCampo'
import { useMutacionCampo } from '@/pages/operacion-campo/useCampo'
import type { EncargoCampo, EntradaEncargo } from '@/types/operacionCampo'
import { hoyLima, sumarDiasCampo, validarEncargoCampo } from '@/utils/operacionCampo'
import { cargarCatalogosEncargo, guardarEncargo } from './api'
import estilos from './Encargo.module.css'

export interface FormularioEncargoProps {
  actual: EncargoCampo | null
  areaInicial?: number | null
  onCerrar: () => void
  /** Recibe lo que devuelve el servidor (con el `id` del encargo nuevo). */
  onGuardado: (guardado: Partial<EncargoCampo>) => void
}

function entradaInicial(actual: EncargoCampo | null, areaInicial: number | null | undefined): EntradaEncargo {
  if (actual) return actual
  const hoy = hoyLima()
  return {
    cuadrilla_id: 0,
    tipo_actividad_id: 0,
    area_verde_id: areaInicial ?? 0,
    descripcion: '',
    periodicidad: 'Semanal',
    fecha_reunion: hoy,
    fecha_inicio: hoy,
    fecha_fin: sumarDiasCampo(hoy, 6),
    plazo_previsto: sumarDiasCampo(hoy, 6),
  }
}

export default function FormularioEncargo({ actual, areaInicial, onCerrar, onGuardado }: FormularioEncargoProps) {
  const hoy = hoyLima()
  const [body, setBody] = useState<EntradaEncargo>(() => entradaInicial(actual, areaInicial))
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [cambios, setCambios] = useState(false)
  const mutacion = useMutacionCampo()
  const catalogos = useConsulta('rd-catalogos-encargo', cargarCatalogosEncargo)
  const directo = body.periodicidad === 'Directo'

  function cambiar(parcial: Partial<EntradaEncargo>) {
    setCambios(true)
    setBody((prev) => ({ ...prev, ...parcial }))
    setErrores({})
  }

  function guardar() {
    const nuevos = validarEncargoCampo(body)
    setErrores(nuevos)
    if (Object.keys(nuevos).length) {
      document.getElementById(`form-encargo-${Object.keys(nuevos)[0]}`)?.focus()
      return
    }
    if (!catalogos.datos || catalogos.estado === 'error') {
      mutacion.setDetalle('Carga las opciones antes de guardar')
      return
    }
    let guardado: Partial<EncargoCampo> = {}
    void mutacion.enviar(
      async () => {
        guardado = await guardarEncargo(body, actual?.id)
      },
      () => onGuardado(guardado),
    )
  }

  return (
    <DialogoFormulario
      abierto
      titulo={actual ? 'Editar encargo' : 'Registrar encargo'}
      textoConfirmar="Guardar encargo"
      ancho="amplio"
      onEnviar={guardar}
      onCerrar={onCerrar}
      error={mutacion.error}
      enviando={mutacion.enviando}
      hayCambios={cambios}
      conObligatorios
    >
      <EstadoCatalogos consulta={catalogos}>
        {({ cuadrillas, tipos, areas }) => (
          <fieldset className={estilos.formulario} disabled={mutacion.enviando}>
            <div className={estilos.rejilla}>
              <Selector
                id="form-encargo-cuadrilla_id"
                etiqueta="Cuadrilla y capataz"
                obligatorio
                valor={body.cuadrilla_id ? String(body.cuadrilla_id) : ''}
                opcionTodos="Selecciona una cuadrilla"
                opciones={cuadrillas
                  .filter((c) => c.activa || c.id === actual?.cuadrilla_id)
                  .map((c) => ({
                    valor: String(c.id),
                    texto: `${c.nombre} · ${c.capataz_nombre}`,
                  }))}
                onCambiar={(v) => cambiar({ cuadrilla_id: Number(v) })}
                error={errores.cuadrilla_id}
              />
              <Selector
                id="form-encargo-periodicidad"
                etiqueta="Modalidad"
                valor={body.periodicidad}
                opciones={[
                  { valor: 'Semanal', texto: 'Semanal · hasta 7 días' },
                  { valor: 'Quincenal', texto: 'Quincenal · hasta 14 días' },
                  { valor: 'Directo', texto: 'Directo · con plazo' },
                ]}
                onCambiar={(v) => {
                  const inicio = v === 'Directo' && actual?.periodicidad !== 'Directo' ? hoy : body.fecha_inicio
                  const fin = v === 'Directo' ? inicio : sumarDiasCampo(inicio, v === 'Semanal' ? 6 : 13)
                  cambiar({
                    periodicidad: v as EntradaEncargo['periodicidad'],
                    fecha_reunion: v === 'Directo' ? null : (body.fecha_reunion ?? hoy),
                    fecha_inicio: inicio,
                    fecha_fin: fin,
                    plazo_previsto: fin,
                  })
                }}
              />
              <Selector
                id="form-encargo-tipo_actividad_id"
                etiqueta="Tipo de actividad"
                obligatorio
                valor={body.tipo_actividad_id ? String(body.tipo_actividad_id) : ''}
                opcionTodos="Selecciona una actividad"
                opciones={tipos
                  .filter((t) => t.activo || t.id === actual?.tipo_actividad_id)
                  .map((t) => ({ valor: String(t.id), texto: t.nombre }))}
                onCambiar={(v) => cambiar({ tipo_actividad_id: Number(v) })}
                error={errores.tipo_actividad_id}
              />
              <Selector
                id="form-encargo-area_verde_id"
                etiqueta="Espacio"
                obligatorio
                valor={body.area_verde_id ? String(body.area_verde_id) : ''}
                opcionTodos="Selecciona un espacio"
                opciones={areas
                  .filter((a) => a.activo || a.id === actual?.area_verde_id || a.id === areaInicial)
                  .map((a) => ({ valor: String(a.id), texto: a.nombre }))}
                onCambiar={(v) => cambiar({ area_verde_id: Number(v) })}
                error={errores.area_verde_id}
              />
              {(directo
                ? (['plazo_previsto'] as const)
                : (['fecha_reunion', 'fecha_inicio', 'fecha_fin', 'plazo_previsto'] as const)
              ).map((key) => (
                <CampoFormulario
                  key={key}
                  id={`form-encargo-${key}`}
                  etiqueta={
                    {
                      fecha_reunion: 'Fecha de reunión',
                      fecha_inicio: 'Inicio del periodo',
                      fecha_fin: 'Fin del periodo',
                      plazo_previsto: 'Plazo previsto',
                    }[key]
                  }
                  type="date"
                  obligatorio
                  value={body[key] ?? ''}
                  onChange={(e) => cambiar({ [key]: e.target.value })}
                  error={errores[key]}
                />
              ))}
            </div>
            <AreaTexto
              id="form-encargo-descripcion"
              etiqueta="Descripción del encargo"
              obligatorio
              maxLength={1000}
              value={body.descripcion}
              onChange={(e) => cambiar({ descripcion: e.target.value })}
              error={errores.descripcion}
            />
            <p className={estilos.ayuda}>
              Los encargos con ejecución registrada conservan su planificación y no pueden redefinirse. Los encargos al
              personal propio no requieren orden de servicio.
            </p>
          </fieldset>
        )}
      </EstadoCatalogos>
    </DialogoFormulario>
  )
}
