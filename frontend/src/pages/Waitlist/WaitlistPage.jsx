/**
 * @file Waitlist / walk-in queue management page.
 * Staff view: add customers, update status, see stats.
 */
import React, { useEffect, useState, useCallback } from 'react'
import { getWaitlistToday, addToWaitlist, updateWaitlistStatus, removeFromWaitlist, getWaitlistStats } from '../../api/waitlist'
import LoadingSpinner from '../../components/LoadingSpinner'
import { FilterBar, useFilters, durationToDates } from '../../components/filters'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  waiting: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-green-100 text-green-700',
  done: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-500',
}

export default function WaitlistPage() {
  const [entries, setEntries] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ walk_in_name: '', walk_in_phone: '', notes: '' })
  const [adding, setAdding] = useState(false)

  const { filters, setFilters, clearFilters, toAPIParams, apiParamsString, hasActiveFilters } = useFilters({
    defaults: { duration: 'today', ...durationToDates('today') },
  })

  const fetchData = useCallback(async () => {
    try {
      const params = toAPIParams()
      const [listRes, statsRes] = await Promise.all([getWaitlistToday(params), getWaitlistStats()])
      setEntries(listRes.data.data || [])
      setStats(statsRes.data.data || null)
    } catch {
      // silent on auto-refresh errors
    } finally {
      setLoading(false)
    }
  }, [apiParamsString])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.walk_in_name || !form.walk_in_phone) {
      toast.error('Name and phone required')
      return
    }
    setAdding(true)
    try {
      await addToWaitlist(form)
      toast.success('Added to queue')
      setForm({ walk_in_name: '', walk_in_phone: '', notes: '' })
      fetchData()
    } catch { toast.error('Failed to add') }
    finally { setAdding(false) }
  }

  const handleStatus = async (id, status) => {
    try {
      await updateWaitlistStatus(id, { status })
      fetchData()
    } catch { toast.error('Failed to update status') }
  }

  const handleRemove = async (id) => {
    try {
      await removeFromWaitlist(id)
      toast.success('Removed from queue')
      fetchData()
    } catch { toast.error('Failed to remove') }
  }

  // Client-side status filter
  const activeStatuses = filters.status ? filters.status.split(',').filter(Boolean) : []
  const filteredEntries = activeStatuses.length > 0
    ? entries.filter(e => activeStatuses.includes(e.status))
    : entries

  const activeEntries = filteredEntries.filter(e => e.status === 'waiting' || e.status === 'in_progress')
  const doneEntries = filteredEntries.filter(e => e.status === 'done' || e.status === 'cancelled')

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Waitlist / Walk-in Queue</h1>
        <button onClick={() => window.open('/queue-display', '_blank')}
          className="text-sm bg-gray-800 text-white px-4 py-2 rounded-lg font-medium">
          📺 Display Screen
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.waiting || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Waiting</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.in_progress || 0}</p>
            <p className="text-xs text-gray-500 mt-1">In Progress</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-600">{stats.done_today || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Served Today</p>
          </div>
        </div>
      )}

      {/* Add to queue form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Add Walk-in</h3>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-32">
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <input type="text" placeholder="Customer name" value={form.walk_in_name}
              onChange={e => setForm(p => ({ ...p, walk_in_name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div className="flex-1 min-w-32">
            <label className="block text-xs text-gray-500 mb-1">Phone</label>
            <input type="text" placeholder="Phone number" value={form.walk_in_phone}
              onChange={e => setForm(p => ({ ...p, walk_in_phone: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div className="flex-1 min-w-40">
            <label className="block text-xs text-gray-500 mb-1">Notes (optional)</label>
            <input type="text" placeholder="Services, preferences..." value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <button type="submit" disabled={adding}
            className="bg-accent text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60 whitespace-nowrap">
            {adding ? 'Adding...' : '+ Add to Queue'}
          </button>
        </form>
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        onClear={clearFilters}
        available={['duration', 'status']}
        statusOptions={['waiting', 'in_progress', 'done', 'cancelled']}
        hasActive={hasActiveFilters}
      />

      {loading ? <LoadingSpinner /> : (
        <>
          {/* Active queue */}
          <div className="space-y-3">
            {activeEntries.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm">Queue is empty</div>
            ) : activeEntries.map(entry => (
              <div key={entry.id} className={`bg-white rounded-2xl border shadow-sm p-4 flex items-center gap-4 ${
                entry.status === 'in_progress' ? 'border-green-300' : 'border-gray-100'
              }`}>
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-lg shrink-0">
                  {entry.position}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800">{entry.walk_in_name || entry.customer_name}</p>
                  <p className="text-xs text-gray-500">{entry.walk_in_phone || entry.customer_phone} {entry.notes && `· ${entry.notes}`}</p>
                  {entry.estimated_wait_minutes > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">~{entry.estimated_wait_minutes} min wait</p>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[entry.status]}`}>
                  {entry.status === 'in_progress' ? 'In Progress' : 'Waiting'}
                </span>
                <div className="flex gap-2 shrink-0">
                  {entry.status === 'waiting' && (
                    <button onClick={() => handleStatus(entry.id, 'in_progress')}
                      className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg">Call</button>
                  )}
                  {entry.status === 'in_progress' && (
                    <button onClick={() => handleStatus(entry.id, 'done')}
                      className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg">Done</button>
                  )}
                  <button onClick={() => handleRemove(entry.id)}
                    className="text-xs border border-gray-200 text-gray-500 px-3 py-1 rounded-lg hover:bg-gray-50">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Done today */}
          {doneEntries.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Completed Today</p>
              <div className="space-y-2">
                {doneEntries.map(entry => (
                  <div key={entry.id} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                    <span className="text-gray-400 font-medium text-sm w-6 text-center">{entry.position}</span>
                    <p className="flex-1 text-sm text-gray-500">{entry.walk_in_name || entry.customer_name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[entry.status]}`}>{entry.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
