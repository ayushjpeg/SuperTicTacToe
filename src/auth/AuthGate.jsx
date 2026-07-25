import { useEffect, useMemo, useState } from 'react'

const DEFAULT_BASE_URL = 'https://common-backend.ayux.in/api'
const stripTrailingSlash = (value) => value.replace(/\/$/, '')
const API_BASE_URL = stripTrailingSlash(import.meta.env.VITE_BACKEND_URL || DEFAULT_BASE_URL)

async function fetchCurrentUser() {
  const response = await fetch(`${API_BASE_URL}/auth/me`, { credentials: 'include' })
  if (response.status === 401) return null
  if (!response.ok) throw new Error('Failed to load session')
  return response.json()
}

function startGoogleLogin() {
  const origin = window.location.origin
  window.location.href = `${API_BASE_URL}/auth/google/start?redirect_origin=${encodeURIComponent(origin)}`
}

async function logout() {
  await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' })
}

export function AuthGate({ children }) {
  const [status, setStatus] = useState('loading')
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const authError = useMemo(() => new URLSearchParams(window.location.search).get('auth_error') || '', [])

  useEffect(() => {
    let canceled = false
    const load = async () => {
      try {
        const currentUser = await fetchCurrentUser()
        if (canceled) return
        if (!currentUser) {
          setStatus('unauthenticated')
          return
        }
        setUser(currentUser)
        setStatus('authenticated')
      } catch (err) {
        if (canceled) return
        setError(err.message || 'Unable to verify your session.')
        setStatus('unauthenticated')
      }
    }
    load()
    return () => {
      canceled = true
    }
  }, [])

  const handleLogout = async () => {
    await logout()
    setUser(null)
    setStatus('unauthenticated')
  }

  if (status === 'loading') {
    return <div className="auth-shell">Checking your session...</div>
  }

  if (status !== 'authenticated') {
    return (
      <div className="auth-shell auth-shell--splash">
        <div className="auth-card">
          <p className="auth-card__eyebrow">Number Tic Tac Toe</p>
          <h1 className="auth-card__title">Enter the arena</h1>
          <p className="auth-card__subtitle">
            Sign in to challenge live players, send invite links, and start competitive Number Tic Tac Toe sessions.
          </p>
          {(authError || error) && <p className="auth-card__error">{authError || error}</p>}
          <button className="auth-card__button" onClick={startGoogleLogin}>Continue with Google</button>
        </div>
      </div>
    )
  }

  return (
    <>
      <header className="session-bar">
        <div className="session-bar__inner">
          <span className="session-bar__user">{user?.email}</span>
          <button className="session-bar__logout" onClick={handleLogout}>Log out</button>
        </div>
      </header>
      {children}
    </>
  )
}
