/**
 * @file Public queue display screen.
 * Fullscreen kiosk view — no auth, auto-refreshes every 15 seconds.
 * Route: /queue-display (outside ProtectedRoute/MainLayout)
 */
import React, { useEffect, useState } from 'react'
import { getWaitlistToday } from '../../api/waitlist'

export default function QueueDisplayPage() {
  const [entries, setEntries] = useState([])
  const [lastUpdate, setLastUpdate] = useState(new Date())

  const fetchData = async () => {
    try {
      const res = await getWaitlistToday()
      setEntries(res.data.data || [])
      setLastUpdate(new Date())
    } catch { /* silent */ }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [])

  const serving = entries.find(e => e.status === 'in_progress')
  const waiting = entries.filter(e => e.status === 'waiting').slice(0, 5)

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white flex flex-col">
      {/* Header */}
      <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">✂️</span>
          <div>
            <p className="text-xl font-bold">KaratOS Salon</p>
            <p className="text-white/50 text-sm">Live Queue Display</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white/50 text-xs">Last updated</p>
          <p className="text-white/70 text-sm">{lastUpdate.toLocaleTimeString('en-IN')}</p>
        </div>
      </div>

      <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Now Serving */}
        <div className="flex flex-col">
          <p className="text-white/50 text-sm font-medium uppercase tracking-wider mb-4">Now Serving</p>
          {serving ? (
            <div className="flex-1 bg-[#e94560]/20 border-2 border-[#e94560] rounded-3xl p-8 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 rounded-full bg-[#e94560]/30 flex items-center justify-center text-5xl font-bold text-[#e94560] mb-4">
                {serving.position}
              </div>
              <p className="text-4xl font-bold mb-2">{serving.walk_in_name || serving.customer_name}</p>
              <p className="text-white/60 text-lg">{serving.walk_in_phone || serving.customer_phone}</p>
              {serving.notes && <p className="text-white/40 text-sm mt-2">{serving.notes}</p>}
              <div className="mt-6 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                <span className="text-green-400 font-medium">In Progress</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 border-2 border-white/20 rounded-3xl flex items-center justify-center">
              <p className="text-white/30 text-xl">No one being served right now</p>
            </div>
          )}
        </div>

        {/* Up Next */}
        <div className="flex flex-col">
          <p className="text-white/50 text-sm font-medium uppercase tracking-wider mb-4">
            Up Next ({waiting.length} waiting)
          </p>
          <div className="space-y-3">
            {waiting.length === 0 ? (
              <div className="border-2 border-white/20 rounded-2xl p-8 text-center text-white/30">Queue is empty</div>
            ) : waiting.map((entry, idx) => (
              <div key={entry.id} className={`border rounded-2xl p-4 flex items-center gap-4 ${
                idx === 0 ? 'border-white/40 bg-white/10' : 'border-white/10 bg-white/5'
              }`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shrink-0 ${
                  idx === 0 ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60'
                }`}>
                  {entry.position}
                </div>
                <div className="flex-1">
                  <p className={`font-semibold text-lg ${idx === 0 ? 'text-white' : 'text-white/70'}`}>
                    {entry.walk_in_name || entry.customer_name}
                  </p>
                  {entry.estimated_wait_minutes > 0 && (
                    <p className="text-white/40 text-sm">~{entry.estimated_wait_minutes} min</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-4 border-t border-white/10 text-center">
        <p className="text-white/30 text-sm">Auto-refreshes every 15 seconds · Powered by KaratOS</p>
      </div>
    </div>
  )
}
