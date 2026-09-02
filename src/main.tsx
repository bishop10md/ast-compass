import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './concordance.css'
import { runDataChecks } from './data/dataChecks'
import { AuthProvider } from './auth/AuthContext'
runDataChecks()
createRoot(document.getElementById('root')!).render(<StrictMode><AuthProvider><App /></AuthProvider></StrictMode>)
