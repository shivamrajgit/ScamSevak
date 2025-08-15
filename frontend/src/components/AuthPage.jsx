import React, { useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_EXP_API_URL || 'http://localhost:8000/api'

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const [res] = await Promise.all([
        axios.post(`${API}/${mode}`, { username, password }),
        new Promise(resolve => setTimeout(resolve, 500))
      ])
      onAuth(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Error')
    } finally {
      setLoading(false)
    }
  }

  const handleGuest = async () => {
    setLoading(true)
    setError('')
    try {
      const [res] = await Promise.all([
        axios.post(`${API}/guest`),
        new Promise(resolve => setTimeout(resolve, 500))
      ])
      onAuth(res.data)
    } catch (err) {
      setError('Guest login failed')
    } finally {
      setLoading(false)
    }
  }

  const isLogin = mode === 'login'

  // Theme values — purely presentational
  const theme = {
    light: {
      pageBg: 'linear-gradient(180deg,#f7fafc 0%, #eef2f7 100%)',
      cardBg: '#f1f5f9',           // slightly darker than page
      cardBorder: 'rgba(15,23,42,0.06)',
      text: '#0f172a',
      inputBg: '#ffffff',
      inputBorder: '#e2e8f0',
      submitBg: '#0b1220',        // dark, crisp CTA on light mode
      submitText: '#ffffff',
      toggleTrack: '#ffffff',     // lighter than card
      toggleKnob: '#0b1220',
      spinnerColor: '#0b1220'
    },
    dark: {
      pageBg: 'linear-gradient(180deg,#000000 0%, #071428 100%)',
      cardBg: '#20303d',          // lighter than background
      cardBorder: 'rgba(255,255,255,0.04)',
      text: '#e6eef9',
      inputBg: '#041025',
      inputBorder: '#123048',
      submitBg: '#e6eef9',        // light CTA on dark mode
      submitText: '#07122a',
      toggleTrack: '#07122a',     // darker than card
      toggleKnob: '#e6eef9',
      spinnerColor: '#e6eef9'
    }
  }[isLogin ? 'light' : 'dark']

  return (
    <div
      className="flex items-center justify-center min-h-screen px-4"
      style={{
        background: theme.pageBg,
        transition: 'background 520ms ease'
      }}
    >
      <form
        onSubmit={handleAuth}
        className="w-full max-w-md p-8 rounded-2xl shadow-lg"
        style={{
          background: theme.cardBg,
          color: theme.text,
          border: `1px solid ${theme.cardBorder}`,
          transition: 'all 420ms cubic-bezier(.2,.9,.2,1)',
          transform: isLogin ? 'translateY(0)' : 'translateY(-4px)'
        }}
      >
        {/* Header + Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-2xl font-semibold tracking-tight"
              style={{ letterSpacing: '-0.01em' }}
            >
              ScamSevak
            </h1>
            <p className="mt-1 text-sm" style={{ color: theme.text, opacity: 0.8 }}>
              Secure your conversations
            </p>
          </div>

          {/* Toggle switch (acts as login/signup switch) */}
          <div
            role="switch"
            aria-checked={!isLogin}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setMode(isLogin ? 'signup' : 'login')
              }
            }}
            onClick={() => setMode(isLogin ? 'signup' : 'login')}
            className="relative select-none cursor-pointer ml-4"
            style={{
              width: 92,
              height: 38,
              borderRadius: 9999,
              display: 'flex',
              alignItems: 'center',
              padding: 4,
              gap: 8,
              background: theme.toggleTrack,
              border: `1px solid ${theme.cardBorder}`,
              boxShadow: isLogin ? 'none' : '0 4px 18px rgba(2,6,23,0.35)'
            }}
            aria-label="Toggle Login / Sign Up"
          >
            <span
              className="absolute inset-0 flex items-center text-nowrap px-3 text-xs font-medium"
              style={{ color: isLogin ? '#475569' : '#94a3b8', pointerEvents: 'none' }}
            >
              <span style={{ opacity: isLogin ? 0 : 1 }}>Login</span>
              <span style={{ opacity: isLogin ? 1 : 0 }}>Sign up</span>
            </span>

            {/* Knob */}
            <div
              className="relative rounded-full"
              style={{
                width: 30,
                height: 30,
                background: theme.toggleKnob,
                transform: isLogin ? 'translateX(2px)' : 'translateX(52px)',
                transition: 'transform 360ms cubic-bezier(.2,.9,.2,1), background 360ms',
                boxShadow: '0 6px 18px rgba(2,6,23,0.12)'
              }}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-3 text-sm font-medium" style={{ color: '#ef4444' }}>
            {error}
          </div>
        )}

        {/* Inputs */}
        <label className="block mb-2 text-sm" style={{ color: theme.text, opacity: 0.85 }}>
          Username
          <input
            className="mt-1 w-full px-3 py-2 rounded-lg focus:outline-none transition"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            disabled={loading}
            style={{
              background: theme.inputBg,
              border: `1px solid ${theme.inputBorder}`,
              color: theme.text
            }}
          />
        </label>

        <label className="block mb-4 text-sm" style={{ color: theme.text, opacity: 0.85 }}>
          Password
          <input
            className="mt-1 w-full px-3 py-2 rounded-lg focus:outline-none transition"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={loading}
            style={{
              background: theme.inputBg,
              border: `1px solid ${theme.inputBorder}`,
              color: theme.text
            }}
          />
        </label>

        {/* Primary CTA */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg font-semibold mb-3 transition"
          style={{
            background: theme.submitBg,
            color: theme.submitText,
            boxShadow: '0 6px 18px rgba(2,6,23,0.12)',
            opacity: loading ? 0.85 : 1,
            transform: loading ? 'translateY(0)' : 'translateY(0)'
          }}
        >
          {/* subtle CSS spinner instead of emoji */}
          {loading && (mode === 'login' || mode === 'signup') && (
            <span
              className="inline-block mr-2 align-middle"
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                borderStyle: 'solid',
                borderWidth: 2,
                borderTopColor: 'transparent',
                borderRightColor: theme.spinnerColor,
                borderBottomColor: theme.spinnerColor,
                borderLeftColor: theme.spinnerColor,
                display: 'inline-block',
                verticalAlign: 'middle',
                animation: 'spin 900ms linear infinite'
              }}
            />
          )}
          {mode === 'login' ? 'Login' : 'Sign Up'}
        </button>

        {/* Guest */}
        <button
          type="button"
          onClick={handleGuest}
          disabled={loading}
          className="w-full py-2 rounded-lg mb-3 transition"
          style={{
            background: 'transparent',
            border: `1px solid ${theme.cardBorder}`,
            color: theme.text,
            opacity: 0.95
          }}
        >
          Continue as Guest
        </button>

        {/* Old left-right buttons removed in favor of the toggle above — kept minimal */}
        <div className="mt-2 text-xs text-center" style={{ color: theme.text, opacity: 0.75 }}>
          <span>
            {isLogin ? 'You are in login mode' : 'You are in signup mode'}
          </span>
        </div>

        {/* Loading block (keeps original behavior — unchanged logic) */}
        {loading && (
          <div className="flex items-center justify-center mt-4" style={{ gap: 10 }}>
            <div
              className="rounded-full"
              style={{
                width: 20,
                height: 20,
                borderWidth: 2,
                borderStyle: 'solid',
                borderTopColor: 'transparent',
                borderRightColor: theme.spinnerColor,
                borderBottomColor: theme.spinnerColor,
                borderLeftColor: theme.spinnerColor,
                borderRadius: '9999px',
                animation: 'spin 900ms linear infinite'
              }}
            />
            <span style={{ color: theme.text, opacity: 0.85 }}>Loading...</span>
          </div>
        )}

        {/* small spinner keyframes */}
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          /* focus styles for accessibility */
          input:focus { box-shadow: 0 6px 18px rgba(11,17,32,0.06); border-color: rgba(99,102,241,0.9); }
          button:focus { outline: none; box-shadow: 0 6px 18px rgba(11,17,32,0.06); }
        `}</style>
      </form>
    </div>
  )
}