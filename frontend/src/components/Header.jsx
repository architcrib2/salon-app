/**
 * @file Top header bar.
 * Shows page context, hamburger menu on mobile, and current user badge.
 */
import React from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/appointments': 'Appointments',
  '/customers': 'Customers',
  '/billing': 'Billing',
  '/services': 'Services',
  '/inventory': 'Inventory',
  '/analytics': 'Analytics',
  '/staff': 'Staff',
}

export default function Header({ onMenuClick }) {
  const location = useLocation()
  const { user } = useAuth()
  const title = PAGE_TITLES[location.pathname] || 'Salon Manager'

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
        >
          ☰
        </button>
        <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500 hidden sm:block">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
        {user && (
          <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5">
            <span className="text-xs font-medium text-gray-700">{user.full_name}</span>
            <span className="text-xs bg-accent text-white px-1.5 py-0.5 rounded-full capitalize">{user.role}</span>
          </div>
        )}
      </div>
    </header>
  )
}
