import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './concordance.css'
import { runDataChecks } from './data/dataChecks'
runDataChecks()
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)

