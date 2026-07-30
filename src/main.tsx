import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Oculta el splash del index.html cuando la app ya montó y pintó el primer frame.
const hideSplash = () => (window as unknown as { __hideSplash?: () => void }).__hideSplash?.()
requestAnimationFrame(() => requestAnimationFrame(hideSplash))
// Respaldo: los navegadores móviles congelan requestAnimationFrame cuando la
// pestaña está en segundo plano. Sin esto, si el usuario abre el link y cambia
// de app mientras carga, al volver el splash sigue tapando todo. __hideSplash
// es idempotente, así que llamarlo dos veces no hace daño.
setTimeout(hideSplash, 2500)
