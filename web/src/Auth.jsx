import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from './api'

const memberPitch = {
  eyebrow: 'Members Only',
  heading: <>Where luxury<br />meets you.</>,
  sub: 'Enjoy early access to new collections, private sales, and concierge service.',
}

// Shared luxury split-screen layout for the auth pages.
function Shell({ title, subtitle, children, pitch = memberPitch }) {
  return (
    <div className="auth">
      <aside className="authbrand">
        <Link className="brand" to="/">HAPPY<span>CART</span></Link>
        <div className="authpitch">
          <p className="eyebrow">{pitch.eyebrow}</p>
          <h2>{pitch.heading}</h2>
          <p className="sub">{pitch.sub}</p>
        </div>
        <p className="authfoot">© 2026 HappyCart</p>
      </aside>
      <section className="authform">
        <div className="authbox">
          <h1>{title}</h1>
          <p className="authsub">{subtitle}</p>
          {children}
        </div>
      </section>
    </div>
  )
}

function Field({ label, ...p }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...p} required />
    </label>
  )
}

export function Login({ onAuth }) {
  const [f, setF] = useState({ username: '', password: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()
  const on = k => e => setF({ ...f, [k]: e.target.value })

  const submit = async e => {
    e.preventDefault(); setErr(''); setBusy(true)
    try { const { token } = await api('/auth/login', 'POST', f); onAuth(token); nav('/') }
    catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <Shell title="Welcome Back" subtitle="Sign in to your account to continue.">
      <form onSubmit={submit}>
        {err && <p className="err">{err}</p>}
        <Field label="Username or Email" value={f.username} onChange={on('username')} autoComplete="username" />
        <Field label="Password" type="password" value={f.password} onChange={on('password')} autoComplete="current-password" />
        <button className="cta" disabled={busy}>{busy ? 'Signing in…' : 'Sign In'}</button>
      </form>
      <p className="switch">New to HappyCart? <Link to="/register">Create an account</Link></p>
      <p className="switch small">Administrator? <Link to="/admin/login">Sign in to the admin portal</Link></p>
    </Shell>
  )
}

const adminPitch = {
  eyebrow: 'Admin Portal',
  heading: <>Manage the<br />collection.</>,
  sub: 'Products, inventory, and customer accounts — all in one secure place.',
}

export function AdminLogin({ onAuth }) {
  const [f, setF] = useState({ username: '', password: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()
  const on = k => e => setF({ ...f, [k]: e.target.value })

  const submit = async e => {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      const { token } = await api('/auth/login', 'POST', f)
      const role = JSON.parse(atob(token.split('.')[1])).role
      if (role !== 'admin') { setErr('This account does not have admin access.'); return }
      onAuth(token); nav('/admin')
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <Shell title="Admin Sign In" subtitle="Restricted access — administrators only." pitch={adminPitch}>
      <form onSubmit={submit}>
        {err && <p className="err">{err}</p>}
        <Field label="Admin Username" value={f.username} onChange={on('username')} autoComplete="username" />
        <Field label="Password" type="password" value={f.password} onChange={on('password')} autoComplete="current-password" />
        <button className="cta" disabled={busy}>{busy ? 'Signing in…' : 'Enter Dashboard'}</button>
      </form>
      <p className="switch small"><Link to="/login">← Back to customer sign in</Link></p>
    </Shell>
  )
}

export function Register() {
  const [f, setF] = useState({ username: '', email: '', password: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()
  const on = k => e => setF({ ...f, [k]: e.target.value })

  const submit = async e => {
    e.preventDefault(); setErr(''); setBusy(true)
    try { await api('/users', 'POST', f); nav('/login') }
    catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <Shell title="Create Account" subtitle="Join the HappyCart circle in seconds.">
      <form onSubmit={submit}>
        {err && <p className="err">{err}</p>}
        <Field label="Username" value={f.username} onChange={on('username')} autoComplete="username" />
        <Field label="Email" type="email" value={f.email} onChange={on('email')} autoComplete="email" />
        <Field label="Password" type="password" value={f.password} onChange={on('password')} autoComplete="new-password" />
        <button className="cta" disabled={busy}>{busy ? 'Creating…' : 'Create Account'}</button>
      </form>
      <p className="switch">Already a member? <Link to="/login">Sign in</Link></p>
    </Shell>
  )
}
