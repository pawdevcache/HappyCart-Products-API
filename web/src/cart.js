import { useState } from 'react'

export const money = n => '$' + Number(n).toFixed(2)

// Cart state backed by localStorage so it survives page navigation.
export function useCart() {
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('cart') || '{}'))
  const save = c => { localStorage.setItem('cart', JSON.stringify(c)); setCart(c) }

  const add = p => {
    const id = p.id || p._id
    save({ ...cart, [id]: { product: p, qty: (cart[id]?.qty || 0) + 1 } })
  }
  const setQty = (id, qty) => {
    if (qty <= 0) { const { [id]: _, ...rest } = cart; save(rest) }
    else save({ ...cart, [id]: { ...cart[id], qty } })
  }

  const items = Object.entries(cart)
  const count = items.reduce((n, [, i]) => n + i.qty, 0)
  const total = items.reduce((s, [, i]) => s + i.product.price * i.qty, 0)
  return { items, count, total, add, setQty }
}
