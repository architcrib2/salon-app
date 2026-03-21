/**
 * @file Login page.
 * JWT login form with username + password. Stores tokens via AuthContext.
 * Redirects to dashboard on success. Tailwind styled with salon branding.
 */
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.username || !form.password) {
      setError('Please enter both username and password')
      return
    }
    setLoading(true)
    try {
      await login(form.username, form.password)
      toast.success('Welcome back!')
      navigate('/')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid credentials'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <span className="text-6xl block mb-3">✂️</span>
          <h1 className="text-3xl font-bold text-white">KaratOS Salon</h1>
          <p className="text-white/50 mt-1 text-sm">Management System</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Sign in to your account</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                placeholder="admin"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-dark text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 font-medium mb-1">Demo credentials</p>
            <p className="text-xs text-gray-600">Username: <code className="font-mono bg-white px-1 rounded">admin</code></p>
            <p className="text-xs text-gray-600">Password: <code className="font-mono bg-white px-1 rounded">demo1234</code></p>
          </div>
        </div>
      </div>
    </div>
  )
}
