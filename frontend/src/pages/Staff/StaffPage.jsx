/**
 * @file Staff management page.
 * List all staff with role badges and commission. Add staff member form.
 * Shows commission earned this month per stylist.
 */
import React, { useEffect, useState } from 'react'
import { getStaff, createStaff } from '../../api/staff'
import { getStaffPerformance } from '../../api/analytics'
import Badge from '../../components/Badge'
import Modal from '../../components/Modal'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import toast from 'react-hot-toast'

export default function StaffPage() {
  const [staff, setStaff] = useState([])
  const [performance, setPerformance] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    username: '', first_name: '', last_name: '', email: '',
    phone: '', role: 'stylist', commission_rate: 15, password: ''
  })

  const fetchStaff = async () => {
    try {
      const [staffRes, perfRes] = await Promise.all([
        getStaff(),
        getStaffPerformance().catch(() => ({ data: { data: [] } })),
      ])
      setStaff(staffRes.data.data || [])
      setPerformance(perfRes.data.data || [])
    } catch {
      toast.error('Failed to load staff')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStaff() }, [])

  const getPerf = (staffId) => performance.find(p => p.stylist_id === staffId)

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.username || !form.password || !form.first_name) {
      toast.error('Username, name and password are required')
      return
    }
    setSaving(true)
    try {
      await createStaff(form)
      toast.success('Staff member added!')
      setShowModal(false)
      setForm({ username: '', first_name: '', last_name: '', email: '', phone: '', role: 'stylist', commission_rate: 15, password: '' })
      fetchStaff()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add staff member')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)}
          className="bg-accent text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-accent-dark transition-colors">
          ➕ Add Staff Member
        </button>
      </div>

      {/* Staff cards */}
      {staff.length === 0 ? (
        <EmptyState icon="👤" title="No staff found"
          action={{ label: 'Add Staff Member', onClick: () => setShowModal(true) }} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map(member => {
            const perf = getPerf(member.id)
            return (
              <div key={member.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-lg font-bold text-accent">
                      {(member.first_name || member.username).charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{member.full_name}</p>
                      <p className="text-xs text-gray-400">@{member.username}</p>
                    </div>
                  </div>
                  <Badge label={member.role} variant={member.role} />
                </div>

                <div className="space-y-1.5 text-sm">
                  {member.phone && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <span>📱</span> {member.phone}
                    </div>
                  )}
                  {member.email && (
                    <div className="flex items-center gap-2 text-gray-500 truncate">
                      <span>✉️</span> {member.email}
                    </div>
                  )}
                  {member.role === 'stylist' && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <span>💰</span> {member.commission_rate}% commission
                    </div>
                  )}
                </div>

                {/* This month's performance */}
                {perf && (
                  <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-gray-800">{perf.appointments}</p>
                      <p className="text-xs text-gray-400">Appts</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-800">₹{(perf.revenue/1000).toFixed(1)}k</p>
                      <p className="text-xs text-gray-400">Revenue</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-600">₹{perf.commission.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-gray-400">Commission</p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Staff Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Staff Member" size="lg">
        <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
            <input type="text" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input type="text" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
            <input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
              <option value="stylist">Stylist</option>
              <option value="receptionist">Receptionist</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%)</label>
            <input type="number" min="0" max="50" value={form.commission_rate}
              onChange={e => setForm({...form, commission_rate: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div className="col-span-2 flex gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 bg-accent text-white py-2 rounded-lg text-sm font-medium hover:bg-accent-dark disabled:opacity-60">
              {saving ? 'Adding...' : 'Add Staff Member'}
            </button>
            <button type="button" onClick={() => setShowModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
