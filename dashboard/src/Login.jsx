import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import './Login.css'

const supabase = createClient(
  'https://poiwjrkqtbfxhfqvabep.supabase.co',
  'sb_publishable_XOGsctULk60og40FT2zRfg_amrSIm5_'
)

export default function Login() {
  const [mode, setMode]       = useState('login')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        window.location.href = '/dashboard'
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } }
        })
        if (error) throw error
        window.location.href = '/'
      }
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-brand">
          <div className="login-badge">EV.</div>
          <div>
            <div className="login-brand-name">E‑Voila</div>
            <div className="login-brand-sub">Voice CRM</div>
          </div>
        </div>

        <h2 className="login-title">
          {mode === 'login' ? 'Willkommen zurück' : 'Account erstellen'}
        </h2>
        <p className="login-sub">
          {mode === 'login'
            ? 'Melde dich an um fortzufahren'
            : 'Erstelle deinen E-Voila Account'}
        </p>

        {error && <div className="login-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          {mode === 'register' && (
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                placeholder="Max Mustermann"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>E-Mail</label>
            <input
              type="email"
              placeholder="name@firma.de"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Passwort</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? '⏳ Lädt...' : mode === 'login' ? '→ Anmelden' : '→ Registrieren'}
          </button>
        </form>

        <div className="login-switch">
          {mode === 'login' ? (
            <>Noch kein Account?{' '}
              <button onClick={() => setMode('register')}>Registrieren</button>
            </>
          ) : (
            <>Bereits registriert?{' '}
              <button onClick={() => setMode('login')}>Anmelden</button>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
