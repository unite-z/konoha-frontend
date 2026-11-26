import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import AccionFila, { AccionesFila, AccionFilaEnlace } from '@/design-system/AccionFila'
import { PERMISOS } from '@/config/permisosCore'
import Boton from '@/design-system/Boton'
import Tarjeta from '@/design-system/Tarjeta'
import CampoFormulario from '@/design-system/CampoFormulario'
import Selector from '@/design-system/Selector'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import AccionesPagina from '@/layouts/LayoutOficina/AccionesPagina'
import { rutaTareasDeEncargo } from '@/router/rutasCampo'
import { rutaIncidencia } from '@/router/rutasApp'
import { usePermisos } from '@/sesion/ContextoSesion'
import type { EncargoCampo } from '@/types/operacionCampo'
import {
  esJefeCampo,
  puedeCambiarEstadoEncargo,
  puedeReprogramarEncargo,
} from '@/utils/operacionCampo'
import { formatearFecha } from '@/utils/formato'
import { BuscarCampo, TablaCampo } from './ComponentesCampo'
import { useListadoCampo } from './useCampo'
import estilos from './OperacionCampo.module.css'
import Estado from '@/design-system/Estado'
import { DialogoEncargo } from './DialogoEncargo'
import { DialogoReprogramar } from './DialogoReprogramar'
import { DialogoSeguimiento, tonosEncargo } from './DialogoSeguimiento'

export default function EncargosPage() {
  usePaginaActual('Encargos', [{ texto: 'Operación de campo' }, { texto: 'Encargos' }])
  const permisos = usePermisos()
  const jefe = esJefeCampo(permisos)
  const navegar = useNavigate()
  const [seguimiento, setSeguimiento] = useState<EncargoCampo | null>(null)
  const [reprogramando, setReprogramando] = useState<EncargoCampo | null>(null)
  const listado = useListadoCampo<EncargoCampo>('encargos', ['periodicidad', 'desde', 'hasta', 'vencidos'])
  const [dialogo, setDialogo] = useState<EncargoCampo | 'nuevo' | null>(null),
    [aviso, setAviso] = useState('')
  return (
    <div className={estilos.pagina}>
      <AccionesPagina>{jefe && <Boton onClick={() => setDialogo('nuevo')}>Registrar encargo</Boton>}</AccionesPagina>
      <p className={estilos.descripcion}>Consulta y organiza los encargos directos y periódicos por capataz.</p>
      {aviso && (
        <AvisoEnLinea tono="exito" accion={{ texto: 'Cerrar aviso', onClick: () => setAviso('') }}>
          {aviso}
        </AvisoEnLinea>
      )}
      <Tarjeta>
        <div className={estilos.filtros}>
          <BuscarCampo valor={String(listado.params.q ?? '')} onBuscar={(q) => listado.filtrar({ q })} />
          <Selector
            id="encargo-periodicidad"
            etiqueta="Modalidad"
            valor={String(listado.params.periodicidad ?? '')}
            opciones={[
              { valor: 'Semanal', texto: 'Semanal' },
              { valor: 'Quincenal', texto: 'Quincenal' },
              { valor: 'Directo', texto: 'Directo' },
            ]}
            opcionTodos="Todos"
            onCambiar={(periodicidad) => listado.filtrar({ periodicidad })}
          />
          <Selector
            id="encargo-vencimiento"
            etiqueta="Vencimiento"
            valor={String(listado.params.vencidos ?? '')}
            opciones={[{ valor: 'true', texto: 'Solo vencidos' }]}
            opcionTodos="Todos"
            onCambiar={(vencidos) => listado.filtrar({ vencidos })}
          />
          <CampoFormulario
            id="encargo-desde"
            etiqueta="Desde"
            type="date"
            value={String(listado.params.desde ?? '')}
            onChange={(e) => listado.filtrar({ desde: e.target.value })}
          />
          <CampoFormulario
            id="encargo-hasta"
            etiqueta="Hasta"
            type="date"
            value={String(listado.params.hasta ?? '')}
            onChange={(e) => listado.filtrar({ hasta: e.target.value })}
          />
          <Boton
            variante="fantasma"
            onClick={() => listado.filtrar({ q: '', periodicidad: '', desde: '', hasta: '', vencidos: '' })}
          >
            Limpiar filtros
          </Boton>
        </div>
      </Tarjeta>
      <TablaCampo
        titulo="Encargos por capataz"
        listado={listado}
        vacio="No hay encargos con estos filtros"
        filaPeligro={(e) => e.vencido === true}
        columnas={[
          {
            clave: 'descripcion',
            titulo: 'Encargo',
            multilinea: true,
            render: (e) => (
              <>
                <Link className={estilos.celdaPrincipal} to={rutaTareasDeEncargo(e.id)}>
                  {e.descripcion}
                </Link>
                <span className={estilos.secundario}>
                  {e.tipo_actividad_nombre} · {e.area_verde_nombre}
                </span>
              </>
            ),
          },
          {
            clave: 'capataz_nombre',
            titulo: 'Capataz',
            render: (e) => (
              <>
                {e.capataz_nombre}
                <span className={estilos.secundario}>{e.cuadrilla_nombre}</span>
              </>
            ),
          },
          {
            clave: 'periodo',
            titulo: 'Periodo',
            render: (e) => (
              <>
                <Estado tono="info" texto={e.periodicidad} />
                {e.periodicidad !== 'Directo' && (
                  <span className={estilos.secundario}>
                    {formatearFecha(e.fecha_inicio)} — {formatearFecha(e.fecha_fin)}
                  </span>
                )}
              </>
            ),
          },
          {
            clave: 'plazo_previsto',
            titulo: 'Plazo previsto',
            render: (e) => formatearFecha(e.plazo_previsto),
          },
          {
            clave: 'estado',
            titulo: 'Estado',
            // «Vencido» es una presentación derivada: el estado persistido conserva sus
            // transiciones y acciones de negocio (AV-403).
            render: (e) =>
              e.vencido ? (
                <Estado tono="error" texto="Vencido" />
              ) : (
                <Estado tono={tonosEncargo[e.estado]} texto={e.estado} />
              ),
          },
          {
            clave: 'acciones',
            titulo: 'Acciones',
            render: (e) => (
              <AccionesFila>
                {e.incidencia_origen_id &&
                  permisos?.includes(PERMISOS.consultarPlanificacion) &&
                  permisos.includes(PERMISOS.registrarIncidencia) && (
                    <AccionFilaEnlace
                      icono="eye"
                      nombre="Ver incidencia de origen"
                      etiqueta={`Ver incidencia de origen del encargo ${e.id}`}
                      to={rutaIncidencia(e.incidencia_origen_id)}
                    />
                  )}
                <AccionFila
                  icono="list"
                  nombre="Ver tareas"
                  etiqueta={`Ver tareas del encargo ${e.id}`}
                  onClick={() => navegar(rutaTareasDeEncargo(e.id))}
                />
                <AccionFila
                  icono={jefe ? 'pencil' : 'eye'}
                  nombre={jefe ? 'Editar encargo' : 'Ver encargo'}
                  etiqueta={`${jefe ? 'Editar' : 'Ver'} encargo ${e.id}`}
                  onClick={() => setDialogo(e)}
                />
                {jefe && puedeReprogramarEncargo(e.estado) && (
                  <AccionFila
                    icono="calendar"
                    nombre="Reprogramar"
                    etiqueta={`Reprogramar el encargo ${e.id}`}
                    onClick={() => setReprogramando(e)}
                  />
                )}
                <AccionFila
                  icono="history"
                  nombre="Seguimiento"
                  etiqueta={`Seguimiento del encargo ${e.id}`}
                  onClick={() => setSeguimiento(e)}
                />
              </AccionesFila>
            ),
          },
        ]}
      />
      {seguimiento && (
        <DialogoSeguimiento
          id={seguimiento.id}
          puedeCambiar={puedeCambiarEstadoEncargo(permisos)}
          puedeCancelar={jefe}
          onCerrar={() => setSeguimiento(null)}
          onGuardado={() => {
            setSeguimiento(null)
            setAviso('El estado del encargo se guardó correctamente')
            listado.consulta.reintentar()
          }}
        />
      )}
      {reprogramando && (
        <DialogoReprogramar
          encargo={reprogramando}
          onCerrar={() => setReprogramando(null)}
          onGuardado={() => {
            setReprogramando(null)
            setAviso('El encargo se reprogramó correctamente')
            listado.consulta.reintentar()
          }}
        />
      )}
      {dialogo && (
        <DialogoEncargo
          actual={dialogo === 'nuevo' ? null : dialogo}
          soloLectura={!jefe}
          onCerrar={() => setDialogo(null)}
          onGuardado={() => {
            setDialogo(null)
            setAviso('El encargo se guardó correctamente')
            listado.consulta.reintentar()
          }}
        />
      )}
    </div>
  )
}
