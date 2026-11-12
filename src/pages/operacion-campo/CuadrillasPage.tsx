import { useState } from 'react'
import { Link } from 'react-router'
import AccionFila from '@/design-system/AccionFila'
import Boton from '@/components/ui/Boton'
import Tarjeta from '@/components/ui/Tarjeta'
import Casilla from '@/components/ui/Casilla'
import CampoFormulario from '@/components/ui/CampoFormulario'
import Selector from '@/components/ui/Selector'
import DialogoFormulario from '@/components/ui/DialogoFormulario'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import AccionesPagina from '@/layouts/LayoutOficina/AccionesPagina'
import { useConsulta } from '@/hooks/useConsulta'
import { usePermisos } from '@/sesion/ContextoSesion'
import { RUTAS_CORE } from '@/router/rutasApp'
import { listarUsuarios } from '@/services/api/core'
import type { UsuarioResumen } from '@/types/core'
import { hoyLima } from '@/utils/instanteLima'
import { campoApi, todosCampo } from '@/services/api/operacionCampo'
import type { CuadrillaCampo, PersonalCampo } from '@/types/operacionCampo'
import { esJefeCampo } from '@/utils/operacionCampo'
import { BuscarCampo, EstadoCatalogos, SeleccionOperarios, TablaCampo } from './ComponentesCampo'
import { useListadoCampo, useMutacionCampo } from './useCampo'
import estilos from './OperacionCampo.module.css'
import Estado from '@/components/ui/Estado'
import { TONO_ESTADO } from '@/components/ui/tonos'

export default function CuadrillasPage() {
  usePaginaActual('Cuadrillas', [{ texto: 'Operación de campo' }, { texto: 'Cuadrillas' }])
  const jefe = esJefeCampo(usePermisos())
  const listado = useListadoCampo<CuadrillaCampo>('cuadrillas', ['activa'])
  const [dialogo, setDialogo] = useState<CuadrillaCampo | 'nueva' | null>(null)
  const [personal, setPersonal] = useState(false),
    [aviso, setAviso] = useState('')
  function guardado() {
    setDialogo(null)
    setPersonal(false)
    setAviso('Los cambios se guardaron correctamente')
    listado.consulta.reintentar()
  }
  return (
    <div className={estilos.pagina}>
      <AccionesPagina>
        {jefe && (
          <>
            <Boton variante="secundario" onClick={() => setPersonal(true)}>
              Registrar operario
            </Boton>
            <Boton onClick={() => setDialogo('nueva')}>Registrar cuadrilla</Boton>
          </>
        )}
      </AccionesPagina>
      <p className={estilos.descripcion}>Consulta los equipos de trabajo, sus capataces y los operarios asignados.</p>
      {aviso && (
        <AvisoEnLinea tono="exito" accion={{ texto: 'Cerrar aviso', onClick: () => setAviso('') }}>
          {aviso}
        </AvisoEnLinea>
      )}
      <Tarjeta>
        <div className={estilos.filtros}>
          <BuscarCampo valor={String(listado.params.q ?? '')} onBuscar={(q) => listado.filtrar({ q })} />
          <Selector
            id="cuadrilla-estado"
            etiqueta="Estado"
            valor={String(listado.params.activa ?? '')}
            opciones={[
              { valor: 'true', texto: 'Activas' },
              { valor: 'false', texto: 'Inactivas' },
            ]}
            opcionTodos="Todos"
            onCambiar={(activa) => listado.filtrar({ activa })}
          />
          <Boton variante="fantasma" onClick={() => listado.filtrar({ q: '', activa: '' })}>
            Limpiar filtros
          </Boton>
        </div>
      </Tarjeta>
      <TablaCampo
        titulo="Cuadrillas de trabajo"
        listado={listado}
        vacio="No hay cuadrillas con estos filtros"
        columnas={[
          {
            clave: 'nombre',
            titulo: 'Cuadrilla',
            render: (c) => <span className={estilos.celdaPrincipal}>{c.nombre}</span>,
          },
          { clave: 'capataz_nombre', titulo: 'Capataz responsable' },
          { clave: 'cantidad_operarios', titulo: 'Operarios', alineacion: 'derecha' },
          {
            clave: 'operarios',
            titulo: 'Personal asignado',
            multilinea: true,
            render: (c) =>
              c.operarios.length
                ? c.operarios.map((p) => `${p.nombres} ${p.apellidos}`).join(', ')
                : 'Sin operarios asignados',
          },
          {
            clave: 'activa',
            titulo: 'Estado',
            render: (c) => (
              <Estado tono={TONO_ESTADO[c.activa ? 'exito' : 'neutral']} texto={c.activa ? 'Activa' : 'Inactiva'} />
            ),
          },
          {
            clave: 'acciones',
            titulo: 'Acciones',
            render: (c) => (
              <AccionFila
                icono={jefe ? 'pencil' : 'eye'}
                nombre={jefe ? 'Editar cuadrilla' : 'Ver integrantes'}
                etiqueta={`${jefe ? 'Editar' : 'Ver'} ${c.nombre}`}
                onClick={() => setDialogo(c)}
              />
            ),
          },
        ]}
      />
      {dialogo && (
        <DialogoCuadrilla
          actual={dialogo === 'nueva' ? null : dialogo}
          soloLectura={!jefe}
          onCerrar={() => setDialogo(null)}
          onGuardado={guardado}
        />
      )}
      {personal && <DialogoOperario onCerrar={() => setPersonal(false)} onGuardado={guardado} />}
    </div>
  )
}

function DialogoCuadrilla({
  actual,
  soloLectura,
  onCerrar,
  onGuardado,
}: {
  actual: CuadrillaCampo | null
  soloLectura: boolean
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [nombre, setNombre] = useState(actual?.nombre ?? '')
  const [capataz, setCapataz] = useState(actual ? `personal:${actual.capataz_id}` : '')
  const [activa, setActiva] = useState(actual?.activa ?? true)
  const [operarios, setOperarios] = useState(actual?.operarios.map((p) => p.id) ?? [])
  const [cambios, setCambios] = useState(false)
  const mutacion = useMutacionCampo()
  const catalogos = useConsulta('composicion-cuadrilla', async (signal) => {
    const [personas, cuadrillas, cuentas] = await Promise.all([
      todosCampo<PersonalCampo>('personal/', {}, signal),
      todosCampo<CuadrillaCampo>('cuadrillas/', { activa: true }, signal),
      soloLectura ? [] : capatacesActivos(signal),
    ])
    return { personas, cuadrillas, cuentas }
  })
  function cambiar(fn: () => void) {
    setCambios(true)
    fn()
  }
  function guardar() {
    if (soloLectura) {
      onCerrar()
      return
    }
    if (!nombre.trim() || !capataz) {
      mutacion.setDetalle('Completa el nombre y selecciona un capataz')
      document.getElementById(!nombre.trim() ? 'cuadrilla-nombre' : 'cuadrilla-capataz')?.focus()
      return
    }
    if (!catalogos.datos || catalogos.estado === 'error') {
      mutacion.setDetalle('Carga las opciones antes de guardar')
      return
    }
    const [origen, idCapataz] = capataz.split(':')
    void mutacion.enviar(
      () =>
        campoApi(`cuadrillas/${actual ? `${actual.id}/` : ''}`, {
          metodo: actual ? 'PUT' : 'POST',
          cuerpo: {
            nombre: nombre.trim(),
            ...(origen === 'usuario' ? { capataz_usuario_id: Number(idCapataz) } : { capataz_id: Number(idCapataz) }),
            activa,
            operarios: activa ? operarios : [],
          },
        }),
      onGuardado,
    )
  }
  return (
    <DialogoFormulario
      abierto
      titulo={soloLectura ? `Integrantes de ${nombre}` : actual ? 'Editar cuadrilla' : 'Registrar cuadrilla'}
      textoConfirmar={soloLectura ? 'Cerrar' : 'Guardar cuadrilla'}
      onCerrar={onCerrar}
      onEnviar={guardar}
      enviando={mutacion.enviando}
      hayCambios={!soloLectura && cambios}
      error={mutacion.error}
      ancho="amplio"
      conObligatorios={!soloLectura}
    >
      <EstadoCatalogos consulta={catalogos}>
        {({ personas, cuadrillas, cuentas }) => {
          const ocupados = new Set(cuadrillas.filter((c) => c.id !== actual?.id).map((c) => c.capataz_id))
          const personalPorUsuario = new Map(personas.map((p) => [p.usuario_id, p]))
          const usuarioActual = personas.find((p) => p.id === actual?.capataz_id)?.usuario_id
          const capataces = cuentas.flatMap((cuenta) => {
            const ficha = personalPorUsuario.get(cuenta.id)
            if (ficha && (!ficha.activo || ocupados.has(ficha.id))) return []
            return [
              {
                valor: ficha && ficha.id === actual?.capataz_id ? `personal:${ficha.id}` : `usuario:${cuenta.id}`,
                texto: cuenta.correo ? `${cuenta.nombre} (${cuenta.correo})` : cuenta.nombre,
              },
            ]
          })
          if (actual && !capataces.some((p) => p.valor === `personal:${actual.capataz_id}`)) {
            capataces.unshift({
              valor: `personal:${actual.capataz_id}`,
              texto:
                usuarioActual || soloLectura
                  ? actual.capataz_nombre
                  : `${actual.capataz_nombre} (sin cuenta vinculada)`,
            })
          }
          const options = personas.filter((p) => p.tipo_personal === 'Operario')
          const bloqueados = options
            .filter((p) => !p.activo || (p.cuadrilla_id !== null && p.cuadrilla_id !== actual?.id))
            .map((p) => p.id)
          return (
            <fieldset className={estilos.formulario} disabled={soloLectura || mutacion.enviando}>
              <div className={estilos.rejilla}>
                <CampoFormulario
                  id="cuadrilla-nombre"
                  etiqueta="Nombre de la cuadrilla"
                  obligatorio
                  maxLength={150}
                  value={nombre}
                  onChange={(e) => cambiar(() => setNombre(e.target.value))}
                />
                <Selector
                  id="cuadrilla-capataz"
                  etiqueta="Capataz responsable"
                  obligatorio
                  valor={capataz}
                  opcionTodos="Selecciona un capataz"
                  opciones={capataces}
                  onCambiar={(v) => cambiar(() => setCapataz(v))}
                  ayuda="Selecciona una cuenta activa de Capataz disponible."
                />
              </div>
              {!soloLectura && (
                <p className={estilos.descripcion}>
                  Si falta una cuenta, créala con el rol Capataz en{' '}
                  <Link to={RUTAS_CORE.usuarios}>Usuarios y roles</Link>.
                </p>
              )}
              <Casilla
                etiqueta="Cuadrilla activa"
                marcada={activa}
                onCambiar={(marcada) => cambiar(() => setActiva(marcada))}
              />
              {!activa && (
                <AvisoEnLinea tono="advertencia">
                  Al guardar, la cuadrilla quedará sin operarios asignados. Los registros de actividades anteriores se
                  conservan.
                </AvisoEnLinea>
              )}
              <SeleccionOperarios
                opciones={options}
                seleccion={activa ? operarios : []}
                bloqueados={bloqueados}
                soloLectura={!activa || soloLectura}
                onCambiar={(ids) => cambiar(() => setOperarios(ids))}
              />
              <p className={estilos.ayuda}>
                Para trasladar un operario, retíralo de su cuadrilla actual antes de asignarlo a otra.
              </p>
            </fieldset>
          )
        }}
      </EstadoCatalogos>
    </DialogoFormulario>
  )
}

function DialogoOperario({ onCerrar, onGuardado }: { onCerrar: () => void; onGuardado: () => void }) {
  const [nombres, setNombres] = useState(''),
    [apellidos, setApellidos] = useState('')
  const mutacion = useMutacionCampo()
  function guardar() {
    if (!nombres.trim() || !apellidos.trim()) {
      mutacion.setDetalle('Completa los nombres y apellidos')
      document.getElementById(!nombres.trim() ? 'personal-nombres' : 'personal-apellidos')?.focus()
      return
    }
    void mutacion.enviar(
      () =>
        campoApi('personal/', {
          metodo: 'POST',
          cuerpo: { nombres: nombres.trim(), apellidos: apellidos.trim(), tipo_personal: 'Operario' },
        }),
      onGuardado,
    )
  }
  return (
    <DialogoFormulario
      abierto
      titulo="Registrar operario"
      descripcion="Añade un operario al listado de personal que puedes asignar a una cuadrilla."
      textoConfirmar="Guardar operario"
      onCerrar={onCerrar}
      onEnviar={guardar}
      enviando={mutacion.enviando}
      hayCambios={Boolean(nombres || apellidos)}
      error={mutacion.error}
    >
      <fieldset className={estilos.formulario} disabled={mutacion.enviando}>
        <CampoFormulario
          id="personal-nombres"
          etiqueta="Nombres"
          obligatorio
          value={nombres}
          maxLength={100}
          onChange={(e) => setNombres(e.target.value)}
        />
        <CampoFormulario
          id="personal-apellidos"
          etiqueta="Apellidos"
          obligatorio
          value={apellidos}
          maxLength={150}
          onChange={(e) => setApellidos(e.target.value)}
        />
      </fieldset>
    </DialogoFormulario>
  )
}

async function capatacesActivos(signal: AbortSignal): Promise<UsuarioResumen[]> {
  const cuentas: UsuarioResumen[] = []
  const hoy = hoyLima()
  let page = 1
  while (true) {
    const respuesta = await listarUsuarios({ rol: 'capataz', estado: 'activa', page }, signal)
    cuentas.push(...respuesta.results.filter((u) => !u.fecha_fin_vigencia || u.fecha_fin_vigencia >= hoy))
    if (!respuesta.next) return cuentas
    page++
  }
}
