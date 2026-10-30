// RF-T-002 y RF-T-003 · Ficha de una cuenta (CU-MOD01-004, 005 y 007)
/**
 * Datos, estado, rol e historial de una cuenta, con sus acciones:
 * - editar, desactivar (con motivo; cierra todas sus sesiones), reactivar, desbloquear, cerrar sesiones
 *   y generar una contraseña temporal;
 * - cambiar el rol (un solo rol, con motivo).
 * No existe «eliminar» (HU-MOD01-005, «Sin eliminación»). Los errores del servidor (último jefe, la
 * propia cuenta, encargos abiertos) se muestran tal cual.
 */
import { useState } from 'react'
import { useLocation, useParams } from 'react-router'
import AvisoEnLinea from '../../components/ui/AvisoEnLinea'
import AvisoTemporal from '../../components/ui/AvisoTemporal'
import Badge from '../../components/ui/Badge'
import Boton from '../../components/ui/Boton'
import { AreaTexto } from '../../components/ui/CampoFormulario'
import DialogoConfirmacion from '../../components/ui/DialogoConfirmacion'
import EstadoCarga from '../../components/ui/EstadoCarga'
import EstadoError from '../../components/ui/EstadoError'
import ListaDescripcion from '../../components/ui/ListaDescripcion'
import TablaDatos, { type ColumnaTabla } from '../../components/ui/TablaDatos'
import { useConsulta } from '../../hooks/useConsulta'
import { usePaginaActual } from '../../hooks/usePaginaActual'
import { MIGAS_CORE } from '../../router/rutasApp'
import { aErrorApi } from '../../services/api/cliente'
import {
  activarUsuario,
  cerrarSesionesUsuario,
  desactivarUsuario,
  desbloquearUsuario,
  generarContrasenaTemporal,
  historialUsuario,
  obtenerUsuario,
} from '../../services/api/core'
import type { CambioCuenta, UsuarioConContrasena, UsuarioResumen } from '../../types/core'
import { DESTACADO, ESTADO_CUENTA, resumenCambio, textoAccion } from '../../utils/etiquetasCore'
import { formatearFecha, formatearFechaHora } from '../../utils/formato'
import { validarMotivo } from '../../utils/validacionCore'
import DialogoCambioRol from './DialogoCambioRol'
import DialogoContrasenaTemporal from './DialogoContrasenaTemporal'
import DialogoCuenta from './DialogoCuenta'
import estilos from './UsuariosRoles.module.css'

type Accion = 'editar' | 'rol' | 'desactivar' | 'cerrar-sesiones' | 'contrasena' | null

const COLUMNAS_HISTORIAL: ColumnaTabla<CambioCuenta>[] = [
  { clave: 'fecha', titulo: 'Fecha', render: (c) => formatearFechaHora(c.fecha_hora) },
  { clave: 'accion', titulo: 'Cambio', render: (c) => textoAccion(c.accion) },
  { clave: 'detalle', titulo: 'Detalle', multilinea: true, render: (c) => resumenCambio(c.valores_anteriores, c.valores_nuevos) },
  { clave: 'motivo', titulo: 'Motivo', multilinea: true, render: (c) => c.motivo ?? '—' },
  { clave: 'autor', titulo: 'Autor', render: (c) => c.usuario_nombre },
]

export default function UsuarioDetallePage() {
  const id = Number(useParams().id)
  const { state } = useLocation()
  const [aviso, setAviso] = useState<string | null>((state as { aviso?: string } | null)?.aviso ?? null)
  const [accion, setAccion] = useState<Accion>(null)
  const [contrasena, setContrasena] = useState<UsuarioConContrasena | null>(null)
  const [motivo, setMotivo] = useState('')
  const [errorMotivo, setErrorMotivo] = useState<string | undefined>()
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [version, setVersion] = useState(0)

  const cuenta = useConsulta(`usuario-${id}-${version}`, (signal) => obtenerUsuario(id, signal))
  const historial = useConsulta(`historial-${id}-${version}`, (signal) => historialUsuario(id, signal), (h) => h.length === 0)
  usePaginaActual(cuenta.datos?.nombre ?? 'Cuenta', [MIGAS_CORE.usuariosRoles, MIGAS_CORE.usuarios, { texto: cuenta.datos?.nombre ?? 'Cuenta' }])

  function actualizado(mensaje: string) {
    setAccion(null)
    setMotivo('')
    setErrorAccion(null)
    setAviso(mensaje)
    setVersion((v) => v + 1)
  }

  async function ejecutar(operacion: () => Promise<unknown>, mensaje: string) {
    setEnviando(true)
    setErrorAccion(null)
    try {
      const resultado = await operacion()
      if (resultado && typeof resultado === 'object' && 'contrasena_temporal' in resultado) {
        setContrasena(resultado as UsuarioConContrasena)
      }
      actualizado(mensaje)
    } catch (causa) {
      setErrorAccion(aErrorApi(causa).detalle)
    } finally {
      setEnviando(false)
    }
  }

  if (cuenta.estado === 'error' && !cuenta.datos) {
    return (
      <EstadoError
        titulo={cuenta.error?.estado === 404 ? 'La cuenta no existe' : 'No pudimos cargar la cuenta'}
        descripcion={cuenta.error?.detalle ?? ''}
        onReintentar={cuenta.reintentar}
      />
    )
  }
  if (!cuenta.datos) return <EstadoCarga forma="pagina" />
  const u: UsuarioResumen = cuenta.datos

  return (
    <div className={estilos.pagina}>
      <AvisoTemporal mensaje={aviso} onCerrar={() => setAviso(null)} />
      {errorAccion && accion === null && (
        <AvisoEnLinea tono="error" titulo="No se pudo completar la acción">
          {errorAccion}
        </AvisoEnLinea>
      )}

      <section className={estilos.seccion} aria-labelledby="cuenta-datos">
        <div className={estilos.barraAcciones}>
          <h2 id="cuenta-datos" className={estilos.tituloSeccion}>
            Datos de la cuenta
          </h2>
          <div className={estilos.acciones}>
            <Boton variante="secundario" compacto onClick={() => setAccion('editar')}>
              Editar
            </Boton>
            <Boton variante="secundario" compacto onClick={() => setAccion('rol')} deshabilitado={u.estado === 'inactiva'}>
              Cambiar rol
            </Boton>
            {u.estado === 'bloqueada' && (
              <Boton variante="secundario" compacto cargando={enviando} onClick={() => void ejecutar(() => desbloquearUsuario(u.id), 'Cuenta desbloqueada')}>
                Desbloquear
              </Boton>
            )}
            {u.estado !== 'inactiva' && (
              <>
                <Boton variante="secundario" compacto onClick={() => setAccion('cerrar-sesiones')}>
                  Cerrar sesiones
                </Boton>
                <Boton variante="secundario" compacto onClick={() => setAccion('contrasena')}>
                  Contraseña temporal
                </Boton>
                <Boton variante="destructivo" compacto onClick={() => setAccion('desactivar')}>
                  Desactivar
                </Boton>
              </>
            )}
            {u.estado === 'inactiva' && (
              <Boton compacto cargando={enviando} onClick={() => void ejecutar(() => activarUsuario(u.id), 'Cuenta reactivada')}>
                Reactivar
              </Boton>
            )}
          </div>
        </div>
        <ListaDescripcion
          elementos={[
            { etiqueta: 'Nombre', valor: u.nombre },
            { etiqueta: 'Correo', valor: u.correo },
            { etiqueta: 'Teléfono', valor: u.telefono },
            { etiqueta: 'Rol', valor: u.rol_nombre },
            { etiqueta: 'Estado', valor: <Badge tono={ESTADO_CUENTA[u.estado].tono} texto={ESTADO_CUENTA[u.estado].texto} /> },
            { etiqueta: 'Vigencia', valor: u.fecha_fin_vigencia ? `Hasta ${formatearFecha(u.fecha_fin_vigencia)}` : 'Sin fin' },
            { etiqueta: 'Último acceso', valor: u.ultimo_acceso ? formatearFechaHora(u.ultimo_acceso) : 'Nunca' },
            u.debe_cambiar_contrasena && { etiqueta: 'Contraseña', valor: 'Temporal: la cambiará al entrar' },
            u.destacados.length > 0 && {
              etiqueta: 'Atención',
              valor: (
                <span className={estilos.badges}>
                  {u.destacados.map((d) => (
                    <Badge key={d} tono="advertencia" texto={DESTACADO[d].texto} ayuda={DESTACADO[d].ayuda} />
                  ))}
                </span>
              ),
            },
          ]}
        />
      </section>

      <section className={estilos.seccion} aria-labelledby="cuenta-historial">
        <h2 id="cuenta-historial" className={estilos.tituloSeccion}>
          Historial de la cuenta
        </h2>
        <TablaDatos
          titulo="Historial de la cuenta"
          columnas={COLUMNAS_HISTORIAL}
          filas={historial.datos ?? []}
          claveFila={(c) => String(c.id)}
          estado={historial.estado === 'inactivo' || historial.estado === 'cargando' ? 'cargando' : historial.estado}
          vacio={{ titulo: 'Sin cambios registrados', nivel: 3 }}
          error={{ titulo: 'No pudimos cargar el historial', descripcion: historial.error?.detalle ?? '', onReintentar: historial.reintentar, nivel: 3 }}
          compacta
        />
      </section>

      {accion === 'editar' && (
        <DialogoCuenta cuenta={u} onCerrar={() => setAccion(null)} onActualizada={() => actualizado('Datos actualizados')} />
      )}
      {accion === 'rol' && (
        <DialogoCambioRol cuenta={u} onCerrar={() => setAccion(null)} onCambiado={(r) => actualizado(`Rol cambiado a ${r.rol.nombre}`)} />
      )}
      {accion === 'desactivar' && (
        <DialogoConfirmacion
          abierto
          titulo={`Desactivar la cuenta de ${u.nombre}`}
          consecuencia="Se cierran de inmediato todas sus sesiones, también la del móvil. Lo que registró sigue firmado por esta persona."
          textoConfirmar="Desactivar"
          variante="destructivo"
          cargando={enviando}
          onConfirmar={() => {
            const error = validarMotivo(motivo)
            setErrorMotivo(error)
            if (!error) void ejecutar(() => desactivarUsuario(u.id, motivo.trim()), 'Cuenta desactivada')
          }}
          onCancelar={() => setAccion(null)}
        >
          <AreaTexto
            id="desactivar-motivo"
            etiqueta="Motivo"
            obligatorio
            rows={2}
            maxLength={500}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            error={errorMotivo}
          />
          {errorAccion && <AvisoEnLinea tono="error">{errorAccion}</AvisoEnLinea>}
        </DialogoConfirmacion>
      )}
      {accion === 'cerrar-sesiones' && (
        <DialogoConfirmacion
          abierto
          titulo="Cerrar todas sus sesiones"
          consecuencia="Tendrá que volver a iniciar sesión en todos sus dispositivos. Úsalo si perdió el móvil."
          textoConfirmar="Cerrar sesiones"
          cargando={enviando}
          onConfirmar={() => void ejecutar(() => cerrarSesionesUsuario(u.id), 'Sesiones cerradas')}
          onCancelar={() => setAccion(null)}
        />
      )}
      {accion === 'contrasena' && (
        <DialogoConfirmacion
          abierto
          titulo="Generar una contraseña temporal"
          consecuencia="Su contraseña actual deja de valer y se cierran sus sesiones. Tendrá que cambiar la temporal al entrar."
          textoConfirmar="Generar"
          cargando={enviando}
          onConfirmar={() => void ejecutar(() => generarContrasenaTemporal(u.id), 'Contraseña temporal generada')}
          onCancelar={() => setAccion(null)}
        />
      )}
      {contrasena && <DialogoContrasenaTemporal resultado={contrasena} onCerrar={() => setContrasena(null)} />}
    </div>
  )
}
