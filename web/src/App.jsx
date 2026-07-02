import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './Layout.jsx'
import Store from './Store.jsx'
import ProductDetail from './ProductDetail.jsx'
import Admin from './Admin.jsx'
import { Login, Register, AdminLogin } from './Auth.jsx'

// Read the role claim out of the JWT payload (no verification needed client-side).
const roleOf = t => { try { return JSON.parse(atob(t.split('.')[1])).role } catch { return '' } }

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')
  const isAdmin = roleOf(token) === 'admin'

  const saveToken = t => { localStorage.setItem('token', t); setToken(t) }
  const logout = () => { localStorage.removeItem('token'); setToken('') }

  return (
    <Routes>
      <Route element={<Layout token={token} isAdmin={isAdmin} onLogout={logout} />}>
        <Route index element={<Store />} />
        <Route path="product/:id" element={<ProductDetail />} />
      </Route>
      <Route path="/admin" element={<Admin token={token} isAdmin={isAdmin} onLogout={logout} />} />
      <Route path="/admin/login" element={<AdminLogin onAuth={saveToken} />} />
      <Route path="/login" element={<Login onAuth={saveToken} />} />
      <Route path="/register" element={<Register />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
