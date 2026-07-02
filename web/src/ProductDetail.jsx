import { useEffect, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { money } from './cart'

// Distinct "views" of the single product photo, so the gallery reads like multiple images.
const views = [
  { label: 'Front', style: {} },
  { label: 'Detail', style: { transform: 'scale(1.7)', objectPosition: 'top' } },
  { label: 'Angle', style: { transform: 'scale(1.4)', objectPosition: 'bottom right' } },
  { label: 'Studio', style: { filter: 'contrast(1.15) saturate(1.1) brightness(1.03)' } },
]

export default function ProductDetail() {
  const { id } = useParams()
  const { add, openBag } = useOutletContext()
  const [p, setP] = useState(null) // null = loading, false = not found
  const [active, setActive] = useState(0)

  useEffect(() => {
    setP(null); setActive(0)
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
        <div className="dgallery">
          <div className="dimg"><img src={p.image} alt={p.title} style={views[active].style} /></div>
          <div className="thumbs">
            {views.map((v, i) => (
              <button key={i} className={'thumb-btn' + (i === active ? ' on' : '')} onClick={() => setActive(i)} aria-label={v.label}>
                <img src={p.image} alt="" style={v.style} />
              </button>
            ))}
          </div>
        </div>
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
