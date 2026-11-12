import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/geist/400.css'
import '@fontsource/geist/500.css'
import '@fontsource/geist/600.css'
import './styles/global.css'
import App from './App.tsx'
import { instalarRecargaTrasDespliegue } from './utils/recargaTrasDespliegue'

instalarRecargaTrasDespliegue() // AV-367: chunks de la versión anterior tras un despliegue

// oxlint-disable-next-line typescript/no-non-null-assertion -- index.html siempre tiene #root
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
