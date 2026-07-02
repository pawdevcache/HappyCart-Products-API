import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api } from './api'
import { money } from './cart'

const blank = { title: '', price: '', category: '', image: '', description: '' }

export default function Admin({ token, isAdmin, onLogout }) {
  if (!isAdmin) return <Navigate to="/admin/login" />
  const [products, setProducts] = useState([])
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(blank)
  const [msg, setMsg] = useState('')

  const loadProducts = () => fetch('/api/products').then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : []))
  const loadUsers = () => api('/users', 'GET', null, token).then(setUsers).catch(e => setMsg(e.message))
  useEffect(() => { loadProducts(); loadUsers() }, [])

  const on = k => e => setForm({ ...form, [k]: e.target.value })
  const edit = p => { setForm({ id: p.id || p._id, title: p.title, price: p.price, category: p.category, image: p.image, description: p.description }); window.scrollTo(0, 0) }

  const saveProduct = async e => {
    e.preventDefault(); setMsg('')
    const { id, ...rest } = form
    const body = { ...rest, price: Number(rest.price), rating: { rate: 0, count: 0 } }
    try {
      await api(id ? `/products/${id}` : '/products', id ? 'PUT' : 'POST', body, token)
      setForm(blank); setMsg(id ? 'Product updated.' : 'Product added.'); loadProducts()
    } catch (e) { setMsg(e.message) }
  }
  const delProduct = async id => { if (confirm('Delete this product?')) { await api(`/products/${id}`, 'DELETE', null, token); loadProducts() } }
  const delUser = async id => { if (confirm('Delete this user account?')) { try { await api(`/users/${id}`, 'DELETE', null, token); loadUsers() } catch (e) { setMsg(e.message) } } }

  return (
    <div className="admin">
      <header className="ahead">
        <Link className="brand" to="/">HAPPY<span>CART</span> · Admin</Link>
        <div className="navactions">
          <Link className="ghost" to="/">View Store</Link>
          <button className="ghost" onClick={onLogout}>Sign Out</button>
        </div>
      </header>

      {msg && <p className="notice">{msg}</p>}

      <section className="apanel">
        <h2>{form.id ? 'Edit Product' : 'Add Product'}</h2>
        <form className="pform" onSubmit={saveProduct}>
          <input placeholder="Title" value={form.title} onChange={on('title')} required />
          <input placeholder="Price" type="number" step="0.01" value={form.price} onChange={on('price')} required />
          <input placeholder="Category" value={form.category} onChange={on('category')} required />
          <input placeholder="Image URL" value={form.image} onChange={on('image')} />
          <textarea placeholder="Description" value={form.description} onChange={on('description')} rows="2" />
          <div className="pactions">
            <button className="cta" type="submit">{form.id ? 'Update Product' : 'Add Product'}</button>
            {form.id && <button type="button" className="ghost dark" onClick={() => setForm(blank)}>Cancel</button>}
          </div>
        </form>
      </section>

      <section className="apanel">
        <h2>Products <span className="badge">{products.length}</span></h2>
        <table className="atable">
          <thead><tr><th></th><th>Title</th><th>Category</th><th>Price</th><th></th></tr></thead>
          <tbody>
            {products.map(p => {
              const id = p.id || p._id
              return (
                <tr key={id}>
                  <td><img className="tiny" src={p.image} alt="" /></td>
                  <td className="tcell">{p.title}</td>
                  <td>{p.category}</td>
                  <td className="price">{money(p.price)}</td>
                  <td className="acts">
                    <button onClick={() => edit(p)}>Edit</button>
                    <button className="danger" onClick={() => delProduct(id)}>Delete</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section className="apanel">
        <h2>Users <span className="badge">{users.length}</span></h2>
        <table className="atable">
          <thead><tr><th>Username</th><th>Email</th><th>Role</th><th></th></tr></thead>
          <tbody>
            {users.map(u => {
              const id = u.id || u._id
              return (
                <tr key={id}>
                  <td className="tcell">{u.username}</td>
                  <td>{u.email}</td>
                  <td><span className={'rolechip' + (u.role === 'admin' ? ' gold' : '')}>{u.role}</span></td>
                  <td className="acts">
                    <button className="danger" disabled={u.role === 'admin'} onClick={() => delUser(id)}>Delete</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}
