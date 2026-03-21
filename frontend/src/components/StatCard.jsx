/**
 * @file Summary stat card for dashboard.
 * Shows icon, label, value, and optional trend indicator.
 */
import React from 'react'

export default function StatCard({ icon, label, value, sub, color = 'bg-white' }) {
  return (
    <div className={`${color} rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4`}>
      <div className="text-3xl">{icon}</div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-800 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  )
}
