/**
 * @file Walk-in Billing page.
 * 4-step wizard: Customer → Services → Payment → Receipt
 * Creates an invoice without a pre-existing appointment.
 */
import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCustomers, createCustomer } from '../../api/customers'
import { getServices } from '../../api/services'
import { createInvoice } from '../../api/billing'
import toast from 'react-hot-toast'

const STEPS = ['Customer', 'Services', 'Payment', 'Receipt']
const PAYMENT_METHODS = ['cash', 'upi', 'card']
const GST_RATE = 5

export default function WalkinBillingPage() {
  const navigate = useNavigate()
  const printRef = useRef(null)

  const [step, setStep] = useState(0)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', email: '' })
  const [allServices, setAllServices] = useState([])
  const [selectedServices, setSelectedServices] = useState([])
  const [serviceSearch, setServiceSearch] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [discountAmount, setDiscountAmount] = useState(0)
  const [notes, setNotes] = useState('')
  const [invoice, setInvoice] = useState(null)
  const [saving, setSaving] = useState(false)
  const [creatingCustomer, setCreatingCustomer] = useState(false)

  // Load services on mount
  useEffect(() => {
    getServices().then(r => setAllServices(r.data.data || [])).catch(() => {})
  }, [])

  // Search customers
  useEffect(() => {
    if (customerSearch.length < 2) { setCustomerResults([]); return }
    const t = setTimeout(() => {
      getCustomers(customerSearch).then(r => setCustomerResults(r.data.data || [])).catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [customerSearch])

  const handleCreateCustomer = async (e) => {
    e.preventDefault()
    if (!newCustomerForm.name || !newCustomerForm.phone) {
      toast.error('Name and phone are required')
      return
    }
    setCreatingCustomer(true)
    try {
      const res = await createCustomer(newCustomerForm)
      const c = res.data.data
      setSelectedCustomer(c)
      setShowNewCustomer(false)
      setCustomerSearch(c.name)
      setCustomerResults([])
      toast.success('Customer created')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create customer')
    } finally {
      setCreatingCustomer(false)
    }
  }

  const toggleService = (svc) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.id === svc.id)
      if (exists) return prev.filter(s => s.id !== svc.id)
      return [...prev, { ...svc, qty: 1 }]
    })
  }

  // Totals
  const subtotal = selectedServices.reduce((sum, s) => sum + Number(s.price) * (s.qty || 1), 0)
  const gstAmount = Math.round(subtotal * GST_RATE / 100)
  const discount = Math.min(Number(discountAmount) || 0, subtotal + gstAmount)
  const total = subtotal + gstAmount - discount

  const handleSubmit = async () => {
    if (!selectedCustomer) { toast.error('Select a customer'); return }
    if (selectedServices.length === 0) { toast.error('Add at least one service'); return }

    setSaving(true)
    try {
      const items = selectedServices.map(s => ({
        service_id: s.id,
        quantity: s.qty || 1,
        unit_price: s.price,
      }))
      const res = await createInvoice({
        is_walkin: true,
        customer_id: selectedCustomer.id,
        items,
        payment_method: paymentMethod,
        discount_amount: discount,
        gst_rate: GST_RATE,
        notes,
      })
      setInvoice(res.data.data)
      setStep(3)
      toast.success('Invoice created!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create invoice')
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => {
    if (printRef.current) {
      const html = printRef.current.innerHTML
      const w = window.open('', '_blank')
      w.document.write(`<html><head><title>Invoice</title>
        <style>body{font-family:sans-serif;padding:20px;max-width:400px;margin:auto}
        table{width:100%;border-collapse:collapse}td,th{padding:6px;border-bottom:1px solid #eee;text-align:left}
        .total{font-weight:bold;font-size:1.1em}.text-right{text-align:right}</style>
      </head><body>${html}</body></html>`)
      w.document.close()
      w.print()
    }
  }

  const filteredServices = allServices.filter(s =>
    !serviceSearch || s.name.toLowerCase().includes(serviceSearch.toLowerCase())
  )

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              i === step ? 'bg-accent text-white' :
              i < step ? 'bg-green-100 text-green-700' :
              'bg-gray-100 text-gray-400'
            }`}>
              <span>{i < step ? '✓' : i + 1}</span>
              <span>{s}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 ${i < step ? 'bg-green-300' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 0 — Customer */}
      {step === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 text-lg">Select Customer</h2>

          {selectedCustomer ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-4">
              <div>
                <p className="font-medium text-gray-800">{selectedCustomer.name}</p>
                <p className="text-sm text-gray-500">{selectedCustomer.phone}</p>
              </div>
              <button onClick={() => { setSelectedCustomer(null); setCustomerSearch('') }}
                className="text-sm text-gray-400 hover:text-gray-600">Change</button>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search by name or phone</label>
                <input
                  type="text"
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  placeholder="Type at least 2 characters..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                {customerResults.length > 0 && (
                  <div className="border border-gray-200 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-lg">
                    {customerResults.map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedCustomer(c); setCustomerSearch(c.name); setCustomerResults([]) }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                      >
                        <p className="font-medium text-sm text-gray-800">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.phone}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-xs text-gray-400">or</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              <button
                onClick={() => setShowNewCustomer(v => !v)}
                className="text-sm font-medium text-accent hover:text-accent-dark"
              >
                {showNewCustomer ? '− Hide form' : '+ New Walk-in Customer'}
              </button>

              {showNewCustomer && (
                <form onSubmit={handleCreateCustomer} className="space-y-3 bg-gray-50 rounded-xl p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                      <input type="text" required value={newCustomerForm.name}
                        onChange={e => setNewCustomerForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Phone *</label>
                      <input type="tel" required value={newCustomerForm.phone}
                        onChange={e => setNewCustomerForm(f => ({ ...f, phone: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                      <input type="email" value={newCustomerForm.email}
                        onChange={e => setNewCustomerForm(f => ({ ...f, email: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                    </div>
                  </div>
                  <button type="submit" disabled={creatingCustomer}
                    className="w-full bg-accent text-white py-2 rounded-lg text-sm font-medium hover:bg-accent-dark disabled:opacity-60">
                    {creatingCustomer ? 'Creating...' : 'Create Customer'}
                  </button>
                </form>
              )}
            </>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStep(1)}
              disabled={!selectedCustomer}
              className="bg-accent text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-accent-dark disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 1 — Services */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 text-lg">Select Services</h2>

          <input
            type="text"
            value={serviceSearch}
            onChange={e => setServiceSearch(e.target.value)}
            placeholder="Search services..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
            {filteredServices.map(svc => {
              const sel = selectedServices.find(s => s.id === svc.id)
              return (
                <button
                  key={svc.id}
                  onClick={() => toggleService(svc)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-all ${
                    sel ? 'border-accent bg-accent/5 text-accent' : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium">{svc.name}</p>
                    <p className="text-xs text-gray-400">{svc.duration_min} min</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">₹{Number(svc.price).toLocaleString('en-IN')}</p>
                    {sel && <span className="text-xs text-accent">✓ Added</span>}
                  </div>
                </button>
              )
            })}
          </div>

          {selectedServices.length > 0 && (
            <div className="border-t border-gray-100 pt-3 space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Selected</p>
              {selectedServices.map(s => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{s.name}</span>
                  <span className="font-medium text-gray-800">₹{Number(s.price).toLocaleString('en-IN')}</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold text-gray-800 pt-1 border-t border-gray-100">
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(0)} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
            <button
              onClick={() => setStep(2)}
              disabled={selectedServices.length === 0}
              className="bg-accent text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-accent-dark disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Payment */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 text-lg">Payment</h2>

          {/* Bill summary */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            {selectedServices.map(s => (
              <div key={s.id} className="flex justify-between text-gray-700">
                <span>{s.name}</span>
                <span>₹{Number(s.price).toLocaleString('en-IN')}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-2 flex justify-between text-gray-600">
              <span>Subtotal</span><span>₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>GST ({GST_RATE}%)</span><span>₹{gstAmount.toLocaleString('en-IN')}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span><span>−₹{discount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-800 text-base">
              <span>Total</span><span>₹{total.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
            <div className="flex gap-2">
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium capitalize transition-all ${
                    paymentMethod === m
                      ? 'border-accent bg-accent text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {m === 'cash' ? '💵' : m === 'upi' ? '📱' : '💳'} {m}
                </button>
              ))}
            </div>
          </div>

          {/* Discount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount (₹)</label>
            <input
              type="number" min="0" value={discountAmount}
              onChange={e => setDiscountAmount(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>

          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-accent text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-accent-dark disabled:opacity-60"
            >
              {saving ? 'Creating...' : '✓ Create Invoice'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Receipt */}
      {step === 3 && invoice && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="text-center">
            <div className="text-4xl mb-2">✅</div>
            <h2 className="font-bold text-gray-800 text-xl">Invoice Created!</h2>
            <p className="text-sm text-gray-500 mt-1">Invoice #{invoice.id}</p>
          </div>

          {/* Printable receipt */}
          <div ref={printRef} className="border border-gray-200 rounded-xl p-5 space-y-3">
            <div className="text-center border-b border-gray-200 pb-3">
              <p className="font-bold text-lg">KaratOS Salon</p>
              <p className="text-sm text-gray-500">Walk-in Receipt</p>
            </div>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Customer</span>
                <span className="font-medium">{selectedCustomer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phone</span>
                <span>{selectedCustomer?.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1 text-gray-500 font-medium">Service</th>
                  <th className="text-right py-1 text-gray-500 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {selectedServices.map(s => (
                  <tr key={s.id}>
                    <td className="py-1">{s.name}</td>
                    <td className="py-1 text-right">₹{Number(s.price).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-gray-200 pt-2 text-sm space-y-1">
              <div className="flex justify-between text-gray-600">
                <span>GST ({GST_RATE}%)</span><span>₹{gstAmount.toLocaleString('en-IN')}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span><span>−₹{discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base">
                <span>Total</span><span>₹{total.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Paid via</span><span className="capitalize">{paymentMethod}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              🖨️ Print
            </button>
            <button
              onClick={() => navigate(`/billing/${invoice.id}`)}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50"
            >
              View Invoice →
            </button>
            <button
              onClick={() => {
                setStep(0); setSelectedCustomer(null); setCustomerSearch(''); setSelectedServices([])
                setDiscountAmount(0); setNotes(''); setInvoice(null); setPaymentMethod('cash')
              }}
              className="flex-1 bg-accent text-white py-2.5 rounded-xl text-sm font-medium hover:bg-accent-dark"
            >
              + New Bill
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
