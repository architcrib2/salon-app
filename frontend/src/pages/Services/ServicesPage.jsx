/**
 * @file Services catalogue page.
 * Services grouped by category tabs. Add/edit service via modal.
 */
import React, { useEffect, useState } from 'react'
import { getCategories, createService, updateService } from '../../api/services'
import Modal from '../../components/Modal'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'

export default function ServicesPage() {
  const [categories, setCategories] = useState([])
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editService, setEditService] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', duration_minutes: 30, price: '', gst_rate: 18, category: '', is_active: true })

  const fetchCategories = async () => {
    try {
      const res = await getCategories()
      setCategories(res.data.data || [])
    } catch {
      toast.error('Failed to load services')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCategories() }, [])

  const openAdd = () => {
    const cat = categories[activeTab]
    setEditService(null)
    setForm({ name: '', description: '', duration_minutes: 30, price: '', gst_rate: 18, category: cat?.id || '', is_active: true })
    setShowModal(true)
  }

  const openEdit = (svc) => {
    setEditService(svc)
    setForm({ name: svc.name, description: svc.description, duration_minutes: svc.duration_minutes, price: svc.price, gst_rate: svc.gst_rate, category: svc.category, is_active: svc.is_active })
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name || !form.price) { toast.error('Name and price required'); return }
    setSaving(true)
    try {
      if (editService) {
        await updateService(editService.id, form)
        toast.success('Service updated')
      } else {
        await createService(form)
        toast.success('Service added')
      }
      setShowModal(false)
      fetchCategories()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save service')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (svc) => {
    try {
      await updateService(svc.id, { is_active: !svc.is_active })
      toast.success(svc.is_active ? 'Service deactivated' : 'Service activated')
      fetchCategories()
    } catch {
      toast.error('Failed to update')
    }
  }

  if (loading) return <LoadingSpinner />

  const currentCat = categories[activeTab]

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-2 flex flex-wrap gap-1">
        {categories.map((cat, i) => (
          <button key={cat.id} onClick={() => setActiveTab(i)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              i === activeTab ? 'bg-accent text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}>
            {cat.name} <span className="opacity-70 text-xs">({cat.services?.filter(s => s.is_active).length})</span>
          </button>
        ))}
      </div>

      {/* Services table */}
      {currentCat && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-800">{currentCat.name}</h2>
              <p className="text-xs text-gray-400 capitalize">Gender: {currentCat.gender}</p>
            </div>
            <button onClick={openAdd}
              className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-dark">
              ➕ Add Service
            </button>
          </div>

          {currentCat.services?.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">No services in this category</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Service</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Duration</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">GST</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {currentCat.services.map(svc => (
                    <tr key={svc.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-800">{svc.name}</td>
                      <td className="px-4 py-3 text-gray-500">{svc.duration_minutes} min</td>
                      <td className="px-4 py-3 text-gray-800">₹{Number(svc.price).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-gray-500">{svc.gst_rate}%</td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        ₹{Number(svc.price_with_gst).toFixed(0)}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleActive(svc)}
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            svc.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                          {svc.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => openEdit(svc)} className="text-xs text-accent hover:underline">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editService ? 'Edit Service' : 'Add Service'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Name *</label>
            <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min) *</label>
              <input type="number" min="5" value={form.duration_minutes} onChange={e => setForm({...form, duration_minutes: e.target.value})} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
              <input type="number" min="0" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST Rate (%)</label>
              <input type="number" min="0" max="28" value={form.gst_rate} onChange={e => setForm({...form, gst_rate: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 bg-accent text-white py-2 rounded-lg text-sm font-medium hover:bg-accent-dark disabled:opacity-60">
              {saving ? 'Saving...' : editService ? 'Update' : 'Add Service'}
            </button>
            <button type="button" onClick={() => setShowModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
