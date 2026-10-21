import { RouterProvider } from 'react-router'
import { router } from './router/rutas'

export default function App() {
  return <RouterProvider router={router} />
}
