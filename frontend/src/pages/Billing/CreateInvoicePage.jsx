/**
 * @file Create Invoice page.
 * Select appointment → auto-fill customer + services.
 * Live GST calculation, discount, loyalty points, payment method.
 * Generates invoice and shows printable receipt.
 */
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getInvoices, createInvoice } from '../../api/billing'
import { getAppointments } from '../../api/appointments'
import { getCustomer } from '../../api/customers'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function CreateInvoicePage() {
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState([])
  const [selectedAppt, setSelectedAppt] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    appointment_id: '',
    payment_method: 'upi',
    discount_amount: 0,
    loyalty_points_used: 0,
    tip_amount: 0,
    notes: '',
  })

  useEffect(() => {
    // Load appointments that don't have invoices (scheduled/completed)
    getAppointments({ status: 'scheduled' })
      .then(res => setAppointments(res.data.data || []))
      .catch(() => toast.error('Failed to load appointments'))
      .finally(() => setLoading(false))
  }, [])

  const handleApptSelect = async (apptId) => {
    const appt = appointments.find(a => a.id === parseInt(apptId))
    setSelectedAppt(appt)
    setForm(prev => ({ ...prev, appointment_id: apptId }))
    if (appt) {
      try {
        const res = await getCustomer(appt.customer)
        setCustomer(res.data.data)
      } catch {}
    }
  }

  // ── Live billing calculation ──────────────────────────────────────────────
  // These values are approximate for preview; server does authoritative calc
  const subtotal = 0 // server calculates from service prices
  const discountAmt = Number(form.discount_amount) || 0
  const loyaltyDiscount = Number(form.loyalty_points_used) || 0
  const tipAmt = Number(form.tip_amount) || 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.appointment_id) { toast.error('Please select an appointment'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        appointment_id: parseInt(form.appointment_id),
        discount_amount: discountAmt,
        loyalty_points_used: loyaltyDiscount,
        tip_amount: tipAmt,
      }
      const res = await createInvoice(payload)
      toast.success(`Invoice ${res.data.data.invoice_number} generated!`)
      navigate(`/billing/${res.data.data.id}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create invoice')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <button onClick={() => navigate('/billing')} className="text-sm text-accent hover:text-accent-dark flex items-center gap-1">
        ← Back to Billing
      </button>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-5">Generate Invoice</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Appointment selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Appointment *</label>
            <select
              value={form.appointment_id}
              onChange={e => handleApptSelect(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              required
            >
              <option value="">Choose appointment...</option>
              {appointments.map(a => (
                <option key={a.id} value={a.id}>
                  {a.customer_name} — {format(new Date(a.scheduled_at), 'd MMM, h:mm a')} — {a.service_names?.join(', ')}
                </option>
              ))}
            </select>
          </div>

          {/* Auto-filled customer info */}
          {selectedAppt && (
            <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Customer:</span>
                <span className="font-medium">{selectedAppt.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Stylist:</span>
                <span className="font-medium">{selectedAppt.stylist_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Services:</span>
                <span className="font-medium text-right">{selectedAppt.service_names?.join(', ')}</span>
              </div>
              {customer && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Loyalty Points Available:</span>
                  <span className="font-medium text-amber-600">⭐ {customer.loyalty_points}</span>
                </div>
              )}
            </div>
          )}

          {/* Payment */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
              <select value={form.payment_method}
                onChange={e => setForm({...form, payment_method: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount (₹)</label>
              <input type="number" min="0" value={form.discount_amount}
                onChange={e => setForm({...form, discount_amount: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loyalty Points to Redeem {customer ? `(max ${customer.loyalty_points})` : ''}
              </label>
              <input type="number" min="0" max={customer?.loyalty_points || 0}
                value={form.loyalty_points_used}
                onChange={e => setForm({...form, loyalty_points_used: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              <p className="text-xs text-gray-400 mt-0.5">1 point = ₹1 discount</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tip (₹)</label>
              <input type="number" min="0" value={form.tip_amount}
                onChange={e => setForm({...form, tip_amount: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input type="text" value={form.notes}
              onChange={e => setForm({...form, notes: e.target.value})}
              placeholder="Payment notes..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="flex-1 bg-accent text-white py-2.5 rounded-lg text-sm font-medium hover:bg-accent-dark disabled:opacity-60">
              {saving ? 'Generating...' : '🧾 Generate Invoice'}
            </button>
            <button type="button" onClick={() => navigate('/billing')}
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
