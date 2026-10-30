import { RouterProvider } from 'react-router'
import { router } from './router/rutas'
import ProveedorSesion from './sesion/ProveedorSesion'

export default function App() {
  return (
    <ProveedorSesion>
      <RouterProvider router={router} />
    </ProveedorSesion>
  )
}
