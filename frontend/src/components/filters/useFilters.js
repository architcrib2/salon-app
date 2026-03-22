/**
 * useFilters — manages filter state synced to URL query params + localStorage.
 *
 * Usage:
 *   const { filters, setFilter, setFilters, clearFilters, toAPIParams } = useFilters({
 *     defaults: { duration: 'this_month', start_date: '...', end_date: '...' },
 *     storageKey: 'salon_filters_billing'   // optional, for localStorage persistence
 *   })
 */
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear,
  format, subDays
} from 'date-fns'

export const DURATION_PRESETS = {
  today:         () => ({ start: startOfDay(new Date()), end: endOfDay(new Date()) }),
  this_week:     () => ({ start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: endOfWeek(new Date(), { weekStartsOn: 1 }) }),
  this_month:    () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }),
  last_month:    () => ({ start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) }),
  last_3_months: () => ({ start: startOfMonth(subMonths(new Date(), 2)), end: endOfMonth(new Date()) }),
  last_6_months: () => ({ start: startOfMonth(subMonths(new Date(), 5)), end: endOfMonth(new Date()) }),
  this_year:     () => ({ start: startOfYear(new Date()), end: endOfYear(new Date()) }),
}

const fmt = (d) => format(d, 'yyyy-MM-dd')

export function durationToDates(duration) {
  const fn = DURATION_PRESETS[duration]
  if (!fn) return {}
  const { start, end } = fn()
  return { start_date: fmt(start), end_date: fmt(end) }
}

export default function useFilters({ defaults = {}, storageKey = null } = {}) {
  const [searchParams, setSearchParams] = useSearchParams()

  // Build current filters: URL params > localStorage > defaults
  const filters = useMemo(() => {
    const result = { ...defaults }

    // Read from localStorage
    if (storageKey) {
      try {
        const stored = localStorage.getItem(storageKey)
        if (stored) Object.assign(result, JSON.parse(stored))
      } catch {}
    }

    // URL params override everything
    for (const [key, value] of searchParams.entries()) {
      if (value) result[key] = value
    }

    return result
  }, [searchParams, storageKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const setFilter = useCallback((key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value === null || value === undefined || value === '') {
        next.delete(key)
      } else {
        next.set(key, String(value))
      }
      return next
    }, { replace: true })

    // Persist globals to localStorage
    if (storageKey) {
      try {
        const stored = localStorage.getItem(storageKey)
        const cur = stored ? JSON.parse(stored) : {}
        if (value === null || value === undefined || value === '') {
          delete cur[key]
        } else {
          cur[key] = value
        }
        localStorage.setItem(storageKey, JSON.stringify(cur))
      } catch {}
    }
  }, [setSearchParams, storageKey])

  const setFilters = useCallback((updates) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === '') {
          next.delete(key)
        } else {
          next.set(key, String(value))
        }
      }
      return next
    }, { replace: true })

    if (storageKey) {
      try {
        const stored = localStorage.getItem(storageKey)
        const cur = stored ? JSON.parse(stored) : {}
        Object.assign(cur, updates)
        localStorage.setItem(storageKey, JSON.stringify(cur))
      } catch {}
    }
  }, [setSearchParams, storageKey])

  const clearFilters = useCallback(() => {
    setSearchParams({}, { replace: true })
    if (storageKey) {
      try { localStorage.removeItem(storageKey) } catch {}
    }
  }, [setSearchParams, storageKey])

  // Returns URLSearchParams-compatible string for appending to API calls
  const toAPIParams = useCallback(() => {
    const p = new URLSearchParams()
    for (const [key, value] of Object.entries(filters)) {
      if (key === 'duration') continue // don't send duration itself to API
      if (value !== null && value !== undefined && value !== '') {
        p.set(key, String(value))
      }
    }
    return p
  }, [filters])

  const apiParamsString = useMemo(() => toAPIParams().toString(), [toAPIParams])

  // Check if any non-default filter is active
  const hasActiveFilters = useMemo(() => {
    for (const [key, value] of Object.entries(filters)) {
      const defaultVal = defaults[key]
      if (value !== defaultVal && value !== null && value !== undefined && value !== '') {
        return true
      }
    }
    return false
  }, [filters, defaults])

  return { filters, setFilter, setFilters, clearFilters, toAPIParams, apiParamsString, hasActiveFilters }
}
