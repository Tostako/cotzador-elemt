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
requestAnimationFrame(() =>
  requestAnimationFrame(() => {
    (window as unknown as { __hideSplash?: () => void }).__hideSplash?.()
  })
)
