/**
 * @file Analytics page (owner-only).
 * Revenue bar chart, top services, staff performance, customer retention,
 * appointment heatmap, revenue breakdown, membership stats, referral stats.
 */
import React, { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { getRevenue, getTopServices, getStaffPerformance, getCustomerRetention } from '../../api/analytics'
import axios from 'axios'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'

const ACCENT = '#e94560'
const COLORS = ['#e94560', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('month')
  const [revenue, setRevenue] = useState([])
  const [topServices, setTopServices] = useState([])
  const [staffData, setStaffData] = useState([])
  const [retention, setRetention] = useState(null)
  const [heatmap, setHeatmap] = useState([])
  const [breakdown, setBreakdown] = useState(null)
  const [membershipStats, setMembershipStats] = useState(null)
  const [referralStats, setReferralStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      try {
        const [revRes, svcRes, staffRes, retRes, heatRes, breakRes, memRes, refRes] = await Promise.all([
          getRevenue(period),
          getTopServices(),
          getStaffPerformance(),
          getCustomerRetention(),
          axios.get('/api/analytics/heatmap/'),
          axios.get('/api/analytics/revenue-breakdown/'),
          axios.get('/api/analytics/membership-stats/'),
          axios.get('/api/analytics/referral-stats/'),
        ])
        setRevenue(revRes.data.data || [])
        setTopServices(svcRes.data.data || [])
        setStaffData(staffRes.data.data || [])
        setRetention(retRes.data.data || null)
        setHeatmap(heatRes.data.data || [])
        setBreakdown(breakRes.data.data || null)
        setMembershipStats(memRes.data.data || null)
        setReferralStats(refRes.data.data || null)
      } catch {
        toast.error('Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [period])

  const totalRevenue = revenue.reduce((s, d) => s + d.revenue, 0)
  const totalAppts = revenue.reduce((s, d) => s + d.appointments, 0)

  // Build heatmap lookup
  const heatmapMax = Math.max(...heatmap.map(h => h.count), 1)
  const heatmapLookup = {}
  heatmap.forEach(h => { heatmapLookup[`${h.day}-${h.hour}`] = h.count })

  const getHeatColor = (count) => {
    if (count === 0) return 'bg-gray-100'
    const intensity = count / heatmapMax
    if (intensity < 0.25) return 'bg-red-100'
    if (intensity < 0.5) return 'bg-red-200'
    if (intensity < 0.75) return 'bg-red-400'
    return 'bg-red-600'
  }

  if (loading) return <LoadingSpinner message="Crunching numbers..." />

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 font-medium">Revenue ({period === 'week' ? '7d' : '30d'})</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">₹{totalRevenue.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 font-medium">Appointments</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{totalAppts}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 font-medium">New Customers (30d)</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{retention?.new_customers_30d || 0}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 font-medium">Total Customers</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{retention?.total_customers || 0}</p>
        </div>
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-800">Revenue Trend</h2>
          <div className="flex gap-2">
            {['week', 'month'].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  period === p ? 'bg-accent text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {p === 'week' ? 'Last 7 Days' : 'Last 30 Days'}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={revenue} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false}
              tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(val) => [`₹${val.toLocaleString('en-IN')}`, 'Revenue']}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
            />
            <Bar dataKey="revenue" fill={ACCENT} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Appointment Heatmap */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Appointment Heatmap (90 days)</h2>
        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* Hour labels */}
            <div className="flex gap-1 mb-1 ml-10">
              {HOURS.map(h => (
                <div key={h} className="w-8 text-center text-xs text-gray-400">
                  {h > 12 ? `${h-12}p` : h === 12 ? '12p' : `${h}a`}
                </div>
              ))}
            </div>
            {DAYS.map((day, d) => (
              <div key={d} className="flex items-center gap-1 mb-1">
                <div className="w-9 text-xs text-gray-500 text-right pr-1">{day}</div>
                {HOURS.map(h => {
                  const count = heatmapLookup[`${d}-${h}`] || 0
                  return (
                    <div key={h} title={`${day} ${h}:00 — ${count} appts`}
                      className={`w-8 h-8 rounded-md ${getHeatColor(count)} cursor-default`} />
                  )
                })}
              </div>
            ))}
            <div className="flex items-center gap-2 mt-3 ml-10">
              <span className="text-xs text-gray-400">Less</span>
              {['bg-gray-100', 'bg-red-100', 'bg-red-200', 'bg-red-400', 'bg-red-600'].map(c => (
                <div key={c} className={`w-4 h-4 rounded ${c}`} />
              ))}
              <span className="text-xs text-gray-400">More</span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue breakdown + Top services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Revenue by payment method */}
        {breakdown && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Revenue by Payment Method (This Month)</h2>
            {breakdown.by_payment_method.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No data yet</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={160}>
                  <PieChart>
                    <Pie data={breakdown.by_payment_method} dataKey="total" nameKey="method"
                      cx="50%" cy="50%" outerRadius={60}>
                      {breakdown.by_payment_method.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={v => `₹${v.toLocaleString('en-IN')}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {breakdown.by_payment_method.map((m, i) => (
                    <div key={m.method} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-gray-600 capitalize">{m.method}</span>
                      </div>
                      <span className="font-medium text-gray-800">₹{m.total.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Top services */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Top Services by Revenue</h2>
          {topServices.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-3">
              {topServices.map((svc, i) => {
                const maxRev = topServices[0].revenue
                const pct = (svc.revenue / maxRev) * 100
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">{svc.name}</span>
                      <span className="text-gray-500">₹{svc.revenue.toLocaleString('en-IN')} · {svc.count} times</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Membership & Referral summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Membership stats */}
        {membershipStats && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Membership Overview</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-purple-600">{membershipStats.total_active}</p>
                <p className="text-xs text-purple-700 mt-0.5">Active</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-600">₹{(membershipStats.total_revenue || 0).toLocaleString('en-IN')}</p>
                <p className="text-xs text-green-700 mt-0.5">Revenue</p>
              </div>
            </div>
            {membershipStats.by_plan?.length > 0 && (
              <div className="space-y-2">
                {membershipStats.by_plan.map(p => (
                  <div key={p.plan_id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{p.plan_name}</span>
                    <span className="font-medium text-gray-800">{p.active_count} members</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Referral stats */}
        {referralStats && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Referral Programme</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{referralStats.total_referred_customers}</p>
                <p className="text-xs text-blue-700 mt-0.5">Referred Customers</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{referralStats.total_referral_points_awarded || 0}</p>
                <p className="text-xs text-amber-700 mt-0.5">Points Awarded</p>
              </div>
            </div>
            {referralStats.top_referrers?.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 font-medium mb-2">Top Referrers</p>
                <div className="space-y-1">
                  {referralStats.top_referrers.map(r => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{r.name}</span>
                      <span className="text-gray-500 font-medium">{r.ref_count} referrals</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Customer retention */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Customer Retention (30 days)</h2>
        {retention ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{retention.new_customers_30d}</p>
                <p className="text-xs text-blue-700 mt-1">New Customers</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{retention.returning_customers_30d}</p>
                <p className="text-xs text-green-700 mt-1">Returning</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">New customers trend (30d)</p>
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={retention.trend} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                  <Bar dataKey="new" fill={ACCENT} radius={[2, 2, 0, 0]} />
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <Tooltip formatter={v => [v, 'New customers']} contentStyle={{ fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">No data yet</p>
        )}
      </div>

      {/* Revenue by category */}
      {breakdown?.by_category?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Revenue by Category (This Month)</h2>
          <div className="space-y-3">
            {breakdown.by_category.map((cat, i) => {
              const maxRev = breakdown.by_category[0].revenue
              const pct = maxRev > 0 ? (cat.revenue / maxRev) * 100 : 0
              return (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium">{cat.category}</span>
                    <span className="text-gray-500">₹{cat.revenue.toLocaleString('en-IN')} · {cat.count} services</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${pct}%`,
                      background: COLORS[i % COLORS.length]
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Staff performance table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Staff Performance (This Month)</h2>
        </div>
        {staffData.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No data yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Stylist</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Appointments</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Commission Rate</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Commission Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {staffData.map(s => (
                  <tr key={s.stylist_id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{s.name}</td>
                    <td className="px-4 py-3 text-gray-600">{s.appointments}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">₹{s.revenue.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-gray-500">{s.commission_rate}%</td>
                    <td className="px-4 py-3 font-medium text-green-600">₹{s.commission.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
