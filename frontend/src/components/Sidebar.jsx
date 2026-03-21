/**
 * @file Sidebar navigation component.
 * Uses deep charcoal background (#1a1a2e) with accent red (#e94560) active state.
 * Responsive: visible always on md+, slide-in on mobile.
 */
import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const CORE_NAV = [
  { path: '/', label: 'Dashboard', icon: '🏠', exact: true },
  { path: '/appointments', label: 'Appointments', icon: '📅' },
  { path: '/customers', label: 'Customers', icon: '👥' },
  { path: '/billing', label: 'Billing', icon: '💳' },
  { path: '/services', label: 'Services', icon: '✂️' },
  { path: '/inventory', label: 'Inventory', icon: '📦' },
  { path: '/analytics', label: 'Analytics', icon: '📊', ownerOnly: true },
  { path: '/staff', label: 'Staff', icon: '👤' },
]

const ENGAGEMENT_NAV = [
  { path: '/waitlist', label: 'Waitlist', icon: '🔢' },
  { path: '/memberships', label: 'Memberships', icon: '🎫' },
  { path: '/campaigns', label: 'Campaigns', icon: '📣' },
  { path: '/notifications', label: 'Notifications', icon: '💬' },
  { path: '/booking-requests', label: 'Booking Requests', icon: '📲' },
]

const INTELLIGENCE_NAV = [
  { path: '/analytics/intelligence', label: 'Customer Intelligence', icon: '🧠', ownerOnly: true },
  { path: '/staff-intelligence',     label: 'Staff Intelligence',    icon: '👤', ownerOnly: true },
  { path: '/inventory-intelligence', label: 'Inventory Intelligence',icon: '📦', ownerOnly: true },
]

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Logged out')
    navigate('/login')
  }

  const sidebarClass = `
    fixed md:static inset-y-0 left-0 z-30
    w-64 bg-sidebar text-white flex flex-col
    transform transition-transform duration-200 ease-in-out
    ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
  `

  const NavItem = ({ item }) => {
    if (item.ownerOnly && user?.role !== 'owner') return null
    return (
      <NavLink
        to={item.path}
        end={item.exact}
        onClick={onClose}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
          ${isActive
            ? 'bg-accent text-white'
            : 'text-white/70 hover:bg-white/10 hover:text-white'
          }`
        }
      >
        <span className="text-base">{item.icon}</span>
        {item.label}
      </NavLink>
    )
  }

  return (
    <aside className={sidebarClass}>
      {/* Logo / brand */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✂️</span>
          <div>
            <p className="font-bold text-lg leading-none">KaratOS</p>
            <p className="text-xs text-white/50">Salon Manager</p>
          </div>
        </div>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
        {/* Core navigation */}
        {CORE_NAV.map(item => <NavItem key={item.path} item={item} />)}

        {/* Engagement section */}
        <div className="pt-4 pb-1">
          <p className="text-xs font-semibold text-white/30 uppercase tracking-wider px-3 mb-2">Engagement</p>
        </div>
        {ENGAGEMENT_NAV.map(item => <NavItem key={item.path} item={item} />)}

        {/* Intelligence section */}
        <div className="pt-4 pb-1">
          <p className="text-xs font-semibold text-white/30 uppercase tracking-wider px-3 mb-2">Intelligence</p>
        </div>
        {INTELLIGENCE_NAV.map(item => <NavItem key={item.path} item={item} />)}
      </nav>

      {/* User info + logout */}
      <div className="px-4 py-4 border-t border-white/10">
        {user && (
          <div className="mb-3 px-2">
            <p className="text-sm font-medium text-white truncate">{user.full_name}</p>
            <p className="text-xs text-white/50 capitalize">{user.role}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <span>🚪</span> Logout
        </button>
      </div>
    </aside>
  )
}
