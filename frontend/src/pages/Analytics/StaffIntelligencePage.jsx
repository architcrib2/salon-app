/**
 * @file Staff Intelligence page.
 * 4 tabs: Performance, Trends, Specializations, Workload.
 * Calls GET /api/analytics/staff-intelligence/
 */
import React, { useEffect, useState } from 'react'
import axios from 'axios'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'

const TABS = ['Performance', 'Trends', 'Specializations', 'Workload']

const TIER_COLOR = {
  star:       'bg-yellow-100 text-yellow-700',
  strong:     'bg-blue-100 text-blue-700',
  average:    'bg-gray-100 text-gray-600',
  developing: 'bg-red-100 text-red-600',
}

const PROFILE_COLOR = {
  specialist: 'bg-purple-100 text-purple-700',
  focused:    'bg-blue-100 text-blue-700',
  generalist: 'bg-green-100 text-green-700',
}

const SCORE_PILL_COLOR = {
  revenue:    'bg-blue-50 text-blue-700',
  completion: 'bg-green-50 text-green-700',
  retention:  'bg-purple-50 text-purple-700',
  efficiency: 'bg-orange-50 text-orange-700',
}

const fmt = (n) => Number(n || 0).toLocaleString('en-IN')
const pct = (n) => `${Number(n || 0).toFixed(1)}%`

function ScoreBar({ value, max = 100, color = 'bg-accent' }) {
  const w = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2 min-w-0" style={{ minWidth: 80 }}>
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${w}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-7 text-right shrink-0">{value}</span>
    </div>
  )
}

/* ─── TAB 1: PERFORMANCE ───────────────────────────────────────────────────── */

function PerformanceTab({ data, summary }) {
  if (!data.length) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
      <p className="text-gray-500 text-sm">No performance data available yet.</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Staff',       value: summary.total_staff,                  cls: 'bg-gray-50 text-gray-700' },
            { label: 'Star Performers',   value: summary.star_performers,              cls: 'bg-yellow-50 text-yellow-700' },
            { label: 'Avg Completion',    value: pct(summary.avg_completion_rate),     cls: 'bg-green-50 text-green-700' },
            { label: 'Total Revenue',     value: `₹${fmt(summary.total_revenue)}`,     cls: 'bg-blue-50 text-blue-700' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-3 text-center ${s.cls}`}>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-center px-3 py-3 text-xs font-medium text-gray-500 uppercase w-10">#</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Staff</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase min-w-[120px]">Score</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tier</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Revenue</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Appts</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Completion</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Retention</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Avg/Visit</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Breakdown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((r, idx) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 text-center text-xs text-gray-400">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{r.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{r.role}</p>
                  </td>
                  <td className="px-4 py-3 w-36">
                    <ScoreBar value={r.performance_score ?? 0} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TIER_COLOR[r.tier] || 'bg-gray-100 text-gray-600'}`}>
                      {r.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-800 font-medium">₹{fmt(r.total_revenue)}</td>
                  <td className="px-4 py-3 text-gray-600">{r.total_appointments}</td>
                  <td className="px-4 py-3 text-gray-600">{pct(r.completion_rate)}</td>
                  <td className="px-4 py-3 text-gray-600">{pct(r.retention_rate)}</td>
                  <td className="px-4 py-3 text-gray-600">₹{fmt(r.avg_revenue_per_visit)}</td>
                  <td className="px-4 py-3">
                    {r.score_breakdown && (
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(r.score_breakdown).map(([k, v]) => (
                          <span key={k} className={`px-1.5 py-0.5 rounded text-xs font-medium capitalize ${SCORE_PILL_COLOR[k] || 'bg-gray-100 text-gray-600'}`}>
                            {k[0].toUpperCase()}: {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ─── TAB 2: TRENDS ────────────────────────────────────────────────────────── */

function Sparkline({ points }) {
  if (!points || points.length < 2) return <div className="h-10 text-xs text-gray-300 flex items-center">No data</div>

  const revenues = points.map(p => Number(p.revenue) || 0)
  const min = Math.min(...revenues)
  const max = Math.max(...revenues)
  const range = max - min || 1

  const W = 120
  const H = 36
  const step = W / (points.length - 1)

  const coords = revenues.map((v, i) => {
    const x = i * step
    const y = H - ((v - min) / range) * (H - 4) - 2
    return `${x},${y}`
  })

  const d = `M ${coords.join(' L ')}`

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <path d={d} fill="none" stroke="var(--color-accent, #b91c1c)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={coords[coords.length - 1].split(',')[0]} cy={coords[coords.length - 1].split(',')[1]} r="2.5" fill="var(--color-accent, #b91c1c)" />
    </svg>
  )
}

function TrendsTab({ data }) {
  if (!data.length) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
      <p className="text-gray-500 text-sm">No trend data available yet.</p>
    </div>
  )

  const sorted = [...data].sort((a, b) =>
    Number(b.current_period?.revenue || 0) - Number(a.current_period?.revenue || 0)
  )

  const TREND_ICON  = { up: { icon: '↑', cls: 'text-green-600' }, down: { icon: '↓', cls: 'text-red-500' }, stable: { icon: '→', cls: 'text-gray-400' } }
  const CHANGE_CLS  = (v) => v > 0 ? 'text-green-600' : v < 0 ? 'text-red-500' : 'text-gray-500'

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sorted.map(r => {
        const t = TREND_ICON[r.trend] || TREND_ICON.stable
        const revChg = Number(r.revenue_change_pct || 0)
        const apptChg = Number(r.appointment_change_pct || 0)

        return (
          <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-800">{r.name}</p>
                <p className="text-xs text-gray-400 capitalize">{r.role}</p>
              </div>
              <span className={`text-2xl font-bold ${t.cls}`}>{t.icon}</span>
            </div>

            {/* Revenue change */}
            <div className="flex items-end gap-3">
              <p className={`text-3xl font-bold ${CHANGE_CLS(revChg)}`}>
                {revChg > 0 ? '+' : ''}{revChg.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-400 mb-1">revenue vs prev period</p>
            </div>

            {/* Period comparison */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-gray-400 mb-0.5">Current</p>
                <p className="font-semibold text-gray-800">₹{fmt(r.current_period?.revenue)}</p>
                <p className="text-gray-500">{r.current_period?.appointments} appts</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-gray-400 mb-0.5">Previous</p>
                <p className="font-semibold text-gray-800">₹{fmt(r.previous_period?.revenue)}</p>
                <p className="text-gray-500">{r.previous_period?.appointments} appts</p>
              </div>
            </div>

            {/* Appt change */}
            <p className="text-xs text-gray-500">
              Appointments: <span className={`font-medium ${CHANGE_CLS(apptChg)}`}>
                {apptChg > 0 ? '+' : ''}{apptChg.toFixed(1)}%
              </span>
            </p>

            {/* Sparkline */}
            {r.daily_sparkline?.length > 1 && (
              <div className="pt-1 border-t border-gray-50">
                <p className="text-xs text-gray-400 mb-1">Revenue trend (daily)</p>
                <Sparkline points={r.daily_sparkline} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── TAB 3: SPECIALIZATIONS ───────────────────────────────────────────────── */

function SpecializationsTab({ data }) {
  if (!data.length) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
      <p className="text-gray-500 text-sm">No specialization data available yet.</p>
    </div>
  )

  const CHIP_COLORS = [
    'bg-indigo-50 text-indigo-700',
    'bg-pink-50 text-pink-700',
    'bg-teal-50 text-teal-700',
    'bg-amber-50 text-amber-700',
  ]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Staff</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Profile</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Dominant Service</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase min-w-[140px]">Specialization</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Performed</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Top Services</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map(r => {
              const idx = Number(r.specialization_index || 0)
              const pctIdx = Math.round(idx * 100)

              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-800">{r.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{r.role}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PROFILE_COLOR[r.profile] || 'bg-gray-100 text-gray-600'}`}>
                      {r.profile}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 text-xs">{r.dominant_service || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-2" style={{ minWidth: 80 }}>
                        <div
                          className="bg-purple-400 h-2 rounded-full transition-all"
                          style={{ width: `${pctIdx}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{idx.toFixed(2)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.total_services_performed}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(r.top_by_count || []).slice(0, 3).map((svc, i) => (
                        <span key={i} className={`px-2 py-0.5 rounded-full text-xs font-medium ${CHIP_COLORS[i % CHIP_COLORS.length]}`}>
                          {svc.name}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─── TAB 4: WORKLOAD ──────────────────────────────────────────────────────── */

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function WorkloadCard({ r }) {
  const util = Number(r.utilization_pct || 0)
  const utilCls = util >= 70 ? 'text-green-600' : util >= 40 ? 'text-yellow-600' : 'text-red-500'
  const utilBarCls = util >= 70 ? 'bg-green-400' : util >= 40 ? 'bg-yellow-400' : 'bg-red-400'

  // Day of week bars
  const dayData = r.by_day_of_week || []
  const maxDay = Math.max(...dayData.map(d => d.count || 0), 1)

  // Hour heatmap (9–21)
  const hourData = r.by_hour || []
  const hourMap = Object.fromEntries(hourData.map(h => [h.hour, h.count]))
  const maxHour = Math.max(...hourData.map(h => h.count || 0), 1)
  const HOURS = Array.from({ length: 13 }, (_, i) => i + 9)

  const heatCls = (count) => {
    if (!count) return 'bg-gray-100'
    const ratio = count / maxHour
    if (ratio >= 0.75) return 'bg-accent opacity-90'
    if (ratio >= 0.5)  return 'bg-accent opacity-60'
    if (ratio >= 0.25) return 'bg-accent opacity-30'
    return 'bg-gray-200'
  }

  const fmtHour = (h) => {
    const suffix = h >= 12 ? 'pm' : 'am'
    const h12 = h > 12 ? h - 12 : h
    return `${h12}${suffix}`
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-gray-800">{r.name}</p>
          <p className="text-xs text-gray-400 capitalize">{r.role}</p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold ${utilCls}`}>{util.toFixed(0)}%</p>
          <p className="text-xs text-gray-400">utilization</p>
        </div>
      </div>

      {/* Utilization bar */}
      <div className="bg-gray-100 rounded-full h-2">
        <div className={`${utilBarCls} h-2 rounded-full transition-all`} style={{ width: `${Math.min(util, 100)}%` }} />
      </div>

      {/* Peak info */}
      <div className="flex gap-4 text-xs text-gray-500">
        <span>Peak day: <span className="font-medium text-gray-700">{r.peak_day || '—'}</span></span>
        <span>Peak hour: <span className="font-medium text-gray-700">{r.peak_hour != null ? fmtHour(r.peak_hour) : '—'}</span></span>
        <span>Appts (90d): <span className="font-medium text-gray-700">{r.total_appointments_90d || 0}</span></span>
      </div>

      {/* Day-of-week bar chart */}
      {dayData.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-2">By day of week</p>
          <div className="flex items-end gap-1 h-12">
            {DAY_LABELS.map((label, i) => {
              const entry = dayData.find(d => d.day === i + 1 || d.day === label) || dayData[i]
              const count = entry?.count || 0
              const barH = maxDay > 0 ? Math.round((count / maxDay) * 44) : 0
              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full flex items-end justify-center" style={{ height: 44 }}>
                    <div
                      className="w-full rounded-t bg-accent opacity-70 min-h-[2px] transition-all"
                      style={{ height: Math.max(barH, count > 0 ? 2 : 0) }}
                      title={`${label}: ${count}`}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400">{label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Hour heatmap */}
      <div>
        <p className="text-xs text-gray-400 mb-1.5">Hourly heatmap</p>
        <div className="flex gap-0.5">
          {HOURS.map(h => (
            <div key={h} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className={`w-full h-5 rounded-sm ${heatCls(hourMap[h] || 0)}`}
                title={`${fmtHour(h)}: ${hourMap[h] || 0} appts`}
              />
              {h % 3 === 0 && <span className="text-[9px] text-gray-300">{fmtHour(h)}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function WorkloadTab({ data }) {
  if (!data.length) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
      <p className="text-gray-500 text-sm">No workload data available yet.</p>
    </div>
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {data.map(r => <WorkloadCard key={r.id} r={r} />)}
    </div>
  )
}

/* ─── MAIN PAGE ────────────────────────────────────────────────────────────── */

export default function StaffIntelligencePage() {
  const [activeTab, setActiveTab] = useState(0)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await axios.get('/api/analytics/staff-intelligence/')
        setData(res.data.data || {})
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load staff intelligence')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const tabCounts = data
    ? [
        data.performance?.length ?? 0,
        data.trends?.length ?? 0,
        data.specializations?.length ?? 0,
        data.workload?.length ?? 0,
      ]
    : [0, 0, 0, 0]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Staff Intelligence</h1>
        <p className="text-sm text-gray-500 mt-0.5">Performance scoring, trends, specializations and workload analysis</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === i
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
            {!loading && (
              <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                {tabCounts[i]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner message="Analysing staff data..." />
      ) : !data ? null : (
        <>
          {activeTab === 0 && <PerformanceTab data={data.performance || []} summary={data.summary} />}
          {activeTab === 1 && <TrendsTab data={data.trends || []} />}
          {activeTab === 2 && <SpecializationsTab data={data.specializations || []} />}
          {activeTab === 3 && <WorkloadTab data={data.workload || []} />}
        </>
      )}
    </div>
  )
}
