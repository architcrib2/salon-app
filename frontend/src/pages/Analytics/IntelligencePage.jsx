/**
 * @file Customer Intelligence page.
 * 4 tabs: Churn Risk, Next Visits, VIP Ranking, Rebook Today.
 * Calls Phase 3 analytics endpoints. Owner-only.
 */
import React, { useEffect, useState } from 'react'
import {
  getChurnRisk,
  getNextVisitPredictions,
  getVIPRanking,
  getRebookingOpportunities,
  sendRebookingNudge,
} from '../../api/analytics'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'

const TABS = ['Churn Risk', 'Next Visits', 'VIP Ranking', 'Rebook Today']

const CHURN_BAND_COLOR = {
  healthy: 'bg-green-100 text-green-700',
  at_risk: 'bg-yellow-100 text-yellow-700',
  high_risk: 'bg-orange-100 text-orange-700',
  churned: 'bg-red-100 text-red-700',
}

const CONFIDENCE_COLOR = {
  low: 'bg-gray-100 text-gray-500',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-green-100 text-green-700',
}

function ScoreBar({ value, max = 100, color = 'bg-accent' }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{value}</span>
    </div>
  )
}

function ChurnTab({ data, summary }) {
  if (!data.length) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
      <p className="text-3xl mb-2">✅</p>
      <p className="text-gray-500 text-sm">No churn risk data yet. Add more customer history.</p>
    </div>
  )
  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Healthy', count: summary.healthy_count, cls: 'bg-green-50 text-green-700' },
            { label: 'At Risk', count: summary.at_risk_count, cls: 'bg-yellow-50 text-yellow-700' },
            { label: 'High Risk', count: summary.high_risk_count, cls: 'bg-orange-50 text-orange-700' },
            { label: 'Churned', count: summary.churned_count, cls: 'bg-red-50 text-red-700' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-3 text-center ${s.cls}`}>
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-xs font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-sm text-gray-500">Customers ranked by churn risk (0–100). Higher = more likely to leave.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Risk Band</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Days Absent</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Visits</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-800">{r.name}</p>
                    <p className="text-xs text-gray-400">{r.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${CHURN_BAND_COLOR[r.risk_band] || 'bg-gray-100 text-gray-600'}`}>
                      {r.risk_band?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 w-40">
                    <ScoreBar value={r.churn_score} color={
                      r.risk_band === 'churned' ? 'bg-red-500' :
                      r.risk_band === 'high_risk' ? 'bg-orange-400' :
                      r.risk_band === 'at_risk' ? 'bg-yellow-400' : 'bg-green-400'
                    } />
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.days_since_last_visit ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{r.total_visits}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs">{r.churn_reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function NextVisitsTab({ data, summary }) {
  if (!data.length) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
      <p className="text-3xl mb-2">📅</p>
      <p className="text-gray-500 text-sm">No visit prediction data yet.</p>
    </div>
  )
  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Upcoming', count: summary.upcoming_count, cls: 'bg-blue-50 text-blue-700' },
            { label: 'Due Soon', count: summary.due_soon_count, cls: 'bg-yellow-50 text-yellow-700' },
            { label: 'Overdue', count: summary.overdue_count, cls: 'bg-red-50 text-red-700' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-3 text-center ${s.cls}`}>
              <p className="text-2xl font-bold">{s.count}</p>
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
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Predicted Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Gap</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Confidence</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Visits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map(r => {
                const daysUntil = r.days_until_due
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800">{r.name}</p>
                      <p className="text-xs text-gray-400">{r.phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      {r.predicted_next_date ? (
                        <div>
                          <p className="text-gray-800 font-medium">
                            {new Date(r.predicted_next_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                          <p className={`text-xs ${daysUntil < 0 ? 'text-red-500 font-medium' : daysUntil <= 7 ? 'text-yellow-600' : 'text-gray-400'}`}>
                            {daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` : daysUntil === 0 ? 'Today' : `in ${daysUntil}d`}
                          </p>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.predicted_gap_days ? `${r.predicted_gap_days}d` : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${CONFIDENCE_COLOR[r.confidence] || 'bg-gray-100 text-gray-500'}`}>
                        {r.confidence || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium capitalize ${
                        r.status === 'overdue' ? 'text-red-600' :
                        r.status === 'due_soon' ? 'text-yellow-600' : 'text-blue-600'
                      }`}>{r.status?.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.total_visits}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function VIPTab({ data, summary }) {
  if (!data.length) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
      <p className="text-3xl mb-2">👑</p>
      <p className="text-gray-500 text-sm">No VIP data yet. Add customer revenue history.</p>
    </div>
  )
  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Platinum', count: summary.platinum_count, cls: 'bg-purple-50 text-purple-700' },
            { label: 'Gold', count: summary.gold_count, cls: 'bg-yellow-50 text-yellow-700' },
            { label: 'Silver', count: summary.silver_count, cls: 'bg-gray-50 text-gray-600' },
            { label: 'Regular', count: summary.regular_count, cls: 'bg-blue-50 text-blue-600' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-3 text-center ${s.cls}`}>
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-xs font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-sm text-gray-500">Revenue (35%) + Frequency (25%) + Recency (20%) + Loyalty (10%) + Referrals (10%)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-center px-3 py-3 text-xs font-medium text-gray-500 uppercase w-10">#</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">VIP Score</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tier</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Lifetime Spend</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Visits</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Referrals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((r, idx) => (
                <tr key={r.id} className={`hover:bg-gray-50 ${idx < 3 ? 'bg-yellow-50/30' : ''}`}>
                  <td className="px-3 py-3 text-center">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (
                      <span className="text-xs text-gray-400">{idx + 1}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{r.name}</p>
                    <p className="text-xs text-gray-400">{r.phone}</p>
                  </td>
                  <td className="px-4 py-3 w-40">
                    <ScoreBar value={r.vip_score} color="bg-yellow-400" />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                      r.vip_tier === 'platinum' ? 'bg-purple-100 text-purple-700' :
                      r.vip_tier === 'gold' ? 'bg-yellow-100 text-yellow-700' :
                      r.vip_tier === 'silver' ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-600'
                    }`}>{r.vip_tier}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-800 font-medium">
                    ₹{Number(r.lifetime_revenue || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.total_visits}</td>
                  <td className="px-4 py-3 text-gray-600">{r.referrals_made || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function RebookTab({ data, summary }) {
  const [nudging, setNudging] = useState({})

  if (!data.length) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
      <p className="text-3xl mb-2">📞</p>
      <p className="text-gray-500 text-sm">No rebooking opportunities right now. Check back later.</p>
    </div>
  )

  const handleNudge = async (customerId, customerName) => {
    setNudging(prev => ({ ...prev, [customerId]: true }))
    try {
      await sendRebookingNudge(customerId)
      toast.success(`Nudge sent to ${customerName}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send nudge')
    } finally {
      setNudging(prev => ({ ...prev, [customerId]: false }))
    }
  }

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-xl p-3 text-center text-blue-700">
            <p className="text-2xl font-bold">{summary.total_opportunities}</p>
            <p className="text-xs font-medium mt-0.5">Opportunities</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center text-green-700">
            <p className="text-2xl font-bold">₹{Number(summary.potential_revenue_today || 0).toLocaleString('en-IN')}</p>
            <p className="text-xs font-medium mt-0.5">Potential Revenue</p>
          </div>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-sm text-gray-500">Customers most likely to re-book. Send a WhatsApp nudge with one click.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Avg Spend</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Suggested Action</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nudge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-800">{r.name}</p>
                    <p className="text-xs text-gray-400">{r.phone}</p>
                  </td>
                  <td className="px-4 py-3 w-36">
                    <ScoreBar value={r.rebooking_score} color="bg-blue-400" />
                  </td>
                  <td className="px-4 py-3 text-gray-800">₹{Number(r.avg_spend_per_visit || 0).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs">{r.suggested_action || '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleNudge(r.id, r.name)}
                      disabled={nudging[r.id]}
                      className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors font-medium whitespace-nowrap"
                    >
                      {nudging[r.id] ? 'Sending...' : '💬 Nudge'}
                    </button>
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

export default function IntelligencePage() {
  const [activeTab, setActiveTab] = useState(0)
  const [churn, setChurn] = useState([])
  const [churnSummary, setChurnSummary] = useState(null)
  const [nextVisits, setNextVisits] = useState([])
  const [nextSummary, setNextSummary] = useState(null)
  const [vip, setVIP] = useState([])
  const [vipSummary, setVIPSummary] = useState(null)
  const [rebook, setRebook] = useState([])
  const [rebookSummary, setRebookSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      try {
        const [cRes, nRes, vRes, rRes] = await Promise.all([
          getChurnRisk(),
          getNextVisitPredictions(),
          getVIPRanking(),
          getRebookingOpportunities(),
        ])
        // Each response has data: { summary: {...}, customers: [...] }
        setChurn(cRes.data.data?.customers || [])
        setChurnSummary(cRes.data.data?.summary || null)
        setNextVisits(nRes.data.data?.customers || [])
        setNextSummary(nRes.data.data?.summary || null)
        setVIP(vRes.data.data?.customers || [])
        setVIPSummary(vRes.data.data?.summary || null)
        setRebook(rRes.data.data?.customers || [])
        setRebookSummary(rRes.data.data?.summary || null)
      } catch (err) {
        toast.error('Failed to load intelligence data')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const counts = [churn.length, nextVisits.length, vip.length, rebook.length]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Customer Intelligence</h1>
        <p className="text-sm text-gray-500 mt-0.5">Deterministic scoring — no ML, no black boxes</p>
      </div>

      {/* Tabs */}
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
                {counts[i]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner message="Calculating scores..." />
      ) : (
        <>
          {activeTab === 0 && <ChurnTab data={churn} summary={churnSummary} />}
          {activeTab === 1 && <NextVisitsTab data={nextVisits} summary={nextSummary} />}
          {activeTab === 2 && <VIPTab data={vip} summary={vipSummary} />}
          {activeTab === 3 && <RebookTab data={rebook} summary={rebookSummary} />}
        </>
      )}
    </div>
  )
}
