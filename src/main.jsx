import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Sobrescribir diálogos nativos para corregir el bug de pérdida de foco del cursor en Windows/Electron
if (window.electronAPI && typeof window.electronAPI.refocus === 'function') {
  const originalAlert = window.alert;
  window.alert = (message) => {
    originalAlert(message);
    window.electronAPI.refocus();
  };

  const originalConfirm = window.confirm;
  window.confirm = (message) => {
    const result = originalConfirm(message);
    window.electronAPI.refocus();
    return result;
  };

  const originalPrompt = window.prompt;
  window.prompt = (message, defaultValue) => {
    const result = originalPrompt(message, defaultValue);
    window.electronAPI.refocus();
    return result;
  };

  // Escuchador global de respaldo: re-enfocar la ventana si el usuario hace clic en un input
  document.addEventListener('click', (e) => {
    if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
      window.electronAPI.refocus();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

