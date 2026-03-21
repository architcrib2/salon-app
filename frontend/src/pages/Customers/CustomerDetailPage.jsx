/**
 * @file Customer detail page.
 * Profile card with loyalty points, visit history, notes, referral programme, and memberships.
 */
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCustomer, getCustomerAppointments, updateCustomer } from '../../api/customers'
import { getCustomerMemberships } from '../../api/memberships'
import { getCustomerReferrals } from '../../api/referrals'
import Badge from '../../components/Badge'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const TABS = ['Visits', 'Memberships', 'Referrals', 'Notes']

export default function CustomerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [memberships, setMemberships] = useState([])
  const [referralData, setReferralData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Visits')
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [custRes, apptRes] = await Promise.all([
          getCustomer(id),
          getCustomerAppointments(id),
        ])
        setCustomer(custRes.data.data)
        setNotes(custRes.data.data.notes || '')
        setAppointments(apptRes.data.data || [])
      } catch {
        toast.error('Failed to load customer')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [id])

  // Lazy-load memberships and referrals when tabs are clicked
  useEffect(() => {
    if (activeTab === 'Memberships' && memberships.length === 0) {
      getCustomerMemberships(id)
        .then(res => setMemberships(res.data.data || []))
        .catch(() => {})
    }
    if (activeTab === 'Referrals' && !referralData) {
      getCustomerReferrals(id)
        .then(res => setReferralData(res.data.data))
        .catch(() => {})
    }
  }, [activeTab, id])

  const handleSaveNotes = async () => {
    setSaving(true)
    try {
      await updateCustomer(id, { notes })
      toast.success('Notes saved')
      setEditingNotes(false)
      setCustomer(prev => ({ ...prev, notes }))
    } catch {
      toast.error('Failed to save notes')
    } finally {
      setSaving(false)
    }
  }

  const handleCopyReferralCode = () => {
    if (referralData?.referral_code) {
      navigator.clipboard.writeText(referralData.referral_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) return <LoadingSpinner />
  if (!customer) return <div className="text-center py-12 text-gray-500">Customer not found</div>

  const totalVisits = appointments.filter(a => a.status === 'completed').length

  return (
    <div className="space-y-5">
      {/* Back */}
      <button onClick={() => navigate('/customers')} className="text-sm text-accent hover:text-accent-dark flex items-center gap-1">
        ← Back to Customers
      </button>

      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-2xl font-bold text-accent">
            {customer.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800">{customer.name}</h2>
            <p className="text-gray-500 text-sm mt-0.5">{customer.phone} {customer.email && `· ${customer.email}`}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge label={customer.gender} variant="scheduled" />
              {customer.last_visit && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  Last visit: {format(new Date(customer.last_visit), 'd MMM yyyy')}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-3 text-center">
            <div className="bg-amber-50 rounded-xl px-4 py-3">
              <p className="text-2xl font-bold text-amber-600">⭐ {customer.loyalty_points}</p>
              <p className="text-xs text-amber-700 mt-0.5">Loyalty Points</p>
            </div>
            <div className="bg-green-50 rounded-xl px-4 py-3">
              <p className="text-2xl font-bold text-green-600">{totalVisits}</p>
              <p className="text-xs text-green-700 mt-0.5">Visits</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-100 pb-0">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab: Visits */}
      {activeTab === 'Visits' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {appointments.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No visits yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Date</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Services</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Stylist</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {appointments.map(appt => (
                    <tr key={appt.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-700 whitespace-nowrap">
                        {format(new Date(appt.scheduled_at), 'd MMM yyyy, h:mm a')}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{appt.service_names?.join(', ')}</td>
                      <td className="px-4 py-3 text-gray-600">{appt.stylist_name}</td>
                      <td className="px-4 py-3"><Badge label={appt.status.replace('_', ' ')} variant={appt.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Memberships */}
      {activeTab === 'Memberships' && (
        <div className="space-y-3">
          {memberships.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400 text-sm">
              No active memberships
            </div>
          ) : memberships.map(m => {
            const pct = m.sessions_total > 0 ? (m.sessions_used / m.sessions_total) * 100 : 0
            return (
              <div key={m.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-800">{m.plan_name}</p>
                    <p className="text-xs text-gray-500">Purchased: {m.purchased_at ? format(new Date(m.purchased_at), 'd MMM yyyy') : '—'}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    m.status === 'active' ? 'bg-green-100 text-green-700' :
                    m.status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                  }`}>{m.status}</span>
                </div>
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Sessions used</span>
                    <span>{m.sessions_used} / {m.sessions_total}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <p className="text-xs text-gray-400">Valid until: {m.valid_until}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Tab: Referrals */}
      {activeTab === 'Referrals' && (
        <div className="space-y-4">
          {referralData ? (
            <>
              {/* Referral code card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-800 mb-3">Referral Code</h3>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-50 rounded-xl px-4 py-3">
                    <p className="font-mono font-bold text-xl text-gray-800 tracking-widest">
                      {referralData.referral_code || 'Not assigned'}
                    </p>
                  </div>
                  {referralData.referral_code && (
                    <button onClick={handleCopyReferralCode}
                      className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-blue-600">{referralData.total_referrals}</p>
                    <p className="text-xs text-blue-700 mt-0.5">Total Referrals</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-amber-600">{referralData.referral_points_earned}</p>
                    <p className="text-xs text-amber-700 mt-0.5">Points Earned</p>
                  </div>
                </div>
              </div>

              {/* Referred customers */}
              {referralData.referrals?.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-800">Referred Customers</h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {referralData.referrals.map(r => (
                      <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{r.name}</p>
                          <p className="text-xs text-gray-500">{r.phone}</p>
                        </div>
                        <p className="text-xs text-gray-400">
                          {r.created_at ? format(new Date(r.created_at), 'd MMM yyyy') : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400 text-sm">
              Loading referral data...
            </div>
          )}
        </div>
      )}

      {/* Tab: Notes */}
      {activeTab === 'Notes' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Stylist Notes</h3>
            {!editingNotes && (
              <button onClick={() => setEditingNotes(true)} className="text-xs text-accent hover:underline">Edit</button>
            )}
          </div>
          {editingNotes ? (
            <div className="space-y-3">
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={6}
                placeholder="Allergies, preferences, product notes..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <div className="flex gap-2">
                <button onClick={handleSaveNotes} disabled={saving}
                  className="flex-1 bg-accent text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => { setEditingNotes(false); setNotes(customer.notes || '') }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600 whitespace-pre-wrap min-h-[80px]">
              {customer.notes || <span className="text-gray-400 italic">No notes yet</span>}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
