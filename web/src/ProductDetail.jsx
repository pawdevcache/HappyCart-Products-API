import { useEffect, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { money } from './cart'

export default function ProductDetail() {
  const { id } = useParams()
  const { add, openBag } = useOutletContext()
  const [p, setP] = useState(null) // null = loading, false = not found

  useEffect(() => {
    setP(null)
    // Try the HappyCart backend; fall back to FakeStore (matches the store's data source).
    fetch(`/api/products/${id}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .catch(() => fetch(`https://fakestoreapi.com/products/${id}`).then(r => r.json()))
      .then(d => setP(d && (d.id || d._id || d.title) ? d : false))
      .catch(() => setP(false))
  }, [id])

  if (p === null) return <p className="empty">Loading…</p>
  if (!p) return <section className="detail"><p className="empty">Product not found.</p></section>

  return (
    <section className="detail">
      <Link className="back" to="/">← Back to Collection</Link>
      <div className="dgrid">
        <div className="dimg"><img src={p.image} alt={p.title} /></div>
        <div className="dmeta">
          <p className="cat">{p.category}</p>
          <h1>{p.title}</h1>
          {p.rating && <p className="rating">★ {p.rating.rate} · {p.rating.count} reviews</p>}
          <p className="price big">{money(p.price)}</p>
          <p className="desc">{p.description}</p>
          <button className="cta" onClick={() => { add(p); openBag() }}>Add to Bag</button>
        </div>
      </div>
    </section>
  )
}
