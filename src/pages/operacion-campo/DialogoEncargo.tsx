import { useState } from 'react'
import CampoFormulario, { AreaTexto } from '@/design-system/CampoFormulario'
import Selector from '@/design-system/Selector'
import DialogoFormulario from '@/design-system/DialogoFormulario'
import { useConsulta } from '@/hooks/useConsulta'
import { campoApi, todosCampo } from '@/services/api/operacionCampo'
import type { CatalogoCampo, CuadrillaCampo, EncargoCampo, EntradaEncargo } from '@/types/operacionCampo'
import { hoyLima, sumarDiasCampo, validarEncargoCampo } from '@/utils/operacionCampo'
import { EstadoCatalogos } from './ComponentesCampo'
import { useMutacionCampo } from './useCampo'
import estilos from './OperacionCampo.module.css'

export function DialogoEncargo({
  actual,
  soloLectura,
  onCerrar,
  onGuardado,
}: {
  actual: EncargoCampo | null
  soloLectura: boolean
  onCerrar: () => void
  onGuardado: () => void
}) {
  const hoy = hoyLima()
  const [body, setBody] = useState<EntradaEncargo>(
    actual ?? {
      cuadrilla_id: 0,
      tipo_actividad_id: 0,
      area_verde_id: 0,
      descripcion: '',
      periodicidad: 'Semanal',
      fecha_reunion: hoy,
      fecha_inicio: hoy,
      fecha_fin: sumarDiasCampo(hoy, 6),
      plazo_previsto: sumarDiasCampo(hoy, 6),
    },
  )
  const directo = body.periodicidad === 'Directo'
  const [errores, setErrores] = useState<Record<string, string>>({}),
    [cambios, setCambios] = useState(false)
  const mutacion = useMutacionCampo()
  const catalogos = useConsulta('catalogos-encargo', async (signal) => {
    const [cuadrillas, tipos, areas] = await Promise.all([
      todosCampo<CuadrillaCampo>('cuadrillas/', {}, signal),
      todosCampo<CatalogoCampo>('catalogos/tipos-actividad/', {}, signal),
      todosCampo<CatalogoCampo>('catalogos/areas-verdes/', {}, signal),
    ])
    return { cuadrillas, tipos, areas }
  })
  function cambiar(cambios: Partial<EntradaEncargo>) {
    setCambios(true)
    setBody((prev) => ({ ...prev, ...cambios }))
    setErrores({})
  }
  function guardar() {
    if (soloLectura) {
      onCerrar()
      return
    }
    const errors = validarEncargoCampo(body)
    setErrores(errors)
    if (Object.keys(errors).length) {
      document.getElementById(`form-encargo-${Object.keys(errors)[0]}`)?.focus()
      return
    }
    if (!catalogos.datos || catalogos.estado === 'error') {
      mutacion.setDetalle('Carga las opciones antes de guardar')
      return
    }
    // Solo se envían los campos de entrada, nunca las etiquetas o auditoría de una respuesta GET.
    const entrada = {
      cuadrilla_id: body.cuadrilla_id,
      tipo_actividad_id: body.tipo_actividad_id,
      area_verde_id: body.area_verde_id,
      descripcion: body.descripcion.trim(),
      periodicidad: body.periodicidad,
      ...(directo
        ? {}
        : {
            fecha_reunion: body.fecha_reunion,
            fecha_inicio: body.fecha_inicio,
            fecha_fin: body.fecha_fin,
          }),
      plazo_previsto: body.plazo_previsto,
    }
    void mutacion.enviar(
      () =>
        campoApi(`encargos/${actual ? `${actual.id}/` : ''}`, {
          metodo: actual ? 'PUT' : 'POST',
          cuerpo: entrada,
        }),
      onGuardado,
    )
  }
  return (
    <DialogoFormulario
      abierto
      titulo={soloLectura ? 'Detalle del encargo' : actual ? 'Editar encargo' : 'Registrar encargo'}
      textoConfirmar={soloLectura ? 'Cerrar' : 'Guardar encargo'}
      ancho="amplio"
      onEnviar={guardar}
      onCerrar={onCerrar}
      error={mutacion.error}
      enviando={mutacion.enviando}
      hayCambios={!soloLectura && cambios}
      conObligatorios={!soloLectura}
    >
      <EstadoCatalogos consulta={catalogos}>
        {({ cuadrillas, tipos, areas }) => (
          <fieldset className={estilos.formulario} disabled={soloLectura || mutacion.enviando}>
            <div className={estilos.rejilla}>
              <Selector
                id="form-encargo-cuadrilla_id"
                etiqueta="Cuadrilla y capataz"
                obligatorio
                valor={body.cuadrilla_id ? String(body.cuadrilla_id) : ''}
                opcionTodos="Selecciona una cuadrilla"
                opciones={cuadrillas
                  .filter((c) => c.activa || c.id === actual?.cuadrilla_id)
                  .map((c) => ({ valor: String(c.id), texto: `${c.nombre} · ${c.capataz_nombre}` }))}
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
                  .filter((a) => a.activo || a.id === actual?.area_verde_id)
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
              Los encargos con ejecución registrada conservan su planificación y no pueden redefinirse.
            </p>
          </fieldset>
        )}
      </EstadoCatalogos>
    </DialogoFormulario>
  )
}
