/**
 * Configuración › Cuenta (RD-64, N-02): quién eres, «Cambiar contraseña» (la pantalla de AV-439) y «Cerrar sesión».
 * Cerrar sesión pasa por la sesión común (`POST core/auth/logout`); si falla, avisa y deja la sesión como estaba.
 */
import { useState } from 'react'
import AvisoEnLinea from '@/design-system/AvisoEnLinea'
import Boton, { BotonEnlace } from '@/design-system/Boton'
import ListaDescripcion from '@/design-system/ListaDescripcion'
import { aErrorApi } from '@/services/api/cliente'
import { useSesion, useSesionActiva } from '@/sesion/ContextoSesion'
import { rutaCambiarContrasena } from './enlaces'
import estilos from './Configuracion.module.css'

export default function Cuenta() {
  const sesion = useSesionActiva()
  const { cerrarSesion } = useSesion()
  const [cerrando, setCerrando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function cerrar() {
    setCerrando(true)
    setError(null)
    try {
      await cerrarSesion()
    } catch (causa) {
      setError(aErrorApi(causa).detalle)
      setCerrando(false)
    }
  }

  return (
    <div className={estilos.campos}>
      {sesion && (
        <ListaDescripcion
          elementos={[
            { etiqueta: 'Nombre', valor: sesion.usuario.nombre },
            { etiqueta: 'Usuario', valor: sesion.usuario.nombre_usuario },
            { etiqueta: 'Rol', valor: sesion.rol.nombre },
          ]}
        />
      )}
      {error && (
        <AvisoEnLinea tono="error" titulo="No pudimos cerrar la sesión">
          {error}
        </AvisoEnLinea>
      )}
      <div className={estilos.acciones}>
        <BotonEnlace to={rutaCambiarContrasena()} variante="secundario">
          Cambiar contraseña
        </BotonEnlace>
        <Boton variante="fantasma" onClick={() => void cerrar()} cargando={cerrando}>
          Cerrar sesión
        </Boton>
      </div>
    </div>
  )
}
