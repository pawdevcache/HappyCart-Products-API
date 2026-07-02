import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './Layout.jsx'
import Store from './Store.jsx'
import ProductDetail from './ProductDetail.jsx'
import { Login, Register } from './Auth.jsx'

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')

  const saveToken = t => { localStorage.setItem('token', t); setToken(t) }
  const logout = () => { localStorage.removeItem('token'); setToken('') }

  return (
    <Routes>
      <Route element={<Layout token={token} onLogout={logout} />}>
        <Route index element={<Store />} />
        <Route path="product/:id" element={<ProductDetail />} />
      </Route>
      <Route path="/login" element={<Login onAuth={saveToken} />} />
      <Route path="/register" element={<Register />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
