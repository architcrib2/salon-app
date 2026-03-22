/**
 * FilterBar — reusable horizontal filter bar.
 *
 * Props:
 *   filters      — current filter state object
 *   onChange     — (updates: object) => void  called with partial updates
 *   onClear      — () => void  clears all filters
 *   available    — array of filter names to render
 *   statusOptions — array of status strings (for STATUS filter)
 *   hasActive    — bool: whether any non-default filter is active
 */
import React, { useState, useEffect } from 'react'
import { durationToDates, DURATION_PRESETS } from './useFilters'

const DURATION_LABELS = {
  today:         'Today',
  this_week:     'This Week',
  this_month:    'This Month',
  last_month:    'Last Month',
  last_3_months: 'Last 3 Months',
  last_6_months: 'Last 6 Months',
  this_year:     'This Year',
  custom:        'Custom',
}

const PAYMENT_OPTIONS = ['cash', 'upi', 'card', 'mixed']

// Debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

export default function FilterBar({ filters = {}, onChange, onClear, available = [], statusOptions = [], hasActive = false }) {
  const show = (name) => available.includes(name)

  // Staff dropdown state
  const [staffList, setStaffList] = useState([])
  const [staffLoaded, setStaffLoaded] = useState(false)

  // Customer typeahead state
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerResults, setCustomerResults] = useState([])
  const [customerDropOpen, setCustomerDropOpen] = useState(false)
  const debouncedCustomerQuery = useDebounce(customerQuery, 300)

  // Load staff list once on mount
  useEffect(() => {
    if (!show('staff') || staffLoaded) return
    import('axios').then(({ default: axios }) => {
      axios.get('/api/staff/').then(res => {
        const data = res.data?.data || res.data?.results || res.data || []
        setStaffList(Array.isArray(data) ? data : [])
        setStaffLoaded(true)
      }).catch(() => setStaffLoaded(true))
    })
  }, []) // eslint-disable-line

  // Customer typeahead search
  useEffect(() => {
    if (!show('customer') || debouncedCustomerQuery.length < 2) {
      setCustomerResults([])
      return
    }
    import('axios').then(({ default: axios }) => {
      axios.get(`/api/customers/?search=${encodeURIComponent(debouncedCustomerQuery)}&limit=10`).then(res => {
        const data = res.data?.data || res.data?.results || []
        setCustomerResults(Array.isArray(data) ? data.slice(0, 10) : [])
        setCustomerDropOpen(true)
      }).catch(() => {})
    })
  }, [debouncedCustomerQuery]) // eslint-disable-line

  const handleDurationChange = (key) => {
    if (key === 'custom') {
      onChange({ duration: 'custom' })
    } else {
      const { start_date, end_date } = durationToDates(key)
      onChange({ duration: key, start_date, end_date })
    }
  }

  const toggleStatus = (s) => {
    const current = filters.status ? filters.status.split(',').filter(Boolean) : []
    const next = current.includes(s) ? current.filter(x => x !== s) : [...current, s]
    onChange({ status: next.join(',') })
  }

  const togglePayment = (m) => {
    const current = filters.payment_method ? filters.payment_method.split(',').filter(Boolean) : []
    const next = current.includes(m) ? current.filter(x => x !== m) : [...current, m]
    onChange({ payment_method: next.join(',') })
  }

  const activeStatuses = filters.status ? filters.status.split(',').filter(Boolean) : []
  const activeMethods  = filters.payment_method ? filters.payment_method.split(',').filter(Boolean) : []

  // Active filter chips data
  const chips = []
  if (filters.duration && filters.duration !== 'this_month') {
    chips.push({ key: 'duration', label: DURATION_LABELS[filters.duration] || filters.duration })
  }
  if (filters.duration === 'custom' && filters.start_date) {
    chips.push({ key: 'start_date', label: `From ${filters.start_date}` })
  }
  if (filters.duration === 'custom' && filters.end_date) {
    chips.push({ key: 'end_date', label: `To ${filters.end_date}` })
  }
  if (filters.staff_id) {
    const s = staffList.find(x => String(x.id) === String(filters.staff_id))
    chips.push({ key: 'staff_id', label: `Staff: ${s?.full_name || s?.name || filters.staff_id}` })
  }
  if (filters.customer_id) {
    chips.push({ key: 'customer_id', label: `Customer #${filters.customer_id}` })
  }
  if (activeStatuses.length) {
    chips.push({ key: 'status', label: `Status: ${activeStatuses.join(', ')}` })
  }
  if (activeMethods.length) {
    chips.push({ key: 'payment_method', label: `Payment: ${activeMethods.join(', ')}` })
  }

  const removeChip = (key) => {
    if (key === 'duration') {
      const { start_date, end_date } = durationToDates('this_month')
      onChange({ duration: 'this_month', start_date, end_date })
    } else if (key === 'start_date' || key === 'end_date') {
      onChange({ [key]: '' })
    } else {
      onChange({ [key]: '' })
    }
  }

  return (
    <div className="bg-white border-b border-gray-200 mb-4">
      {/* Filter controls row */}
      <div className="px-4 py-2.5 flex flex-wrap gap-2 items-center">

        {/* DURATION */}
        {show('duration') && (
          <div className="flex gap-0.5 bg-gray-50 rounded-lg p-0.5 border border-gray-200">
            {Object.entries(DURATION_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => handleDurationChange(key)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors whitespace-nowrap ${
                  filters.duration === key
                    ? 'bg-white text-accent border border-accent shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* CUSTOM DATE INPUTS */}
        {show('duration') && filters.duration === 'custom' && (
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={filters.start_date || ''}
              onChange={e => onChange({ start_date: e.target.value })}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:border-accent"
            />
            <span className="text-gray-400 text-xs">to</span>
            <input
              type="date"
              value={filters.end_date || ''}
              min={filters.start_date || ''}
              onChange={e => onChange({ end_date: e.target.value })}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:border-accent"
            />
          </div>
        )}

        {/* YEAR */}
        {show('year') && (
          <select
            value={filters.year || new Date().getFullYear()}
            onChange={e => {
              const y = Number(e.target.value)
              const m = filters.month ? Number(filters.month) : null
              let start_date, end_date
              if (m) {
                const d = new Date(y, m - 1, 1)
                const last = new Date(y, m, 0)
                start_date = `${y}-${String(m).padStart(2,'0')}-01`
                end_date   = `${y}-${String(m).padStart(2,'0')}-${last.getDate()}`
              } else {
                start_date = `${y}-01-01`
                end_date   = `${y}-12-31`
              }
              onChange({ year: y, start_date, end_date, duration: 'custom' })
            }}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:border-accent"
          >
            {[0,1,2,3].map(i => {
              const y = new Date().getFullYear() - i
              return <option key={y} value={y}>{y}</option>
            })}
          </select>
        )}

        {/* MONTH */}
        {show('month') && (
          <select
            value={filters.month || ''}
            onChange={e => {
              const m = e.target.value ? Number(e.target.value) : null
              const y = filters.year || new Date().getFullYear()
              let start_date, end_date
              if (m) {
                const last = new Date(y, m, 0)
                start_date = `${y}-${String(m).padStart(2,'0')}-01`
                end_date   = `${y}-${String(m).padStart(2,'0')}-${last.getDate()}`
              } else {
                start_date = `${y}-01-01`
                end_date   = `${y}-12-31`
              }
              onChange({ month: m || '', start_date, end_date, duration: 'custom' })
            }}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:border-accent"
          >
            <option value="">All months</option>
            {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((name, i) => (
              <option key={i+1} value={i+1}>{name}</option>
            ))}
          </select>
        )}

        {/* STAFF */}
        {show('staff') && (
          <select
            value={filters.staff_id || ''}
            onChange={e => onChange({ staff_id: e.target.value })}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:border-accent min-w-[130px]"
          >
            <option value="">All Staff</option>
            {staffList.map(s => (
              <option key={s.id} value={s.id}>{s.full_name || s.name} ({s.role})</option>
            ))}
          </select>
        )}

        {/* CUSTOMER typeahead */}
        {show('customer') && (
          <div className="relative">
            <input
              type="text"
              placeholder="Search customer..."
              value={filters.customer_id ? `Customer #${filters.customer_id}` : customerQuery}
              onFocus={() => filters.customer_id ? onChange({ customer_id: '' }) : null}
              onChange={e => {
                if (filters.customer_id) onChange({ customer_id: '' })
                setCustomerQuery(e.target.value)
              }}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:border-accent min-w-[160px]"
            />
            {customerDropOpen && customerResults.length > 0 && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 min-w-[220px] max-h-48 overflow-y-auto">
                {customerResults.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onChange({ customer_id: c.id })
                      setCustomerQuery('')
                      setCustomerDropOpen(false)
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
                  >
                    <span className="font-medium text-gray-800">{c.name}</span>
                    <span className="text-gray-400 ml-2">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STATUS multi-select */}
        {show('status') && statusOptions.length > 0 && (
          <div className="flex gap-1">
            {statusOptions.map(s => (
              <button
                key={s}
                onClick={() => toggleStatus(s)}
                className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors capitalize border ${
                  activeStatuses.includes(s)
                    ? 'bg-accent text-white border-accent'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        )}

        {/* PAYMENT METHOD multi-select */}
        {show('payment_method') && (
          <div className="flex gap-1">
            {PAYMENT_OPTIONS.map(m => (
              <button
                key={m}
                onClick={() => togglePayment(m)}
                className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors uppercase border ${
                  activeMethods.includes(m)
                    ? 'bg-accent text-white border-accent'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}

        {/* CLEAR ALL */}
        {hasActive && (
          <button
            onClick={onClear}
            className="ml-auto text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            <span>✕</span> Clear all
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {chips.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {chips.map(chip => (
            <span key={chip.key} className="inline-flex items-center gap-1 bg-accent/10 text-accent text-xs px-2.5 py-1 rounded-full font-medium">
              {chip.label}
              <button onClick={() => removeChip(chip.key)} className="hover:text-red-500 ml-0.5">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
