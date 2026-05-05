/**
 * @file Walk-in Billing page.
 * 4-step wizard: Customer → Items → Payment → Receipt
 * Supports free-text items (no predefined service catalog required).
 */
import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCustomers, createCustomer } from '../../api/customers'
import { getServices } from '../../api/services'
import { createInvoice } from '../../api/billing'
import toast from 'react-hot-toast'

const STEPS = ['Customer', 'Items', 'Payment', 'Receipt']
const PAYMENT_METHODS = ['cash', 'upi', 'card']
const GST_RATE = 5

let _customItemId = 0
const nextId = () => ++_customItemId

export default function WalkinBillingPage() {
  const navigate = useNavigate()
  const printRef = useRef(null)

  const [step, setStep] = useState(0)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', email: '' })

  // Free-text custom items
  const [customItems, setCustomItems] = useState([])
  const [customItemDesc, setCustomItemDesc] = useState('')
  const [customItemAmount, setCustomItemAmount] = useState('')

  // Catalog items (optional)
  const [allServices, setAllServices] = useState([])
  const [selectedServices, setSelectedServices] = useState([])
  const [serviceSearch, setServiceSearch] = useState('')
  const [showCatalog, setShowCatalog] = useState(false)

  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [discountAmount, setDiscountAmount] = useState(0)
  const [notes, setNotes] = useState('')
  const [invoice, setInvoice] = useState(null)
  const [saving, setSaving] = useState(false)
  const [creatingCustomer, setCreatingCustomer] = useState(false)

  useEffect(() => {
    getServices().then(r => setAllServices(r.data.data || [])).catch(() => {})
  }, [])

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

  const addCustomItem = () => {
    const desc = customItemDesc.trim()
    const amount = Number(customItemAmount)
    if (!desc) { toast.error('Enter a service / item name'); return }
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return }
    setCustomItems(prev => [...prev, { id: nextId(), description: desc, amount }])
    setCustomItemDesc('')
    setCustomItemAmount('')
  }

  const removeCustomItem = (id) => setCustomItems(prev => prev.filter(i => i.id !== id))

  const toggleService = (svc) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.id === svc.id)
      if (exists) return prev.filter(s => s.id !== svc.id)
      return [...prev, { ...svc, qty: 1 }]
    })
  }

  const allItems = [
    ...customItems.map(i => ({ key: `c-${i.id}`, name: i.description, price: i.amount })),
    ...selectedServices.map(s => ({ key: `s-${s.id}`, name: s.name, price: Number(s.price) })),
  ]

  const subtotal = allItems.reduce((sum, i) => sum + Number(i.price), 0)
  const gstAmount = Math.round(subtotal * GST_RATE / 100)
  const discount = Math.min(Number(discountAmount) || 0, subtotal + gstAmount)
  const total = subtotal + gstAmount - discount

  const handleSubmit = async () => {
    if (!selectedCustomer) { toast.error('Select a customer'); return }
    if (allItems.length === 0) { toast.error('Add at least one item'); return }

    setSaving(true)
    try {
      const items = [
        ...customItems.map(i => ({ description: i.description, unit_price: i.amount, gst_rate: GST_RATE })),
        ...selectedServices.map(s => ({ service_id: s.id, quantity: 1, unit_price: s.price })),
      ]
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

  const handlePrintGSTInvoice = () => {
    const invoiceItems = invoice?.items || allItems.map(i => ({ service_name: i.name, price: i.price, gst_rate: GST_RATE, gst_amount: Math.round(i.price * GST_RATE / 100) }))
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    const invoiceNum = invoice?.invoice_number || ''

    const rows = invoiceItems.map(item => `
      <tr>
        <td style="padding:8px 6px;border-bottom:1px solid #f0f0f0">${item.service_name}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #f0f0f0;text-align:right">₹${Number(item.price).toLocaleString('en-IN')}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #f0f0f0;text-align:right">${Number(item.gst_rate).toFixed(0)}%</td>
        <td style="padding:8px 6px;border-bottom:1px solid #f0f0f0;text-align:right">₹${Number(item.gst_amount).toFixed(2)}</td>
      </tr>`).join('')

    const html = `
      <html><head><title>GST Invoice — ${invoiceNum}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:30px;max-width:600px;margin:auto;color:#222}
        h1{font-size:22px;margin:0}h2{font-size:13px;color:#666;font-weight:normal;margin:4px 0 0}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th{background:#f5f5f5;padding:8px 6px;text-align:left;border-bottom:2px solid #ddd;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
        .text-right{text-align:right}.divider{border:none;border-top:1px solid #eee;margin:14px 0}
        .total-row td{padding:6px 6px;font-size:13px}.grand-total td{font-weight:bold;font-size:15px;padding-top:10px}
        .label{color:#666;font-size:11px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}
        .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;background:#dcfce7;color:#16a34a}
        @media print{body{padding:0}}
      </style></head>
      <body>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
          <div>
            <h1>✂️ KaratOS Salon</h1>
            <h2>GST Tax Invoice</h2>
          </div>
          <div style="text-align:right">
            <div style="font-family:monospace;font-weight:bold;font-size:14px">${invoiceNum}</div>
            <div style="font-size:12px;color:#666;margin-top:3px">${dateStr}</div>
            <div class="badge" style="margin-top:6px">Paid</div>
          </div>
        </div>
        <hr class="divider">
        <div style="display:flex;justify-content:space-between;margin-bottom:20px">
          <div>
            <div class="label">Billed To</div>
            <div style="font-weight:600;font-size:14px">${selectedCustomer?.name || ''}</div>
            <div style="color:#666;font-size:13px">${selectedCustomer?.phone || ''}</div>
          </div>
          <div style="text-align:right">
            <div class="label">Payment Method</div>
            <div style="font-weight:600;font-size:14px;text-transform:capitalize">${paymentMethod}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="text-right">Amount</th>
              <th class="text-right">GST Rate</th>
              <th class="text-right">GST Amt</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <hr class="divider">
        <table>
          <tr class="total-row"><td style="color:#666">Subtotal</td><td class="text-right">₹${subtotal.toLocaleString('en-IN')}</td></tr>
          <tr class="total-row"><td style="color:#666">GST (${GST_RATE}%)</td><td class="text-right">₹${gstAmount.toLocaleString('en-IN')}</td></tr>
          ${discount > 0 ? `<tr class="total-row"><td style="color:#16a34a">Discount</td><td class="text-right" style="color:#16a34a">−₹${discount.toLocaleString('en-IN')}</td></tr>` : ''}
          <tr class="grand-total"><td>Total</td><td class="text-right">₹${total.toLocaleString('en-IN')}</td></tr>
        </table>
        <hr class="divider" style="margin-top:24px">
        <p style="text-align:center;color:#999;font-size:12px">Thank you for visiting KaratOS Salon! ✂️</p>
      </body></html>`

    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    w.print()
  }

  const filteredServices = allServices.filter(s =>
    !serviceSearch || s.name.toLowerCase().includes(serviceSearch.toLowerCase())
  )

  const resetForm = () => {
    setStep(0); setSelectedCustomer(null); setCustomerSearch(''); setCustomerResults([])
    setCustomItems([]); setSelectedServices([]); setCustomItemDesc(''); setCustomItemAmount('')
    setDiscountAmount(0); setNotes(''); setInvoice(null); setPaymentMethod('cash')
    setShowCatalog(false)
  }

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

      {/* Step 1 — Items */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 text-lg">Add Services / Items</h2>

          {/* Free-text item entry */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase">Add Item</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={customItemDesc}
                onChange={e => setCustomItemDesc(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomItem()}
                placeholder="Service / item name (e.g. Haircut)"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <input
                type="number"
                value={customItemAmount}
                onChange={e => setCustomItemAmount(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomItem()}
                placeholder="₹ Amount"
                min="1"
                className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                onClick={addCustomItem}
                className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-dark whitespace-nowrap"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Items list */}
          {allItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">Bill Items</p>
              {customItems.map(item => (
                <div key={item.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-accent/20 bg-accent/5">
                  <span className="text-sm font-medium text-gray-800">{item.description}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-800">₹{Number(item.amount).toLocaleString('en-IN')}</span>
                    <button onClick={() => removeCustomItem(item.id)}
                      className="text-gray-400 hover:text-red-500 text-lg leading-none">×</button>
                  </div>
                </div>
              ))}
              {selectedServices.map(s => (
                <div key={s.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-blue-100 bg-blue-50/50">
                  <div>
                    <span className="text-sm font-medium text-gray-800">{s.name}</span>
                    <span className="ml-2 text-xs text-gray-400">from catalog</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-800">₹{Number(s.price).toLocaleString('en-IN')}</span>
                    <button onClick={() => toggleService(s)}
                      className="text-gray-400 hover:text-red-500 text-lg leading-none">×</button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between font-semibold text-gray-800 px-3 pt-1 border-t border-gray-100">
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          {/* Optional: Service catalog */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowCatalog(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-600 hover:bg-gray-50"
            >
              <span className="font-medium">Browse service catalog (optional)</span>
              <span>{showCatalog ? '▲' : '▼'}</span>
            </button>
            {showCatalog && (
              <div className="p-4 border-t border-gray-100 space-y-3">
                <input
                  type="text"
                  value={serviceSearch}
                  onChange={e => setServiceSearch(e.target.value)}
                  placeholder="Search services..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
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
              </div>
            )}
          </div>

          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(0)} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
            <button
              onClick={() => setStep(2)}
              disabled={allItems.length === 0}
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
            {allItems.map(i => (
              <div key={i.key} className="flex justify-between text-gray-700">
                <span>{i.name}</span>
                <span>₹{Number(i.price).toLocaleString('en-IN')}</span>
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
            <p className="text-sm text-gray-500 mt-1">{invoice.invoice_number}</p>
          </div>

          {/* Receipt summary */}
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
                <span className="text-gray-500">Invoice #</span>
                <span className="font-mono text-xs">{invoice.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1 text-gray-500 font-medium">Item</th>
                  <th className="text-right py-1 text-gray-500 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.items || allItems).map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td className="py-1">{item.service_name || item.name}</td>
                    <td className="py-1 text-right">₹{Number(item.price).toLocaleString('en-IN')}</td>
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

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handlePrintGSTInvoice}
              className="col-span-2 bg-accent text-white py-2.5 rounded-xl text-sm font-medium hover:bg-accent-dark transition-colors"
            >
              📄 Download GST Invoice
            </button>
            <button
              onClick={() => navigate(`/billing/${invoice.id}`)}
              className="border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50"
            >
              View Invoice →
            </button>
            <button
              onClick={resetForm}
              className="bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200"
            >
              + New Bill
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
