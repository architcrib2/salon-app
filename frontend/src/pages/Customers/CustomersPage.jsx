/**
 * @file Customers list page.
 * Searchable table by name or phone. Click row to view customer detail.
 */
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCustomers, createCustomer } from '../../api/customers'
import Modal from '../../components/Modal'
import Badge from '../../components/Badge'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function CustomersPage() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', gender: 'female', notes: '' })

  const fetchCustomers = async (q = '') => {
    setLoading(true)
    try {
      const res = await getCustomers(q)
      setCustomers(res.data.data || [])
    } catch {
      toast.error('Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCustomers() }, [])

  const handleSearch = (e) => {
    setSearch(e.target.value)
    fetchCustomers(e.target.value)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.name || !form.phone) { toast.error('Name and phone are required'); return }
    if (!/^[6-9]\d{9}$/.test(form.phone)) { toast.error('Enter a valid 10-digit Indian mobile number'); return }
    setSaving(true)
    try {
      await createCustomer(form)
      toast.success('Customer created!')
      setShowModal(false)
      setForm({ name: '', phone: '', email: '', gender: 'female', notes: '' })
      fetchCustomers(search)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create customer')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search + Add */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Search by name or phone..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent bg-white"
          />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-accent text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-accent-dark transition-colors whitespace-nowrap"
        >
          ➕ Add Customer
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Customers</h2>
          <span className="text-sm text-gray-400">{customers.length} total</span>
        </div>

        {loading ? <LoadingSpinner /> : customers.length === 0 ? (
          <EmptyState
            icon="👥"
            title="No customers found"
            description={search ? `No results for "${search}"` : 'Start by adding your first customer'}
            action={{ label: 'Add Customer', onClick: () => setShowModal(true) }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Gender</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Points</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Last Visit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customers.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/customers/${c.id}`)}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-5 py-3 font-medium text-gray-800">{c.name}</td>
                    <td className="px-5 py-3 text-gray-600 font-mono text-xs">{c.phone}</td>
                    <td className="px-4 py-3 capitalize text-gray-500">{c.gender}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                        ⭐ {c.loyalty_points}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {c.last_visit ? format(new Date(c.last_visit), 'd MMM yyyy') : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Customer">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
            <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
              placeholder="10-digit mobile number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (allergies, preferences)</label>
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 bg-accent text-white py-2 rounded-lg text-sm font-medium hover:bg-accent-dark disabled:opacity-60">
              {saving ? 'Saving...' : 'Add Customer'}
            </button>
            <button type="button" onClick={() => setShowModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
