import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { useCart, money } from './cart'

export default function Layout({ token, isAdmin, onLogout }) {
  const cart = useCart()
  const [open, setOpen] = useState(false)
  const openBag = () => setOpen(true)
  const { items, count, total, setQty } = cart

  return (
    <>
      <header className="nav">
        <Link className="brand" to="/">HAPPY<span>CART</span></Link>
        <nav className="links"><a>New In</a><a>Collections</a><a>Jewelry</a><a>About</a></nav>
        <div className="navactions">
          {isAdmin && <Link className="ghost" to="/admin">Admin</Link>}
          {token
            ? <button className="ghost" onClick={onLogout}>Sign Out</button>
            : <Link className="ghost" to="/login">Sign In</Link>}
          <button className="bag" onClick={openBag}>Bag<span>{count}</span></button>
        </div>
      </header>

      <Outlet context={{ add: cart.add, openBag }} />

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
