/**
 * @file Status badge component.
 * Color-coded by status/role for appointments and staff lists.
 */
import React from 'react'

const VARIANTS = {
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-600',
  no_show: 'bg-red-100 text-red-700',
  owner: 'bg-purple-100 text-purple-700',
  stylist: 'bg-blue-100 text-blue-700',
  receptionist: 'bg-teal-100 text-teal-700',
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  cash: 'bg-green-100 text-green-700',
  upi: 'bg-indigo-100 text-indigo-700',
  card: 'bg-blue-100 text-blue-700',
  mixed: 'bg-purple-100 text-purple-700',
  low: 'bg-red-100 text-red-700',
}

export default function Badge({ label, variant }) {
  const cls = VARIANTS[variant] || VARIANTS[label?.toLowerCase()] || 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {label}
    </span>
  )
}
