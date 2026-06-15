import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { installLocalApi } from './services/localApi.js'

// Importaciones de PrimeReact (Tema, núcleo e iconos)
import { PrimeReactProvider } from 'primereact/api';
import "primereact/resources/themes/lara-light-cyan/theme.css"; 
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';

installLocalApi();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PrimeReactProvider>
      <App />
    </PrimeReactProvider>
  </StrictMode>,
)
