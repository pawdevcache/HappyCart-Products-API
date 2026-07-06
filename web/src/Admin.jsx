import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api } from './api'
import { money } from './cart'

const blank = { title: '', price: '', category: '', image: '', description: '' }

export default function Admin({ token, isAdmin, onLogout }) {
  if (!isAdmin) return <Navigate to="/admin/login" />
  const [tab, setTab] = useState('overview')
  const [products, setProducts] = useState([])
  const [users, setUsers] = useState([])
  const [carts, setCarts] = useState([])
  const [form, setForm] = useState(blank)
  const [uForm, setUForm] = useState(null) // null = not editing a user
  const [msg, setMsg] = useState('')

  const loadProducts = () => fetch('/api/products').then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : []))
  const loadUsers = () => api('/users', 'GET', null, token).then(setUsers).catch(e => setMsg(e.message))
  const loadCarts = () => fetch('/api/carts').then(r => r.json()).then(d => setCarts(Array.isArray(d) ? d : [])).catch(() => {})
  useEffect(() => { loadProducts(); loadUsers(); loadCarts() }, [])

  const on = k => e => setForm({ ...form, [k]: e.target.value })
  const edit = p => { setForm({ id: p.id || p._id, title: p.title, price: p.price, category: p.category, image: p.image, description: p.description }); setTab('products'); window.scrollTo(0, 0) }

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

  const editUser = u => { setUForm({ id: u.id || u._id, username: u.username, email: u.email, role: u.role, password: '' }) }
  const onU = k => e => setUForm({ ...uForm, [k]: e.target.value })
  const saveUser = async e => {
    e.preventDefault(); setMsg('')
    const { id, password, ...rest } = uForm
    const body = { ...rest, ...(password ? { password } : {}) } // only send password if changed
    try { await api(`/users/${id}`, 'PUT', body, token); setUForm(null); setMsg('User updated.'); loadUsers() }
    catch (e) { setMsg(e.message) }
  }

  // ---- Derived metrics (memoised so they only recompute when data changes) ----
  const stats = useMemo(() => {
    const catalogValue = products.reduce((s, p) => s + (Number(p.price) || 0), 0)
    const avgPrice = products.length ? catalogValue / products.length : 0
    const byCat = {}
    for (const p of products) byCat[p.category || 'uncategorised'] = (byCat[p.category || 'uncategorised'] || 0) + 1
    const categories = Object.entries(byCat).sort((a, b) => b[1] - a[1])
    const admins = users.filter(u => u.role === 'admin').length
    const unitsSold = carts.reduce((s, c) => s + (c.products || []).reduce((n, i) => n + (i.quantity || 0), 0), 0)
    const topValue = [...products].sort((a, b) => (b.price || 0) - (a.price || 0)).slice(0, 5)
    const recent = [...carts].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 6)
    return { catalogValue, avgPrice, categories, admins, unitsSold, topValue, recent }
  }, [products, users, carts])

  const nav = [
    { id: 'overview', label: 'Overview', icon: '◆' },
    { id: 'products', label: 'Products', icon: '❖', count: products.length },
    { id: 'users', label: 'Users', icon: '⚇', count: users.length },
  ]

  return (
    <div className="dash">
      <aside className="side">
        <Link className="brand" to="/">HAPPY<span>CART</span></Link>
        <p className="sidetag">Admin Console</p>
        <nav className="sidenav">
          {nav.map(n => (
            <button key={n.id} className={'sidelink' + (tab === n.id ? ' on' : '')} onClick={() => setTab(n.id)}>
              <span className="ico">{n.icon}</span>{n.label}
              {n.count != null && <span className="pill">{n.count}</span>}
            </button>
          ))}
        </nav>
        <div className="sidefoot">
          <Link className="sidelink ghostish" to="/"><span className="ico">↗</span>View Store</Link>
          <button className="sidelink ghostish" onClick={onLogout}><span className="ico">⏻</span>Sign Out</button>
        </div>
      </aside>

      <main className="dmain">
        <header className="dtop">
          <div>
            <h1>{nav.find(n => n.id === tab).label}</h1>
            <p className="crumbs">HappyCart · {nav.find(n => n.id === tab).label}</p>
          </div>
          {tab !== 'overview' && (
            <button className="cta small" onClick={() => { setTab('overview') }}>← Back to Overview</button>
          )}
        </header>

        {msg && <p className="notice" onAnimationEnd={() => setMsg('')}>{msg}</p>}

        {tab === 'overview' && (
          <Overview products={products} users={users} carts={carts} stats={stats} onEdit={edit} onManage={setTab} />
        )}

        {tab === 'products' && (
          <>
            <section className="panel">
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

            <section className="panel">
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
                  {!products.length && <tr><td colSpan="5" className="tempty">No products yet.</td></tr>}
                </tbody>
              </table>
            </section>
          </>
        )}

        {tab === 'users' && (
          <section className="panel">
            <h2>Users <span className="badge">{users.length}</span></h2>
            {uForm && (
              <form className="pform" onSubmit={saveUser}>
                <input placeholder="Username" value={uForm.username} onChange={onU('username')} required />
                <input placeholder="Email" type="email" value={uForm.email} onChange={onU('email')} />
                <select value={uForm.role} onChange={onU('role')}>
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
                <input placeholder="New password (optional)" type="password" value={uForm.password} onChange={onU('password')} />
                <div className="pactions">
                  <button className="cta" type="submit">Update User</button>
                  <button type="button" className="ghost dark" onClick={() => setUForm(null)}>Cancel</button>
                </div>
              </form>
            )}
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
                        <button onClick={() => editUser(u)}>Edit</button>
                        <button className="danger" disabled={u.role === 'admin'} onClick={() => delUser(id)}>Delete</button>
                      </td>
                    </tr>
                  )
                })}
                {!users.length && <tr><td colSpan="4" className="tempty">No users yet.</td></tr>}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Overview: KPI cards + charts, all derived from live data.
// ---------------------------------------------------------------------------
function Overview({ products, users, carts, stats, onEdit, onManage }) {
  const cards = [
    { label: 'Total Products', value: products.length, sub: `${stats.categories.length} categories`, icon: '❖' },
    { label: 'Registered Users', value: users.length, sub: `${stats.admins} admin${stats.admins === 1 ? '' : 's'}`, icon: '⚇' },
    { label: 'Orders', value: carts.length, sub: `${stats.unitsSold} units sold`, icon: '🛒' },
    { label: 'Catalog Value', value: money(stats.catalogValue), sub: `avg ${money(stats.avgPrice)}`, icon: '◆' },
  ]
  const maxCat = Math.max(1, ...stats.categories.map(c => c[1]))
  const admins = stats.admins, normal = users.length - admins
  const donut = ring(admins, users.length)

  return (
    <div className="ovr">
      <div className="cards">
        {cards.map(c => (
          <div className="kpi" key={c.label}>
            <div className="kpiicon">{c.icon}</div>
            <div className="kpimeta">
              <span className="klabel">{c.label}</span>
              <span className="kval">{c.value}</span>
              <span className="ksub">{c.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="ograte">
        <section className="panel chart">
          <h2>Products by Category</h2>
          {stats.categories.length ? (
            <ul className="bars">
              {stats.categories.map(([cat, n]) => (
                <li key={cat}>
                  <span className="blabel">{cat}</span>
                  <span className="btrack"><span className="bfill" style={{ width: (n / maxCat * 100) + '%' }} /></span>
                  <span className="bval">{n}</span>
                </li>
              ))}
            </ul>
          ) : <p className="tempty">No products yet.</p>}
        </section>

        <section className="panel chart">
          <h2>Users by Role</h2>
          <div className="donutwrap">
            <svg viewBox="0 0 42 42" className="donut">
              <circle className="dring bg" cx="21" cy="21" r="15.915" />
              <circle className="dring gold" cx="21" cy="21" r="15.915"
                strokeDasharray={`${donut} ${100 - donut}`} strokeDashoffset="25" />
            </svg>
            <div className="donutlegend">
              <div><i className="dot gold" /> Admins <b>{admins}</b></div>
              <div><i className="dot grey" /> Customers <b>{normal}</b></div>
            </div>
          </div>
        </section>
      </div>

      <div className="ograte">
        <section className="panel chart">
          <h2>Recent Orders</h2>
          {stats.recent.length ? (
            <table className="atable slim">
              <thead><tr><th>Order</th><th>User</th><th>Items</th><th>Date</th></tr></thead>
              <tbody>
                {stats.recent.map(c => {
                  const id = c.id || c._id || ''
                  const items = (c.products || []).reduce((n, i) => n + (i.quantity || 0), 0)
                  return (
                    <tr key={id}>
                      <td className="mono">#{String(id).slice(-6) || '—'}</td>
                      <td>user {c.userId}</td>
                      <td>{items}</td>
                      <td>{fmtDate(c.date)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : <p className="tempty">No orders recorded yet.</p>}
        </section>

        <section className="panel chart">
          <h2>Top-Value Products</h2>
          {stats.topValue.length ? (
            <ul className="toplist">
              {stats.topValue.map(p => (
                <li key={p.id || p._id} onClick={() => onEdit(p)}>
                  <img src={p.image} alt="" />
                  <span className="tname">{p.title}</span>
                  <span className="price">{money(p.price)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="tempty">No products yet.</p>}
          <button className="ghost dark full" onClick={() => onManage('products')}>Manage Products →</button>
        </section>
      </div>
    </div>
  )
}

// share of `part` out of `whole`, as a number 0–100 for the donut arc.
const ring = (part, whole) => whole ? Math.round(part / whole * 100) : 0

function fmtDate(d) {
  if (!d) return '—'
  const t = new Date(d)
  return isNaN(t) ? String(d) : t.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
