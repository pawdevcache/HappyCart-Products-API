import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

const money = n => '$' + Number(n).toFixed(2)

export default function Store({ token, onLogout }) {
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState({}) // id -> { product, qty }
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Prefer the HappyCart backend; fall back to FakeStore so the store is never empty.
    fetch('/api/products')
      .then(r => r.json())
      .then(d => (Array.isArray(d) && d.length ? d : Promise.reject()))
      .catch(() => fetch('https://fakestoreapi.com/products').then(r => r.json()))
      .then(setProducts)
      .catch(() => setProducts([]))
  }, [])

  const add = p => {
    const id = p.id || p._id
    setCart(c => ({ ...c, [id]: { product: p, qty: (c[id]?.qty || 0) + 1 } }))
    setOpen(true)
  }
  const setQty = (id, qty) =>
    setCart(c => {
      if (qty <= 0) { const { [id]: _, ...rest } = c; return rest }
      return { ...c, [id]: { ...c[id], qty } }
    })

  const items = Object.entries(cart)
  const count = items.reduce((n, [, i]) => n + i.qty, 0)
  const total = useMemo(() => items.reduce((s, [, i]) => s + i.product.price * i.qty, 0), [cart])

  return (
    <>
      <header className="nav">
        <div className="brand">HAPPY<span>CART</span></div>
        <nav className="links"><a>New In</a><a>Collections</a><a>Jewelry</a><a>About</a></nav>
        <div className="navactions">
          {token
            ? <button className="ghost" onClick={onLogout}>Sign Out</button>
            : <Link className="ghost" to="/login">Sign In</Link>}
          <button className="bag" onClick={() => setOpen(true)}>Bag<span>{count}</span></button>
        </div>
      </header>

      <section className="hero">
        <p className="eyebrow">Est. 2026 — Curated Luxury</p>
        <h1>Timeless Pieces,<br />Crafted for the Few.</h1>
        <p className="sub">Discover our exclusive edit of high-end fashion, fine jewelry, and objects of desire.</p>
        <button className="cta" onClick={() => document.getElementById('shop').scrollIntoView({ behavior: 'smooth' })}>
          Explore the Collection
        </button>
      </section>

      <main id="shop" className="grid">
        {products.map(p => {
          const id = p.id || p._id
          return (
            <article key={id} className="card">
              <div className="thumb"><img src={p.image} alt={p.title} loading="lazy" /></div>
              <p className="cat">{p.category}</p>
              <h3 className="title">{p.title}</h3>
              <div className="row">
                <span className="price">{money(p.price)}</span>
                <button className="addbtn" onClick={() => add(p)}>Add to Bag</button>
              </div>
            </article>
          )
        })}
        {!products.length && <p className="empty">Loading the collection…</p>}
      </main>

      <footer className="foot">
        <div className="brand">HAPPY<span>CART</span></div>
        <p>© 2026 HappyCart — Luxury, delivered.</p>
      </footer>

      <div className={'drawer' + (open ? ' show' : '')}>
        <div className="dhead"><h2>Your Bag</h2><button onClick={() => setOpen(false)}>✕</button></div>
        <div className="ditems">
          {items.length === 0 && <p className="empty">Your bag is empty.</p>}
          {items.map(([id, i]) => (
            <div key={id} className="ditem">
              <img src={i.product.image} alt="" />
              <div className="dinfo">
                <p className="title">{i.product.title}</p>
                <span className="price">{money(i.product.price)}</span>
                <div className="qty">
                  <button onClick={() => setQty(id, i.qty - 1)}>−</button>
                  <span>{i.qty}</span>
                  <button onClick={() => setQty(id, i.qty + 1)}>＋</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="dfoot">
          <div className="totrow"><span>Total</span><span className="price">{money(total)}</span></div>
          <button className="checkout" disabled={!items.length}>Checkout</button>
        </div>
      </div>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
    </>
  )
}
