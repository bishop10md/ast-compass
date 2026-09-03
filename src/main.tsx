import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './concordance.css'
import './phenotype.css'
import './promo.css'
import './promo-phone.css'
import { runDataChecks } from './data/dataChecks'
import { AuthProvider } from './auth/AuthContext'
import AppErrorBoundary from './components/AppErrorBoundary'
import { captureError, initTelemetry } from './lib/telemetry'
try { runDataChecks(); initTelemetry() } catch (error) { captureError(error, { feature_name: "application_initialization", success_or_failure: "failure" }) }
createRoot(document.getElementById('root')!).render(<StrictMode><AppErrorBoundary><AuthProvider><App /></AuthProvider></AppErrorBoundary></StrictMode>)
