import { RouterProvider } from 'react-router'
import { router } from './router/rutas'
import ProveedorSesion from './sesion/ProveedorSesion'
import ProveedorSincronizacion from './sincronizacion/ProveedorSincronizacion'

export default function App() {
  return (
    <ProveedorSesion>
      <ProveedorSincronizacion>
        <RouterProvider router={router} />
      </ProveedorSincronizacion>
    </ProveedorSesion>
  )
}
