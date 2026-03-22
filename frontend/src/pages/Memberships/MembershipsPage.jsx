/**
 * @file Memberships management page.
 * Plans tab: view/create membership plans (session-based or amount-based).
 * Active tab: view memberships with progress bars (sessions or credit balance).
 */
import React, { useEffect, useState } from 'react'
import { getMembershipPlans, createMembershipPlan, getExpiringSoon, purchaseMembership, getAllMemberships } from '../../api/memberships'
import LoadingSpinner from '../../components/LoadingSpinner'
import { FilterBar, useFilters, durationToDates } from '../../components/filters'
import toast from 'react-hot-toast'

const fmt = (n) => Number(n).toLocaleString('en-IN')

export default function MembershipsPage() {
  const [tab, setTab] = useState('plans')
  const [plans, setPlans] = useState([])
  const [activeMemberships, setActiveMemberships] = useState([])
  const [expiringSoon, setExpiringSoon] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [planForm, setPlanForm] = useState({
    name: '', description: '', price: '', validity_days: '',
    plan_type: 'session', total_sessions: '', total_credit_amount: '',
  })
  const [purchaseForm, setPurchaseForm] = useState({
    customer_id: '', plan_id: '', payment_method: 'cash', amount_paid: '', notes: '',
  })
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
    if (planForm.plan_type === 'session' && !planForm.total_sessions) {
      toast.error('Total sessions is required for session plans')
      return
    }
    if (planForm.plan_type === 'amount' && !planForm.total_credit_amount) {
      toast.error('Total credit amount is required for amount plans')
      return
    }
    setSaving(true)
    try {
      await createMembershipPlan(planForm)
      toast.success('Plan created')
      setShowPlanModal(false)
      setPlanForm({ name: '', description: '', price: '', validity_days: '', plan_type: 'session', total_sessions: '', total_credit_amount: '' })
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create plan')
    } finally { setSaving(false) }
  }

  const handlePurchase = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await purchaseMembership(purchaseForm)
      toast.success('Membership purchased!')
      setShowPurchaseModal(false)
      setPurchaseForm({ customer_id: '', plan_id: '', payment_method: 'cash', amount_paid: '', notes: '' })
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Purchase failed')
    } finally { setSaving(false) }
  }

  const selectedPlan = plans.find(p => String(p.id) === String(purchaseForm.plan_id))

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

      {/* ── Plans tab ────────────────────────────────────────────────── */}
      {tab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.length === 0 ? (
            <p className="text-gray-400 text-sm col-span-3 text-center py-12">No plans yet. Create one!</p>
          ) : plans.map(plan => (
            <div key={plan.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-800">{plan.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    plan.plan_type === 'amount' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {plan.plan_type === 'amount' ? 'Amount' : 'Sessions'}
                  </span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  plan.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>{plan.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              {plan.description && <p className="text-xs text-gray-500 mb-3">{plan.description}</p>}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Price paid</span>
                  <span className="font-semibold text-gray-800">₹{fmt(plan.price)}</span>
                </div>
                {plan.plan_type === 'amount' ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Credit value</span>
                      <span className="font-semibold text-green-700">₹{fmt(plan.total_credit_amount)}</span>
                    </div>
                    {Number(plan.total_credit_amount) > Number(plan.price) && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Bonus</span>
                        <span className="text-purple-600 font-medium">
                          +₹{fmt(Number(plan.total_credit_amount) - Number(plan.price))}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Sessions</span>
                    <span>{plan.total_sessions}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Valid for</span>
                  <span>{plan.validity_days} days</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Active memberships tab ────────────────────────────────────── */}
      {tab === 'active' && (
        <div className="space-y-3">
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
            const isExpiring = expiringSoon.some(e => e.id === m.id)
            const isAmount = m.plan_type === 'amount'
            const pct = m.progress_pct || 0

            return (
              <div key={m.id} className={`bg-white rounded-2xl border shadow-sm p-5 ${isExpiring ? 'border-amber-300' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-800">{m.customer_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-500">{m.plan_name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        isAmount ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {isAmount ? 'Amount' : 'Sessions'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      m.status === 'active' ? 'bg-green-100 text-green-700' :
                      m.status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                    }`}>{m.status}</span>
                    {isExpiring && <p className="text-xs text-amber-600 mt-1">Expires soon!</p>}
                  </div>
                </div>

                {/* Amount plan details */}
                {isAmount ? (
                  <div className="mb-3 space-y-2">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-xs text-gray-500">Paid</p>
                        <p className="text-sm font-semibold text-gray-800">₹{fmt(m.amount_paid)}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-2">
                        <p className="text-xs text-gray-500">Credit</p>
                        <p className="text-sm font-semibold text-green-700">₹{fmt(m.total_credit_amount)}</p>
                        {m.bonus_amount > 0 && (
                          <p className="text-xs text-purple-600">+₹{fmt(m.bonus_amount)} bonus</p>
                        )}
                      </div>
                      <div className="bg-blue-50 rounded-lg p-2">
                        <p className="text-xs text-gray-500">Remaining</p>
                        <p className="text-sm font-semibold text-blue-700">₹{fmt(m.amount_remaining)}</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Used: ₹{fmt(m.amount_used)}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct > 80 ? 'bg-red-400' : pct > 50 ? 'bg-amber-400' : 'bg-accent'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Session plan details */
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Sessions used</span>
                      <span>{m.sessions_used} / {m.sessions_total}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-gray-400">
                      <span>Paid: ₹{fmt(m.amount_paid)}</span>
                      <span>{m.sessions_remaining} sessions left</span>
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-400">Valid until: {m.valid_until}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Create Plan Modal ────────────────────────────────────────── */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-4">New Membership Plan</h2>
            <form onSubmit={handleCreatePlan} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Plan Name *</label>
                <input type="text" required value={planForm.name}
                  onChange={e => setPlanForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <input type="text" value={planForm.description}
                  onChange={e => setPlanForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>

              {/* Plan type toggle */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Plan Type *</label>
                <div className="flex gap-2">
                  {[['session', 'Session-based'], ['amount', 'Amount-based']].map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPlanForm(p => ({ ...p, plan_type: val }))}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                        planForm.plan_type === val
                          ? 'border-accent bg-accent text-white'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {planForm.plan_type === 'amount'
                    ? 'Customer pays a price and gets a larger credit to spend on services'
                    : 'Customer gets a fixed number of sessions'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Price paid by customer (₹) *</label>
                <input type="number" required min="0" step="0.01" value={planForm.price}
                  onChange={e => setPlanForm(p => ({ ...p, price: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>

              {planForm.plan_type === 'session' ? (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Total Sessions *</label>
                  <input type="number" required min="1" value={planForm.total_sessions}
                    onChange={e => setPlanForm(p => ({ ...p, total_sessions: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Credit value customer gets (₹) *
                    {planForm.price && planForm.total_credit_amount && Number(planForm.total_credit_amount) > Number(planForm.price) && (
                      <span className="text-purple-600 ml-2">
                        +₹{fmt(Number(planForm.total_credit_amount) - Number(planForm.price))} bonus
                      </span>
                    )}
                  </label>
                  <input type="number" required min="0" step="0.01" value={planForm.total_credit_amount}
                    onChange={e => setPlanForm(p => ({ ...p, total_credit_amount: e.target.value }))}
                    placeholder={planForm.price || 'e.g. 45000'}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Valid for (days) *</label>
                <input type="number" required min="1" value={planForm.validity_days}
                  onChange={e => setPlanForm(p => ({ ...p, validity_days: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>

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

      {/* ── Purchase Modal ───────────────────────────────────────────── */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Purchase Membership</h2>
            <form onSubmit={handlePurchase} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Customer ID *</label>
                <input type="number" required value={purchaseForm.customer_id}
                  onChange={e => setPurchaseForm(p => ({ ...p, customer_id: e.target.value }))}
                  placeholder="Enter customer ID"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Plan *</label>
                <select required value={purchaseForm.plan_id}
                  onChange={e => setPurchaseForm(p => ({ ...p, plan_id: e.target.value, amount_paid: '' }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                  <option value="">Select plan...</option>
                  {plans.filter(p => p.is_active).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ₹{fmt(p.price)}
                      {p.plan_type === 'amount' ? ` → ₹${fmt(p.total_credit_amount)} credit` : ` (${p.total_sessions} sessions)`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Plan preview */}
              {selectedPlan && (
                <div className={`rounded-xl p-3 text-sm border ${selectedPlan.plan_type === 'amount' ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'}`}>
                  {selectedPlan.plan_type === 'amount' ? (
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Plan price</span>
                        <span className="font-medium">₹{fmt(selectedPlan.price)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Customer gets</span>
                        <span className="font-semibold text-green-700">₹{fmt(selectedPlan.total_credit_amount)} credit</span>
                      </div>
                      {Number(selectedPlan.total_credit_amount) > Number(selectedPlan.price) && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Bonus value</span>
                          <span className="text-purple-600 font-medium">
                            +₹{fmt(Number(selectedPlan.total_credit_amount) - Number(selectedPlan.price))}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sessions included</span>
                      <span className="font-medium">{selectedPlan.total_sessions}</span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Amount Paid (₹)
                  {selectedPlan && <span className="text-gray-400 font-normal"> — leave blank to use plan price ₹{fmt(selectedPlan.price)}</span>}
                </label>
                <input type="number" min="0" step="0.01" value={purchaseForm.amount_paid}
                  onChange={e => setPurchaseForm(p => ({ ...p, amount_paid: e.target.value }))}
                  placeholder={selectedPlan ? String(selectedPlan.price) : ''}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
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

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <input type="text" value={purchaseForm.notes}
                  onChange={e => setPurchaseForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Optional notes..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
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
