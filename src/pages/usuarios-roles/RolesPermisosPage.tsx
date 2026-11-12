// AV-381 · Roles y permisos (solo el superadministrador)
/**
 * Los permisos de cada rol, por módulo, con casillas. Guardar sustituye todos los permisos del rol: vale desde la
 * siguiente acción de cada persona con ese rol y queda en la auditoría con autor, fecha y motivo.
 *
 * - «Gestionar los permisos de cada rol» es exclusivo del superadministrador: aparece sin poder marcarse.
 * - Los sensibles (datos personales o económicos, RNF-008) llevan aviso.
 * - El rol superadministrador no aparece: tiene siempre todos los permisos.
 * - MOD-05 y partes de MOD-02 y MOD-04 aún deciden por el nombre del rol: lo dice un aviso.
 */
import { useState } from 'react'
import AvisoEnLinea from '@/components/ui/AvisoEnLinea'
import Boton from '@/components/ui/Boton'
import Casilla from '@/components/ui/Casilla'
import { AreaTexto } from '@/components/ui/CampoFormulario'
import Estado from '@/components/ui/Estado'
import EstadoCarga from '@/components/ui/EstadoCarga'
import EstadoError from '@/components/ui/EstadoError'
import Pestanas from '@/components/ui/Pestanas'
import TablaDatos, { type ColumnaTabla } from '@/components/ui/TablaDatos'
import Tarjeta from '@/components/ui/Tarjeta'
import { useConsulta } from '@/hooks/useConsulta'
import { usePaginaActual } from '@/hooks/usePaginaActual'
import { MIGAS_CORE } from '@/router/rutasApp'
import { aErrorApi } from '@/services/api/cliente'
import { cambiarPermisosRol, listarPermisos, listarRoles, obtenerPermisosRol } from '@/services/api/core'
import type { CambioPermisos, CodigoRol, PermisoCatalogo } from '@/types/core'
import { formatearFechaHora } from '@/utils/formato'
import { PERMISO_RESERVADO, agruparPorModulo, diferenciaPermisos } from '@/utils/permisosRol'
import { validarMotivo } from '@/utils/validacionCore'
import estilos from './UsuariosRoles.module.css'

const TITULO = 'Roles y permisos'

const COLUMNAS_HISTORIAL: ColumnaTabla<CambioPermisos>[] = [
  { clave: 'fecha_hora', titulo: 'Fecha', render: (c) => formatearFechaHora(c.fecha_hora) },
  { clave: 'autor', titulo: 'Autor' },
  {
    clave: 'cambio',
    titulo: 'Cambio',
    multilinea: true,
    render: (c) => {
      const { anadidos, quitados } = diferenciaPermisos(c.anteriores, c.nuevos)
      return [anadidos.length ? `+ ${anadidos.join(', ')}` : '', quitados.length ? `− ${quitados.join(', ')}` : ''].filter(Boolean).join(' · ')
    },
  },
  { clave: 'motivo', titulo: 'Motivo', multilinea: true },
]

function EditorRol({ codigo, catalogo, onGuardado }: { codigo: CodigoRol; catalogo: PermisoCatalogo[]; onGuardado: () => void }) {
  const consulta = useConsulta(`permisos-rol-${codigo}`, (signal) => obtenerPermisosRol(codigo, signal))
  const [marcados, setMarcados] = useState<Set<string> | null>(null)
  const [motivo, setMotivo] = useState('')
  const [errorMotivo, setErrorMotivo] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (consulta.estado === 'error') {
    return <EstadoError titulo="No pudimos cargar los permisos del rol" descripcion={consulta.error?.detalle ?? ''} onReintentar={consulta.reintentar} nivel={3} />
  }
  if (!consulta.datos) return <EstadoCarga forma="tabla" filas={6} />

  const actuales = new Set(consulta.datos.rol.permisos)
  const seleccion = marcados ?? actuales
  const { anadidos, quitados } = diferenciaPermisos([...actuales], [...seleccion])
  const hayCambios = anadidos.length + quitados.length > 0

  function alternar(permiso: string, marcada: boolean) {
    const siguiente = new Set(seleccion)
    if (marcada) siguiente.add(permiso)
    else siguiente.delete(permiso)
    setMarcados(siguiente)
    setAviso(null)
  }

  async function guardar() {
    const fallo = validarMotivo(motivo)
    setErrorMotivo(fallo ?? undefined)
    if (fallo) {
      document.getElementById('permisos-motivo')?.focus()
      return
    }
    setEnviando(true)
    setError(null)
    try {
      await cambiarPermisosRol(codigo, [...seleccion].sort(), motivo.trim())
      setMarcados(null)
      setMotivo('')
      setAviso(`Permisos guardados: ${seleccion.size}. Valen desde la siguiente acción de cada persona con este rol.`)
      consulta.reintentar()
      onGuardado()
    } catch (causa) {
      setError(aErrorApi(causa).detalle)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className={estilos.pagina}>
      <p className={estilos.descripcionRol}>
        {consulta.datos.rol.descripcion}. {seleccion.size} de {catalogo.length} permisos.
        {!consulta.datos.rol.activo && ' Rol previsto para una fase posterior: sus cuentas no pueden entrar.'}
      </p>
      {agruparPorModulo(catalogo).map(({ modulo, permisos }) => (
        <Tarjeta key={modulo}>
          <fieldset className={estilos.grupoPermisos} disabled={enviando}>
            <legend className={estilos.tituloModulo}>
              {modulo} · {permisos.filter((p) => seleccion.has(p.codigo)).length} de {permisos.length}
            </legend>
            {permisos.map((p) => (
              <Casilla
                key={p.codigo}
                id={`permiso-${p.codigo}`}
                etiqueta={p.descripcion}
                ayuda={[
                  p.codigo,
                  p.es_sensible ? 'Sensible: datos personales o económicos' : '',
                  p.codigo === PERMISO_RESERVADO ? 'Exclusivo del superadministrador' : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
                marcada={seleccion.has(p.codigo)}
                disabled={p.codigo === PERMISO_RESERVADO}
                onCambiar={(marcada) => alternar(p.codigo, marcada)}
              />
            ))}
          </fieldset>
        </Tarjeta>
      ))}
      {aviso && <AvisoEnLinea tono="exito">{aviso}</AvisoEnLinea>}
      {error && <AvisoEnLinea tono="error" titulo="No se guardaron los permisos">{error}</AvisoEnLinea>}
      {hayCambios && (
        <Tarjeta>
          <div className={estilos.pagina}>
            <p>
              {anadidos.length > 0 && <Estado tono="exito" texto={`${anadidos.length} añadidos`} />}{' '}
              {quitados.length > 0 && <Estado tono="aviso" texto={`${quitados.length} quitados`} />}
            </p>
            <AreaTexto
              id="permisos-motivo"
              etiqueta="Motivo del cambio"
              obligatorio
              rows={2}
              maxLength={500}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              error={errorMotivo}
              disabled={enviando}
            />
            <div className={estilos.acciones}>
              <Boton onClick={() => void guardar()} cargando={enviando}>
                Guardar permisos
              </Boton>
              <Boton variante="fantasma" onClick={() => setMarcados(null)} deshabilitado={enviando}>
                Descartar cambios
              </Boton>
            </div>
          </div>
        </Tarjeta>
      )}
      <TablaDatos
        titulo="Cambios de permisos de este rol"
        tituloVisible
        columnas={COLUMNAS_HISTORIAL}
        filas={consulta.datos.historial}
        claveFila={(c, i) => `${c.fecha_hora}-${i}`}
        estado={consulta.datos.historial.length ? 'exito' : 'vacio'}
        vacio={{ titulo: 'Sin cambios todavía', descripcion: 'Los permisos de este rol son los iniciales.', nivel: 3 }}
        compacta
      />
    </div>
  )
}

export default function RolesPermisosPage() {
  usePaginaActual(TITULO, [MIGAS_CORE.usuariosRoles, { texto: TITULO }])
  const roles = useConsulta('roles-permisos', (signal) => listarRoles(signal))
  const catalogo = useConsulta('catalogo-permisos', (signal) => listarPermisos(signal))
  const [elegido, setElegido] = useState<CodigoRol | null>(null)

  if (roles.estado === 'error' || catalogo.estado === 'error') {
    const fallo = roles.error ?? catalogo.error
    return <EstadoError titulo="No pudimos cargar los roles" descripcion={fallo?.detalle ?? ''} onReintentar={() => { roles.reintentar(); catalogo.reintentar() }} />
  }
  if (!roles.datos || !catalogo.datos) return <EstadoCarga forma="tabla" filas={6} texto="Cargando roles…" />

  const codigo = elegido ?? roles.datos[0]?.codigo
  return (
    <div className={estilos.pagina}>
      <AvisoEnLinea tono="info">
        Servicios tercerizados y parte de Inventario y Operación de campo todavía deciden por el nombre del rol: en esas
        pantallas, cambiar un permiso aquí aún no cambia lo que la persona puede hacer.
      </AvisoEnLinea>
      {codigo && (
        <Pestanas
          etiqueta="Roles"
          valor={codigo}
          onCambiar={(valor) => setElegido(valor as CodigoRol)}
          pestanas={roles.datos.map((r) => ({ valor: r.codigo, texto: r.nombre, contador: r.permisos.length }))}
        >
          <EditorRol key={codigo} codigo={codigo} catalogo={catalogo.datos} onGuardado={roles.reintentar} />
        </Pestanas>
      )}
    </div>
  )
}
