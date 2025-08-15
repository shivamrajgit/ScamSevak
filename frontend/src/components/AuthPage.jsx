import React, { useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

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

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f7971e 100%)',
        transition: 'background 0.5s'
      }}
    >
      <form className="bg-white bg-opacity-90 p-8 rounded-2xl shadow-2xl w-80 flex flex-col items-center border border-gray-200 backdrop-blur-md"
        onSubmit={handleAuth}
      >
        <h2 className="text-3xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-orange-400">
          ScamSevak
        </h2>
        <p className="mb-4 text-gray-500 text-sm">Secure your conversations</p>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <input
          className="w-full mb-2 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          disabled={loading}
        />
        <input
          className="w-full mb-4 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={loading}
        />
        <button
          className={`w-full py-2 rounded mb-2 font-semibold text-white transition ${mode === 'login' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-orange-500 hover:bg-orange-600'} ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
          type="submit"
          disabled={loading}
        >
          {loading && (mode === 'login' || mode === 'signup') && <span className="animate-spin mr-2">🔄</span>}
          {mode === 'login' ? 'Login' : 'Sign Up'}
        </button>
        <button
          className="w-full bg-gray-100 text-gray-800 py-2 rounded mb-2 hover:bg-gray-200 transition"
          type="button"
          onClick={handleGuest}
          disabled={loading}
        >
          {loading && mode === 'guest' && <span className="animate-spin mr-2">🔄</span>}
          Continue as Guest
        </button>
        <div className="flex justify-between mt-2 text-xs w-full">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`transition ${mode === 'login' ? 'font-bold text-purple-600' : 'text-gray-500'} cursor-pointer`}
            disabled={loading}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`transition ${mode === 'signup' ? 'font-bold text-orange-500' : 'text-gray-500'} cursor-pointer`}
            disabled={loading}
          >
            Sign Up
          </button>
        </div>
        {loading && (
          <div className="flex justify-center mt-4">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500"></div>
            <span className="ml-2 text-purple-600">Loading...</span>
          </div>
        )}
      </form>
    </div>
  )
}