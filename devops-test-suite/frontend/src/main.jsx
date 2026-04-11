// FILE: main.jsx
// PURPOSE: React entry point — mounts the App component into the HTML #root div
// USED BY: frontend/index.html via <script type="module">

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// StrictMode renders components twice in development to catch side effects
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
