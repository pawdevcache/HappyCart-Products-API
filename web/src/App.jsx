import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Store from './Store.jsx'
import { Login, Register } from './Auth.jsx'

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')

  const saveToken = t => { localStorage.setItem('token', t); setToken(t) }
  const logout = () => { localStorage.removeItem('token'); setToken('') }

  return (
    <Routes>
      <Route path="/" element={<Store token={token} onLogout={logout} />} />
      <Route path="/login" element={<Login onAuth={saveToken} />} />
      <Route path="/register" element={<Register />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
