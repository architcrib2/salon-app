import React, { useState } from 'react'
import { createInvoice } from '../../api/billing'
import toast from 'react-hot-toast'

const GST_OPTIONS = [0, 5, 12, 18]
let _id = 0
const uid = () => ++_id

const blankItem = () => ({ id: uid(), description: '', amount: '' })

export default function QuickBillPage() {
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [items, setItems] = useState([blankItem()])
  const [gstRate, setGstRate] = useState(5)
  const [discount, setDiscount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const setItem = (id, field, value) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))

  const addRow = () => setItems(prev => [...prev, blankItem()])
  const removeRow = (id) => setItems(prev => prev.length > 1 ? prev.filter(i => i.id !== id) : prev)

  const validItems = items.filter(i => i.description.trim() && Number(i.amount) > 0)
  const subtotal = validItems.reduce((s, i) => s + Number(i.amount), 0)
  const gstAmount = Math.round(subtotal * gstRate / 100)
  const discountAmt = Math.min(Number(discount) || 0, subtotal + gstAmount)
  const total = subtotal + gstAmount - discountAmt

  const openGSTInvoice = (inv, invoiceItems) => {
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    const rows = invoiceItems.map(item => `
      <tr>
        <td style="padding:9px 8px;border-bottom:1px solid #f0f0f0">${item.description || item.service_name}</td>
        <td style="padding:9px 8px;border-bottom:1px solid #f0f0f0;text-align:right">₹${Number(item.amount || item.price).toLocaleString('en-IN')}</td>
        <td style="padding:9px 8px;border-bottom:1px solid #f0f0f0;text-align:right">${gstRate}%</td>
        <td style="padding:9px 8px;border-bottom:1px solid #f0f0f0;text-align:right">₹${Math.round(Number(item.amount || item.price) * gstRate / 100).toLocaleString('en-IN')}</td>
      </tr>`).join('')

    const html = `<html><head><title>Invoice ${inv.invoice_number}</title>
    <style>
      *{box-sizing:border-box}body{font-family:Arial,sans-serif;padding:32px;max-width:620px;margin:auto;color:#1a1a1a}
      .logo{font-size:22px;font-weight:700;margin:0}.sub{font-size:12px;color:#888;margin:2px 0 0}
      .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#dcfce7;color:#16a34a;margin-top:6px}
      table{width:100%;border-collapse:collapse;font-size:13px;margin-top:16px}
      th{background:#f7f7f7;padding:9px 8px;text-align:left;border-bottom:2px solid #e5e5e5;font-size:11px;text-transform:uppercase;letter-spacing:.4px;color:#666}
      .tr{text-align:right}.divider{border:none;border-top:1px solid #ebebeb;margin:16px 0}
      .label{font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#999;margin-bottom:4px}
      .summary td{padding:5px 4px;font-size:13px;color:#444}.summary .grand td{font-weight:700;font-size:16px;color:#111;padding-top:10px}
      @media print{body{padding:16px}}
    </style></head>
    <body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div><p class="logo">✂️ KaratOS Salon</p><p class="sub">GST Tax Invoice</p></div>
        <div style="text-align:right">
          <div style="font-family:monospace;font-weight:700;font-size:14px">${inv.invoice_number}</div>
          <div style="font-size:12px;color:#888;margin-top:2px">${dateStr}</div>
          <span class="badge">Paid</span>
        </div>
      </div>
      <hr class="divider">
      <div style="display:flex;justify-content:space-between">
        <div><div class="label">Billed To</div><div style="font-weight:600;font-size:14px">${customerName}</div><div style="color:#666;font-size:13px">${customerPhone}</div></div>
        <div style="text-align:right"><div class="label">Payment</div><div style="font-weight:600;font-size:14px;text-transform:capitalize">${paymentMethod}</div></div>
      </div>
      <table>
        <thead><tr><th>Description</th><th class="tr">Amount</th><th class="tr">GST%</th><th class="tr">GST Amt</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <hr class="divider">
      <table class="summary">
        <tr><td style="color:#666">Subtotal</td><td class="tr">₹${subtotal.toLocaleString('en-IN')}</td></tr>
        <tr><td style="color:#666">GST (${gstRate}%)</td><td class="tr">₹${gstAmount.toLocaleString('en-IN')}</td></tr>
        ${discountAmt > 0 ? `<tr><td style="color:#16a34a">Discount</td><td class="tr" style="color:#16a34a">−₹${discountAmt.toLocaleString('en-IN')}</td></tr>` : ''}
        <tr class="grand"><td>Total</td><td class="tr">₹${total.toLocaleString('en-IN')}</td></tr>
      </table>
      <hr class="divider" style="margin-top:28px">
      <p style="text-align:center;color:#bbb;font-size:12px">Thank you for visiting KaratOS Salon ✂️</p>
    </body></html>`

    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    w.print()
  }

  const handleSubmit = async () => {
    if (!customerName.trim()) { toast.error('Enter customer name'); return }
    if (!customerPhone.trim()) { toast.error('Enter customer phone'); return }
    if (validItems.length === 0) { toast.error('Add at least one item with name and amount'); return }

    setSaving(true)
    try {
      const res = await createInvoice({
        is_walkin: true,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        items: validItems.map(i => ({
          description: i.description.trim(),
          unit_price: Number(i.amount),
          gst_rate: gstRate,
        })),
        gst_rate: gstRate,
        payment_method: paymentMethod,
        discount_amount: discountAmt,
        notes,
      })
      const inv = res.data.data
      toast.success(`Invoice ${inv.invoice_number} created!`)
      openGSTInvoice(inv, validItems)

      // Reset form
      setCustomerName(''); setCustomerPhone(''); setItems([blankItem()])
      setGstRate(5); setDiscount(''); setNotes(''); setPaymentMethod('cash')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create invoice')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Quick Bill</h1>
        <p className="text-sm text-gray-400 mt-0.5">Fill in customer details, add services, and download GST invoice instantly.</p>
      </div>

      {/* Customer */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <p className="text-sm font-semibold text-gray-700">Customer Details</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Name *</label>
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Phone *</label>
            <input
              type="tel"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <p className="text-sm font-semibold text-gray-700">Services / Items</p>

        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={item.id} className="flex gap-2 items-center">
              <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">{idx + 1}.</span>
              <input
                type="text"
                value={item.description}
                onChange={e => setItem(item.id, 'description', e.target.value)}
                placeholder="Service name (e.g. Haircut)"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                <input
                  type="number"
                  value={item.amount}
                  onChange={e => setItem(item.id, 'amount', e.target.value)}
                  placeholder="0"
                  min="0"
                  className="w-28 border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <button
                onClick={() => removeRow(item.id)}
                className="text-gray-300 hover:text-red-400 text-xl leading-none flex-shrink-0"
              >×</button>
            </div>
          ))}
        </div>

        <button
          onClick={addRow}
          className="text-sm text-accent hover:text-accent-dark font-medium"
        >
          + Add another item
        </button>

        {/* Subtotal preview */}
        {subtotal > 0 && (
          <div className="border-t border-gray-100 pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span><span>₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>GST ({gstRate}%)</span><span>₹{gstAmount.toLocaleString('en-IN')}</span>
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span><span>−₹{discountAmt.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-800 text-base pt-1 border-t border-gray-100">
              <span>Total</span><span>₹{total.toLocaleString('en-IN')}</span>
            </div>
          </div>
        )}
      </div>

      {/* GST + Payment + Discount */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <p className="text-sm font-semibold text-gray-700">Billing Details</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">GST Rate</label>
            <div className="flex gap-1.5">
              {GST_OPTIONS.map(r => (
                <button
                  key={r}
                  onClick={() => setGstRate(r)}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    gstRate === r ? 'bg-accent text-white border-accent' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {r}%
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Discount (₹)</label>
            <input
              type="number"
              value={discount}
              onChange={e => setDiscount(e.target.value)}
              placeholder="0"
              min="0"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Payment Method</label>
          <div className="flex gap-2">
            {['cash', 'upi', 'card'].map(m => (
              <button
                key={m}
                onClick={() => setPaymentMethod(m)}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium capitalize transition-all ${
                  paymentMethod === m ? 'bg-accent text-white border-accent' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {m === 'cash' ? '💵' : m === 'upi' ? '📱' : '💳'} {m}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Any additional notes..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          />
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full bg-accent text-white py-3.5 rounded-2xl text-base font-semibold hover:bg-accent-dark disabled:opacity-60 transition-colors shadow-sm"
      >
        {saving ? 'Creating...' : '📄 Create Bill & Download GST Invoice'}
      </button>
    </div>
  )
}
