/**
 * @file Loading spinner component.
 * Centered spinner with optional message. Used during async data fetches.
 */
import React from 'react'

export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-accent rounded-full animate-spin" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  )
}
