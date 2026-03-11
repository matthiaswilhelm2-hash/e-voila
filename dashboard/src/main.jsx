import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import Dashboard from './Dashboard'
import Login from './Login'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<App />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/login"     element={<Login />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)
