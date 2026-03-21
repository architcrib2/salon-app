/**
 * @file Empty state component.
 * Shown when a list/table has no data. Provides icon, message, and optional CTA button.
 */
import React from 'react'

export default function EmptyState({ icon = '📭', title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <span className="text-5xl mb-4">{icon}</span>
      <h3 className="text-lg font-semibold text-gray-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-4 max-w-xs">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
