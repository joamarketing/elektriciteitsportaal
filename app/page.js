'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Ongeldige gebruikersnaam of wachtwoord')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      position: 'relative',
      zIndex: 1,
      padding: 16
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: 72, 
            height: 72, 
            borderRadius: 20, 
            background: 'linear-gradient(135deg, #E85D3A, #D4A843)', 
            marginBottom: 24,
            boxShadow: '0 8px 32px rgba(232, 93, 58, 0.3)'
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <h1 style={{ 
            fontSize: 32, 
            fontWeight: 800, 
            margin: 0, 
            letterSpacing: -0.5,
            background: 'linear-gradient(135deg, #E8E6E1, rgba(232, 230, 225, 0.7))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Energieportaal
          </h1>
          <p style={{ color: 'rgba(232, 230, 225, 0.4)', marginTop: 8, fontSize: 15 }}>
            Beheer en verdeling van elektriciteitskosten
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 20 }}>
              <label className="label">E-mailadres</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="naam@voorbeeld.be"
                required
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label className="label">Wachtwoord</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Voer wachtwoord in"
                required
              />
            </div>
            
            {error && (
              <div className="error-message" style={{ marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 16 }}
              disabled={loading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              {loading ? 'Aanmelden...' : 'Aanmelden'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
