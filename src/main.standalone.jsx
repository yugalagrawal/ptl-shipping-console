import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

// Entry point used only for the exported single-file prototype
// (PTL-Console-Prototype.html) — HashRouter instead of main.jsx's
// BrowserRouter, since that file gets opened via file:// or from whatever
// path a dev drops it at, not served at "/". BrowserRouter's route matching
// is based on the real URL path, which is wrong in both cases; HashRouter
// keeps all routing after the "#" so it works the same regardless of where
// the file lives.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
)
