import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from './api'

// Shared luxury split-screen layout for both auth pages.
function Shell({ title, subtitle, children }) {
  return (
    <div className="auth">
      <aside className="authbrand">
        <Link className="brand" to="/">HAPPY<span>CART</span></Link>
        <div className="authpitch">
          <p className="eyebrow">Members Only</p>
          <h2>Where luxury<br />meets you.</h2>
          <p className="sub">Enjoy early access to new collections, private sales, and concierge service.</p>
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
