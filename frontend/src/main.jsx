import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AuthPage from './components/AuthPage.jsx'
import './index.css'

function Main() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })
  const [loading, setLoading] = useState(false)

  const handleAuth = (userData) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const handleLogout = async () => {
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 500))
    setUser(null)
    localStorage.removeItem('user')
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600"></div>
        <span className="mt-4 text-blue-600 text-lg">Logging out...</span>
      </div>
    )
  }

  return user ? <App user={user} onLogout={handleLogout} /> : <AuthPage onAuth={handleAuth} />
}

ReactDOM.createRoot(document.getElementById('root')).render(<Main />)