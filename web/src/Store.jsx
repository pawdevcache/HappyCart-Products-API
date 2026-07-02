import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { money } from './cart'

export default function Store() {
  const [products, setProducts] = useState([])
  const { add, openBag } = useOutletContext()

  useEffect(() => {
    // Prefer the HappyCart backend; fall back to FakeStore so the store is never empty.
    fetch('/api/products')
      .then(r => r.json())
      .then(d => (Array.isArray(d) && d.length ? d : Promise.reject()))
      .catch(() => fetch('https://fakestoreapi.com/products').then(r => r.json()))
      .then(setProducts)
      .catch(() => setProducts([]))
  }, [])

  return (
    <>
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
            <Link key={id} to={`/product/${id}`} className="card">
              <div className="thumb"><img src={p.image} alt={p.title} loading="lazy" /></div>
              <p className="cat">{p.category}</p>
              <h3 className="title">{p.title}</h3>
              <div className="row">
                <span className="price">{money(p.price)}</span>
                <button className="addbtn" onClick={e => { e.preventDefault(); add(p); openBag() }}>Add to Bag</button>
              </div>
            </Link>
          )
        })}
        {!products.length && <p className="empty">Loading the collection…</p>}
      </main>
    </>
  )
}
