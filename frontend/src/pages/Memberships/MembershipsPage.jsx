/**
 * @file Memberships management page.
 * Plans tab: view/create membership plans.
 * Active tab: view active memberships with session progress bars.
 */
import React, { useEffect, useState } from 'react'
import { getMembershipPlans, createMembershipPlan, getExpiringSoon, purchaseMembership, getAllMemberships } from '../../api/memberships'
import LoadingSpinner from '../../components/LoadingSpinner'
import { FilterBar, useFilters, durationToDates } from '../../components/filters'
import toast from 'react-hot-toast'

export default function MembershipsPage() {
  const [tab, setTab] = useState('plans')
  const [plans, setPlans] = useState([])
  const [activeMemberships, setActiveMemberships] = useState([])
  const [expiringSoon, setExpiringSoon] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [planForm, setPlanForm] = useState({ name: '', description: '', price: '', total_sessions: '', validity_days: '' })
  const [purchaseForm, setPurchaseForm] = useState({ customer_id: '', plan_id: '', payment_method: 'cash', amount_paid: '' })
  const [saving, setSaving] = useState(false)

  const { filters, setFilters, clearFilters, toAPIParams, apiParamsString, hasActiveFilters } = useFilters({
    defaults: { duration: 'this_month', ...durationToDates('this_month') },
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = toAPIParams()
      const [plansRes, expiringRes, activeRes] = await Promise.all([
        getMembershipPlans(),
        getExpiringSoon(),
        getAllMemberships(params).catch(() => ({ data: { data: [] } })),
      ])
      setPlans(plansRes.data.data || [])
      setExpiringSoon(expiringRes.data.data || [])
      setActiveMemberships(activeRes.data?.data || expiringRes.data?.data || [])
    } catch {
      // active endpoint may not exist; fallback to expiring + plans
      try {
        const [plansRes, expiringRes] = await Promise.all([getMembershipPlans(), getExpiringSoon()])
        setPlans(plansRes.data.data || [])
        setExpiringSoon(expiringRes.data.data || [])
        setActiveMemberships(expiringRes.data.data || [])
      } catch { toast.error('Failed to load memberships') }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [apiParamsString])

  const handleCreatePlan = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await createMembershipPlan(planForm)
      toast.success('Plan created')
      setShowPlanModal(false)
      setPlanForm({ name: '', description: '', price: '', total_sessions: '', validity_days: '' })
      fetchData()
    } catch { toast.error('Failed to create plan') }
    finally { setSaving(false) }
  }

  const handlePurchase = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await purchaseMembership(purchaseForm)
      toast.success('Membership purchased!')
      setShowPurchaseModal(false)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Purchase failed')
    } finally { setSaving(false) }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Memberships</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowPurchaseModal(true)}
            className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg font-medium">
            + Purchase
          </button>
          <button onClick={() => setShowPlanModal(true)}
            className="text-sm bg-accent text-white px-4 py-2 rounded-lg font-medium">
            + New Plan
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {['plans', 'active'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-sm px-4 py-1.5 rounded-lg font-medium capitalize transition-colors ${
              tab === t ? 'bg-accent text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {t === 'plans' ? 'Plans' : 'Active Memberships'}
          </button>
        ))}
      </div>

      {tab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.length === 0 ? (
            <p className="text-gray-400 text-sm col-span-3 text-center py-12">No plans yet. Create one!</p>
          ) : plans.map(plan => (
            <div key={plan.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-800">{plan.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  plan.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>{plan.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              {plan.description && <p className="text-xs text-gray-500 mb-3">{plan.description}</p>}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Price</span><span className="font-semibold">₹{Number(plan.price).toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Sessions</span><span>{plan.total_sessions}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Valid for</span><span>{plan.validity_days} days</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'active' && (
        <div className="space-y-3">
          {/* Filter Bar for active tab */}
          <FilterBar
            filters={filters}
            onChange={setFilters}
            onClear={clearFilters}
            available={['duration', 'status']}
            statusOptions={['active', 'expired', 'exhausted']}
            hasActive={hasActiveFilters}
          />

          {expiringSoon.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
              ⚠️ {expiringSoon.length} membership(s) expiring within 7 days
            </div>
          )}
          {activeMemberships.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-12">No active memberships</p>
          ) : activeMemberships.map(m => {
            const pct = m.sessions_total > 0 ? (m.sessions_used / m.sessions_total) * 100 : 0
            const isExpiring = expiringSoon.some(e => e.id === m.id)
            return (
              <div key={m.id} className={`bg-white rounded-2xl border shadow-sm p-5 ${isExpiring ? 'border-amber-300' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-800">{m.customer_name}</p>
                    <p className="text-xs text-gray-500">{m.plan_name}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      m.status === 'active' ? 'bg-green-100 text-green-700' :
                      m.status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                    }`}>{m.status}</span>
                    {isExpiring && <p className="text-xs text-amber-600 mt-1">Expires soon!</p>}
                  </div>
                </div>
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Sessions used</span>
                    <span>{m.sessions_used} / {m.sessions_total}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <p className="text-xs text-gray-400">Valid until: {m.valid_until}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-gray-800 mb-4">New Membership Plan</h2>
            <form onSubmit={handleCreatePlan} className="space-y-3">
              {[
                { label: 'Plan Name', key: 'name', type: 'text', required: true },
                { label: 'Description', key: 'description', type: 'text' },
                { label: 'Price (₹)', key: 'price', type: 'number', required: true },
                { label: 'Total Sessions', key: 'total_sessions', type: 'number', required: true },
                { label: 'Valid for (days)', key: 'validity_days', type: 'number', required: true },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <input type={f.type} required={f.required} value={planForm[f.key]}
                    onChange={e => setPlanForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-accent text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                  {saving ? 'Creating...' : 'Create Plan'}
                </button>
                <button type="button" onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Purchase Membership</h2>
            <form onSubmit={handlePurchase} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Customer ID</label>
                <input type="number" required value={purchaseForm.customer_id}
                  onChange={e => setPurchaseForm(p => ({ ...p, customer_id: e.target.value }))}
                  placeholder="Enter customer ID"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Plan</label>
                <select required value={purchaseForm.plan_id}
                  onChange={e => setPurchaseForm(p => ({ ...p, plan_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                  <option value="">Select plan...</option>
                  {plans.filter(p => p.is_active).map(p => (
                    <option key={p.id} value={p.id}>{p.name} — ₹{Number(p.price).toLocaleString('en-IN')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
                <select value={purchaseForm.payment_method}
                  onChange={e => setPurchaseForm(p => ({ ...p, payment_method: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-accent text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                  {saving ? 'Processing...' : 'Purchase'}
                </button>
                <button type="button" onClick={() => setShowPurchaseModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
